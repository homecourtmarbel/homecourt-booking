// Tiny JSON-file "database". Zero cost, zero setup - good enough
// for a small facility or a demo. See README.md for notes on
// upgrading to a real database (e.g. SQLite/Postgres) later.
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "db.json");

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    writeDB({ bookings: [], users: [] });
  }
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { bookings: [], users: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };
