const bcrypt = require('bcryptjs');
const { getDb, saveDb } = require('./db');

async function main() {
  const db = await getDb();

  const users = [
    { username: 'admin', password: process.env.ADMIN_PASSWORD || 'changeme', display_name: 'Admin' },
    { username: 'enza', password: process.env.ENZA_PASSWORD || 'changeme', display_name: 'Enza Home' },
  ];

  for (const u of users) {
    const existing = db.exec('SELECT id FROM users WHERE username = ?', [u.username]);
    if (existing.length && existing[0].values.length) {
      console.log(`User '${u.username}' already exists, skipping.`);
      continue;
    }
    const hash = bcrypt.hashSync(u.password, 10);
    db.run('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)', [
      u.username, hash, u.display_name
    ]);
    console.log(`Created user: ${u.username}`);
  }

  saveDb();
  console.log('Done.');
}

main().catch(console.error);
