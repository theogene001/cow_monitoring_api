const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all collars
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [collars] = await pool.execute(`
      SELECT * FROM COLLARS ORDER BY ASSIGNED_AT DESC
    `);
    res.json(collars);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get collar by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [collars] = await pool.execute(`
      SELECT * FROM COLLARS WHERE COLLAR_ID = ?
    `, [req.params.id]);
    if (collars.length === 0) {
      return res.status(404).json({ error: 'Collar not found' });
    }
    res.json(collars[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new collar
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { COW_ID, COLLAR_CODE, STATUS } = req.body;
    if (!COW_ID || !COLLAR_CODE) {
      return res.status(400).json({ error: 'COW_ID and COLLAR_CODE are required' });
    }
    const [result] = await pool.execute(
      'INSERT INTO COLLARS (COW_ID, COLLAR_CODE, STATUS) VALUES (?, ?, ?)',
      [COW_ID, COLLAR_CODE, STATUS || 'ACTIVE']
    );
    const [newCollar] = await pool.execute(
      'SELECT * FROM COLLARS WHERE COLLAR_ID = ?',
      [result.insertId]
    );
    res.status(201).json(newCollar[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Collar code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update collar
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { COW_ID, COLLAR_CODE, STATUS } = req.body;
    const [result] = await pool.execute(
      'UPDATE COLLARS SET COW_ID = ?, COLLAR_CODE = ?, STATUS = ? WHERE COLLAR_ID = ?',
      [COW_ID, COLLAR_CODE, STATUS, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Collar not found' });
    }
    const [updatedCollar] = await pool.execute(
      'SELECT * FROM COLLARS WHERE COLLAR_ID = ?',
      [req.params.id]
    );
    res.json(updatedCollar[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Collar code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete collar
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM COLLARS WHERE COLLAR_ID = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Collar not found' });
    }
    res.json({ message: 'Collar deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
