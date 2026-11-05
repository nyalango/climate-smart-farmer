# Climate Smart Farmer — deployment and Android build guide

## 1. Protect local files
Do not upload `.env`, `backend/.env`, `src/config/$env`, `backend/farmers.db`,
`.venv`, or `node_modules` to GitHub or a hosting provider. The deployment ZIP
intentionally excludes local secrets and the local SQLite database.

## 2. Deploy the FastAPI backend
Create a PostgreSQL database with your hosting provider, then create a Python
web service from this repository/project.

For Render, use:
- Runtime: Python
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

Set these web-service environment variables:
- `ENVIRONMENT` = `production`
- `DATABASE_URL` = the provider's PostgreSQL connection string
- `JWT_SECRET` = a newly generated random secret (at least 32 random bytes)
- `JWT_EXPIRE_MINUTES` = `10080`
- `DEV_PRINT_CODE` = `false`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`,
  `SMTP_STARTTLS` = configure these if email verification is required.

This backend normalizes PostgreSQL URLs to use psycopg 3. Do not paste secrets
into source files or share them in chat. Use the hosting provider's secret
environment-variable settings.

After deployment, test `https://YOUR-SERVICE/health`. A healthy response should
include `"status":"ok"`. Also test `https://YOUR-SERVICE/docs`.

IMPORTANT: the existing local `farmers.db` is not included or migrated. A new
cloud PostgreSQL database starts empty. Existing local accounts will need to
register again unless you arrange a secure database migration.

## 3. Point the app to the cloud backend
From the project root, save the public backend URL in the EAS `production`
environment (replace the example URL with your real Render service URL):
```powershell
eas env:set --name EXPO_PUBLIC_API_URL --value https://YOUR-SERVICE.onrender.com --environment production --visibility plaintext
```
For local preview builds, create the same variable in the `preview` environment.
The `eas.json` profiles select their corresponding EAS environments.
Expo embeds `EXPO_PUBLIC_` values into the app bundle. This URL is public; never
put passwords, JWT secrets, SMTP credentials, or other private keys in it.

## 4. Install and configure EAS
From the project root:
```powershell
npm install
npm install -g eas-cli
eas login
eas project:info
```
The existing app.json already contains an EAS project ID. Confirm it belongs
to your Expo account before building.

## 5. Build Android files
APK for direct testing/install:
```powershell
eas build --platform android --profile preview
```
AAB for Google Play:
```powershell
eas build --platform android --profile production
```
Download each artifact from the completed build page. Test the APK on a phone
using mobile data or another Wi-Fi network, with the development PC switched off.

## 6. Offline behavior
The app caches successful daily and weekly forecasts on the device for up to
7 days. Cached values are not live weather. The app needs internet for fresh
forecasts, registration/email verification, and online chatbot services.
Local navigation, theme, preferences, and saved forecast viewing remain
available when offline after the app has been opened/configured.
