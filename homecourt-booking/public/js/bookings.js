async function loadMyBookings() {
  const listEl = document.getElementById("bookings-list");
  if (!listEl) return;

  const meRes = await fetch("/api/auth/me");
  const { user } = await meRes.json();
  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  const cfgRes = await fetch("/api/config");
  const cfg = await cfgRes.json();

  const res = await fetch("/api/bookings/me");
  const { bookings } = await res.json();

  if (!bookings.length) {
    listEl.innerHTML = '<p style="color: var(--muted);">No bookings yet. <a href="/" style="color: var(--accent);">Book a court →</a></p>';
    return;
  }

  function formatHour(h) {
    const period = h >= 12 ? "PM" : "AM";
    let hr = h % 12;
    if (hr === 0) hr = 12;
    return `${hr} ${period}`;
  }

  listEl.innerHTML = bookings
    .map(
      (b) => `
      <div class="booking-row" data-id="${b.id}">
        <div>
          <div><b>${b.courtName}</b></div>
          <div class="meta">${b.date} · ${formatHour(b.hour)}–${formatHour(b.hour + 1)} · ${cfg.pricing.currencySymbol}${b.price}</div>
        </div>
        <button class="cancel-btn" data-id="${b.id}">Cancel</button>
      </div>`
    )
    .join("");

  listEl.querySelectorAll(".cancel-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await fetch(`/api/bookings/${btn.dataset.id}`, { method: "DELETE" });
      loadMyBookings();
    });
  });
}

document.addEventListener("DOMContentLoaded", loadMyBookings);
