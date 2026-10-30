# Kasatria People Table

The three.js [CSS3D periodic table demo](https://threejs.org/examples/#css3d_periodictable), rebuilt in Next.js and TypeScript to show 200 people read live from a private Google Sheet. Visitors sign in with Google, and the same sign-in grants read-only access to the sheet.

**Live URL:** _add your Vercel URL here_

## Requirements covered

| Brief | Implementation |
| --- | --- |
| Google Sheet shared with lisa@kasatria.com | Sheet stays private (Restricted). Data is read with the signed-in user's token, so only accounts the sheet is shared with can load it. |
| Webpage with Google login (Image A) | Google Identity Services token flow (`src/lib/google/identity-services.ts`). **Redesigned on purpose:** `LoginScreen` is a front-desk visitor pass rather than Image A's card. See [Login page](#login-page). |
| Data comes from the Google Sheet | Sheets API v4 `values.get` (`src/lib/google/sheets-api.ts`), parsed by header name (`src/lib/people/parse-people.ts`) |
| Tile content as in Image B | Country, age, photo, name, interest (`src/lib/scene/person-tile.ts`) |
| Colour by net worth | Red < $100K, orange $100K–$200K, green > $200K (`src/lib/people/net-worth.ts`) plus a Low → High legend |
| Table, Sphere, Helix, Grid | `src/lib/layouts/layouts.ts` |
| Table 20 × 10 | **Changed on purpose:** the table takes the chemistry periodic table's shape instead (24 columns, 200 cells). See [Decisions](#decisions-and-assumptions). |
| Double helix | Two strands 180° apart, alternating people |
| Grid 5 × 4 × 10 | 5 columns × 4 rows per layer, 10 layers in depth |

## How it works

```
Click "Sign in with Google"
  → one Google pop-up (scopes: openid, email, profile, spreadsheets.readonly)
  → access token (kept in memory only)
  → GET sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}?valueRenderOption=UNFORMATTED_VALUE
  → parsePeopleRows()        rows → Person[]
  → createLayoutTargets()    Person count → target positions for 4 layouts
  → PeopleScene              CSS3DRenderer + TrackballControls + tween.js
```

### Project structure

```
public/google-g-logo.svg      Google's colour G for the sign-in button
src/
├── app/                      Next.js App Router entry (layout with fonts, page, global CSS)
├── components/
│   ├── App.tsx               Switches between login and the 3D view
│   ├── auth/                 AuthProvider (session state), LoginScreen, VisitorPass, GoogleSignInButton, CustomCursor
│   ├── SplitText/            Text reveal from React Bits (SplitText.jsx) plus its TypeScript types (SplitText.d.ts)
│   └── people/               PeopleExplorer, PeopleScene3D, LayoutControls, NetWorthLegend, UserMenu, StatusMessage
├── config/app-config.ts      Environment variables and OAuth scopes in one place
├── hooks/
│   ├── usePeople.ts          Loading, error and retry state for the sheet data
│   └── useSmoothScroll.ts    Lenis smooth scrolling for the login page, driven by GSAP's ticker
└── lib/                      Framework-free logic
    ├── google/               Identity Services wrapper, user profile, Sheets API client
    ├── people/               Person type, sheet parsing, net worth tiers (with unit tests)
    ├── layouts/              Table (periodic shape), sphere, double helix and grid positions (with unit tests)
    ├── motion/               Damped pendulum for the login page's hanging pass (with unit tests)
    └── scene/                three.js scene class and tile DOM builder
```

The logic in `src/lib` does not depend on React, so it is unit-tested directly. React components only hold state and render UI. three.js is loaded with a dynamic `import()` after sign-in, which keeps it out of the login page bundle and off the server.

### Login page

The login page has its own look, separate from the 3D view: a front desk where a visitor pass hangs from a lanyard and carries the sign-in button.

- **The pass** (`VisitorPass`) swings in from the left on load, across to the right, and settles into a small swing around the centre. It keeps swinging until the pointer (or keyboard focus) rests on it, so the button holds still to be clicked, and starts again once the pointer leaves. It can be dragged by the card and sways as the page scrolls. The swing is a damped pendulum (`src/lib/motion/pendulum.ts`) stepped on GSAP's ticker.
- **The pass states facts about sign-in:** name and photo come from the Google account, access is view only, and it is valid for this tab only. The steps under the headline explain each one, and GSAP ScrollTrigger highlights the matching field on the pass as each step scrolls into view.
- **Headline:** "Visitors, please sign in." revealed letter by letter with React Bits' SplitText.
- **Scrolling** is smoothed by Lenis, driven from GSAP's ticker so ScrollTrigger and Lenis update on the same frame.
- **Cursor** (`CustomCursor`): a dot and a trailing ring. The ring outlines buttons and says "Drag" over the pass. Mouse and pen only; touch screens keep the default.
- **Type and colour:** Big Shoulders for signage and the pass, Instrument Sans for text (both via `next/font`), on navy with a safety-orange lanyard.

On narrow screens the pass comes first, then the copy and steps, then a second sign-in button at the end.

### Libraries

| Library | Used for |
| --- | --- |
| `three` + `@tweenjs/tween.js` | 3D view: CSS3DRenderer, TrackballControls, layout transitions |
| `gsap` + `@gsap/react` | Login page: pendulum ticker, ScrollTrigger, cursor, SplitText |
| `lenis` | Smooth scrolling on the login page |
| React Bits `SplitText` | Headline reveal. Copied in from the `@react-bits/SplitText-JS-CSS` registry item rather than through the shadcn CLI, because the project has no `components.json` or Tailwind. `SplitText.d.ts` types its props, since TypeScript would otherwise treat every prop without a default as required. |

## Decisions and assumptions

- **Net worth boundaries.** The brief does not say where exactly $100,000 and $200,000 fall. Both are treated as orange: `< 100,000` red, `100,000 – 200,000` orange, `> 200,000` green.
- **Table shape.** The brief asks for a 20 × 10 table; this project deliberately gives the table the chemistry periodic table's shape instead. 200 people do not map onto 118 elements, so it keeps the shape rather than the element positions: the first row holds only its two ends (where H and He sit), the next three rows only the s-block (2 columns) and p-block (6), then full rows, and a two-row f-block set apart below. The d-block is widened from 10 to 16 columns so that 2 + 3 × 8 + 6 × 24 + 2 × 15 = 200. Tiles fill in sheet order, row by row, with the f-block last. Cells are slightly tighter than elsewhere so all 12½ rows fit the default view; on screens narrower than about 3:2 the sides are cropped until you zoom out.
- **Double helix.** Even rows go to strand A and odd rows to strand B, 180° apart, so each pair faces each other across the helix. Spacing is chosen so no tiles overlap (see the comment in `layouts.ts`).
- **Grid axes.** 5 columns (x) × 4 rows (y) per layer, 10 layers in depth (z). The first layer is nearest the camera. Rotate with the mouse to get the angled view in Image C.
- **Layouts follow the data.** Sizes are computed from the number of people, not hard-coded to 200. More rows add table rows, grid layers and helix turns.
- **Columns are matched by name.** Header spacing and case do not matter (the original CSV has `" Net Worth "`), and reordering columns does not break the app.
- **Session.** The access token is kept in memory only, never in localStorage. Reloading the page asks the user to sign in again. Sign out revokes the grant with Google.
- **Safe rendering.** Sheet values are written with `textContent`, never `innerHTML`, and only `http(s)` photo URLs are used. A broken photo falls back to the person's initials.
- **Reduced motion.** When the system asks for reduced motion, layout changes jump instantly, the login pass hangs still, the headline appears without animation, scrolling is native (no Lenis), and the cursor ring follows without a trail.

## Setup

### 1. Google Sheet

Import `Data Template.csv` into a Google Sheet and share it with lisa@kasatria.com as Viewer. Keep general access Restricted.

### 2. Google Cloud project

1. Enable **Google Sheets API**.
2. **Google Auth Platform → Branding:** app name, support email, audience **External**.
3. **Audience:** keep **Testing** and add test users (lisa@kasatria.com and your own account).
4. **Data Access:** add `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `.../auth/spreadsheets.readonly`.
5. **Clients:** create a **Web application** client. Add `http://localhost:3000` and your Vercel URL to **Authorized JavaScript origins**. No redirect URI is needed. No API key or client secret is used.

### 3. Google "G" logo

The sign-in button shows the standard colour G from `public/google-g-logo.svg`, which is included. For production you can swap in the file from Google's own sign-in assets ([Sign in with Google branding guidelines](https://developers.google.com/identity/branding-guidelines)) under the same name. If the file is missing, the button shows an empty space where the G should be. The button itself follows Google's light theme.

### 4. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Required | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | `1234-abc.apps.googleusercontent.com` |
| `NEXT_PUBLIC_SPREADSHEET_ID` | Yes | The part of the sheet URL between `/d/` and `/edit` |
| `NEXT_PUBLIC_SHEET_RANGE` | No | `'Data Template'!A:F` (default). Use `Data!A:F` if the tab is named `Data`. |

These values are public by design: a client ID and a sheet ID grant nothing without a signed-in user who has access.

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
| `npm test` | Unit tests (Vitest): sheet parsing, net worth tiers, layout geometry, login pass pendulum |

## Deploy to Vercel

1. Push the project to GitHub and import it in Vercel. The Next.js preset is detected automatically.
2. Add the environment variables above under **Settings → Environment Variables**. On Vercel, enter the range without the surrounding double quotes: `'Data Template'!A:F`.
3. Deploy, then add the production URL (for example `https://kasatria-people-table.vercel.app`) to **Authorized JavaScript origins** in the Google Cloud client.
4. Test on the production URL. Preview deployments get different URLs that are not registered with Google, so sign-in fails there.

`NEXT_PUBLIC_*` values are inlined at build time, so redeploy after changing them.

## Troubleshooting

| What you see | Cause and fix |
| --- | --- |
| `Error 400: origin_mismatch` | The page's origin is not in Authorized JavaScript origins. Add it exactly (protocol, domain, port, no trailing slash) and wait a few minutes. |
| `Access blocked: app has not completed the Google verification process` | The account is not a test user. Add it under Audience → Test users. |
| `Google hasn't verified this app` | Expected for an unverified app with a Sheets scope. Select Continue. |
| "This Google account cannot open the spreadsheet" | The sheet is not shared with that account. |
| "The sheet range … could not be read" | The tab name in `NEXT_PUBLIC_SHEET_RANGE` does not match the sheet. |
| Sign-in window does not open | The browser blocked the pop-up. Allow pop-ups for the site. |
| `unable to verify the first certificate` or `UNABLE_TO_VERIFY_LEAF_SIGNATURE` from `npx shadcn …`, or fonts failing to download in `next dev` / `next build` | The network inspects HTTPS traffic with its own certificate, which the operating system trusts but Node does not. Run the command with `NODE_OPTIONS=--use-system-ca` so Node uses the system's certificates. |
