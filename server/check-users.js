// Quick diagnostic: print all users and their roles from the DB
const { getDb } = require('./db');

(async () => {
  const db = await getDb();
  const r = db.exec('SELECT id, username, display_name, role, active FROM users ORDER BY id');
  if (!r.length || !r[0].values.length) {
    console.log('No users in DB.');
    process.exit(0);
  }
  console.log('Users in DB:');
  console.log('ID | username | display_name | role | active');
  console.log('---+----------+--------------+------+-------');
  r[0].values.forEach(row => {
    console.log(row.join(' | '));
  });
})();
