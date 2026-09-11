const express = require('express');
const bcrypt = require('bcryptjs');
const { queryOne, runSql } = require('../db/init');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', (req, res) => {
  try {
    const settings = queryOne('SELECT * FROM settings WHERE user_id = ?', [req.user.id]);
    if (!settings) {
      return res.json({
        settings: {
          pushNotifications: true,
          locationSharing: false,
          autoVoiceRecording: true,
        }
      });
    }
    res.json({
      settings: {
        pushNotifications: !!settings.push_notifications,
        locationSharing: !!settings.location_sharing,
        autoVoiceRecording: !!settings.auto_voice_recording,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/', (req, res) => {
  try {
    const { pushNotifications, locationSharing, autoVoiceRecording } = req.body;

    const existing = queryOne('SELECT * FROM settings WHERE user_id = ?', [req.user.id]);

    if (existing) {
      runSql(
        'UPDATE settings SET push_notifications = ?, location_sharing = ?, auto_voice_recording = ? WHERE user_id = ?',
        [
          pushNotifications !== undefined ? (pushNotifications ? 1 : 0) : existing.push_notifications,
          locationSharing !== undefined ? (locationSharing ? 1 : 0) : existing.location_sharing,
          autoVoiceRecording !== undefined ? (autoVoiceRecording ? 1 : 0) : existing.auto_voice_recording,
          req.user.id
        ]
      );
    } else {
      runSql(
        'INSERT INTO settings (user_id, push_notifications, location_sharing, auto_voice_recording) VALUES (?, ?, ?, ?)',
        [
          req.user.id,
          pushNotifications !== undefined ? (pushNotifications ? 1 : 0) : 1,
          locationSharing !== undefined ? (locationSharing ? 1 : 0) : 0,
          autoVoiceRecording !== undefined ? (autoVoiceRecording ? 1 : 0) : 1,
        ]
      );
    }

    const updated = queryOne('SELECT * FROM settings WHERE user_id = ?', [req.user.id]);
    res.json({
      settings: {
        pushNotifications: !!updated.push_notifications,
        locationSharing: !!updated.location_sharing,
        autoVoiceRecording: !!updated.auto_voice_recording,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
