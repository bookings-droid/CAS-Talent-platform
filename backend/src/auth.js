const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'cas_session';
const STAFF_COOKIE_NAME = 'cas_staff_session';

function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function setSessionCookie(res, artistId) {
  const token = jwt.sign({ artistId }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.artistId = payload.artistId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

function getArtistIdFromRequest(req) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET).artistId;
  } catch (e) {
    return null;
  }
}

// Sesión del equipo de CAS para el Backoffice — cookie separada de la de artistas, para
// que una persona pueda estar conectada como artista y como staff en el mismo navegador
// sin que una sesión pise a la otra.
function setStaffSessionCookie(res, staffId) {
  const token = jwt.sign({ staffId }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie(STAFF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function clearStaffSessionCookie(res) {
  res.clearCookie(STAFF_COOKIE_NAME);
}

function requireStaffAuth(req, res, next) {
  const token = req.cookies[STAFF_COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.staffId = payload.staffId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

function getStaffIdFromRequest(req) {
  const token = req.cookies[STAFF_COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET).staffId;
  } catch (e) {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  getArtistIdFromRequest,
  setStaffSessionCookie,
  clearStaffSessionCookie,
  requireStaffAuth,
  getStaffIdFromRequest
};
