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

`NEXT_PUBLIC_GAS_WEB_APP_URL_NON_CAP=https://script.google.com/macros/s/.../exec`

You can also set only deployment IDs:

`NEXT_PUBLIC_GAS_WEB_APP_URL_CAP=AKfy...`

`NEXT_PUBLIC_GAS_WEB_APP_URL_NON_CAP=AKfy...`

Backward compatibility:

`NEXT_PUBLIC_GAS_WEB_APP_URL` is still supported as a fallback for both modes.

Apps Script sample code is in:

`google-apps-script/Code.gs`

Deployment summary:

1. Open your spreadsheet and go to `Extensions -> Apps Script`.
2. Paste `google-apps-script/Code.gs`.
3. `Deploy -> New deployment -> Web app`.
4. Execute as: `Me`.
5. Who has access: `Anyone`.
6. Use the generated `/exec` URL in `NEXT_PUBLIC_GAS_WEB_APP_URL_CAP` or `NEXT_PUBLIC_GAS_WEB_APP_URL_NON_CAP`.

The script appends rows in this order:
`timestamp, nombres, apellido, dni, fechaNacimiento, matricula, expiracion, control`
