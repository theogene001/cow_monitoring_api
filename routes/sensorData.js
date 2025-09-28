const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');

// Get sensor data with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const [data] = await pool.execute(`
      SELECT sd.*, s.SENSOR_TYPE, c.TAG_ID 
      FROM SENSOR_DATA sd 
      LEFT JOIN SENSORS s ON sd.SENSOR_ID = s.SENSOR_ID 
      LEFT JOIN COWS c ON sd.COW_ID = c.COW_ID 
      ORDER BY sd.RECORDED_AT DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [total] = await pool.execute('SELECT COUNT(*) as total FROM SENSOR_DATA');
    
    res.json({
      data,
      pagination: {
        page,
        limit,
        total: total[0].total,
        totalPages: Math.ceil(total[0].total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add sensor data
router.post('/', authenticateToken, [
  body('SENSOR_ID').isInt({ min: 1 }),
  body('COW_ID').isInt({ min: 1 }),
  body('READING_VALUE').notEmpty(),
  body('UNIT').optional().isString()
], async (req, res) => {
  try {
    const { SENSOR_ID, COW_ID, READING_VALUE, UNIT } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO SENSOR_DATA (SENSOR_ID, COW_ID, READING_VALUE, UNIT) VALUES (?, ?, ?, ?)',
      [SENSOR_ID, COW_ID, READING_VALUE, UNIT]
    );

    const [newData] = await pool.execute(`
      SELECT sd.*, s.SENSOR_TYPE, c.TAG_ID 
      FROM SENSOR_DATA sd 
      LEFT JOIN SENSORS s ON sd.SENSOR_ID = s.SENSOR_ID 
      LEFT JOIN COWS c ON sd.COW_ID = c.COW_ID 
      WHERE sd.DATA_ID = ?
    `, [result.insertId]);

    res.status(201).json(newData[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sensor data by cow with date range
router.get('/cow/:cowId', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, sensorType } = req.query;
    
    let query = `
      SELECT sd.*, s.SENSOR_TYPE, c.TAG_ID 
      FROM SENSOR_DATA sd 
      LEFT JOIN SENSORS s ON sd.SENSOR_ID = s.SENSOR_ID 
      LEFT JOIN COWS c ON sd.COW_ID = c.COW_ID 
      WHERE sd.COW_ID = ?
    `;
    
    const params = [req.params.cowId];

    if (startDate) {
      query += ' AND sd.RECORDED_AT >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND sd.RECORDED_AT <= ?';
      params.push(endDate);
    }

    if (sensorType) {
      query += ' AND s.SENSOR_TYPE = ?';
      params.push(sensorType);
    }

    query += ' ORDER BY sd.RECORDED_AT DESC LIMIT 100';

    const [data] = await pool.execute(query, params);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;