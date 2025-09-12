const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Initialize Supabase client with anon key BUT MAYBE IT NEEDS SR Key?
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const app = express();
const PORT = process.env.PORT || 8080;

console.log('Starting server on port:', PORT);

// Initialize PostgreSQL connection pool for database queries
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize database table
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS surveydisco_projects (
        id SERIAL PRIMARY KEY,
        job_number VARCHAR(10) UNIQUE NOT NULL,
        client VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        prepared_for VARCHAR(255),
        address TEXT,
        geo_address TEXT,
        parcel VARCHAR(100),
        area VARCHAR(50),
        contact TEXT,
        service_type VARCHAR(100),
        cost_estimate VARCHAR(50),
        status VARCHAR(50) DEFAULT 'New',
        created TIMESTAMP DEFAULT NOW(),
        modified TIMESTAMP DEFAULT NOW(),
        notes TEXT
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS surveydisco_todo_items (
        id SERIAL PRIMARY KEY,
        item_number INTEGER NOT NULL,
        description TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created TIMESTAMP DEFAULT NOW(),
        modified TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS surveydisco_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        modified TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert default web text if it doesn't exist
    await pool.query(`
      INSERT INTO surveydisco_settings (setting_key, setting_value) 
      VALUES ('webdevtxt', 'Each field in Job Cards below are editable. TODO card holds enhancement ideas.')
      ON CONFLICT (setting_key) DO NOTHING
    `);
    
    // Add missing columns if they don't exist (for existing tables)
    try {
      await pool.query(`
        ALTER TABLE surveydisco_projects 
        ADD COLUMN IF NOT EXISTS area VARCHAR(50)
      `);
      await pool.query(`
        ALTER TABLE surveydisco_projects 
        ADD COLUMN IF NOT EXISTS cost_estimate VARCHAR(50)
      `);
      await pool.query(`
        ALTER TABLE surveydisco_projects 
        ADD COLUMN IF NOT EXISTS geo_address TEXT
      `);
      await pool.query(`
        ALTER TABLE surveydisco_projects 
        ADD COLUMN IF NOT EXISTS email VARCHAR(255)
      `);
      await pool.query(`
        ALTER TABLE surveydisco_projects 
        ADD COLUMN IF NOT EXISTS phone VARCHAR(50)
      `);
      await pool.query(`
        ALTER TABLE surveydisco_projects 
        ADD COLUMN IF NOT EXISTS prepared_for VARCHAR(255)
      `);
    } catch (alterError) {
      // Columns might already exist, ignore error
      console.log('Columns might already exist');
    }
    
    console.log('Database initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

initDatabase();

app.use(cors());
app.use(express.json());

// Address validation using Google Maps Geocoding API
async function validateAddress(address) {
  if (!process.env.GOOGLE_MAPS_API_KEY || !address) {
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    
    return null; // No valid address found
  } catch (error) {
    console.error('Address validation error:', error);
    return null; // Return null on error, keep original address
  }
}

// Text parsing utilities
async function generateJobNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // Last 2 digits
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const yearMonth = year + month;
  
  try {
    // Get the highest job number for this month
    const result = await pool.query(
      'SELECT job_number FROM surveydisco_projects WHERE job_number LIKE $1 ORDER BY job_number DESC LIMIT 1',
      [yearMonth + '%']
    );
    
    let sequence = 1;
    if (result.rows.length > 0) {
      const lastJobNumber = result.rows[0].job_number;
      const lastSequence = parseInt(lastJobNumber.slice(-2));
      sequence = lastSequence + 1;
    }
    
    return yearMonth + sequence.toString().padStart(2, '0');
  } catch (error) {
    console.error('Error generating job number:', error);
    return yearMonth + '01';
  }
}

async function parseProjectText(text) {
  const project = {
    jobNumber: await generateJobNumber(),
    client: '',
    email: '',
    phone: '',
    preparedFor: '',
    address: '',
    geoAddress: '',
    parcel: '',
    area: '',
    contact: '',
    serviceType: '',
    costEstimate: '',
    status: 'New',
    notes: text // Store original text in notes
  };

  // Extract addresses (improved patterns, exclude dollar amounts)
  const addressRegex = /\b\d+\s+[A-Za-z0-9\s.,'-]+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Place|Pl|Court|Ct|Circle|Cir|Trail|Tr|Parkway|Pkwy)\b/gi;
  const addressMatch = text.match(addressRegex);
  if (addressMatch) {
    // Filter out matches that contain dollar signs
    const validAddress = addressMatch.find(addr => !addr.includes('$'));
    if (validAddress) {
      project.address = validAddress.trim();
    }
  } else {
    // Try simpler pattern for addresses without full street types (exclude $ signs)
    const simpleAddressRegex = /\b\d+\s+[A-Za-z\s]+\b/g;
    const simpleMatch = text.match(simpleAddressRegex);
    if (simpleMatch) {
      // Filter out dollar amounts and find the longest valid address
      const validMatches = simpleMatch.filter(match => 
        !match.includes('$') && 
        match.length > 10 && 
        !/^\d+\s*$/.test(match) // Not just numbers
      );
      if (validMatches.length > 0) {
        const longestMatch = validMatches.reduce((a, b) => a.length > b.length ? a : b);
        project.address = longestMatch.trim();
      }
    }
  }

  // Extract phone numbers
  const phoneRegex = /\b\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    project.phone = phoneMatch[0].trim();
    project.contact = phoneMatch[0].trim(); // Keep for backward compatibility
  }

  // Extract emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    project.email = emailMatch[0].trim();
    project.contact = project.contact ? project.contact + ', ' + emailMatch[0] : emailMatch[0];
  }

  // Extract parcel numbers (various formats)
  const parcelRegex = /\b(?:parcel|apn|pin)\s*[#:]?\s*([0-9-]+)\b/gi;
  const parcelMatch = text.match(parcelRegex);
  if (parcelMatch) {
    const parcelNumber = parcelMatch[0].replace(/.*?([0-9-]+)$/, '$1');
    project.parcel = parcelNumber;
  }

  // Extract area/acreage information
  const areaRegex = /\b([0-9]+(?:\.[0-9]+)?)\s*(?:ac|acres?|AC|ACRES?)\b/gi;
  const areaMatch = text.match(areaRegex);
  if (areaMatch) {
    project.area = areaMatch[0].trim();
  }

  // Extract cost estimates (dollar amounts)
  const costRegex = /\$([0-9,]+(?:\.[0-9]{2})?)/g;
  const costMatch = text.match(costRegex);
  if (costMatch) {
    project.costEstimate = costMatch[0].trim();
  }

  // Extract potential client names (first capitalized words before common survey terms)
  const nameRegex = /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g;
  const nameMatch = text.match(nameRegex);
  if (nameMatch) {
    project.client = nameMatch[0].trim();
  }

  // Extract "prepared for" information
  const preparedForRegex = /(?:prepared for|prep for|for)\s*[:]?\s*([A-Za-z\s]+?)(?:\n|\.|$)/gi;
  const preparedForMatch = text.match(preparedForRegex);
  if (preparedForMatch) {
    const preparedForText = preparedForMatch[0].replace(/(?:prepared for|prep for|for)\s*[:]?\s*/i, '').trim();
    if (preparedForText.length > 2) {
      project.preparedFor = preparedForText;
    }
  }

  // Determine service type based on keywords (prioritize survey-related)
  const lowerText = text.toLowerCase();
  
  // Survey-specific types (highest priority)
  if (lowerText.includes('boundary survey') || lowerText.includes('boundary line')) {
    project.serviceType = 'Boundary Survey';
  } else if (lowerText.includes('topographic survey') || lowerText.includes('topo survey')) {
    project.serviceType = 'Topographic Survey';
  } else if (lowerText.includes('alta survey') || lowerText.includes('alta/nsps')) {
    project.serviceType = 'ALTA Survey';
  } else if (lowerText.includes('legal description') || lowerText.includes('legal desc')) {
    project.serviceType = 'Legal Description';
  } else if (lowerText.includes('elevation certificate') || lowerText.includes('elev cert')) {
    project.serviceType = 'Elevation Certificate';
  } else if (lowerText.includes('subdivision') || lowerText.includes('plat')) {
    project.serviceType = 'Subdivision';
  }
  // General survey terms
  else if (lowerText.includes('survey')) {
    project.serviceType = 'Survey';
  }
  // Non-survey services
  else if (lowerText.includes('quote') || lowerText.includes('estimate')) {
    project.serviceType = 'Quote Request';
  } else if (lowerText.includes('consultation') || lowerText.includes('consult')) {
    project.serviceType = 'Consultation';
  }
  // Default - assume survey related if address/parcel mentioned
  else if (project.address || project.parcel) {
    project.serviceType = 'Survey';
  } else {
    project.serviceType = 'General Inquiry';
  }

  // Try to validate/standardize address with Google Maps API (with fallback)
  if (project.address) {
    try {
      const validatedAddress = await validateAddress(project.address);
      if (validatedAddress) {
        project.geoAddress = validatedAddress;
      }
      // If validation fails, geoAddress stays empty, original address is preserved
    } catch (error) {
      // API failed, keep geoAddress empty
      console.log('Address validation failed, keeping original address');
    }
  }

  return project;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'SurveyDisco.ai', port: PORT });
});

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM surveydisco_projects ORDER BY created DESC');
    const projects = result.rows.map(row => ({
      id: row.id,
      jobNumber: row.job_number,
      client: row.client,
      email: row.email,
      phone: row.phone,
      preparedFor: row.prepared_for,
      address: row.address,
      geoAddress: row.geo_address,
      parcel: row.parcel,
      area: row.area,
      contact: row.contact,
      serviceType: row.service_type,
      costEstimate: row.cost_estimate,
      status: row.status,
      created: row.created,
      modified: row.modified,
      notes: row.notes
    }));
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Parse text and create new project
app.post('/api/projects/parse', async (req, res) => {
  const { text } = req.body;
  
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const project = await parseProjectText(text);
    
    const result = await pool.query(`
      INSERT INTO surveydisco_projects (job_number, client, email, phone, prepared_for, address, geo_address, parcel, area, contact, service_type, cost_estimate, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      project.jobNumber,
      project.client,
      project.email,
      project.phone,
      project.preparedFor,
      project.address,
      project.geoAddress,
      project.parcel,
      project.area,
      project.contact,
      project.serviceType,
      project.costEstimate,
      project.status,
      project.notes
    ]);
    
    const savedProject = {
      id: result.rows[0].id,
      jobNumber: result.rows[0].job_number,
      client: result.rows[0].client,
      email: result.rows[0].email,
      phone: result.rows[0].phone,
      preparedFor: result.rows[0].prepared_for,
      address: result.rows[0].address,
      geoAddress: result.rows[0].geo_address,
      parcel: result.rows[0].parcel,
      area: result.rows[0].area,
      contact: result.rows[0].contact,
      serviceType: result.rows[0].service_type,
      costEstimate: result.rows[0].cost_estimate,
      status: result.rows[0].status,
      created: result.rows[0].created,
      modified: result.rows[0].modified,
      notes: result.rows[0].notes
    };
    
    res.json(savedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update a project field
app.patch('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  try {
    // Don't allow updating certain read-only fields
    const readOnlyFields = ['id', 'jobNumber', 'created'];
    const allowedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => !readOnlyFields.includes(key))
    );
    
    // Convert camelCase to snake_case for database
    const dbUpdates = {};
    Object.entries(allowedUpdates).forEach(([key, value]) => {
      switch (key) {
        case 'serviceType':
          dbUpdates.service_type = value;
          break;
        case 'costEstimate':
          dbUpdates.cost_estimate = value;
          break;
        case 'geoAddress':
          dbUpdates.geo_address = value;
          break;
        case 'preparedFor':
          dbUpdates.prepared_for = value;
          break;
        default:
          dbUpdates[key] = value;
      }
    });
    
    if (Object.keys(dbUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const setClause = Object.keys(dbUpdates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(dbUpdates)];
    
    const result = await pool.query(`
      UPDATE surveydisco_projects 
      SET ${setClause}, modified = NOW()
      WHERE id = $1
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const updatedProject = {
      id: result.rows[0].id,
      jobNumber: result.rows[0].job_number,
      client: result.rows[0].client,
      email: result.rows[0].email,
      phone: result.rows[0].phone,
      preparedFor: result.rows[0].prepared_for,
      address: result.rows[0].address,
      geoAddress: result.rows[0].geo_address,
      parcel: result.rows[0].parcel,
      area: result.rows[0].area,
      contact: result.rows[0].contact,
      serviceType: result.rows[0].service_type,
      costEstimate: result.rows[0].cost_estimate,
      status: result.rows[0].status,
      created: result.rows[0].created,
      modified: result.rows[0].modified,
      notes: result.rows[0].notes
    };
    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete a project (with password protection)
app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  
  // Simple password check (you can make this more secure)
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'delete123';
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  try {
    const result = await pool.query(
      'DELETE FROM surveydisco_projects WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted successfully', deleted: result.rows[0] });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// TODO API endpoints
app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM surveydisco_todo_items ORDER BY item_number ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.post('/api/todos', async (req, res) => {
  const { description } = req.body;
  
  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Description is required' });
  }

  try {
    // Get next item number
    const maxResult = await pool.query('SELECT COALESCE(MAX(item_number), 0) + 1 as next_number FROM surveydisco_todo_items');
    const itemNumber = maxResult.rows[0].next_number;
    
    const result = await pool.query(
      'INSERT INTO surveydisco_todo_items (item_number, description) VALUES ($1, $2) RETURNING *',
      [itemNumber, description.trim()]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.patch('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { description, completed } = req.body;
  
  try {
    const updates = [];
    const values = [id];
    let paramIndex = 2;
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    
    if (completed !== undefined) {
      updates.push(`completed = $${paramIndex}`);
      values.push(completed);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('modified = NOW()');
    
    const result = await pool.query(
      `UPDATE surveydisco_todo_items SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'DELETE FROM surveydisco_todo_items WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// Serve React static files
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Catch-all handler for React Router  
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
