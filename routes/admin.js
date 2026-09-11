const express = require('express');
const { queryAll, queryOne, runSql } = require('../db/init');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

router.use(adminAuth);

router.get('/stats', (req, res) => {
  try {
    const totalUsers = queryOne('SELECT COUNT(*) as count FROM users').count;
    const totalAlerts = queryOne('SELECT COUNT(*) as count FROM alerts').count;
    const resolvedAlerts = queryOne("SELECT COUNT(*) as count FROM alerts WHERE status = 'resolved'").count;
    const activeAlerts = queryOne("SELECT COUNT(*) as count FROM alerts WHERE status = 'active'").count;

    res.json({ totalUsers, totalAlerts, resolvedAlerts, activeAlerts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/users', (req, res) => {
  try {
    const users = queryAll(
      'SELECT id, name, email, phone, gender, role, profile_pic, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/users/:id/block', (req, res) => {
  try {
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const newRole = user.role === 'blocked' ? 'user' : 'blocked';
    runSql('UPDATE users SET role = ? WHERE id = ?', [newRole, req.params.id]);

    const updated = queryOne(
      'SELECT id, name, email, phone, gender, role, profile_pic, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    res.json({ user: updated, message: `User ${newRole === 'blocked' ? 'blocked' : 'unblocked'} successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/alerts', (req, res) => {
  try {
    const alerts = queryAll(`
      SELECT alerts.*, users.name as user_name, users.email as user_email, users.phone as user_phone
      FROM alerts
      JOIN users ON alerts.user_id = users.id
      ORDER BY alerts.created_at DESC
    `);
    res.json({ alerts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
