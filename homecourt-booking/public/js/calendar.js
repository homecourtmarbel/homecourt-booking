let CONFIG = null;
let currentDate = null;
let currentSlots = [];
const selected = new Set(); // keys: `${hour}-${courtId}`

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHour(h) {
  const period = h >= 12 ? "PM" : "AM";
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return `${hr} ${period}`;
}

async function loadConfig() {
  const res = await fetch("/api/config");
  CONFIG = await res.json();

  const nameEl = document.getElementById("facility-name");
  const locEl = document.getElementById("facility-location");
  const rateEl = document.getElementById("from-rate");
  const taglineEl = document.getElementById("facility-tagline");
  if (nameEl) nameEl.textContent = CONFIG.facilityName;
  if (locEl) locEl.textContent = CONFIG.location;
  if (taglineEl) taglineEl.textContent = CONFIG.tagline;
  if (rateEl) {
    rateEl.textContent = `From ${CONFIG.pricing.currencySymbol}${CONFIG.pricing.offPeakRate}/hr · ${CONFIG.courts.length} courts`;
  }

  renderDateScroller();
  renderAmenities();
}

function renderAmenities() {
  const el = document.getElementById("amenities");
  if (!el || !CONFIG.amenities) return;
  el.innerHTML = CONFIG.amenities
    .map((a) => `<div class="info-item">${a}</div>`)
    .join("");
}

function renderDateScroller() {
  const container = document.getElementById("date-scroller");
  if (!container) return;
  container.innerHTML = "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < CONFIG.daysAheadBookable; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = toDateStr(d);
    const btn = document.createElement("button");
    btn.className = "date-btn";
    btn.dataset.date = dateStr;
    btn.innerHTML = `
      <span class="dow">${d.toLocaleDateString(undefined, { weekday: "short" })}</span>
      <span class="dom">${d.getDate()}</span>
      <span class="mon">${d.toLocaleDateString(undefined, { month: "short" })}</span>`;
    btn.addEventListener("click", () => selectDate(dateStr));
    container.appendChild(btn);
  }
  selectDate(toDateStr(today));
}

async function selectDate(dateStr) {
  currentDate = dateStr;
  selected.clear();
  document.querySelectorAll(".date-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.date === dateStr);
  });
  const res = await fetch(`/api/availability?date=${dateStr}`);
  const data = await res.json();
  currentSlots = data.slots;
  renderGrid();
}

function renderGrid() {
  const table = document.getElementById("slot-grid");
  if (!table) return;
  const courts = CONFIG.courts;
  const hours = [...new Set(currentSlots.map((s) => s.hour))].sort((a, b) => a - b);

  let html =
    "<thead><tr><th>Time</th>" +
    courts.map((c) => `<th>${c.name}</th>`).join("") +
    "</tr></thead><tbody>";

  for (const hour of hours) {
    html += `<tr><td class="time-col">${formatHour(hour)} – ${formatHour(hour + 1)}</td>`;
    for (const court of courts) {
      const slot = currentSlots.find((s) => s.hour === hour && s.courtId === court.id);
      const key = `${hour}-${court.id}`;
      const isSelected = selected.has(key);
      let cls = "slot open";
      let label = `Open · ${CONFIG.pricing.currencySymbol}${slot.price}`;
      if (slot.status === "booked") {
        cls = "slot booked";
        label = "Booked";
      } else if (isSelected) {
        cls = "slot selected";
        label = "Selected";
      }
      html += `<td><button class="${cls}" data-hour="${hour}" data-court="${court.id}" ${
        slot.status === "booked" ? "disabled" : ""
      }>${label}</button></td>`;
    }
    html += "</tr>";
  }
  html += "</tbody>";
  table.innerHTML = html;

  table.querySelectorAll(".slot.open, .slot.selected").forEach((btn) => {
    btn.addEventListener("click", () => toggleSlot(btn.dataset.hour, btn.dataset.court));
  });
  updateSummary();
}

function toggleSlot(hour, courtId) {
  const key = `${hour}-${courtId}`;
  if (selected.has(key)) selected.delete(key);
  else selected.add(key);
  renderGrid();
}

function updateSummary() {
  const summaryEl = document.getElementById("summary");
  const bookBtn = document.getElementById("book-btn");
  if (!summaryEl || !bookBtn) return;
  let total = 0;
  for (const key of selected) {
    const [hour, courtId] = key.split("-");
    const slot = currentSlots.find((s) => String(s.hour) === hour && s.courtId === courtId);
    if (slot) total += slot.price;
  }
  summaryEl.textContent = selected.size
    ? `${selected.size} slot(s) selected · ${CONFIG.pricing.currencySymbol}${total} total`
    : "Tap open slots to select them";
  bookBtn.disabled = selected.size === 0;
}

async function bookSelected() {
  const me = await fetch("/api/auth/me").then((r) => r.json());
  if (!me.user) {
    window.location.href = "/login.html";
    return;
  }
  const btn = document.getElementById("book-btn");
  btn.disabled = true;
  btn.textContent = "Booking...";

  const keys = [...selected];
  let okCount = 0;
  let failCount = 0;
  for (const key of keys) {
    const [hour, courtId] = key.split("-");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: currentDate, hour: Number(hour), courtId })
    });
    if (res.ok) okCount++;
    else failCount++;
  }

  selected.clear();
  await selectDate(currentDate);
  btn.textContent = "Book selected slots";
  document.getElementById("summary").textContent = failCount
    ? `Booked ${okCount}, ${failCount} were already taken — availability refreshed`
    : `Booked ${okCount} slot(s)! See "My bookings" in the top nav.`;
}

document.addEventListener("DOMContentLoaded", () => {
  loadConfig();
  const bookBtn = document.getElementById("book-btn");
  if (bookBtn) bookBtn.addEventListener("click", bookSelected);
});
