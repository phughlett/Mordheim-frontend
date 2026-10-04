# Mordheim frontend

React Router SPA with browser-side authentication and API requests.

## Development

```sh
npm ci
npm run dev
```

The development server listens on port 5173. Set `VITE_API_BASE_URL` to the
backend's API URL (by default `http://localhost:4000/api`).

## Build and validate

```sh
npm run typecheck
npm run build
npm start
```

`npm start` previews the static build on port 3000 for local testing only.
Production uses Nginx, not Vite's preview server.

## Docker deployment

```sh
docker build --build-arg VITE_API_BASE_URL=/api -t mordheim-frontend .
docker run --rm -p 3000:3000 mordheim-frontend
```

The multi-stage [Dockerfile](./Dockerfile) uses Node only to build the SPA.
The runtime is unprivileged Nginx serving `build/client` on port 3000; there
is no Node process or npm installation in the runtime image.

For production, put the shared HTTPS reverse proxy in front of this container.
It must route `/api/` to the backend and all other application requests here.
The standalone container does not proxy API requests. For standalone local
testing, build with `VITE_API_BASE_URL=http://localhost:4000/api` instead.
The API URL is baked into the build; changing it requires rebuilding the image.

[nginx.conf](./nginx.conf) provides:

- `/healthz` for container health checks.
- Uncached HTML so clients receive the current asset references after deployment.
- One-year immutable caching for fingerprinted `/assets/` files.
- SPA fallback for application URLs and real 404s for missing assets/API paths.

The production stack is maintained in
[hughlett-web-deploy](https://github.com/phughlett/hughlett-web-deploy).

Run the isolated container smoke test after building an image:

```sh
bash test/container.test.sh mordheim-frontend
```

It checks non-root execution, health, caching, SPA fallback, and missing-resource
404s using a temporary container and random loopback port.
