const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

function contractRowToJson(row) {
  return {
    id: row.id,
    artistId: row.artist_id,
    titulo: row.titulo,
    rol: row.rol,
    pago: row.pago,
    inicio: row.inicio,
    fin: row.fin,
    estado: row.estado,
    onboardingStep: row.onboarding_step,
    signedName: row.signed_name,
    signedAt: row.signed_at,
    hasSignature: !!row.signature_data
  };
}

// Contratos del artista en sesión (pestaña "Mis contratos").
router.get('/me/contracts', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM contracts WHERE artist_id = $1 ORDER BY created_at DESC',
    [req.artistId]
  );
  res.json({ contracts: result.rows.map(contractRowToJson) });
});

// Avanza el onboarding de un contrato propio. Solo deja avanzar (nunca retroceder) y
// nunca más de un paso a la vez, aunque alguien intente saltarse pasos llamando la API
// directo — el guion del video en el navegador ya obliga a verlo completo paso por paso.
router.post('/me/contracts/:id/onboarding', requireAuth, async (req, res) => {
  const step = Number(req.body && req.body.step);
  if (!Number.isInteger(step) || step < 1 || step > 5) {
    return res.status(400).json({ error: 'Paso inválido' });
  }
  const current = await pool.query(
    'SELECT onboarding_step FROM contracts WHERE id = $1 AND artist_id = $2',
    [req.params.id, req.artistId]
  );
  if (!current.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  if (step !== current.rows[0].onboarding_step + 1) {
    return res.status(400).json({ error: 'Hay que completar los pasos en orden' });
  }
  const result = await pool.query(
    `UPDATE contracts SET onboarding_step = $1, updated_at = now() WHERE id = $2 AND artist_id = $3 RETURNING *`,
    [step, req.params.id, req.artistId]
  );
  res.json({ contract: contractRowToJson(result.rows[0]) });
});

// Firma final — solo si ya completó los 5 pasos del onboarding.
router.post('/me/contracts/:id/sign', requireAuth, async (req, res) => {
  const { name, signatureDataUrl } = req.body || {};
  if (!name || !signatureDataUrl) return res.status(400).json({ error: 'Falta el nombre o la firma' });
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(signatureDataUrl);
  if (!match) return res.status(400).json({ error: 'Firma inválida' });
  const current = await pool.query(
    'SELECT onboarding_step FROM contracts WHERE id = $1 AND artist_id = $2',
    [req.params.id, req.artistId]
  );
  if (!current.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  if (current.rows[0].onboarding_step < 5) {
    return res.status(400).json({ error: 'Completa el onboarding antes de firmar' });
  }
  const mime = match[1];
  const data = Buffer.from(match[2], 'base64');
  const result = await pool.query(
    `UPDATE contracts SET estado = 'firmado', signed_name = $1, signed_at = now(),
       signature_data = $2, signature_mime = $3, updated_at = now()
     WHERE id = $4 AND artist_id = $5 RETURNING *`,
    [name, data, mime, req.params.id, req.artistId]
  );
  res.json({ contract: contractRowToJson(result.rows[0]) });
});

// Sirve la imagen de la firma de un contrato propio.
router.get('/me/contracts/:id/signature', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT signature_data, signature_mime FROM contracts WHERE id = $1 AND artist_id = $2',
    [req.params.id, req.artistId]
  );
  const row = result.rows[0];
  if (!row || !row.signature_data) return res.status(404).end();
  res.set('Content-Type', row.signature_mime || 'image/png');
  res.send(row.signature_data);
});

// Para el staff (ver backoffice.routes.js, ya protegida con requireStaffAuth): la misma
// firma pero de cualquier contrato, sin importar de quién sea.
async function serveSignatureForStaff(req, res) {
  const result = await pool.query('SELECT signature_data, signature_mime FROM contracts WHERE id = $1', [req.params.id]);
  const row = result.rows[0];
  if (!row || !row.signature_data) return res.status(404).end();
  res.set('Content-Type', row.signature_mime || 'image/png');
  res.send(row.signature_data);
}

module.exports = { router, contractRowToJson, serveSignatureForStaff };
