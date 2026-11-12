require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const { router: profileRoutes } = require('./routes/profile.routes');
const filesRoutes = require('./routes/files.routes');
const backofficeRoutes = require('./routes/backoffice.routes');
const draftsRoutes = require('./routes/drafts.routes');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/me', profileRoutes);
app.use('/api', filesRoutes);
app.use('/api/backoffice', backofficeRoutes);
app.use('/api', draftsRoutes);

app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CAS Talent Platform backend escuchando en http://localhost:${PORT}`);
});
