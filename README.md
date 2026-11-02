# Mordheim frontend

React Router SPA with browser-side authentication and API requests.

Click a warrior or henchman group row (or its name) to open its details.
Click it again to collapse the details, or use the close button.
Clicking another warrior or group switches to its details.

The top-bar account icon shows the signed-in user's initial. Click it to see
the username and **Log out** option. Escape or clicking outside dismisses
the popup; account controls are also available on mobile.

Injury tracking retains effects and their causes, not full-recovery outcomes.
Between battles, newly selected skills, spells and advancement outcomes remain
correctable until the battle counter changes; fixed choices show **Fixed**.
Removing a spell releases its linked advance, and current spell-difficulty
reductions have an undo action. Innate starting skills remain fixed.
Current gear purchases show **Cancel purchase** and refund the complete amount
paid, including items assigned to warriors. Older purchases retain ordinary
resale rules. Cancelling a consumed Tome removes its gained spells and releases
their advances; current paid Tomes refund in full, while older Tomes are restored
to inventory. Campaign correction actions do not depend on the current stage.
Legacy records without trustworthy counters cannot be corrected.

**Add injury** and **Resolve** open a modal for selection, secondary rolls and
preview/confirmation. Cancel, Close or Escape discard an unapplied preview;
the dialog remains open if cancellation fails. Keyboard focus stays within
the modal and returns to the roster when it closes.
Warrior rows identify current effects; details and the printable roster include
gameplay references for Frenzy, Stupidity, fear and hatred. Injury stat modifiers
are already applied to roster stats and should not be applied again in play.
Multiple Injuries outcomes are stored as individual injury entries, not a nested
group. Pit victories protect the XP total reached after the +2 XP award; XP
controls cannot reduce below that minimum even after removing an advancement.

**Remove injury** corrects an accidental injury before the battle counter changes,
reversing stats, conditions, protected XP, gold and equipment effects. Accidental
casualty injuries can be corrected from removed-warrior injury history, including
deaths and Henchman model losses, with capacity/type-limit validation.
Dependent stat, XP/advancement or replacement-equipment changes must be undone
first; errors explain what blocks correction. Older injuries without saved
correction snapshots remain read-only. Shared views and PDFs have no correction
controls. This is separate from the non-death Graveyard **Undo removal** action.

For Bitter Enmity, enter the hatred target in the selection or preview, including
simulated results. Campaign dropdowns use the latest played battle's opposing
warbands, Heroes or leaders according to the secondary roll. Other/historical
targets can be typed manually. The target is retained in roster gameplay rules
and print output without rerolling the injury.

The **Graveyard** lists all removed Heroes with their reason and battle number.
Expand an entry to view its read-only full snapshot (stats, XP, equipment,
skills, spells and notes). It is excluded from PDF/print exports; archived
Heroes and their gear do not count toward the active roster.
The Graveyard is hidden during roster creation. **Undo removal** restores
non-dead Heroes only before the battle counter changes and during hiring
stages, subject to server-checked capacity and recruitment limits. Dismissals
after roster creation give no hire-fee refund.

## Campaign leagues

Select a campaign to open **Campaign management**. The owner is its commissioner.
**New campaign** and **Campaign setup** open a full-width setup page (instead of a
modal) for starting gold, finite/indefinite length, allowed warbands, Hero
starting bonuses and paid advances, Trading Post items, optional rules and
house-rule text. Every player sees a rules summary that labels each rule as
Automated or Manual; manual rules may need hand edits to rosters. Commissioners
can delete a campaign from the setup page after a permanent-deletion warning and
typing its name; its warbands move to Freebuild. Existing unscheduled campaigns retain their
original Battle panel.

The scenario calendar shows play windows and locations and exports `.ics` events.
Schedule players at tables, mark absences, then determine teams at the event.
Tables support flexible teams or individual results, including the ten supplied
2026 scenarios in the library. Their structured sections can be copied into the
custom-scenario form; original documents retain maps and tables. Shared scenarios
import as independent copies.

Complete roster preparation before starting a table, record results, and resolve
post-battle work before the next scenario. Commissioners may confirm completed
post-battle steps and explicitly grant one-time absence catch-up awards. Special
scenario effects and ordinary rewards remain manual. Player standings survive
retiring/replacing a warband; retired warbands remain visible and read-only.

Loading the 2026 house-rule template only fills the editor: review and save it.
It does not automatically implement its special gear, currencies or penalties.
The source player/date roster is not published.

## Development setup

```sh
npm ci
npm run dev
```

The development server listens on port 5173. Set `VITE_API_BASE_URL` to the
backend's API URL (by default `http://localhost:4000/api`).

The public landing page at `/` and sign-in/roster app at `/app` are pre-rendered
at build time. The SEO canonical URL, `robots.txt` and `sitemap.xml` use
`https://mordheim.hughlett.org`; update those references if the production
domain changes. The sitemap intentionally lists only the public landing page.

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
- Direct serving of `/app` without a directory redirect; other Nginx redirects
  use relative URLs to preserve the external HTTPS origin behind the proxy.
- One-year immutable caching for fingerprinted `/assets/` files.
- SPA fallback for application URLs and real 404s for missing assets/API paths.

The production stack is maintained in
[hughlett-web-deploy](https://github.com/phughlett/hughlett-web-deploy).

Run the isolated container smoke test after building an image:

```sh
bash test/container.test.sh mordheim-frontend
```

It checks non-root execution, health, caching, SPA fallback, app/share URLs behind
an HTTPS proxy, and missing-resource 404s using a temporary container and random
loopback port.
