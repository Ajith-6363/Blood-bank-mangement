const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_mysql_password',
  database: 'blood_bank',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get('/api/inventory', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT blood_group, units, last_updated FROM inventory ORDER BY FIELD(blood_group, "O+","O-","A+","A-","B+","B-","AB+","AB-")');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/api/donors', async (req, res) => {
  const { name, phone, email, blood_group, city, units = 1 } = req.body;
  if (!name || !blood_group) return res.status(400).json({ error: 'Missing fields' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('INSERT INTO donors (name, phone, email, blood_group, city, last_donated) VALUES (?, ?, ?, ?, ?, CURDATE())', [name, phone, email, blood_group, city]);
    await conn.query('INSERT INTO inventory (blood_group, units) VALUES (?, ?) ON DUPLICATE KEY UPDATE units = units + VALUES(units)', [blood_group, parseInt(units,10)]);
    await conn.commit();
    res.json({ message: 'Thanks for donating! Inventory updated.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Failed to save donor' });
  } finally {
    conn.release();
  }
});

app.post('/api/requests', async (req, res) => {
  const { name, phone, blood_group, units_needed = 1, city } = req.body;
  if (!name || !blood_group || !units_needed) return res.status(400).json({ error: 'Missing fields' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [invRows] = await conn.query('SELECT units FROM inventory WHERE blood_group = ? FOR UPDATE', [blood_group]);
    let available = (invRows[0] && invRows[0].units) || 0;
    let status = 'pending';
    if (available >= units_needed) {
      await conn.query('UPDATE inventory SET units = units - ? WHERE blood_group = ?', [units_needed, blood_group]);
      status = 'fulfilled';
    }
    await conn.query('INSERT INTO requests (name, phone, blood_group, units_needed, city, status) VALUES (?, ?, ?, ?, ?, ?)', [name, phone, blood_group, units_needed, city, status]);
    await conn.commit();
    res.json({ message: `Request submitted (${status}).` });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Failed to create request' });
  } finally {
    conn.release();
  }
});

app.get('/api/requests', async (req, res) => {
  const status = req.query.status;
  try {
    const [rows] = status
      ? await pool.query('SELECT * FROM requests WHERE status = ? ORDER BY created_at DESC LIMIT 50', [status])
      : await pool.query('SELECT * FROM requests ORDER BY created_at DESC LIMIT 50');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/api/inventory/adjust', async (req, res) => {
  const { blood_group, units } = req.body;
  if (!blood_group || typeof units !== 'number') return res.status(400).json({ error: 'Missing fields' });
  try {
    await pool.query('INSERT INTO inventory (blood_group, units) VALUES (?, ?) ON DUPLICATE KEY UPDATE units = ?', [blood_group, units, units]);
    res.json({ message: 'Inventory set.' });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
