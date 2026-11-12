const express = require('express');
const multer = require('multer');
const { pool } = require('../db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = express.Router();

// Sube una foto/documento ANTES de que la persona termine de registrarse (todavía no
// tiene sesión). El navegador genera un "draft token" aleatorio al abrir Inscripción;
// estos archivos se asocian al artista real en el momento del registro (ver auth.routes.js).
router.post('/drafts/:token/files', upload.single('file'), async (req, res) => {
  const category = req.body.category;
  if (!category) return res.status(400).json({ error: 'Falta la categoría' });
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo' });

  const result = await pool.query(
    `INSERT INTO pending_files (draft_token, category, file_name, mime_type, data)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, category, file_name, mime_type, created_at`,
    [req.params.token, category, req.file.originalname, req.file.mimetype, req.file.buffer]
  );
  res.status(201).json({ file: result.rows[0] });
});

router.get('/drafts/:token/files', async (req, res) => {
  const result = await pool.query(
    'SELECT id, category, file_name, mime_type, created_at FROM pending_files WHERE draft_token = $1 ORDER BY created_at',
    [req.params.token]
  );
  res.json({ files: result.rows });
});

// Sirve el byte real de un archivo de borrador (para la vista previa antes de registrarse).
router.get('/pending-files/:id', async (req, res) => {
  const result = await pool.query('SELECT file_name, mime_type, data FROM pending_files WHERE id = $1', [req.params.id]);
  const file = result.rows[0];
  if (!file) return res.status(404).end();
  res.set('Content-Type', file.mime_type);
  res.set('Content-Disposition', `inline; filename="${file.file_name}"`);
  res.send(file.data);
});

router.delete('/drafts/:token/files/:id', async (req, res) => {
  await pool.query('DELETE FROM pending_files WHERE draft_token = $1 AND id = $2', [req.params.token, req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
