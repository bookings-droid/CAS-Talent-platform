const express = require('express');
const { pool } = require('../db');
const { artistRowToJson } = require('../serialize');
const { updateArtist } = require('./profile.routes');
const { requireStaffAuth } = require('../auth');
const { contractRowToJson, serveSignatureForStaff } = require('./contracts.routes');

const router = express.Router();

// Todo lo de Backoffice exige sesión real del equipo de CAS (ver staff-auth.routes.js) —
// antes esta parte no tenía ningún login, a propósito, mientras no hubiera datos
// sensibles de verdad detrás.
router.use(requireStaffAuth);

// Cualquier artista (de muestra o registrado de verdad) que todavía no ha sido aprobado
// ni rechazado.
router.get('/queue', async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM artists WHERE verified = false AND rejected = false ORDER BY created_at`
  );
  res.json({ artists: result.rows.map(artistRowToJson) });
});

router.post('/applications/:id/approve', async (req, res) => {
  const result = await pool.query(
    `UPDATE artists SET verified = true, rejected = false, updated_at = now() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  res.json({ artist: artistRowToJson(result.rows[0]) });
});

router.post('/applications/:id/reject', async (req, res) => {
  const result = await pool.query(
    `UPDATE artists SET verified = false, rejected = true, updated_at = now() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  res.json({ artist: artistRowToJson(result.rows[0]) });
});

// Directorio de artistas verificados (incluye los de muestra e `is_demo`), filtrable por texto.
router.get('/directory', async (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const result = await pool.query(
    `SELECT * FROM artists WHERE verified = true AND banned = false AND (
       $1 = '' OR lower(first_name || ' ' || coalesce(last_name,'')) LIKE '%' || $1 || '%'
       OR lower(cas_id) LIKE '%' || $1 || '%' OR lower(coalesce(discipline,'')) LIKE '%' || $1 || '%'
     ) ORDER BY first_name`,
    [q]
  );
  res.json({ artists: result.rows.map(artistRowToJson) });
});

// Perfil completo de un artista para el modo administrador (ver/editar desde el Directorio).
router.get('/artists/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM artists WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  res.json({ artist: artistRowToJson(result.rows[0]) });
});

router.put('/artists/:id', async (req, res) => {
  const updated = await updateArtist(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'No encontrado' });
  res.json({ artist: artistRowToJson(updated) });
});

// Conteos reales para las tarjetas de Resumen del Backoffice.
router.get('/stats', async (req, res) => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM artists) AS total_artists,
      (SELECT COUNT(*) FROM artists WHERE profile_completion >= 70) AS profiles_70plus,
      (
        (SELECT COUNT(*) FROM artists WHERE passport_exp IS NOT NULL AND passport_exp <= CURRENT_DATE + INTERVAL '60 days') +
        (SELECT COUNT(*) FROM artists WHERE stcw_exp IS NOT NULL AND stcw_exp <= CURRENT_DATE + INTERVAL '60 days') +
        (SELECT COUNT(*) FROM artists WHERE peme_exp IS NOT NULL AND peme_exp <= CURRENT_DATE + INTERVAL '60 days') +
        (SELECT COUNT(*) FROM artists WHERE visa_exp IS NOT NULL AND visa_exp <= CURRENT_DATE + INTERVAL '60 days')
      ) AS expiring_docs
  `);
  const row = result.rows[0];
  res.json({
    totalArtists: Number(row.total_artists),
    profiles70Plus: Number(row.profiles_70plus),
    expiringDocs: Number(row.expiring_docs)
  });
});

// Elimina una cuenta por completo (sus archivos se borran en cascada).
router.delete('/artists/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM artists WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true });
});

// Suspende una cuenta sin borrarla: no puede iniciar sesión, pero su historial (contratos,
// documentos) queda intacto por si se reactiva después.
router.post('/artists/:id/ban', async (req, res) => {
  const { reason } = req.body || {};
  const result = await pool.query(
    `UPDATE artists SET banned = true, banned_at = now(), banned_reason = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [reason || '', req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  res.json({ artist: artistRowToJson(result.rows[0]) });
});

router.post('/artists/:id/unban', async (req, res) => {
  const result = await pool.query(
    `UPDATE artists SET banned = false, banned_at = NULL, banned_reason = NULL, updated_at = now() WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  res.json({ artist: artistRowToJson(result.rows[0]) });
});

// Seguimiento de onboarding/firma de todos los contratos (para la pantalla de Contratos
// del Backoffice) — opcionalmente filtrable por artista.
router.get('/contracts', async (req, res) => {
  const artistId = req.query.artistId;
  const result = await pool.query(
    artistId
      ? 'SELECT c.*, a.first_name, a.last_name, a.cas_id FROM contracts c JOIN artists a ON a.id = c.artist_id WHERE c.artist_id = $1 ORDER BY c.created_at DESC'
      : 'SELECT c.*, a.first_name, a.last_name, a.cas_id FROM contracts c JOIN artists a ON a.id = c.artist_id ORDER BY c.created_at DESC',
    artistId ? [artistId] : []
  );
  res.json({
    contracts: result.rows.map(row => ({
      ...contractRowToJson(row),
      artistName: row.first_name + (row.last_name ? ' ' + row.last_name : ''),
      casId: row.cas_id
    }))
  });
});

// Crea un contrato nuevo para un artista — lo verá en su pestaña "Mis contratos" y tendrá
// que completar el onboarding (5 pasos) y firmar antes de quedar "firmado".
router.post('/contracts', async (req, res) => {
  const { artistId, titulo, rol, pago, inicio, fin } = req.body || {};
  if (!artistId || !titulo) return res.status(400).json({ error: 'Falta artista o título' });
  const result = await pool.query(
    `INSERT INTO contracts (artist_id, titulo, rol, pago, inicio, fin, created_by)
     VALUES ($1,$2,$3,$4, NULLIF($5,'')::date, NULLIF($6,'')::date, $7) RETURNING *`,
    [artistId, titulo, rol || '', pago || '', inicio || '', fin || '', req.staffId]
  );
  res.json({ contract: contractRowToJson(result.rows[0]) });
});

router.get('/contracts/:id/signature', serveSignatureForStaff);

module.exports = router;
