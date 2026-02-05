const express = require('express');
const connectDB = require('./db');
const cors = require('cors');
require('dotenv').config();

const path = require('path');
const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));

// Define Routes
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/auth', require('./routes/auth'));

// app.get('/', (req, res) => res.send('API Running'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
