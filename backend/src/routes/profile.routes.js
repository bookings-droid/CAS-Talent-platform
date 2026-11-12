const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../auth');
const { artistRowToJson } = require('../serialize');

const router = express.Router();

const EDITABLE_FIELDS = [
  ['firstName', 'first_name'], ['lastName', 'last_name'], ['birthDate', 'birth_date'],
  ['nacionalidadValue', 'nacionalidad_value'], ['discipline', 'discipline'],
  ['mainSkillValue', 'main_skill_value'], ['followUpValue', 'follow_up_value'],
  ['aniosExp', 'anios_exp'], ['nivelIngles', 'nivel_ingles'], ['nivelInglesId', 'nivel_ingles_id'],
  ['estaturaValor', 'estatura_valor'], ['estaturaUnidad', 'estatura_unidad'],
  ['pesoValor', 'peso_valor'], ['pesoUnidad', 'peso_unidad'],
  ['pais', 'pais'], ['paisValue', 'pais_value'], ['ciudad', 'ciudad'],
  ['whatsapp', 'whatsapp'], ['instagram', 'instagram'],
  ['passportNum', 'passport_num'], ['passportExp', 'passport_exp'],
  ['stcwExp', 'stcw_exp'], ['pemeExp', 'peme_exp'],
  ['visaTipo', 'visa_tipo'], ['visaExp', 'visa_exp']
];
const DATE_FIELDS = new Set(['birthDate', 'passportExp', 'stcwExp', 'pemeExp', 'visaExp']);

async function updateArtist(artistId, body) {
  const sets = [];
  const values = [];
  let i = 1;
  for (const [jsKey, col] of EDITABLE_FIELDS) {
    if (!(jsKey in body)) continue;
    const raw = body[jsKey];
    if (DATE_FIELDS.has(jsKey)) {
      sets.push(`${col} = NULLIF($${i}, '')::date`);
    } else {
      sets.push(`${col} = $${i}`);
    }
    values.push(raw || '');
    i++;
  }
  if (!sets.length) return pool.query('SELECT * FROM artists WHERE id = $1', [artistId]).then(r => r.rows[0]);
  sets.push('updated_at = now()');
  values.push(artistId);
  const result = await pool.query(
    `UPDATE artists SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
}

router.get('/', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM artists WHERE id = $1', [req.artistId]);
  if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  res.json({ artist: artistRowToJson(result.rows[0]) });
});

router.put('/', requireAuth, async (req, res) => {
  const updated = await updateArtist(req.artistId, req.body || {});
  res.json({ artist: artistRowToJson(updated) });
});

module.exports = { router, updateArtist };
