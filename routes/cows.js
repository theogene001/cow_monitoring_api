const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateCow } = require('../middleware/validation');

// Get all cows with farmer details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [cows] = await pool.execute(`
      SELECT c.*, f.NAME as FARMER_NAME, f.EMAIL as FARMER_EMAIL 
      FROM COWS c 
      LEFT JOIN FARMERS f ON c.FARMER_ID = f.FARMER_ID 
      ORDER BY c.CREATED_AT DESC
    `);
    res.json(cows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cow by ID with detailed information
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [cows] = await pool.execute(`
      SELECT c.*, f.NAME as FARMER_NAME, f.EMAIL as FARMER_EMAIL 
      FROM COWS c 
      LEFT JOIN FARMERS f ON c.FARMER_ID = f.FARMER_ID 
      WHERE c.COW_ID = ?
    `, [req.params.id]);

    if (cows.length === 0) {
      return res.status(404).json({ error: 'Cow not found' });
    }

    res.json(cows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new cow
router.post('/', authenticateToken, validateCow, async (req, res) => {
  try {
    const { FARMER_ID, TAG_ID, BREED, AGE, WEIGHT, HEALTH_STATUS } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO COWS (FARMER_ID, TAG_ID, BREED, AGE, WEIGHT, HEALTH_STATUS) VALUES (?, ?, ?, ?, ?, ?)',
      [FARMER_ID, TAG_ID, BREED, AGE, WEIGHT, HEALTH_STATUS]
    );

    const [newCow] = await pool.execute(`
      SELECT c.*, f.NAME as FARMER_NAME 
      FROM COWS c 
      LEFT JOIN FARMERS f ON c.FARMER_ID = f.FARMER_ID 
      WHERE c.COW_ID = ?
    `, [result.insertId]);

    res.status(201).json(newCow[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Tag ID already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update cow
router.put('/:id', authenticateToken, validateCow, async (req, res) => {
  try {
    const { FARMER_ID, TAG_ID, BREED, AGE, WEIGHT, HEALTH_STATUS } = req.body;
    
    const [result] = await pool.execute(
      'UPDATE COWS SET FARMER_ID = ?, TAG_ID = ?, BREED = ?, AGE = ?, WEIGHT = ?, HEALTH_STATUS = ? WHERE COW_ID = ?',
      [FARMER_ID, TAG_ID, BREED, AGE, WEIGHT, HEALTH_STATUS, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cow not found' });
    }

    const [updatedCow] = await pool.execute(`
      SELECT c.*, f.NAME as FARMER_NAME 
      FROM COWS c 
      LEFT JOIN FARMERS f ON c.FARMER_ID = f.FARMER_ID 
      WHERE c.COW_ID = ?
    `, [req.params.id]);

    res.json(updatedCow[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Tag ID already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete cow
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM COWS WHERE COW_ID = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cow not found' });
    }

    res.json({ message: 'Cow deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cows by farmer
router.get('/farmer/:farmerId', authenticateToken, async (req, res) => {
  try {
    const [cows] = await pool.execute(`
      SELECT c.*, f.NAME as FARMER_NAME 
      FROM COWS c 
      LEFT JOIN FARMERS f ON c.FARMER_ID = f.FARMER_ID 
      WHERE c.FARMER_ID = ? 
      ORDER BY c.CREATED_AT DESC
    `, [req.params.farmerId]);

    res.json(cows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;