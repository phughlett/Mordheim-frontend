#!/usr/bin/env bash
set -euo pipefail

image=${1:-mordheim-frontend:spa-validation}
name="mordheim-frontend-test-$$"
test_dir=$(mktemp -d)
cleanup() {
    docker rm -f "$name" >/dev/null 2>&1 || true
    rm -rf -- "$test_dir"
}
trap cleanup EXIT

docker run -d --name "$name" -p 127.0.0.1::3000 "$image" >/dev/null
port=$(docker inspect --format '{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}' "$name")
base="http://127.0.0.1:$port"
curl --silent --show-error --fail --retry 10 --retry-connrefused --retry-delay 1 \
    "$base/healthz" | grep -qx ok
docker exec "$name" nginx -t
test "$(docker exec "$name" id -u)" != 0
docker exec "$name" sh -c '! command -v node && ! command -v npm'
printf 'PASS: healthy, non-root Nginx runtime without Node/npm\n'

curl --silent --show-error --fail -D "$test_dir/headers" "$base/" > "$test_dir/index"
grep -qi '^Cache-Control: no-store' "$test_dir/headers"
grep -q '<html' "$test_dir/index"
curl --silent --show-error --fail "$base/application-route" > "$test_dir/fallback"
cmp "$test_dir/index" "$test_dir/fallback"
printf 'PASS: uncached HTML and SPA fallback\n'

for path in /app /app/ '/app?share=test%20code'; do
    status=$(curl --silent --show-error -D "$test_dir/headers" -o "$test_dir/app" \
        -w '%{http_code}' -H 'Host: mordheim.hughlett.org' \
        -H 'X-Forwarded-Proto: https' "$base$path")
    test "$status" = 200
    if grep -qi '^Location:' "$test_dir/headers"; then
        printf 'FAIL: %s redirected behind the HTTPS proxy\n' "$path" >&2
        exit 1
    fi
    grep -q 'name="robots" content="noindex, nofollow"' "$test_dir/app"
    if [[ "$path" == /app ]]; then
        cp "$test_dir/app" "$test_dir/app-index"
    else
        cmp "$test_dir/app-index" "$test_dir/app"
    fi
done
printf 'PASS: app and share URLs serve private app HTML without proxy redirects\n'

asset=$(grep -oE '/assets/[^"]+\.js' "$test_dir/index" | head -1)
curl --silent --show-error --fail -D "$test_dir/headers" "$base$asset" > /dev/null
grep -qi '^Cache-Control: public, max-age=31536000, immutable' "$test_dir/headers"
printf 'PASS: immutable caching for fingerprinted assets\n'

for path in /assets/missing.js /missing.css /api /api/health; do
    status=$(curl --silent --show-error -o /dev/null -w '%{http_code}' "$base$path")
    test "$status" = 404
done
printf 'PASS: missing assets and API paths return 404, not SPA HTML\n'
