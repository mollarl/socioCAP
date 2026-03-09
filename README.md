## Running the code

1. Install dependencies:
   `npm_config_cache=.npm-cache npm i`
2. Start development server:
   `npm run dev`
3. Open:
   `http://localhost:3000`

## Google Sheets integration

The form sends validated data to a Google Apps Script Web App URL.

Optional env var:

`NEXT_PUBLIC_GAS_WEB_APP_URL=https://script.google.com/macros/s/.../exec`

You can also set only the deployment ID:

`NEXT_PUBLIC_GAS_WEB_APP_URL=AKfy...`

If the env var is not present, the app uses the current deployment URL already configured in the form component.

Apps Script sample code is in:

`google-apps-script/Code.gs`

Deployment summary:

1. Open your spreadsheet and go to `Extensions -> Apps Script`.
2. Paste `google-apps-script/Code.gs`.
3. `Deploy -> New deployment -> Web app`.
4. Execute as: `Me`.
5. Who has access: `Anyone`.
6. Use the generated `/exec` URL in `NEXT_PUBLIC_GAS_WEB_APP_URL`.

The script appends rows in this order:
`timestamp, nombres, apellido, dni, fechaNacimiento, matricula, expiracion, control`
