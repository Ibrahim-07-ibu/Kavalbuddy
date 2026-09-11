const { getDb, runSql, queryOne, queryAll } = require('./db/init');
const bcrypt = require('bcryptjs');

async function seed() {
  const db = await getDb();

  // Clear existing data
  db.run('DELETE FROM settings');
  db.run('DELETE FROM feedback');
  db.run('DELETE FROM alerts');
  db.run('DELETE FROM contacts');
  db.run('DELETE FROM users');

  // Create admin user
  const adminHash = bcrypt.hashSync('admin123', 10);
  const adminResult = runSql(
    'INSERT INTO users (name, email, phone, gender, password, role) VALUES (?, ?, ?, ?, ?, ?)',
    ['Admin', 'admin@kavalbuddy.com', '9000000001', 'Male', adminHash, 'admin']
  );
  console.log(`Admin created - ID: ${adminResult.lastId}`);

  // Create regular user
  const userHash = bcrypt.hashSync('user1234', 10);
  const userResult = runSql(
    'INSERT INTO users (name, email, phone, gender, password, role) VALUES (?, ?, ?, ?, ?, ?)',
    ['John Doe', 'user@kavalbuddy.com', '9876543210', 'Male', userHash, 'user']
  );
  console.log(`User created - ID: ${userResult.lastId}`);

  // Create settings for both
  runSql('INSERT INTO settings (user_id) VALUES (?)', [adminResult.lastId]);
  runSql('INSERT INTO settings (user_id) VALUES (?)', [userResult.lastId]);

  // Add sample contacts for the regular user
  const sampleContacts = [
    { name: 'Mom', phone: '9876543211', relation: 'Family Member' },
    { name: 'Dad', phone: '9876543212', relation: 'Family Member' },
    { name: 'Best Friend', phone: '9876543213', relation: 'Friend' },
    { name: 'Police Helpline', phone: '100', relation: 'Emergency Service' },
    { name: 'Ambulance', phone: '108', relation: 'Emergency Service' },
  ];

  sampleContacts.forEach(c => {
    runSql(
      'INSERT INTO contacts (user_id, name, phone, relation) VALUES (?, ?, ?, ?)',
      [userResult.lastId, c.name, c.phone, c.relation]
    );
  });
  console.log(`Added ${sampleContacts.length} sample contacts`);

  // Add a sample SOS alert
  runSql(
    'INSERT INTO alerts (user_id, latitude, longitude, status) VALUES (?, ?, ?, ?)',
    [userResult.lastId, 12.9716, 77.5946, 'resolved']
  );
  runSql(
    'INSERT INTO alerts (user_id, latitude, longitude, status) VALUES (?, ?, ?, ?)',
    [userResult.lastId, 13.0827, 80.2707, 'active']
  );
  console.log('Added sample alerts');

  // Add sample feedback
  runSql(
    'INSERT INTO feedback (user_id, message, status) VALUES (?, ?, ?)',
    [userResult.lastId, 'Great app! The SOS feature is very reassuring.', 'resolved']
  );
  runSql(
    'INSERT INTO feedback (user_id, message, status) VALUES (?, ?, ?)',
    [userResult.lastId, 'Would love to see route sharing with contacts.', 'pending']
  );
  console.log('Added sample feedback');

  console.log('\n=== SEED COMPLETE ===');
  console.log('\nCredentials:');
  console.log('  Admin  -> admin@kavalbuddy.com / admin123');
  console.log('  User   -> user@kavalbuddy.com  / user1234');
  console.log('\nRun "npm start" to launch the server.');

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
