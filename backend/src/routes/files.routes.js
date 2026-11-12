const express = require('express');
const multer = require('multer');
const { pool } = require('../db');
const { requireAuth, getArtistIdFromRequest } = require('../auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = express.Router();

// Sube una foto/video/documento del artista autenticado a una categoría
// (headshot_primer, headshot_cuerpo, showreel, sin_editar, ingles, passport, stcw, peme, vacunas).
router.post('/me/files', requireAuth, upload.single('file'), async (req, res) => {
  const category = req.body.category;
  if (!category) return res.status(400).json({ error: 'Falta la categoría' });
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo' });

  const result = await pool.query(
    `INSERT INTO artist_files (artist_id, category, file_name, mime_type, data)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, category, file_name, mime_type, created_at`,
    [req.artistId, category, req.file.originalname, req.file.mimetype, req.file.buffer]
  );
  res.status(201).json({ file: result.rows[0] });
});

// Lista los archivos del artista autenticado (opcionalmente filtrados por categoría).
router.get('/me/files', requireAuth, async (req, res) => {
  const { category } = req.query;
  const result = category
    ? await pool.query('SELECT id, category, file_name, mime_type, created_at FROM artist_files WHERE artist_id = $1 AND category = $2 ORDER BY created_at', [req.artistId, category])
    : await pool.query('SELECT id, category, file_name, mime_type, created_at FROM artist_files WHERE artist_id = $1 ORDER BY created_at', [req.artistId]);
  res.json({ files: result.rows });
});

// Lista los archivos de CUALQUIER artista (uso del Backoffice al ver un perfil).
router.get('/artists/:artistId/files', async (req, res) => {
  const result = await pool.query('SELECT id, category, file_name, mime_type, created_at FROM artist_files WHERE artist_id = $1 ORDER BY created_at', [req.params.artistId]);
  res.json({ files: result.rows });
});

// Sirve el archivo real (imagen/video/pdf) — no requiere sesión, igual que una URL pública de imagen.
router.get('/files/:id', async (req, res) => {
  const result = await pool.query('SELECT file_name, mime_type, data FROM artist_files WHERE id = $1', [req.params.id]);
  const file = result.rows[0];
  if (!file) return res.status(404).end();
  res.set('Content-Type', file.mime_type);
  res.set('Content-Disposition', `inline; filename="${file.file_name}"`);
  res.send(file.data);
});

router.delete('/files/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM artist_files WHERE id = $1 AND artist_id = $2', [req.params.id, req.artistId]);
  res.json({ ok: true });
});

module.exports = router;
