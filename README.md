# Kasatria People Table

The three.js [CSS3D periodic table demo](https://threejs.org/examples/#css3d_periodictable), rebuilt in Next.js and TypeScript to show 200 people read live from a private Google Sheet. Anyone can sign in with a Google account; the app's server checks the sign-in and reads the sheet with its own service account, so the sheet itself is never shared with the people who sign in.

**Live URL:** https://kasatria-table-periodic.vercel.app

## Requirements covered

| Brief | Implementation |
| --- | --- |
| Google Sheet shared with lisa@kasatria.com | Sheet stays private (Restricted), shared as Viewer with lisa@kasatria.com and with the app's service account. Signed-in users never get access to the sheet; the server reads it for them. |
| Webpage with Google login (Image A) | Google Identity Services token flow (`src/lib/google/identity-services.ts`). **Redesigned on purpose:** `LoginScreen` is a front-desk visitor pass rather than Image A's card. See [Login page](#login-page). |
| Data comes from the Google Sheet | `GET /api/people` (`src/app/api/people/route.ts`) reads it live with Sheets API v4 `values.get` as the service account (`src/lib/google/sheets-api.ts`), parsed by header name (`src/lib/people/parse-people.ts`) |
| Tile content as in Image B | Country, age, photo, name, interest (`src/lib/scene/person-tile.ts`) |
| Colour by net worth | Red < $100K, orange $100K–$200K, green > $200K (`src/lib/people/net-worth.ts`) plus a Low → High legend |
| Table, Sphere, Helix, Grid | `src/lib/layouts/layouts.ts` |
| Table 20 × 10 | **Changed on purpose:** the table takes the chemistry periodic table's shape instead (24 columns, 200 cells). See [Decisions](#decisions-and-assumptions). |
| Double helix | Two strands 180° apart, alternating people |
| Grid 5 × 4 × 10 | 5 columns × 4 rows per layer, 10 layers in depth |

## How it works

```
Browser
  Click "Sign in with Google"
    → one Google pop-up (scopes: openid, email, profile — all non-sensitive)
    → access token (kept in memory only) + profile for the user menu
    → GET /api/people   Authorization: Bearer <access token>

Server: /api/people
    → oauth2.googleapis.com/tokeninfo   is the token valid, and issued to this app's client ID?
    → service account JWT (RS256)       → service account access token, cached until 1 min before expiry
    → Sheets API values.get             UNFORMATTED_VALUE, read as the service account
    → parsePeopleRows()                 rows → Person[]
    → JSON                              Cache-Control: private, no-store

Browser
    → createLayoutTargets()    Person count → target positions for 4 layouts
    → PeopleScene              CSS3DRenderer + TrackballControls + tween.js
    → click a tile             it flies out of the layout to the camera, enlarged; the next click or Escape puts it back
```

The sign-in asks only for the basic profile, so the OAuth app can be published for any Google account without Google's verification. The sheet ID and the service account credentials are server-only environment variables: they never use the `NEXT_PUBLIC_` prefix, and the modules that read them import `server-only`, so importing them from client code fails the build.

### Project structure

```
public/google-g-logo.svg      Google's colour G for the sign-in button
src/
├── app/                      Next.js App Router entry (layout with fonts, page, global CSS)
│   ├── api/people/route.ts   GET /api/people: token check → service account → sheet → JSON
│   └── privacy/              Privacy policy page, linked from the login page and from Google Branding
├── components/
│   ├── App.tsx               Switches between login and the 3D view
│   ├── auth/                 AuthProvider (session state), LoginScreen, VisitorPass, GoogleSignInButton, CustomCursor
│   ├── SplitText/            Text reveal from React Bits (SplitText.jsx) plus its TypeScript types (SplitText.d.ts)
│   └── people/               PeopleExplorer, PeopleScene3D, LayoutControls, NetWorthLegend, UserMenu, StatusMessage
├── config/
│   ├── app-config.ts         Browser-safe: OAuth client ID, scopes, env value cleaning
│   └── server-config.ts      Server only: sheet ID, range, service account credentials
├── hooks/
│   ├── usePeople.ts          Loading, error and retry state for the people data
│   └── useSmoothScroll.ts    Lenis smooth scrolling for the login page, driven by GSAP's ticker
└── lib/                      Framework-free logic
    ├── google/               Browser: Identity Services wrapper, user profile.
    │                         Server only: token verification, service account JWT, Sheets API client
    ├── people/               Person type, sheet parsing, net worth tiers, /api/people client (with unit tests)
    ├── layouts/              Table (periodic shape), sphere, double helix and grid positions (with unit tests)
    ├── motion/               Damped pendulum for the login page's hanging pass (with unit tests)
    └── scene/                three.js scene class and tile DOM builder
```

The logic in `src/lib` does not depend on React, so it is unit-tested directly. React components only hold state and render UI. three.js is loaded with a dynamic `import()` after sign-in, which keeps it out of the login page bundle and off the server.

### Login page

The login page has its own look, separate from the 3D view: a front desk where a visitor pass hangs from a lanyard and carries the sign-in button.

- **The pass** (`VisitorPass`) swings in from the left on load, across to the right, and settles into a small swing around the centre. It keeps swinging until the pointer (or keyboard focus) rests on it, so the button holds still to be clicked, and starts again once the pointer leaves. It can be dragged by the card and sways as the page scrolls. The swing is a damped pendulum (`src/lib/motion/pendulum.ts`) stepped on GSAP's ticker.
- **The pass states facts about sign-in:** name and photo come from the Google account, access is view only, and it is valid for this tab only. The steps under the headline explain each one, and GSAP ScrollTrigger highlights the matching field on the pass as each step scrolls into view. A link to the privacy policy follows the steps.
- **Headline:** "Visitors, please sign in." revealed letter by letter with React Bits' SplitText.
- **Scrolling** is smoothed by Lenis, driven from GSAP's ticker so ScrollTrigger and Lenis update on the same frame. A round arrow at the foot of the first screen ("What signing in does") scrolls down to the steps through Lenis; its nudge animation stops with reduced motion.
- **Cursor** (`CustomCursor`): a dot and a trailing ring. The ring outlines buttons and says "Drag" over the pass. Mouse and pen only; touch screens keep the default.
- **Type and colour:** Big Shoulders for signage and the pass, Instrument Sans for text (both via `next/font`), on navy with a safety-orange lanyard. The `/privacy` page uses the same look.

On narrow screens the pass comes first, then the copy and steps, then a second sign-in button at the end.

### Libraries

| Library | Used for |
| --- | --- |
| `three` + `@tweenjs/tween.js` | 3D view: CSS3DRenderer, TrackballControls, layout transitions |
| `gsap` + `@gsap/react` | Login page: pendulum ticker, ScrollTrigger, cursor, SplitText |
| `lenis` | Smooth scrolling on the login page |
| React Bits `SplitText` | Headline reveal. Copied in from the `@react-bits/SplitText-JS-CSS` registry item rather than through the shadcn CLI, because the project has no `components.json` or Tailwind. `SplitText.d.ts` types its props, since TypeScript would otherwise treat every prop without a default as required. |
| `server-only` | Makes the server modules (config, token check, service account, Sheets client) a build error to import from client code |

The service account JWT is signed with `node:crypto`; no Google client library is used.

## Decisions and assumptions

- **Who can sign in.** Any Google account. The sign-in only requests `openid`, `email` and `profile`, which are non-sensitive, so the OAuth app can be published (In production) without verification. The sheet stays private because only the service account and lisa@kasatria.com can open it.
- **Token check.** `/api/people` asks Google's tokeninfo endpoint about the token on every request and requires its audience (`aud` or `azp`) to be this app's client ID, so tokens issued to other apps are refused. An expired or unknown token gets 401 and the browser goes back to the sign-in screen; a Google outage gets 500 and does not sign the user out.
- **Caching.** People data is never cached: responses carry `Cache-Control: private, no-store`, and reading the request headers keeps the route dynamic under Cache Components. Only the service account's access token is cached, per server instance, until a minute before it expires.
- **Access log.** Each successful load writes `[api/people] <email> loaded <n> people` to the server log (Vercel → Logs). The privacy policy says so.
- **Error messages.** They name the setting to fix (`SPREADSHEET_ID`, `SHEET_RANGE`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`) but never include the sheet ID or the service account's address, because any signed-in user can see them.
- **Net worth boundaries.** The brief does not say where exactly $100,000 and $200,000 fall. Both are treated as orange: `< 100,000` red, `100,000 – 200,000` orange, `> 200,000` green.
- **Table shape.** The brief asks for a 20 × 10 table; this project deliberately gives the table the chemistry periodic table's shape instead. 200 people do not map onto 118 elements, so it keeps the shape rather than the element positions: the first row holds only its two ends (where H and He sit), the next three rows only the s-block (2 columns) and p-block (6), then full rows, and a two-row f-block set apart below. The d-block is widened from 10 to 16 columns so that 2 + 3 × 8 + 6 × 24 + 2 × 15 = 200. Tiles fill in sheet order, row by row, with the f-block last. Cells are slightly tighter than elsewhere so all 12½ rows fit the default view; on screens narrower than about 3:2 the sides are cropped until you zoom out.
- **Double helix.** Even rows go to strand A and odd rows to strand B, 180° apart, so each pair faces each other across the helix. Spacing is chosen so no tiles overlap (see the comment in `layouts.ts`).
- **Grid axes.** 5 columns (x) × 4 rows (y) per layer, 10 layers in depth (z). The first layer is nearest the camera. Rotate with the mouse to get the angled view in Image C.
- **Layouts follow the data.** Sizes are computed from the number of people, not hard-coded to 200. More rows add table rows, grid layers and helix turns.
- **Columns are matched by name.** Header spacing and case do not matter (the original CSV has `" Net Worth "`), and reordering columns does not break the app.
- **Session.** The Google access token is kept in memory only, never in localStorage, and is sent only to this app's `/api/people`. Reloading the page asks the user to sign in again. Sign out revokes the grant with Google.
- **Safe rendering.** Sheet values are written with `textContent`, never `innerHTML`, and only `http(s)` photo URLs are used. A broken photo falls back to the person's initials.
- **Reduced motion.** When the system asks for reduced motion, layout changes jump instantly, the login pass hangs still, the headline appears without animation, scrolling is native (no Lenis), and the cursor ring follows without a trail.

## Setup

### 1. Google Sheet

Import `Data Template.csv` into a Google Sheet. Keep general access **Restricted** and share it as **Viewer** with lisa@kasatria.com and with the service account's `client_email` (created in step 2).

### 2. Google Cloud project

1. Enable **Google Sheets API**.
2. **Google Auth Platform → Branding:** app name, support email, audience **External**, app home page (your Vercel URL) and privacy policy link (`https://<your-app>/privacy`). Add the app's domain under **Authorized domains**. Leave the logo empty unless you want to go through brand verification.
3. **Data Access:** only `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`. Remove `.../auth/spreadsheets.readonly` if it was added before.
4. **Audience:** select **Publish app** so any Google account can sign in. With only non-sensitive scopes, no verification is needed.
5. **Clients:** create a **Web application** client. Add `http://localhost:3000` and your Vercel URL to **Authorized JavaScript origins**. No redirect URI is needed. No API key or client secret is used.
6. **IAM & Admin → Service Accounts:** create a service account (it needs no roles), then **Keys → Add key → JSON**. Copy `client_email` and `private_key` from the file into the environment variables below, then delete the file or keep it outside the project. Never commit it.

### 3. Google "G" logo

The sign-in button shows the standard colour G from `public/google-g-logo.svg`, which is included. For production you can swap in the file from Google's own sign-in assets ([Sign in with Google branding guidelines](https://developers.google.com/identity/branding-guidelines)) under the same name. If the file is missing, the button shows an empty space where the G should be. The button itself follows Google's light theme.

### 4. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Required | Read by | Value |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | Browser and server | `1234-abc.apps.googleusercontent.com` |
| `SPREADSHEET_ID` | Yes | Server only | The part of the sheet URL between `/d/` and `/edit` |
| `SHEET_RANGE` | No | Server only | `'Data Template'!A:F` (default). Use `Data!A:F` if the tab is named `Data`. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | Server only | `client_email` from the JSON key |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Yes | Server only | `private_key` from the JSON key, with its `\n` sequences |

Only the client ID reaches the browser; it identifies the app and grants nothing on its own. Never add the `NEXT_PUBLIC_` prefix to the others. Wrapping quotes are stripped and literal `\n` sequences in the key become line breaks, so values can be pasted as they appear in the JSON file.

### 5. Run locally

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (Next.js core web vitals + TypeScript rules) |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit tests (Vitest): sheet parsing, net worth tiers, layout geometry, login pass pendulum, config, token check, service account JWT, `/api/people`, people client |

## Deploy to Vercel

1. Push the project to GitHub and import it in Vercel. The Next.js preset is detected automatically.
2. Add the five environment variables above under **Settings → Environment Variables**. Mark `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` as **Sensitive**. Enter the range without surrounding double quotes: `'Data Template'!A:F`. If the project still has `NEXT_PUBLIC_SPREADSHEET_ID` or `NEXT_PUBLIC_SHEET_RANGE` from the earlier version, delete them.
3. Deploy, then add the production URL to **Authorized JavaScript origins** in the Google Cloud client, and use it for the home page and privacy link in **Branding**.
4. Test on the production URL. Preview deployments get different URLs that are not registered with Google, so sign-in fails there.

Vercel applies environment variable changes on the next deployment, so redeploy after changing any of them.

## Troubleshooting

| What you see | Cause and fix |
| --- | --- |
| `Error 400: origin_mismatch` | The page's origin is not in Authorized JavaScript origins. Add it exactly (protocol, domain, port, no trailing slash) and wait a few minutes. |
| `Access blocked: app has not completed the Google verification process` | The OAuth app is still in Testing and the account is not a test user. Publish the app under Audience. |
| `Google hasn't verified this app` | The OAuth app still lists a sensitive scope. Remove `spreadsheets.readonly` under Data Access. |
| "The service account cannot open the spreadsheet…" | The sheet is not shared with the `GOOGLE_SERVICE_ACCOUNT_EMAIL` address. Share it as Viewer. |
| "The spreadsheet was not found…" | `SPREADSHEET_ID` is wrong, or the sheet is not shared with the service account. |
| "The sheet range … could not be read" | The tab name in `SHEET_RANGE` does not match the sheet. |
| "The Google Sheets API is not enabled…" | Enable Google Sheets API in the Google Cloud project that owns the service account. |
| "Google rejected the service account credentials…" | The email and key do not belong together, the key was deleted, or the key was pasted incompletely. Create a new JSON key and copy both values again. |
| "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not a valid private key…" | Paste the whole `private_key` value, including the `BEGIN` and `END` lines. |
| "… is not set" | That environment variable is missing. Add it (in Vercel, then redeploy). |
| Sign-in window does not open | The browser blocked the pop-up. Allow pop-ups for the site. |
| `unable to verify the first certificate` or `UNABLE_TO_VERIFY_LEAF_SIGNATURE` from `npx shadcn …`, or fonts failing to download in `next dev` / `next build` | The network inspects HTTPS traffic with its own certificate, which the operating system trusts but Node does not. Run the command with `NODE_OPTIONS=--use-system-ca` so Node uses the system's certificates. |
