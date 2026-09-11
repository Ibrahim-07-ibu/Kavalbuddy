const express = require('express');
const { queryAll, queryOne, runSql } = require('../db/init');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', (req, res) => {
  try {
    const contacts = queryAll('SELECT * FROM contacts WHERE user_id = ?', [req.user.id]);
    res.json({ contacts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, phone, relation } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required.' });
    }

    const result = runSql(
      'INSERT INTO contacts (user_id, name, phone, relation) VALUES (?, ?, ?, ?)',
      [req.user.id, name, phone, relation || null]
    );

    const contact = queryOne('SELECT * FROM contacts WHERE id = ?', [result.lastId]);
    res.status(201).json({ contact });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, phone, relation } = req.body;

    const contact = queryOne('SELECT * FROM contacts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    runSql(
      'UPDATE contacts SET name = ?, phone = ?, relation = ? WHERE id = ? AND user_id = ?',
      [name || contact.name, phone || contact.phone, relation || contact.relation, req.params.id, req.user.id]
    );

    const updated = queryOne('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ contact: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const contact = queryOne('SELECT * FROM contacts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    runSql('DELETE FROM contacts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Contact deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
