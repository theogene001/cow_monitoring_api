const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateFarmer } = require('../middleware/validation');

// Get all farmers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [farmers] = await pool.execute(`
      SELECT FARMER_ID, NAME, EMAIL, PHONE, ADDRESS, CREATED_AT 
      FROM FARMERS 
      ORDER BY CREATED_AT DESC
    `);
    res.json(farmers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get farmer by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [farmers] = await pool.execute(`
      SELECT FARMER_ID, NAME, EMAIL, PHONE, ADDRESS, CREATED_AT 
      FROM FARMERS 
      WHERE FARMER_ID = ?
    `, [req.params.id]);

    if (farmers.length === 0) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    res.json(farmers[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new farmer
router.post('/', authenticateToken, authorizeRoles('ADMIN'), validateFarmer, async (req, res) => {
  try {
    const { NAME, EMAIL, PHONE, ADDRESS } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO FARMERS (NAME, EMAIL, PHONE, ADDRESS) VALUES (?, ?, ?, ?)',
      [NAME, EMAIL, PHONE, ADDRESS]
    );

    const [newFarmer] = await pool.execute(
      'SELECT FARMER_ID, NAME, EMAIL, PHONE, ADDRESS, CREATED_AT FROM FARMERS WHERE FARMER_ID = ?',
      [result.insertId]
    );

    res.status(201).json(newFarmer[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update farmer
router.put('/:id', authenticateToken, authorizeRoles('ADMIN'), validateFarmer, async (req, res) => {
  try {
    const { NAME, EMAIL, PHONE, ADDRESS } = req.body;
    
    const [result] = await pool.execute(
      'UPDATE FARMERS SET NAME = ?, EMAIL = ?, PHONE = ?, ADDRESS = ? WHERE FARMER_ID = ?',
      [NAME, EMAIL, PHONE, ADDRESS, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    const [updatedFarmer] = await pool.execute(
      'SELECT FARMER_ID, NAME, EMAIL, PHONE, ADDRESS, CREATED_AT FROM FARMERS WHERE FARMER_ID = ?',
      [req.params.id]
    );

    res.json(updatedFarmer[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete farmer
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM FARMERS WHERE FARMER_ID = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Farmer not found' });
    }

    res.json({ message: 'Farmer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;