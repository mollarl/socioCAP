## Running the code

1. Install dependencies:
   `npm_config_cache=.npm-cache npm i`
2. Start development server:
   `npm run dev`
3. Open:
   `http://localhost:3000`

## Google Sheets integration

The form sends validated data to a Google Apps Script Web App URL.

Optional env vars:

`NEXT_PUBLIC_GAS_WEB_APP_URL_CAP=https://script.google.com/macros/s/.../exec`

`NEXT_PUBLIC_GAS_WEB_APP_URL_CRE=https://script.google.com/macros/s/.../exec`

You can also set only deployment IDs:

`NEXT_PUBLIC_GAS_WEB_APP_URL_CAP=AKfy...`

`NEXT_PUBLIC_GAS_WEB_APP_URL_CRE=AKfy...`

Backward compatibility:

`NEXT_PUBLIC_GAS_WEB_APP_URL_NON_CAP` and `NEXT_PUBLIC_GAS_WEB_APP_URL` are still supported as fallback.

Apps Script sample code is in:

`google-apps-script/Code.gs`

Deployment summary:

1. Open your spreadsheet and go to `Extensions -> Apps Script`.
2. Paste `google-apps-script/Code.gs`.
3. `Deploy -> New deployment -> Web app`.
4. Execute as: `Me`.
5. Who has access: `Anyone`.
6. Use the generated `/exec` URL in `NEXT_PUBLIC_GAS_WEB_APP_URL_CAP` or `NEXT_PUBLIC_GAS_WEB_APP_URL_CRE`.

The script appends rows in this order:
`timestamp, nombres, apellido, dni, fechaNacimiento, matricula, expiracion, control`

## Neon/Postgres integration

Dual write is enabled in the API route:

1. It saves in Google Sheets.
2. It also saves in Neon Postgres.

Required env var:

`DATABASE_URL=postgresql://...`

Create tables using the migration:

- `"CAP"` for `CLUB ATLÉTICO PACÍFICO`
- `"CRE"` for `CENTRO DE RESIDENTES ENTRERRIANOS DE RÍO NEGRO Y NEUQUÉN`

Migration file:

`migrations/001_create_cap_cre.sql`

Each table stores:
`nombres, apellido, dni, fecha_nacimiento, matricula, expiracion, control, imagen, timestamp`

Failure policy:

- Sheets and DB are retried up to 3 times each.
- If one (or both) still fail, the API returns success with warnings so the user can continue.

## Neon Auth and roles

The app uses Neon Auth and requires login.

Required env vars:

`NEON_AUTH_BASE_URL=https://<project>.neonauth.../auth`

`NEON_AUTH_COOKIE_SECRET=<32+ characters>`

`NEON_API_KEY=napi_...` (for user provisioning script)

`NEON_PROJECT_ID=<neon_project_id>` (for user provisioning script)

Server auth route:

`src/app/api/auth/[...path]/route.ts`

Login page:

`/auth/sign-in`

Role model:

- `admin`: full access (CAP + CRE)
- `cap`: can only write/read CAP data
- `cre`: can only write/read CRE data

Role enforcement happens in:

- `src/app/api/sheets/route.ts`
- `src/app/api/records/route.ts`

Provision users from terminal (no in-app user creation):

`NEON_AUTH_SEED_USERS='[{"email":"...","password":"...","role":"admin"}]' npm run auth:provision-users`

Provisioning script:

`scripts/provision-neon-auth-users.mjs`
