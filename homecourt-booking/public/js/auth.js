async function refreshNav() {
  const nav = document.getElementById("auth-nav");
  if (!nav) return;
  const res = await fetch("/api/auth/me");
  const { user } = await res.json();
  if (user) {
    nav.innerHTML =
      '<span class="nav-user">Hi, ' + escapeHtml(user.name) + '</span>' +
      '<a href="/bookings.html" class="nav-link">My bookings</a>' +
      '<button id="logout-btn" class="nav-link" style="background:none;border:none;cursor:pointer;font:inherit;">Log out</button>';
    document.getElementById("logout-btn").addEventListener("click", async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    });
  } else {
    nav.innerHTML =
      '<a href="/login.html" class="nav-link">Sign in</a>' +
      '<a href="/signup.html" class="nav-link btn-link">Sign up</a>';
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function handleAuthForm(formId, url) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("form-error");
    errorEl.textContent = "";
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) {
      errorEl.textContent = body.error || "Something went wrong";
      return;
    }
    window.location.href = "/";
  });
}

document.addEventListener("DOMContentLoaded", refreshNav);
