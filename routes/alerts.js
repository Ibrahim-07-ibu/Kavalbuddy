const express = require('express');
const { queryAll, queryOne, runSql } = require('../db/init');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.post('/sos', (req, res) => {
  try {
    const { latitude, longitude, voice_recording } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    const result = runSql(
      'INSERT INTO alerts (user_id, latitude, longitude, voice_recording) VALUES (?, ?, ?, ?)',
      [req.user.id, latitude, longitude, voice_recording || null]
    );

    const alert = queryOne('SELECT * FROM alerts WHERE id = ?', [result.lastId]);
    const contacts = queryAll('SELECT * FROM contacts WHERE user_id = ?', [req.user.id]);
    const user = queryOne('SELECT name, phone FROM users WHERE id = ?', [req.user.id]);

    res.status(201).json({
      alert,
      emergencyContacts: contacts,
      user: user ? { name: user.name, phone: user.phone } : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/', (req, res) => {
  try {
    const alerts = queryAll('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json({ alerts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/active', (req, res) => {
  try {
    const alerts = queryAll(
      "SELECT * FROM alerts WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json({ alerts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
