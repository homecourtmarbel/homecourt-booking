let CFG = null;

function formatHour(h) {
  const period = h >= 12 ? "PM" : "AM";
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return `${hr} ${period}`;
}

async function lookupBookings() {
  const phoneInput = document.getElementById("phone-input");
  const listEl = document.getElementById("bookings-list");
  const phone = phoneInput.value.trim();
  if (!phone) {
    listEl.innerHTML = '<p style="color: var(--muted);">Enter the phone number you used when booking.</p>';
    return;
  }

  if (!CFG) {
    const cfgRes = await fetch("/api/config");
    CFG = await cfgRes.json();
  }

  const res = await fetch(`/api/bookings/lookup?phone=${encodeURIComponent(phone)}`);
  const { bookings } = await res.json();

  if (!bookings || !bookings.length) {
    listEl.innerHTML = '<p style="color: var(--muted);">No bookings found for that number.</p>';
    return;
  }

  listEl.innerHTML = bookings
    .map((b) => {
      const statusLabel = b.verified
        ? '<span style="color: var(--accent);">Payment verified</span>'
        : '<span style="color: var(--muted);">Payment pending review</span>';
      return `
      <div class="booking-row" data-id="${b.id}">
        <div>
          <div><b>${b.courtName}</b></div>
          <div class="meta">${b.date} · ${formatHour(b.hour)}–${formatHour(b.hour + 1)} · ${CFG.pricing.currencySymbol}${b.price} · ${b.customerName}</div>
          <div class="meta">${statusLabel}</div>
        </div>
        <button class="cancel-btn" data-id="${b.id}">Cancel</button>
      </div>`;
    })
    .join("");

  listEl.querySelectorAll(".cancel-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await fetch(`/api/bookings/${btn.dataset.id}?phone=${encodeURIComponent(phone)}`, {
        method: "DELETE"
      });
      lookupBookings();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("lookup-btn");
  const input = document.getElementById("phone-input");
  if (btn) btn.addEventListener("click", lookupBookings);
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") lookupBookings();
    });
  }
});
