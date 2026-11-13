const express = require('express');
const { pool } = require('../db');
const { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie, getArtistIdFromRequest } = require('../auth');
const { artistRowToJson } = require('../serialize');

const router = express.Router();

function generateCasId(gender, birthDate) {
  const genderMap = { Male: 'M', Female: 'F', Other: 'O' };
  const letter = genderMap[gender] || 'X';
  const year = birthDate ? String(birthDate).slice(2, 4) : String(new Date().getFullYear()).slice(-2);
  const random5 = String(Math.floor(10000 + Math.random() * 90000));
  return `${letter}${year}-${random5}`;
}

function buildWelcomeEmail(firstName, casId, gender) {
  const saludo = gender === 'Male' ? 'Bienvenido' : gender === 'Female' ? 'Bienvenida' : 'Bienvenido/a';
  const subject = `¡${saludo} a CAS Talent, ${firstName}! Tu aplicación fue recibida ✓`;
  const body =
    `<p>Hola <strong>${firstName}</strong>,</p>` +
    `<p>¡Gracias por inscribirte en <strong>CAS Talent Platform</strong>! Ya haces parte de nuestra base de artistas para castings internacionales.</p>` +
    `<p>Tu número de identificación CAS es: <strong>${casId}</strong></p>` +
    `<p>Ya puedes iniciar sesión cuando quieras con tu correo y la contraseña que creaste.</p>` +
    `<p>Nuestro equipo de casting revisará tu perfil y se pondrá en contacto si surge una oportunidad para ti.</p>` +
    `<p>¡${saludo} a CAS!<br>El equipo de CAS Global Productions</p>`;
  return { subject, body };
}

router.post('/register', async (req, res) => {
  const b = req.body || {};
  const required = ['firstName', 'lastName', 'gender', 'birthDate', 'nacionalidadValue', 'paisValue', 'email', 'password'];
  const missing = required.filter(k => !b[k]);
  if (missing.length) {
    return res.status(400).json({ error: 'Faltan campos obligatorios', missing });
  }
  if (String(b.password).length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres' });
  }

  const existing = await pool.query('SELECT id FROM artists WHERE lower(email) = lower($1)', [b.email]);
  if (existing.rows.length) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
  }

  const casId = generateCasId(b.gender, b.birthDate);
  const passwordHash = await hashPassword(b.password);

  const result = await pool.query(
    `INSERT INTO artists (
      cas_id, email, password_hash, first_name, last_name, gender, birth_date, nacionalidad_value,
      discipline, main_skill_value, follow_up_value, anios_exp, nivel_ingles, nivel_ingles_id,
      estatura_valor, estatura_unidad, peso_valor, peso_unidad, pais, pais_value, ciudad,
      whatsapp, instagram, passport_num, passport_exp, stcw_exp, peme_exp, visa_tipo, visa_exp,
      profile_completion, verified
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
      NULLIF($25,'')::date, NULLIF($26,'')::date, NULLIF($27,'')::date, $28, NULLIF($29,'')::date, $30, false
    ) RETURNING *`,
    [
      casId, b.email, passwordHash, b.firstName, b.lastName, b.gender, b.birthDate, b.nacionalidadValue,
      b.discipline || '', b.mainSkillValue || '', b.followUpValue || '', b.aniosExp || '', b.nivelIngles || '', b.nivelInglesId || '',
      b.estaturaValor || '', b.estaturaUnidad || 'cm', b.pesoValor || '', b.pesoUnidad || 'kg', b.pais || '', b.paisValue, b.ciudad || '',
      b.whatsapp || '', b.instagram || '', b.passportNum || '', b.passportExp || '', b.stcwExp || '', b.pemeExp || '', b.visaTipo || '', b.visaExp || '',
      b.profileCompletion || 0
    ]
  );

  const artist = result.rows[0];

  // Si subió fotos/documentos antes de terminar el registro (Material, en Inscripción),
  // esos archivos quedaron en pending_files bajo un "draft token" temporal — se mueven
  // ahora a artist_files, ya asociados a la cuenta recién creada.
  if (b.draftToken) {
    await pool.query(
      `INSERT INTO artist_files (artist_id, category, file_name, mime_type, data)
       SELECT $1, category, file_name, mime_type, data FROM pending_files WHERE draft_token = $2`,
      [artist.id, b.draftToken]
    );
    await pool.query('DELETE FROM pending_files WHERE draft_token = $1', [b.draftToken]);
  }

  const mail = buildWelcomeEmail(artist.first_name, artist.cas_id, artist.gender);
  res.status(201).json({ artist: artistRowToJson(artist), welcomeEmail: mail });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña requeridos' });

  const result = await pool.query('SELECT * FROM artists WHERE lower(email) = lower($1)', [email]);
  const artist = result.rows[0];
  if (!artist) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });

  const ok = await verifyPassword(password, artist.password_hash);
  if (!ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  if (artist.banned) return res.status(403).json({ error: 'Esta cuenta fue suspendida. Contacta a CAS si crees que es un error.' });

  setSessionCookie(res, artist.id);
  res.json({ artist: artistRowToJson(artist) });
});

// Simula "Continuar con Google/Apple": entra sin pedir contraseña, pero SOLO para las
// cuentas de muestra (is_demo = true) — nunca para artistas reales, que sí necesitan su
// contraseña real.
router.post('/oauth-login', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Correo requerido' });
  const result = await pool.query('SELECT * FROM artists WHERE lower(email) = lower($1) AND is_demo = true', [email]);
  const artist = result.rows[0];
  if (!artist) return res.status(401).json({ error: 'Cuenta no disponible para este acceso simulado.' });
  if (artist.banned) return res.status(403).json({ error: 'Esta cuenta fue suspendida.' });
  setSessionCookie(res, artist.id);
  res.json({ artist: artistRowToJson(artist) });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  const artistId = getArtistIdFromRequest(req);
  if (!artistId) return res.status(401).json({ error: 'No autenticado' });
  const result = await pool.query('SELECT * FROM artists WHERE id = $1', [artistId]);
  if (!result.rows[0]) return res.status(401).json({ error: 'No autenticado' });
  if (result.rows[0].banned) {
    clearSessionCookie(res);
    return res.status(403).json({ error: 'Esta cuenta fue suspendida.' });
  }
  res.json({ artist: artistRowToJson(result.rows[0]) });
});

// Lista liviana de cuentas de muestra, usada solo por el selector simulado de
// "Continuar con Google/Apple" (no hay backend de OAuth real detrás).
router.get('/demo-accounts', async (req, res) => {
  const result = await pool.query(
    `SELECT id, cas_id as "casId", email, first_name as "firstName", last_name as "lastName"
     FROM artists WHERE is_demo = true ORDER BY first_name`
  );
  res.json({ accounts: result.rows });
});

module.exports = router;
