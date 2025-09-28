const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get alerts based on abnormal sensor readings (public)
router.get('/', async (req, res) => {
  try {
    // Example: temperature > 39 or heart rate > 100
    const [alerts] = await pool.execute(`
      SELECT sd.*, s.SENSOR_TYPE, c.TAG_ID
      FROM SENSOR_DATA sd
      LEFT JOIN SENSORS s ON sd.SENSOR_ID = s.SENSOR_ID
      LEFT JOIN COWS c ON sd.COW_ID = c.COW_ID
      WHERE (s.SENSOR_TYPE = 'TEMPERATURE' AND sd.READING_VALUE > 39)
         OR (s.SENSOR_TYPE = 'HEART_RATE' AND sd.READING_VALUE > 100)
      ORDER BY sd.RECORDED_AT DESC
      LIMIT 50
    `);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
