const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farmers', require('./routes/farmers'));
app.use('/api/cows', require('./routes/cows'));
app.use('/api/collars', require('./routes/collars'));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/sensor-data', require('./routes/sensorData'));
app.use('/api/health-records', require('./routes/healthRecords'));
app.use('/api/alerts', require('./routes/alerts'));

// DB health check
app.get('/api/health/db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ database: 'up', result: rows[0] });
  } catch (err) {
    res.status(500).json({ database: 'down', error: err.message });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Cow Monitoring API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});