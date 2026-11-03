require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Valida el cuerpo; devuelve mensaje de error o null
function validar({ nombre, precio }) {
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 80)
    return 'nombre es requerido (máx. 80 caracteres)';
  if (typeof precio !== 'number' || !isFinite(precio) || precio < 0 || precio >= 1e8)
    return 'precio debe ser un número válido >= 0';
  return null;
}

app.get('/productos', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tb_productos');
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/productos/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tb_productos WHERE pk_clave_pro = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

app.post('/productos', async (req, res, next) => {
  try {
    const err = validar(req.body);
    if (err) return res.status(400).json({ error: err });
    const { nombre, precio } = req.body;
    const [r] = await pool.query('INSERT INTO tb_productos (nombre, precio) VALUES (?, ?)', [nombre.trim(), precio]);
    res.status(201).json({ pk_clave_pro: r.insertId, nombre: nombre.trim(), precio });
  } catch (e) { next(e); }
});

app.put('/productos/:id', async (req, res, next) => {
  try {
    const err = validar(req.body);
    if (err) return res.status(400).json({ error: err });
    const { nombre, precio } = req.body;
    const [r] = await pool.query('UPDATE tb_productos SET nombre = ?, precio = ? WHERE pk_clave_pro = ?',
      [nombre.trim(), precio, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ pk_clave_pro: Number(req.params.id), nombre: nombre.trim(), precio });
  } catch (e) { next(e); }
});

app.delete('/productos/:id', async (req, res, next) => {
  try {
    const [r] = await pool.query('DELETE FROM tb_productos WHERE pk_clave_pro = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Producto no encontrado' });
    res.status(204).end();
  } catch (e) { next(e); }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`));
