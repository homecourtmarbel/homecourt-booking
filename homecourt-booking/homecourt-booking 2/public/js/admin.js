function formatHour(h) {
  const period = h >= 12 ? "PM" : "AM";
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return `${hr} ${period}`;
}

function getKey() {
  return document.getElementById("key-input").value.trim();
}

async function loadBookings() {
  const key = getKey();
  const listEl = document.getElementById("admin-list");
  if (!key) {
    listEl.innerHTML = '<p style="color: var(--muted);">Enter the admin key.</p>';
    return;
  }
  localStorage.setItem("cb_admin_key", key);

  const cfgRes = await fetch("/api/config");
  const cfg = await cfgRes.json();

  const res = await fetch(`/api/admin/bookings?key=${encodeURIComponent(key)}`);
  if (res.status === 401) {
    listEl.innerHTML = '<p style="color: var(--danger);">Wrong admin key.</p>';
    return;
  }
  const { bookings } = await res.json();

  if (!bookings.length) {
    listEl.innerHTML = '<p style="color: var(--muted);">No bookings yet.</p>';
    return;
  }

  listEl.innerHTML = bookings
    .map((b) => {
      const statusLabel = b.verified
        ? '<span style="color: var(--accent); font-weight:600;">Verified</span>'
        : '<span style="color: var(--danger); font-weight:600;">Pending review</span>';
      return `
      <div class="booking-row" data-id="${b.id}" style="align-items:flex-start;">
        <div style="display:flex; gap:14px;">
          ${b.receiptPath ? `<a href="${b.receiptPath}" target="_blank"><img src="${b.receiptPath}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid var(--border);" /></a>` : ""}
          <div>
            <div><b>${b.courtName}</b> · ${statusLabel}</div>
            <div class="meta">${b.date} · ${formatHour(b.hour)}–${formatHour(b.hour + 1)} · ${cfg.pricing.currencySymbol}${b.price}</div>
            <div class="meta">${b.customerName} · ${b.customerPhone}</div>
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="cancel-btn verify-btn" data-id="${b.id}" style="border-color: var(--accent); color: var(--accent);">${b.verified ? "Unverify" : "Mark verified"}</button>
          <button class="cancel-btn delete-btn" data-id="${b.id}">Delete</button>
        </div>
      </div>`;
    })
    .join("");

  listEl.querySelectorAll(".verify-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await fetch(`/api/admin/bookings/${btn.dataset.id}/verify?key=${encodeURIComponent(getKey())}`, {
        method: "PATCH"
      });
      loadBookings();
    });
  });
  listEl.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this booking?")) return;
      await fetch(`/api/admin/bookings/${btn.dataset.id}?key=${encodeURIComponent(getKey())}`, {
        method: "DELETE"
      });
      loadBookings();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("cb_admin_key");
  if (saved) document.getElementById("key-input").value = saved;
  document.getElementById("load-btn").addEventListener("click", loadBookings);
  fetch("/api/config").then((r) => r.json()).then((cfg) => {
    document.getElementById("facility-name").textContent = cfg.facilityName;
  });
  if (saved) loadBookings();
});
