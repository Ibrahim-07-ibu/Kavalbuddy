const express = require('express');
const { queryAll, queryOne, runSql } = require('../db/init');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const result = runSql(
      'INSERT INTO feedback (user_id, message) VALUES (?, ?)',
      [req.user.id, message]
    );

    const feedback = queryOne('SELECT * FROM feedback WHERE id = ?', [result.lastId]);
    res.status(201).json({ feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/', adminAuth, (req, res) => {
  try {
    const feedback = queryAll(`
      SELECT feedback.*, users.name as user_name, users.email as user_email
      FROM feedback
      JOIN users ON feedback.user_id = users.id
      ORDER BY feedback.created_at DESC
    `);
    res.json({ feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/:id/status', adminAuth, (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['pending', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (pending, reviewed, resolved).' });
    }

    const feedback = queryOne('SELECT * FROM feedback WHERE id = ?', [req.params.id]);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found.' });
    }

    runSql('UPDATE feedback SET status = ? WHERE id = ?', [status, req.params.id]);

    const updated = queryOne('SELECT * FROM feedback WHERE id = ?', [req.params.id]);
    res.json({ feedback: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
