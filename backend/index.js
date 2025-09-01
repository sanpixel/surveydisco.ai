const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

console.log('Starting server on port:', PORT);

app.use(cors());
app.use(express.json());

// Serve React static files
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'SurveyDisco.ai' });
});

// Serve React app for all other routes
app.get('/*', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/build/index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'React app not found' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
