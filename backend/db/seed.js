require('dotenv').config();
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const FONSECA_PHOTOS_DIR = 'C:\\Users\\Gisel\\AppData\\Local\\Temp\\claude\\f56a32fadf0f56bf\\9258c54c-d8d7-4cd5-bc98-28c535ed8c6e\\scratchpad\\david-fonseca';

const ARTISTS = [
  { casId: 'F96-50214', email: 'mcamila.mafla@example.com', password: 'CasDemo123', firstName: 'Maria Camila', lastName: 'Mafla Rendón', gender: 'Female', birthDate: '1996-07-22', nacionalidadValue: 'Colombia', discipline: 'Baile · Contemporáneo', mainSkillValue: 'Dancer', aniosExp: '6', nivelIngles: 'B2', nivelInglesId: 'ei3', estaturaValor: '165', estaturaUnidad: 'cm', pais: 'Colombia', paisValue: 'Colombia', ciudad: 'Cali', instagram: '@camila.mafla', profileCompletion: 78, isDemo: true, verified: true },
  { casId: 'M91-77038', email: 'jefersson.valencia@example.com', password: 'CasDemo123', firstName: 'Jefersson', lastName: 'Valencia Arias', gender: 'Male', birthDate: '1991-04-10', nacionalidadValue: 'Colombia', discipline: 'Música · Percusión', mainSkillValue: 'Musician', aniosExp: '9', nivelIngles: 'A1–A2', nivelInglesId: 'ei1', estaturaValor: '178', estaturaUnidad: 'cm', pais: 'Colombia', paisValue: 'Colombia', ciudad: 'Bogotá', instagram: '@jefersson.va', profileCompletion: 54, isDemo: true, verified: true },
  { casId: 'F98-20461', email: 'paula.morales@example.com', password: 'CasDemo123', firstName: 'Paula', lastName: 'Morales', gender: 'Female', birthDate: '1998-02-18', nacionalidadValue: 'Colombia', discipline: 'Actuación', mainSkillValue: 'Actor / Actress', aniosExp: '5', nivelIngles: 'C1–C2', nivelInglesId: 'ei4', estaturaValor: '168', estaturaUnidad: 'cm', pais: 'Panama', paisValue: 'Panama', ciudad: 'Ciudad de Panamá', instagram: '@paula.morales', profileCompletion: 88, isDemo: true, verified: true },
  { casId: 'M96-33895', email: 'frederick.alvear@example.com', password: 'CasDemo123', firstName: 'Frederick', lastName: 'Alvear Varon', gender: 'Male', birthDate: '1996-09-05', nacionalidadValue: 'Colombia', discipline: 'Circo · Acrobacia', mainSkillValue: 'Circus', aniosExp: '10', nivelIngles: 'B1', nivelInglesId: 'ei2', estaturaValor: '180', estaturaUnidad: 'cm', pais: 'United States', paisValue: 'United States', ciudad: 'Fort Lauderdale', instagram: '@fred.alvear', profileCompletion: 95, isDemo: true, verified: true },
  { casId: 'F98-61027', email: 'angie.duque@example.com', password: 'CasDemo123', firstName: 'Angie Marcela', lastName: 'Duque Posso', gender: 'Female', birthDate: '1998-11-30', nacionalidadValue: 'Colombia', discipline: 'Baile · Salsa', mainSkillValue: 'Dancer', followUpValue: 'Salsa', aniosExp: '7', nivelIngles: 'C1–C2', nivelInglesId: 'ei4', estaturaValor: '162', estaturaUnidad: 'cm', pais: 'Argentina', paisValue: 'Argentina', ciudad: 'Buenos Aires', instagram: '@angie.duque', profileCompletion: 92, isDemo: true, verified: true },
  { casId: 'F96-15902', email: 'natalia.valencia@example.com', password: 'CasDemo123', firstName: 'Natalia', lastName: 'Valencia M', gender: 'Female', birthDate: '1996-05-14', nacionalidadValue: 'Colombia', discipline: 'Canto', mainSkillValue: 'Singer', aniosExp: '5', nivelIngles: 'B1', nivelInglesId: 'ei2', estaturaValor: '160', estaturaUnidad: 'cm', pais: 'Colombia', paisValue: 'Colombia', ciudad: 'Cali', instagram: '@natalia.valencia', profileCompletion: 70, isDemo: true, verified: true },
  { casId: 'F98-74310', email: 'victoria.florez@example.com', password: 'CasDemo123', firstName: 'Victoria', lastName: 'Florez Duque', gender: 'Female', birthDate: '1998-08-21', nacionalidadValue: 'Colombia', discipline: 'Baile urbano', mainSkillValue: 'Dancer', aniosExp: '4', nivelIngles: 'A1–A2', nivelInglesId: 'ei1', estaturaValor: '164', estaturaUnidad: 'cm', pais: 'Colombia', paisValue: 'Colombia', ciudad: 'Medellín', instagram: '@victoria.florez', profileCompletion: 66, isDemo: true, verified: false },
  { casId: 'M04-60173', email: 'carlos.garcia@example.com', password: 'CasDemo123', firstName: 'Carlos Adolfo', lastName: 'Garcia Vivas', gender: 'Male', birthDate: '2004-01-09', nacionalidadValue: 'Colombia', discipline: 'Actuación', mainSkillValue: 'Actor / Actress', aniosExp: '2', nivelIngles: 'A1–A2', nivelInglesId: 'ei1', estaturaValor: '175', estaturaUnidad: 'cm', pais: 'Colombia', paisValue: 'Colombia', ciudad: 'Cali', instagram: '@carlos.garciav', profileCompletion: 40, isDemo: true, verified: true }
];

// Cuenta de prueba fija y predecible para seguir probando el lado de artista sin
// depender de las cuentas de muestra ni de Fonseca.
const TEST_ARTIST = {
  casId: 'F95-00001', email: 'prueba@casglobalproductions.com', password: 'Prueba2026',
  firstName: 'Artista', lastName: 'De Prueba', gender: 'Female',
  birthDate: '1995-05-15', nacionalidadValue: 'Colombia',
  discipline: 'Prueba', mainSkillValue: 'Dancer',
  pais: 'Colombia', paisValue: 'Colombia', ciudad: 'Bogotá',
  profileCompletion: 50, isDemo: false, verified: true
};

const FONSECA = {
  casId: 'M93-22229', email: 'cristianfonseca04@gmail.com', password: 'CasFonseca2026',
  firstName: 'Cristian', lastName: 'Fonseca Perdomo', gender: 'Male',
  birthDate: '1993-01-04', nacionalidadValue: 'Colombia',
  discipline: 'Bailarín / Bailarina · Salsa', mainSkillValue: 'Dancer', followUpValue: 'Salsa',
  aniosExp: '15', nivelIngles: 'B1', nivelInglesId: 'ei2',
  estaturaValor: '168', estaturaUnidad: 'cm', pesoValor: '71', pesoUnidad: 'kg',
  pais: 'Colombia', paisValue: 'Colombia', ciudad: 'Cali',
  whatsapp: '+57 316 052 7434', instagram: '@cristiandavidfonseca',
  passportNum: 'AT216309', passportExp: '2027-11-14', stcwExp: '2028-04-24',
  visaTipo: 'C1/D (Tripulante / tránsito — EE. UU.)', visaExp: '2027-11-14',
  profileCompletion: 90, isDemo: false, verified: false
};

async function insertArtist(client, a) {
  const passwordHash = await bcrypt.hash(a.password, 10);
  const result = await client.query(
    `INSERT INTO artists (
      cas_id, email, password_hash, first_name, last_name, gender, birth_date, nacionalidad_value,
      discipline, main_skill_value, follow_up_value, anios_exp, nivel_ingles, nivel_ingles_id,
      estatura_valor, estatura_unidad, peso_valor, peso_unidad, pais, pais_value, ciudad,
      whatsapp, instagram, passport_num, passport_exp, stcw_exp, peme_exp, visa_tipo, visa_exp,
      profile_completion, verified, rejected, is_demo
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
      NULLIF($25,'')::date, NULLIF($26,'')::date, NULLIF($27,'')::date, $28, NULLIF($29,'')::date,
      $30, $31, false, $32
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id`,
    [
      a.casId, a.email, passwordHash, a.firstName, a.lastName || '', a.gender, a.birthDate, a.nacionalidadValue,
      a.discipline || '', a.mainSkillValue || '', a.followUpValue || '', a.aniosExp || '', a.nivelIngles || '', a.nivelInglesId || '',
      a.estaturaValor || '', a.estaturaUnidad || 'cm', a.pesoValor || '', a.pesoUnidad || 'kg', a.pais || '', a.paisValue, a.ciudad || '',
      a.whatsapp || '', a.instagram || '', a.passportNum || '', a.passportExp || '', a.stcwExp || '', a.pemeExp || '', a.visaTipo || '', a.visaExp || '',
      a.profileCompletion || 0, !!a.verified, !!a.isDemo
    ]
  );
  return result.rows[0] ? result.rows[0].id : null;
}

// La cuenta de staff inicial sale de variables de entorno, nunca de texto plano en el
// código — este archivo se sube a un repositorio público. Sin STAFF_SEED_EMAIL/PASSWORD
// configuradas (ver .env.example), simplemente no siembra ninguna cuenta de staff.
const STAFF = (process.env.STAFF_SEED_EMAIL && process.env.STAFF_SEED_PASSWORD)
  ? [{ email: process.env.STAFF_SEED_EMAIL, password: process.env.STAFF_SEED_PASSWORD, name: process.env.STAFF_SEED_NAME || 'CAS Global Productions', role: 'admin' }]
  : [];

async function insertStaff(client, s) {
  const passwordHash = await bcrypt.hash(s.password, 10);
  const result = await client.query(
    `INSERT INTO staff_users (email, password_hash, name, role) VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [s.email, passwordHash, s.name, s.role]
  );
  return result.rows[0] ? result.rows[0].id : null;
}

async function insertFile(client, artistId, category, filePath, mimeType) {
  const data = fs.readFileSync(filePath);
  await client.query(
    'INSERT INTO artist_files (artist_id, category, file_name, mime_type, data) VALUES ($1,$2,$3,$4,$5)',
    [artistId, category, filePath.split(/[\\/]/).pop(), mimeType, data]
  );
}

async function main() {
  const client = await pool.connect();
  try {
    for (const a of ARTISTS) {
      const id = await insertArtist(client, a);
      if (id) console.log(`Sembrado: ${a.casId} — ${a.firstName}`);
    }

    const testArtistId = await insertArtist(client, TEST_ARTIST);
    if (testArtistId) console.log(`Sembrado: ${TEST_ARTIST.casId} — ${TEST_ARTIST.firstName}`);

    const fonsecaId = await insertArtist(client, FONSECA);
    if (fonsecaId) {
      console.log(`Sembrado: ${FONSECA.casId} — ${FONSECA.firstName}`);
      const headshotPath = `${FONSECA_PHOTOS_DIR}\\headshot.png`;
      const fotoPath = `${FONSECA_PHOTOS_DIR}\\foto-artistica.jpg`;
      if (fs.existsSync(headshotPath)) await insertFile(client, fonsecaId, 'headshot_primer', headshotPath, 'image/png');
      if (fs.existsSync(fotoPath)) await insertFile(client, fonsecaId, 'headshot_cuerpo', fotoPath, 'image/jpeg');
      console.log('Fotos de Fonseca sembradas.');
    }

    for (const s of STAFF) {
      const id = await insertStaff(client, s);
      if (id) console.log(`Staff sembrado: ${s.email}`);
    }

    if (fonsecaId) {
      const existingContract = await client.query('SELECT id FROM contracts WHERE artist_id = $1', [fonsecaId]);
      if (!existingContract.rows.length) {
        await client.query(
          `INSERT INTO contracts (artist_id, titulo, rol, pago, inicio, fin)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [fonsecaId, 'Bailarín principal — Royal Caribbean', 'Bailarín principal', 'USD 2,400/mes', '2027-01-15', '2027-07-15']
        );
        console.log('Contrato de prueba sembrado para Fonseca.');
      }
    }

    console.log('Semilla completa.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error al sembrar:', err);
  process.exit(1);
});
