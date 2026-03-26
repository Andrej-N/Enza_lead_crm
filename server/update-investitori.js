const XLSX = require('xlsx');
const path = require('path');
const { getDb, saveDb } = require('./db');

const FILE = path.resolve('c:/Users/Pc/Downloads/investitori_AZURIRANA_LISTA.xlsx');

const sizeMap = {
  'VELIKI': 'veliki',
  'SREDNJI': 'srednji',
  'MALI': 'mali',
};

function clean(v) {
  if (v === undefined || v === null || v === '' || v === 'n/a' || v === 'N/A' || v === '-' || v === 'kontakt forma' || v === 'kontakt forma na k8.rs' || v === 'n/a (tražiti na CW)') return null;
  return String(v).trim();
}

function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, ' ').replace(/d\.o\.o\.?/g, '').replace(/[^a-z0-9\s]/g, '').trim();
}

async function main() {
  console.log('Loading updated investitori list...');
  const db = await getDb();
  const wb = XLSX.readFile(FILE);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Investitori']);

  // Get existing investitor leads
  const existing = db.exec("SELECT id, name FROM leads WHERE category = 'investitor'");
  const existingMap = new Map();
  if (existing.length) {
    existing[0].values.forEach(([id, name]) => {
      existingMap.set(normalizeName(name), id);
    });
  }
  console.log(`Existing investitori in DB: ${existingMap.size}`);

  let updated = 0, added = 0, skipped = 0;

  for (const r of rows) {
    const name = clean(r['Firma']);
    if (!name) continue;

    const size = sizeMap[r['Kategorija']] || 'mali';
    const city = clean(r['Grad']);
    const phone1Raw = clean(r['Telefon']);
    const email = clean(r['Email']);
    const contact = clean(r['Direktor/Kontakt']);
    const address = clean(r['Adresa']);
    const website = clean(r['Websajt']);
    const projects = clean(r['Projekti/Napomena']);

    // Split multiple phones
    let phone1 = null, phone2 = null;
    if (phone1Raw) {
      const phones = phone1Raw.split(/\s*\/\s*/);
      phone1 = phones[0] || null;
      phone2 = phones[1] || null;
    }

    // Split multiple emails
    let email1 = null, email2 = null;
    if (email) {
      const emails = email.split(/\s*\/\s*/);
      email1 = emails[0] || null;
      email2 = emails[1] || null;
    }

    // Try to match existing lead
    const normalizedName = normalizeName(name);
    let matchId = existingMap.get(normalizedName);

    // Try partial match if exact didn't work
    if (!matchId) {
      for (const [existName, existId] of existingMap) {
        if (normalizedName.includes(existName) || existName.includes(normalizedName)) {
          matchId = existId;
          break;
        }
      }
    }

    if (matchId) {
      // Update existing lead
      db.run(`UPDATE leads SET
        name = ?, investor_size = ?, subcategory = ?, city = ?,
        phone1 = COALESCE(?, phone1), phone2 = COALESCE(?, phone2),
        email = COALESCE(?, email), email2 = COALESCE(?, email2),
        contact_person = COALESCE(?, contact_person),
        address = COALESCE(?, address),
        website = COALESCE(?, website),
        project_name = COALESCE(?, project_name),
        updated_at = datetime('now')
        WHERE id = ?`, [
        name, size, size, city,
        phone1, phone2,
        email1, email2,
        contact, address, website, projects,
        matchId
      ]);
      console.log(`  UPDATED [${matchId}]: ${name}`);
      updated++;
    } else {
      // Insert new lead
      db.run(`INSERT INTO leads (category, subcategory, investor_size, name, city, address,
        phone1, phone2, email, email2, contact_person, website, project_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        'investitor', size, size, name, city, address,
        phone1, phone2, email1, email2, contact, website, projects
      ]);
      console.log(`  ADDED: ${name} (${size})`);
      added++;
    }
  }

  saveDb();
  const total = db.exec("SELECT COUNT(*) FROM leads WHERE category = 'investitor'")[0].values[0][0];
  console.log(`\nDone! Updated: ${updated}, Added: ${added}`);
  console.log(`Total investitori in DB: ${total}`);
}

main().catch(console.error);
