# Court Booking

A free, self-hostable clone of an hourly court-booking site (like the pickleball
booking page this was modeled on). Pick a date, tap open time slots, book them,
manage your bookings — with real signup/login.

No paid services required to run it.

## What's inside

- **Express** server (`server.js`) — serves the site and a small JSON API.
- **Plain HTML/CSS/JS frontend** (`public/`) — no build step, no framework lock-in.
- **JSON-file database** (`data/db.json`) — zero setup, good for a single small
  facility or a demo. See "Scaling up" below for when to outgrow it.
- **config.js** — every piece of branding (name, location, courts, hours,
  pricing, amenities) lives here. Edit this one file to make it *your* court.

## Run it locally

```bash
cd courtbook
npm install
npm start
```

Then open http://localhost:3000

## Make it your own court

Open `config.js` and edit:

- `facilityName`, `tagline`, `location`, `sport`
- `courts` — add/remove/rename courts (each needs a unique `id`)
- `openHour` / `closeHour` — operating hours
- `pricing` — off-peak rate, peak rate, and what hour peak starts
- `amenities`, `address`

Nothing else needs to change — the homepage, courts page, and API all read
from this file.

## How booking works

- `GET /api/availability?date=YYYY-MM-DD` computes open/booked status for
  every court × hour slot on that date by checking `data/db.json`.
- `POST /api/bookings` creates a booking if the slot is still free (returns
  409 if someone else just took it).
- Signup/login use `bcryptjs` for password hashing and a signed session
  cookie (`express-session`) — no third-party auth provider needed.

## Deploying for free

This app has no paid dependencies, so you can host it for $0:

- **Render.com (free web service)** — connect your GitHub repo, set build
  command `npm install`, start command `npm start`. Free tier services spin
  down when idle and wake on the next request (a few seconds delay).
- **Railway / Fly.io** — both have free/trial tiers that work well for a
  small Node app.
- **Your own always-on machine** — a Raspberry Pi or old laptop running
  `npm start` behind something like Cloudflare Tunnel (free) also works.

**Important caveat:** most free hosting tiers use an *ephemeral filesystem* —
meaning `data/db.json` can be wiped on redeploys or restarts. That's fine for
a demo, but if you're taking real bookings you have two good options:

1. Use a host with a persistent volume/disk (Render's paid disks, Railway
   volumes, a VPS with real storage), or
2. Swap `data/store.js` for a free-tier hosted database (Supabase or Neon
   both have free Postgres tiers) — the rest of the app doesn't need to
   change, just the two functions in `store.js` (`readDB`/`writeDB`).

## Known limitations (by design, to keep this simple/free)

- No payment processing — bookings are confirmed instantly without payment.
  Wire in Stripe/PayPal/PayMongo checkout in `POST /api/bookings` if you
  need to collect money.
- No admin dashboard for the court owner (view/cancel any booking, block
  out maintenance times, etc.) — everything is currently self-serve.
- Sessions are stored in memory, so logins reset if the server restarts.
  Fine for small scale; swap in `connect-redis` or similar if you need
  logins to survive restarts on a multi-instance deployment.

## Project structure

```
courtbook/
  config.js            <- edit this to rebrand for your court
  server.js             API + static file server
  data/
    store.js            tiny JSON read/write helpers
    db.json              the "database" (bookings + users)
  public/
    index.html           booking calendar page
    courts.html           facility info page
    login.html / signup.html
    bookings.html          "my bookings" page
    css/style.css
    js/calendar.js         booking calendar logic
    js/auth.js              nav/login state + form handling
    js/bookings.js          "my bookings" page logic
```
