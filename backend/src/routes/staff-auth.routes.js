const express = require('express');
const { pool } = require('../db');
const { verifyPassword, setStaffSessionCookie, clearStaffSessionCookie, requireStaffAuth } = require('../auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Falta correo o contraseña' });
  const result = await pool.query('SELECT * FROM staff_users WHERE email = $1', [String(email).toLowerCase()]);
  const staff = result.rows[0];
  if (!staff || !(await verifyPassword(password, staff.password_hash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }
  setStaffSessionCookie(res, staff.id);
  res.json({ staff: { id: staff.id, email: staff.email, name: staff.name, role: staff.role } });
});

router.post('/logout', (req, res) => {
  clearStaffSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireStaffAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM staff_users WHERE id = $1', [req.staffId]);
  const staff = result.rows[0];
  if (!staff) return res.status(401).json({ error: 'No autenticado' });
  res.json({ staff: { id: staff.id, email: staff.email, name: staff.name, role: staff.role } });
});

module.exports = router;
