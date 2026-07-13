const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const config = require("./config");
const { readDB, writeDB } = require("./data/store");

const app = express();

// Admin key protects the receipt-review page. Set this as a real
// environment variable in your host's dashboard (Render: Settings
// > Environment) - never commit a real secret into config.js
// since this repo is public.
const ADMIN_KEY = process.env.ADMIN_KEY || "changeme-admin-key";

const UPLOAD_DIR = path.join(__dirname, "uploads", "receipts");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").slice(0, 10);
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Receipt must be an image file"));
    }
    cb(null, true);
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

function priceForHour(hour) {
  return hour >= config.pricing.peakStartHour
    ? config.pricing.peakRate
    : config.pricing.offPeakRate;
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
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
    mapsQuery: config.mapsQuery,
    payment: config.payment
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

// ---- Bookings (guest checkout, one shared receipt per batch) ----
// multipart/form-data fields: customerName, customerPhone,
// slots (JSON string: [{date,hour,courtId}, ...]), file field "receipt"
app.post("/api/bookings", upload.single("receipt"), (req, res) => {
  const cleanupUploadedFile = () => {
    if (req.file) fs.unlink(req.file.path, () => {});
  };

  const { customerName, customerPhone } = req.body || {};
  if (!customerName || !customerPhone) {
    cleanupUploadedFile();
    return res.status(400).json({ error: "customerName and customerPhone are required" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "A payment receipt image is required" });
  }

  let slots;
  try {
    slots = JSON.parse(req.body.slots || "[]");
  } catch (e) {
    cleanupUploadedFile();
    return res.status(400).json({ error: "slots must be valid JSON" });
  }
  if (!Array.isArray(slots) || slots.length === 0) {
    cleanupUploadedFile();
    return res.status(400).json({ error: "At least one slot is required" });
  }

  // Validate every requested slot before creating anything.
  for (const s of slots) {
    if (!s.date || s.hour === undefined || s.hour === null || !s.courtId) {
      cleanupUploadedFile();
      return res.status(400).json({ error: "Each slot needs date, hour, courtId" });
    }
    const court = config.courts.find((c) => c.id === s.courtId);
    if (!court) {
      cleanupUploadedFile();
      return res.status(400).json({ error: `Invalid courtId: ${s.courtId}` });
    }
    if (s.hour < config.openHour || s.hour >= config.closeHour) {
      cleanupUploadedFile();
      return res.status(400).json({ error: "Hour outside operating hours" });
    }
  }

  const db = readDB();

  // Check all requested slots for conflicts first (atomic-ish - all or nothing).
  const conflicts = slots.filter((s) =>
    db.bookings.some((b) => b.date === s.date && b.hour === s.hour && b.courtId === s.courtId)
  );
  if (conflicts.length > 0) {
    cleanupUploadedFile();
    return res.status(409).json({
      error: "One or more of those slots were just booked by someone else",
      conflicts
    });
  }

  const receiptPath = `/uploads/receipts/${req.file.filename}`;
  const groupId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const newBookings = slots.map((s) => {
    const court = config.courts.find((c) => c.id === s.courtId);
    return {
      id: crypto.randomUUID(),
      groupId,
      customerName,
      customerPhone: normalizePhone(customerPhone),
      date: s.date,
      hour: s.hour,
      courtId: s.courtId,
      courtName: court.name,
      price: priceForHour(s.hour),
      receiptPath,
      verified: false,
      createdAt
    };
  });

  db.bookings.push(...newBookings);
  writeDB(db);
  res.status(201).json({ bookings: newBookings });
});

// Look up bookings by phone number - no login required.
app.get("/api/bookings/lookup", (req, res) => {
  const phone = normalizePhone(req.query.phone);
  if (!phone) return res.status(400).json({ error: "phone query param is required" });
  const db = readDB();
  const bookings = db.bookings
    .filter((b) => b.customerPhone === phone)
    .sort((a, b) => (a.date + String(a.hour).padStart(2, "0")).localeCompare(
      b.date + String(b.hour).padStart(2, "0")
    ));
  res.json({ bookings });
});

// Cancel a booking - must provide the matching phone number as proof.
app.delete("/api/bookings/:id", (req, res) => {
  const phone = normalizePhone(req.query.phone || (req.body || {}).phone);
  if (!phone) return res.status(400).json({ error: "phone is required to cancel" });
  const db = readDB();
  const idx = db.bookings.findIndex(
    (b) => b.id === req.params.id && b.customerPhone === phone
  );
  if (idx === -1) return res.status(404).json({ error: "Booking not found for that phone number" });
  db.bookings.splice(idx, 1);
  writeDB(db);
  res.json({ ok: true });
});

// ---- Owner-only: review receipts, mark verified ----
function requireAdminKey(req, res, next) {
  const key = req.query.key || req.headers["x-admin-key"];
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Invalid or missing admin key" });
  }
  next();
}

app.get("/api/admin/bookings", requireAdminKey, (req, res) => {
  const db = readDB();
  const bookings = [...db.bookings].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  res.json({ bookings });
});

app.patch("/api/admin/bookings/:id/verify", requireAdminKey, (req, res) => {
  const db = readDB();
  const booking = db.bookings.find((b) => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  booking.verified = !booking.verified;
  writeDB(db);
  res.json({ booking });
});

app.delete("/api/admin/bookings/:id", requireAdminKey, (req, res) => {
  const db = readDB();
  const idx = db.bookings.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Booking not found" });
  db.bookings.splice(idx, 1);
  writeDB(db);
  res.json({ ok: true });
});

// Multer errors (bad file type, too large, etc.) land here.
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || "Upload error" });
  }
  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`${config.facilityName} booking server running on http://localhost:${PORT}`);
});
