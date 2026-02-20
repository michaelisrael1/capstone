const express = require('express');
const{ pool } = require('pg');

const app = express();
const pool new Pool({
  connectionString: 'postgresql://joseph:password@localhost:5432/capstone'

});

app.use(express.static('public'));

app.get('/api/students/:id', async (req, res) => {
  const result = await pool.query('SELECT user_id, first_name, last_name FROM students');
  res.json(result.rows);
});

app.get('/api/students/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM students WHERE user_id = $1',
    [req.params.id]);
  res.json(result.rows[0]);
});

app.listen(3000, () => console.log('http://localhost:3000'));
