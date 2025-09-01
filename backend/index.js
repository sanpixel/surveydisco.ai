const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve React static files
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'SurveyDisco.ai' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
