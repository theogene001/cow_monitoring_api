const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateSensor } = require('../middleware/validation');

// Input validation helper
const validateSensorId = (id) => {
  const sensorId = parseInt(id);
  return !isNaN(sensorId) && sensorId > 0;
};

const validateCowId = (id) => {
  const cowId = parseInt(id);
  return !isNaN(cowId) && cowId > 0;
};

// Get all sensors with cow details
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Validate database connection
    if (!pool) {
      return res.status(500).json({ 
        error: 'Database connection not available',
        code: 'DB_CONNECTION_ERROR'
      });
    }

    const [sensors] = await pool.execute(`
      SELECT s.*, c.TAG_ID, c.BREED 
      FROM SENSORS s 
      LEFT JOIN COWS c ON s.COW_ID = c.COW_ID 
      ORDER BY s.INSTALLATION_DATE DESC
    `);
    
    res.json({
      success: true,
      data: sensors,
      count: sensors.length
    });
  } catch (error) {
    console.error('Error fetching sensors:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sensors',
      code: 'FETCH_SENSORS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get sensor by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Validate sensor ID
    if (!validateSensorId(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid sensor ID',
        code: 'INVALID_SENSOR_ID'
      });
    }

    const [sensors] = await pool.execute(`
      SELECT s.*, c.TAG_ID, c.BREED, c.FARMER_ID 
      FROM SENSORS s 
      LEFT JOIN COWS c ON s.COW_ID = c.COW_ID 
      WHERE s.SENSOR_ID = ?
    `, [req.params.id]);

    if (sensors.length === 0) {
      return res.status(404).json({ 
        error: 'Sensor not found',
        code: 'SENSOR_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: sensors[0]
    });
  } catch (error) {
    console.error('Error fetching sensor:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sensor',
      code: 'FETCH_SENSOR_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new sensor
router.post('/', authenticateToken, validateSensor, async (req, res) => {
  try {
    const { COW_ID, SENSOR_TYPE, INSTALLATION_DATE, STATUS } = req.body;
    
    // Validate COW_ID if provided
    if (COW_ID && !validateCowId(COW_ID)) {
      return res.status(400).json({ 
        error: 'Invalid cow ID',
        code: 'INVALID_COW_ID'
      });
    }

    // Validate SENSOR_TYPE
    const validSensorTypes = ['TEMPERATURE', 'PEDOMETER', 'HEARTBEAT', 'GPS', 'OTHER'];
    if (!SENSOR_TYPE || !validSensorTypes.includes(SENSOR_TYPE.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Invalid sensor type',
        code: 'INVALID_SENSOR_TYPE',
        validTypes: validSensorTypes
      });
    }

    // Validate INSTALLATION_DATE
    if (INSTALLATION_DATE && isNaN(Date.parse(INSTALLATION_DATE))) {
      return res.status(400).json({ 
        error: 'Invalid installation date',
        code: 'INVALID_INSTALLATION_DATE'
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO SENSORS (COW_ID, SENSOR_TYPE, INSTALLATION_DATE, STATUS) VALUES (?, ?, ?, ?)',
      [COW_ID || null, SENSOR_TYPE, INSTALLATION_DATE || new Date(), STATUS || 'ACTIVE']
    );

    const [newSensor] = await pool.execute(`
      SELECT s.*, c.TAG_ID, c.BREED 
      FROM SENSORS s 
      LEFT JOIN COWS c ON s.COW_ID = c.COW_ID 
      WHERE s.SENSOR_ID = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      data: newSensor[0],
      message: 'Sensor created successfully'
    });
  } catch (error) {
    console.error('Error creating sensor:', error);
    
    // Handle duplicate entry or foreign key constraints
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: 'Sensor already exists',
        code: 'SENSOR_EXISTS'
      });
    }
    
    if (error.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ 
        error: 'Referenced cow does not exist',
        code: 'COW_NOT_FOUND'
      });
    }

    res.status(500).json({ 
      error: 'Failed to create sensor',
      code: 'CREATE_SENSOR_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update sensor
router.put('/:id', authenticateToken, validateSensor, async (req, res) => {
  try {
    // Validate sensor ID
    if (!validateSensorId(req.params.id)) {
      return res.status(400).json({ 
        error: 'Invalid sensor ID',
        code: 'INVALID_SENSOR_ID'
      });
    }

    const { COW_ID, SENSOR_TYPE, INSTALLATION_DATE, STATUS } = req.body;
    
    // Validate COW_ID if provided
    if (COW_ID && !validateCowId(COW_ID)) {
      return res.status(400).json({ 
        error: 'Invalid cow ID',
        code: 'INVALID_COW_ID'
      });
    }

    // Check if sensor exists first
    const [existingSensors] = await pool.execute(
      'SELECT SENSOR_ID FROM SENSORS WHERE SENSOR_ID = ?',
      [req.params.id]
    );

    if (existingSensors.length === 0) {
      return res.status(404).json({ 
        error: 'Sensor not found',
        code: 'SENSOR_NOT_FOUND'
      });
    }

    const [result] = await pool.execute(
      'UPDATE SENSORS SET COW_ID = ?, SENSOR_TYPE = ?, INSTALLATION_DATE = ?, STATUS = ? WHERE SENSOR_ID = ?',
      [COW_ID || null, SENSOR_TYPE, INSTALLATION_DATE, STATUS, req.params.id]
    );

    const [updatedSensor] = await pool.execute(`
      SELECT s.*, c.TAG_ID, c.BREED 
      FROM SENSORS s 
      LEFT JOIN COWS c ON s.COW_ID = c.COW_ID 
      WHERE s.SENSOR_ID = ?
    `, [req.params.id]);

    res.json({
      success: true,
      data: updatedSensor[0],
      message: 'Sensor updated successfully'
    });
  } catch (error) {
    console.error('Error updating sensor:', error);
    
    // Handle foreign key constraints
    if (error.code === 'ER_NO_REFERENCED_ROW') {
      return res.status(400).json({ 
        error: 'Referenced cow does not exist',
        code: 'COW_NOT_FOUND'
      });
    }

    res.status(500).json({ 
      error: 'Failed to update sensor',
      code: 'UPDATE_SENSOR_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get sensors by cow
router.get('/cow/:cowId', authenticateToken, async (req, res) => {
  try {
    // Validate cow ID
    if (!validateCowId(req.params.cowId)) {
      return res.status(400).json({ 
        error: 'Invalid cow ID',
        code: 'INVALID_COW_ID'
      });
    }

    const [sensors] = await pool.execute(`
      SELECT s.*, c.TAG_ID 
      FROM SENSORS s 
      LEFT JOIN COWS c ON s.COW_ID = c.COW_ID 
      WHERE s.COW_ID = ? 
      ORDER BY s.INSTALLATION_DATE DESC
    `, [req.params.cowId]);

    res.json({
      success: true,
      data: sensors,
      count: sensors.length
    });
  } catch (error) {
    console.error('Error fetching sensors by cow:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sensors for cow',
      code: 'FETCH_COW_SENSORS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
router.get('/health/check', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({ 
      status: 'OK', 
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      database: 'Disconnected',
      error: error.message 
    });
  }
});

module.exports = router;
