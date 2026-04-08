const bcrypt = require('bcryptjs');
const { getDb, saveDb } = require('./db');

async function main() {
  const db = await getDb();

  const users = [
    { username: 'admin', password: process.env.ADMIN_PASSWORD },
    { username: 'enza', password: process.env.ENZA_PASSWORD },
  ];

  for (const u of users) {
    if (!u.password) {
      console.log(`Skipping '${u.username}' — env var not set.`);
      continue;
    }

    const existing = db.exec('SELECT id FROM users WHERE username = ?', [u.username]);
    if (!existing.length || !existing[0].values.length) {
      console.log(`User '${u.username}' does not exist, skipping. Run seed-users.js first.`);
      continue;
    }

    const hash = bcrypt.hashSync(u.password, 10);
    db.run('UPDATE users SET password_hash = ? WHERE username = ?', [hash, u.username]);
    console.log(`Password reset for user: ${u.username}`);
  }

  saveDb();
  console.log('Done.');
}

main().catch(console.error);
