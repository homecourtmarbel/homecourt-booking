// ─────────────────────────────────────────────────────────────
// EDIT THIS FILE to turn this into YOUR court's booking site.
// Nothing else in the app needs to change - the whole frontend
// and API read from this config.
//
// Do NOT put secrets (passwords, API keys) in this file if your
// GitHub repo is public - anyone can read it. The admin key for
// reviewing payment receipts is set separately as an environment
// variable (ADMIN_KEY) - see README.md.
// ─────────────────────────────────────────────────────────────
module.exports = {
  facilityName: "Home Court",
  tagline: "Marbel's home for pickleball",
  location: "Koronadal City (Marbel), South Cotabato, Philippines",
  sport: "Pickleball",

  // One row per bookable court. `id` must be unique and stable
  // (don't change it once you have real bookings against it).
  // Home Court currently lists itself as a single-court venue on
  // Picktime - add more rows here if that's not accurate.
  courts: [
    { id: "court-1", name: "Court 1" }
  ],

  // Booking hours are in whole-hour increments, 24h clock.
  // Estimated from Home Court's "Whole Day Reservation" package
  // (1020 min = 17 hrs) on their old Picktime page - adjust to
  // match their real opening hours.
  openHour: 6,
  closeHour: 23,

  // How many days ahead people can book.
  daysAheadBookable: 30,

  // Home Court charges one flat rate per hour (no peak/off-peak
  // split, unlike Prime Pickleball) - confirmed from their
  // Picktime pricing (PHP350 per 60-minute slot at every duration
  // tier, e.g. 120min = PHP700, 240min = PHP1400).
  pricing: {
    currencySymbol: "₱",
    offPeakRate: 350,
    peakRate: 350,
    peakStartHour: 23 // effectively disabled - rate never changes
  },

  amenities: [
    "Parking",
    "Restrooms"
  ],

  address: "Amurao Subdivision, Barangay Santa Cruz, Koronadal City, South Cotabato",
  // Shown alongside the address as helpful landmarks for people
  // who don't know the subdivision by name.
  landmark: "Behind Pryce Gas · beside La Rosa Building (Cebuana Lhuillier) · right side",
  mapsQuery: "Pryce Gas Amurao Subdivision Santa Cruz Koronadal City",

  // ── Payment ──────────────────────────────────────────────
  // Shown to the customer right before they confirm a booking.
  // Replace with your real GCash details. Replace
  // public/img/payment-qr.svg with your real QR code image
  // (keep the same filename, or update qrImagePath below).
  payment: {
    methodName: "GCash",
    // These are masked the same way GCash itself masks them on the
    // sender's confirmation screen - that's expected, not a typo.
    accountName: "MA****A R.",
    accountNumber: "+63 956 770 ••••",
    instructions:
      "Send the exact total via GCash to the details above (transfer fees may apply), then upload a screenshot of your payment confirmation below. Your slot is reserved as soon as you submit - our team verifies the receipt afterward.",
    // Save your real GCash QR screenshot as public/img/payment-qr.png
    // (exact filename) - this path already points there.
    qrImagePath: "/img/payment-qr.png"
  }
};
