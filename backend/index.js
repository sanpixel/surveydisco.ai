const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

console.log('Starting server on port:', PORT);

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'SurveyDisco.ai', port: PORT });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'SurveyDisco.ai API', 
    service: 'Email-driven surveying workflow management',
    endpoints: ['/api/health']
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
