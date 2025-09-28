const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all health records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [records] = await pool.execute(`
      SELECT hr.*, c.TAG_ID, c.BREED, f.NAME as FARMER_NAME 
      FROM HEALTH_RECORDS hr 
      LEFT JOIN COWS c ON hr.COW_ID = c.COW_ID 
      LEFT JOIN FARMERS f ON c.FARMER_ID = f.FARMER_ID 
      ORDER BY hr.DIAGNOSIS_DATE DESC
    `);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create health record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { COW_ID, DISEASE_NAME, DIAGNOSIS_DATE, TREATMENT, VET_NAME, FOLLOW_UP_DATE } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO HEALTH_RECORDS (COW_ID, DISEASE_NAME, DIAGNOSIS_DATE, TREATMENT, VET_NAME, FOLLOW_UP_DATE) VALUES (?, ?, ?, ?, ?, ?)',
      [COW_ID, DISEASE_NAME, DIAGNOSIS_DATE, TREATMENT, VET_NAME, FOLLOW_UP_DATE]
    );

    const [newRecord] = await pool.execute(`
      SELECT hr.*, c.TAG_ID, c.BREED 
      FROM HEALTH_RECORDS hr 
      LEFT JOIN COWS c ON hr.COW_ID = c.COW_ID 
      WHERE hr.RECORD_ID = ?
    `, [result.insertId]);

    res.status(201).json(newRecord[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get health records by cow
router.get('/cow/:cowId', authenticateToken, async (req, res) => {
  try {
    const [records] = await pool.execute(`
      SELECT hr.*, c.TAG_ID 
      FROM HEALTH_RECORDS hr 
      LEFT JOIN COWS c ON hr.COW_ID = c.COW_ID 
      WHERE hr.COW_ID = ? 
      ORDER BY hr.DIAGNOSIS_DATE DESC
    `, [req.params.cowId]);

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;