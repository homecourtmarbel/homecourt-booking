let CONFIG = null;
let currentDate = null;
let currentSlots = [];
const selected = new Set(); // keys: `${hour}::${courtId}`

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
    rateEl.textContent = `From ${CONFIG.pricing.currencySymbol}${CONFIG.pricing.offPeakRate}/hr · ${CONFIG.courts.length} court(s)`;
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
