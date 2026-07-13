const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");

const config = require("./config");
const { readDB, writeDB } = require("./data/store");

const app = express();

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }
  })
);
app.use(express.static(path.join(__dirname, "public")));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
  next();
}

function priceForHour(hour) {
  return hour >= config.pricing.peakStartHour
    ? config.pricing.peakRate
    : config.pricing.offPeakRate;
}

// ---- Config (drives the whole frontend) ----
app.get("/api/config", (req, res) => {
  res.json({
    facilityName: config.facilityName,
    tagline: config.tagline,
    location: config.location,
    sport: config.sport,
    courts: config.courts,
    openHour: config.openHour,
    closeHour: config.closeHour,
    daysAheadBookable: config.daysAheadBookable,
    pricing: config.pricing,
    amenities: config.amenities,
    address: config.address,
    mapsQuery: config.mapsQuery
  });
});

// ---- Availability ----
function slotsForDate(date, db) {
  const slots = [];
  for (let hour = config.openHour; hour < config.closeHour; hour++) {
    const price = priceForHour(hour);
    for (const court of config.courts) {
      const booking = db.bookings.find(
        (b) => b.date === date && b.hour === hour && b.courtId === court.id
      );
      slots.push({
        date,
        hour,
        courtId: court.id,
        courtName: court.name,
        price,
        status: booking ? "booked" : "open"
      });
    }
  }
  return slots;
}

app.get("/api/availability", (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date query param required as YYYY-MM-DD" });
  }
  const db = readDB();
  res.json({ date, slots: slotsForDate(date, db) });
});

// ---- Bookings ----
app.post("/api/bookings", requireAuth, (req, res) => {
  const { date, hour, courtId } = req.body || {};
  if (!date || hour === undefined || hour === null || !courtId) {
    return res.status(400).json({ error: "date, hour, courtId are required" });
  }
  const court = config.courts.find((c) => c.id === courtId);
  if (!court) return res.status(400).json({ error: "Invalid courtId" });
  if (hour < config.openHour || hour >= config.closeHour) {
    return res.status(400).json({ error: "Hour outside operating hours" });
  }

  const db = readDB();
  const clash = db.bookings.find(
    (b) => b.date === date && b.hour === hour && b.courtId === courtId
  );
  if (clash) return res.status(409).json({ error: "That slot was just booked by someone else" });

  const booking = {
    id: crypto.randomUUID(),
    userId: req.session.userId,
    date,
    hour,
    courtId,
    courtName: court.name,
    price: priceForHour(hour),
    createdAt: new Date().toISOString()
  };
  db.bookings.push(booking);
  writeDB(db);
  res.status(201).json({ booking });
});

app.get("/api/bookings/me", requireAuth, (req, res) => {
  const db = readDB();
  const bookings = db.bookings
    .filter((b) => b.userId === req.session.userId)
    .sort((a, b) => (a.date + String(a.hour).padStart(2, "0")).localeCompare(
      b.date + String(b.hour).padStart(2, "0")
    ));
  res.json({ bookings });
});

app.delete("/api/bookings/:id", requireAuth, (req, res) => {
  const db = readDB();
  const idx = db.bookings.findIndex(
    (b) => b.id === req.params.id && b.userId === req.session.userId
  );
  if (idx === -1) return res.status(404).json({ error: "Booking not found" });
  db.bookings.splice(idx, 1);
  writeDB(db);
  res.json({ ok: true });
});

// ---- Auth ----
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }
  const db = readDB();
  if (db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: "That email is already registered" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  writeDB(db);
  req.session.userId = user.id;
  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const db = readDB();
  const user = db.users.find((u) => u.email.toLowerCase() === (email || "").toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  const ok = await bcrypt.compare(password || "", user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  req.session.userId = user.id;
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const db = readDB();
  const user = db.users.find((u) => u.id === req.session.userId);
  if (!user) return res.json({ user: null });
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`${config.facilityName} booking server running on http://localhost:${PORT}`);
});
