# Home Court Booking

A free, self-hostable clone of an hourly court-booking site. Pick a date, tap
open time slots, pay via GCash, attach a receipt, and you're booked — no
customer account needed.

No paid services required to run it.

## What's inside

- **Express** server (`server.js`) — serves the site and a small JSON API.
- **Plain HTML/CSS/JS frontend** (`public/`) — no build step, no framework lock-in.
- **JSON-file database** (`data/db.json`) — zero setup, good for a single small
  facility or a demo.
- **config.js** — every piece of branding (name, location, courts, hours,
  pricing, payment details) lives here.
- **Guest checkout** — customers give their name + phone number when booking.
  No signup, no login, no password to forget.
- **GCash payment + receipt upload** — the booking modal shows your GCash QR
  and account details, and requires a screenshot of the payment before the
  slot is reserved.
- **/admin.html** — a simple, key-protected page for you (the owner) to see
  every booking, view the attached receipt, and mark it verified or delete it.

## Run it locally

```bash
cd courtbook
npm install
ADMIN_KEY=pick-a-real-secret npm start
```

Then open http://localhost:3000 for the booking page, and
http://localhost:3000/admin.html (enter the same key) to review receipts.

## Make it your own court

Open `config.js` and edit:

- `facilityName`, `tagline`, `location`, `sport`
- `courts` — add/remove/rename courts (each needs a unique `id`)
- `openHour` / `closeHour` — operating hours
- `pricing` — off-peak rate, peak rate, and what hour peak starts
- `amenities`, `address`
- `payment.accountName` / `payment.accountNumber` — your real GCash details
- Replace `public/img/payment-qr.svg` with your real GCash QR code image
  (same filename, or update `payment.qrImagePath` in config.js)

**Do not put your admin key in config.js** — the GitHub repo for this project
is public, so anything in code is visible to anyone. Set `ADMIN_KEY` as an
environment variable instead (see Deploying, below).

## How booking works

1. Customer picks slots, enters name + phone (no account).
2. They see your GCash QR + account details and the total due.
3. They upload a screenshot of their payment and submit.
4. The slot is locked in immediately — if two people submit for the same
   slot, the second one is rejected with a clear "already taken" error
   before anything is saved. If someone selects multiple slots at once,
   either all of them are booked or none are (no partial double-booking).
5. You (the owner) open `/admin.html`, enter your admin key, and see every
   booking with its receipt image. Click "Mark verified" once you've
   confirmed the payment actually came through, or "Delete" to remove a
   no-show / fake receipt and free up the slot again.
6. Customers can check "My bookings" any time by typing the same phone
   number back in — no password needed. They can also cancel their own
   booking there.

## Deploying for free

This app has no paid dependencies, so you can host it for $0 on Render.com's
free web service tier (see the walkthrough you already did). Two things to
set on the host once it's live:

1. **Environment variable `ADMIN_KEY`** — set this in Render under
   Settings → Environment to a real secret only you know. Use that same
   value to log into `/admin.html`.
2. Redeploy after editing `config.js` / `public/img/payment-qr.svg` with
   your real GCash info by pushing the updated files to your GitHub repo —
   Render redeploys automatically on new commits.

**Important caveats of free hosting:**

- Free tiers use an *ephemeral filesystem* — `data/db.json` (bookings) and
  everything in `uploads/receipts/` (payment screenshots) can be **wiped on
  redeploys or restarts**. Fine for getting started, but for real ongoing
  use you should either move to a host with a persistent disk, or swap the
  storage layer for a free-tier hosted database + object storage
  (e.g. Supabase Postgres + Supabase Storage) — ask if you'd like help with
  that upgrade later.
- Free instances also spin down after ~15 minutes idle and take up to a
  minute to wake back up on the next visit.

## Known limitations (by design, to keep this simple/free)

- Payments are verified manually by you, not automatically — this app
  doesn't integrate with GCash's API, it just collects a receipt image for
  you to check.
- `/admin.html` isn't linked anywhere on the public site, but it isn't
  hidden either — anyone who knows (or guesses) the URL can try it; the
  admin key is what actually protects it. Keep the key private and it's
  fine for a small operation.
- No email/SMS confirmations sent automatically.

## Project structure

```
courtbook/
  config.js               <- edit this to rebrand + set your GCash details
  server.js                 API + static file server + receipt uploads
  data/
    store.js                tiny JSON read/write helpers
    db.json                  the "database" (bookings)
  uploads/receipts/          uploaded payment screenshots (gitignored)
  public/
    index.html               booking calendar + payment modal
    courts.html               facility info page
    bookings.html             "my bookings" (phone number lookup)
    admin.html                owner-only receipt review page
    img/payment-qr.svg         placeholder - replace with your real QR
    css/style.css
    js/calendar.js             booking calendar + payment modal logic
    js/bookings.js             "my bookings" page logic
    js/admin.js                admin page logic
```
