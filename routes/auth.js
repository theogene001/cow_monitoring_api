const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const pool = require('../config/database');
const { validateUser } = require('../middleware/validation');

router.post('/register', validateUser, async (req, res) => {
  try {
    const { USERNAME, EMAIL, PASSWORD, ROLE } = req.body;
    
    const [existingUsers] = await pool.execute(
      'SELECT USER_ID FROM USERS WHERE EMAIL = ? OR USERNAME = ?',
      [EMAIL, USERNAME]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(PASSWORD, saltRounds);

    const [result] = await pool.execute(
      'INSERT INTO USERS (USERNAME, EMAIL, PASSWORD_HASH, ROLE) VALUES (?, ?, ?, ?)',
      [USERNAME, EMAIL, passwordHash, ROLE || 'FARMER']
    );

    const token = jwt.sign(
      { userId: result.insertId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        USER_ID: result.insertId,
        USERNAME,
        EMAIL,
        ROLE: ROLE || 'FARMER'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { EMAIL, PASSWORD } = req.body;

    if (!EMAIL || !PASSWORD) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [users] = await pool.execute(
      'SELECT USER_ID, USERNAME, EMAIL, PASSWORD_HASH, ROLE FROM USERS WHERE EMAIL = ?',
      [EMAIL]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(PASSWORD, user.PASSWORD_HASH);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.USER_ID },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        USER_ID: user.USER_ID,
        USERNAME: user.USERNAME,
        EMAIL: user.EMAIL,
        ROLE: user.ROLE
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;