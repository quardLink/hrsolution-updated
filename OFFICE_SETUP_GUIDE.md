# Office Computer Setup Guide
## Employee Attendance System — Step by Step

The app is deployed on Vercel, so office computers only need a browser
pointed at the deployed URL — no local install, no dev servers to run.

---

## What You Need
- A Windows/Mac/Linux computer that stays **ON** during office hours
- Internet connection
- Google Chrome (recommended for kiosk mode)
- The deployed app URL (e.g. `https://your-app.vercel.app`) from whoever
  manages the Vercel project

---

## STEP 1 — Open the App

Open Chrome and go to the deployed URL. The kiosk screen will appear.

---

## STEP 2 — Set Chrome as Kiosk (Full-Screen, No Address Bar)

To make it look like a dedicated attendance terminal:

### Windows:
1. Right-click the Desktop → **New → Shortcut**
2. Paste this as the location (replace the URL with your deployed one):
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk https://your-app.vercel.app
   ```
3. Name it "Attendance System"
4. Double-click it — Chrome opens in full kiosk mode
5. Press **F11** or **Alt+F4** to exit kiosk mode when needed

### Mac:
```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk https://your-app.vercel.app
```

---

## STEP 3 — Auto-Start on Boot (Windows)

So the app starts automatically when the office computer turns on:

1. Press **Win + R**, type `shell:startup`, press Enter
2. Copy your "Attendance System" shortcut into that folder

---

## STEP 4 — Share the Google Sheet with the Service Account (one-time, done by whoever sets up the deployment)

In the Google Sheet used as the datastore:
1. Click **Share** (top right)
2. Add the service account email from the deployment's
   `GOOGLE_SERVICE_ACCOUNT_EMAIL` environment variable
3. Set permission to **Editor**
4. Click **Send**

Without this step, attendance records will NOT be saved to Google Sheets.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| App not loading | Check internet connection; confirm the deployed URL is correct |
| Google Sheets not updating | Check the service account email is shared with Editor access |
| PIN rejected | Double-check the employee ID is selected correctly; ask an admin to confirm/reset your PIN in the Admin → Employees tab |
| Clock shows wrong time | The server uses Saudi Arabia time (UTC+3) automatically |

Employee PINs are not listed here — they're managed in the Admin →
Employees tab and should be shared with each employee individually, not
kept in a shared document.

---

## Shift Schedule

| Role | Morning In | Afternoon Out | Afternoon In | Evening Out |
|---|---|---|---|---|
| Sales | 8:00 AM | 12:00 PM | 1:30 PM | 5:00 PM |
| Purchase | 8:00 AM | 1:30 PM | 4:00 PM | 8:00 PM |
| Shop Handler | 9:00 AM | 1:30 PM | 4:00 PM | 8:00 PM |
| Manager | Any time | Any time | Any time | Any time |
