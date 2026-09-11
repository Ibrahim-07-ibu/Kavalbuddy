const express = require('express');
const bcrypt = require('bcryptjs');
const { queryOne, runSql } = require('../db/init');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', (req, res) => {
  try {
    const user = queryOne(
      'SELECT id, name, email, phone, gender, role, profile_pic, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/', (req, res) => {
  try {
    const { name, email, phone, gender } = req.body;

    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (email && email !== user.email) {
      const existing = queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]);
      if (existing) {
        return res.status(400).json({ error: 'Email already in use.' });
      }
    }

    runSql(
      'UPDATE users SET name = ?, email = ?, phone = ?, gender = ? WHERE id = ?',
      [
        name || user.name,
        email || user.email,
        phone !== undefined ? phone : user.phone,
        gender !== undefined ? gender : user.gender,
        req.user.id
      ]
    );

    const updated = queryOne(
      'SELECT id, name, email, phone, gender, role, profile_pic, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/password', (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const validPassword = bcrypt.compareSync(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    runSql('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
