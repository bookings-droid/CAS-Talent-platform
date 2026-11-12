function dateStr(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

// Convierte una fila de la tabla `artists` (snake_case, tipos de Postgres) al mismo
// formato de objeto "account" que ya usaba el prototipo en el navegador (camelCase,
// fechas como texto 'YYYY-MM-DD'), para que el frontend casi no tenga que cambiar.
function artistRowToJson(row) {
  return {
    id: row.id,
    casId: row.cas_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    gender: row.gender,
    birthDate: dateStr(row.birth_date),
    nacionalidadValue: row.nacionalidad_value,
    discipline: row.discipline,
    mainSkillValue: row.main_skill_value,
    followUpValue: row.follow_up_value,
    aniosExp: row.anios_exp,
    nivelIngles: row.nivel_ingles,
    nivelInglesId: row.nivel_ingles_id,
    estaturaValor: row.estatura_valor,
    estaturaUnidad: row.estatura_unidad,
    pesoValor: row.peso_valor,
    pesoUnidad: row.peso_unidad,
    pais: row.pais,
    paisValue: row.pais_value,
    ciudad: row.ciudad,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    passportNum: row.passport_num,
    passportExp: dateStr(row.passport_exp),
    stcwExp: dateStr(row.stcw_exp),
    pemeExp: dateStr(row.peme_exp),
    visaTipo: row.visa_tipo,
    visaExp: dateStr(row.visa_exp),
    profileCompletion: row.profile_completion,
    verified: row.verified,
    rejected: row.rejected,
    isDemo: row.is_demo,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

module.exports = { artistRowToJson, dateStr };
