const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'enza_leads.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  initSchema(db);
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function initSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      -- Kategorija: hotel, klinika, investitor, prodavac
      category TEXT NOT NULL,
      -- Podkategorija zavisi od kategorije
      subcategory TEXT,

      -- Osnovni podaci
      name TEXT NOT NULL,
      city TEXT,
      address TEXT,
      website TEXT,

      -- Kontakt info (editabilno)
      phone1 TEXT,
      phone2 TEXT,
      email TEXT,
      email2 TEXT,
      contact_person TEXT,

      -- Hotel-specifično
      stars TEXT,
      num_rooms TEXT,
      google_rating TEXT,
      email_status TEXT,

      -- Klinika-specifično
      clinic_type TEXT,
      has_stationary INTEGER DEFAULT 0,
      has_surgery INTEGER DEFAULT 0,
      has_maternity INTEGER DEFAULT 0,
      has_palliative INTEGER DEFAULT 0,
      num_beds TEXT,
      relevance TEXT,

      -- Investitor-specifično
      project_name TEXT,
      area_sqm TEXT,
      num_apartments TEXT,
      construction_phase TEXT,
      investor_size TEXT,
      investment_eur TEXT,
      opening_date TEXT,

      -- Lead tracking
      outreach_status TEXT DEFAULT 'not_contacted',
      -- not_contacted, called, meeting_scheduled, negotiation, deal_closed, not_interested
      call_date TEXT,
      meeting_date TEXT,
      meeting_notes TEXT,

      -- Verifikacija kontakta
      phone_verified INTEGER DEFAULT 0,
      email_verified INTEGER DEFAULT 0,

      -- Opšte
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migration: add verification fields (for existing databases)
  try { db.run("ALTER TABLE leads ADD COLUMN phone_verified INTEGER DEFAULT 0"); } catch (e) {}
  try { db.run("ALTER TABLE leads ADD COLUMN email_verified INTEGER DEFAULT 0"); } catch (e) {}

  // Migration: add deal fields
  try { db.run("ALTER TABLE leads ADD COLUMN deal_value TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE leads ADD COLUMN deal_description TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE leads ADD COLUMN deal_date TEXT"); } catch (e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      action_type TEXT DEFAULT 'system',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    )
  `);

  // Migration: add action_type if missing
  try { db.run("ALTER TABLE activity_log ADD COLUMN action_type TEXT DEFAULT 'system'"); } catch (e) {}

  // Migration: add verification fields
  try { db.run("ALTER TABLE leads ADD COLUMN phone_verified INTEGER DEFAULT 0"); } catch (e) {}
  try { db.run("ALTER TABLE leads ADD COLUMN email_verified INTEGER DEFAULT 0"); } catch (e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Walk-in retail customers (B2C) — separate from leads (B2B pipeline)
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      city TEXT,
      address TEXT,
      purchase_date TEXT,
      products TEXT,
      purchase_value TEXT,
      notes TEXT,
      marketing_consent INTEGER DEFAULT 0,
      consent_date TEXT,
      source TEXT DEFAULT 'store',
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  saveDb();
}

module.exports = { getDb, saveDb };
