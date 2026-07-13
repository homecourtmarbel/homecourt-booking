// ─────────────────────────────────────────────────────────────
// EDIT THIS FILE to turn this into YOUR court's booking site.
// Nothing else in the app needs to change - the whole frontend
// and API read from this config.
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

  address: "Koronadal City (Marbel), South Cotabato, Philippines",
  mapsQuery: "Home Court Koronadal South Cotabato"
};
