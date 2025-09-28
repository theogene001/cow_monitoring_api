const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateSensor } = require('../middleware/validation');

// Get all sensors with cow details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [sensors] = await pool.execute(`
      SELECT s.*, c.TAG_ID, c.BREED 
      FROM SENSORS s 
      LEFT JOIN COWS c ON s.COW_ID = c.COW_ID 
      ORDER BY s.INSTALLATION_DATE DESC
    `);
    res.json(sensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sensor by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [sensors] = await pool.execute(`
      SELECT s.*, c.TAG_ID, c.BREED, c.FARMER_ID 
      FROM SENSORS s 
      LEFT JOIN COWS c ON s.COW_ID = c.COW_ID 
      WHERE s.SENSOR_ID = ?
    `, [req.params.id]);

    if (sensors.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    res.json(sensors[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new sensor
router.post('/', authenticateToken, validateSensor, async (req, res) => {
  try {
    const { COW_ID, SENSOR_TYPE, INSTALLATION_DATE, STATUS } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO SENSORS (COW_ID, SENSOR_TYPE, INSTALLATION_DATE, STATUS) VALUES (?, ?, ?, ?)',
      [COW_ID, SENSOR_TYPE, INSTALLATION_DATE, STATUS || 'ACTIVE']
    );

    const [newSensor] = await pool.execute(`
      SELECT s.*, c.TAG_ID, c.BREED 
      FROM SENSORS s 
      LEFT JOIN COWS c ON s.COW_ID = c.COW_ID 
      WHERE s.SENSOR_ID = ?
    `, [result.insertId]);

    res.status(201).json(newSensor[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update sensor
router.put('/:id', authenticateToken, validateSensor, async (req, res) => {
  try {
    const { COW_ID, SENSOR_TYPE, INSTALLATION_DATE, STATUS } = req.body;
    
    const [result] = await pool.execute(
      'UPDATE SENSORS SET COW_ID = ?, SENSOR_TYPE = ?, INSTALLATION_DATE = ?, STATUS = ? WHERE SENSOR_ID = ?',
      [COW_ID, SENSOR_TYPE, INSTALLATION_DATE, STATUS, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const [updatedSensor] = await pool.execute(`
      SELECT s.*, c.TAG_ID, c.BREED 
      FROM SENSORS s 
      LEFT JOIN COWS c ON s.COW_ID = c.COW_ID 
      WHERE s.SENSOR_ID = ?
    `, [req.params.id]);

    res.json(updatedSensor[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sensors by cow
router.get('/cow/:cowId', authenticateToken, async (req, res) => {
  try {
    const [sensors] = await pool.execute(`
      SELECT s.*, c.TAG_ID 
      FROM SENSORS s 
      LEFT JOIN COWS c ON s.COW_ID = c.COW_ID 
      WHERE s.COW_ID = ? 
      ORDER BY s.INSTALLATION_DATE DESC
    `, [req.params.cowId]);

    res.json(sensors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;