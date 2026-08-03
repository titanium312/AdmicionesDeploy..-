// catalogos/adolescencia.js

/**
 * Genera un perfil de adolescente coherente, donde los campos booleanos,
 * textos HEADSS y observaciones clínicas están alineados.
 * SIN NINGUNA REFERENCIA A VIOLENCIA (física, sexual, ni sospecha).
 */
const generarPerfilAdolescente = (edad, esMasculino) => {
    // 1. Definir probabilidades base según edad y género
    const probRiesgo = Math.min(0.3, edad / 100 + 0.05);
    const probConsumo = Math.min(0.4, (edad - 10) / 20);

    // 2. Decidir riesgos de forma conjunta (coherente)
    const tamizaje_riesgo_suicida = Math.random() < probRiesgo * 0.3;
    // --- VIOLENCIA ELIMINADA: siempre false ---
    const tamizaje_violencia_fisica = false;
    const tamizaje_violencia_sexual = false;
    const tamizaje_consumo_alcohol = Math.random() < probConsumo * 0.5;
    const tamizaje_consumo_spa = Math.random() < probConsumo * 0.2;
    const tamizaje_trastorno_alimenticio = Math.random() < probRiesgo * 0.1;

    // 3. Vida sexual (relacionada con edad y género)
    const inicio_relaciones_sexuales = Math.random() < (edad >= 14 ? 0.4 : 0.1);
    const usa_metodo_anticonceptivo = inicio_relaciones_sexuales && Math.random() < 0.7;
    const antecedente_embarazo = inicio_relaciones_sexuales && Math.random() < 0.05;
    const antecedente_its = inicio_relaciones_sexuales && Math.random() < 0.03;

    // 4. Hábitos
    const realiza_actividad_fisica = Math.random() < 0.65;
    const frecuencia_actividad_fisica = realiza_actividad_fisica ? (Math.random() < 0.6 ? "Diaria" : "3 veces por semana") : "Ocasional";
    const consumo_alimentos_ultraprocesados = Math.random() < 0.35;
    const horas_sueno_diario = Math.floor(Math.random() * 4) + 6; // 6-9
    const vacuna_tdpa_refuerzo = Math.random() < 0.7;
    const participa_grupo_juvenil = Math.random() < 0.2;

    // 5. Construir textos HEADSS coherentes (SIN VIOLENCIA)
    let headss_hogar = "Ambiente familiar estable.";
    if (Math.random() < 0.4) {
        const opciones = [
            "Vive con ambos padres.",
            "Convive con madre y hermanos.",
            "Relación familiar adecuada.",
            "Disputas ocasionales entre padres.",
            "Convivencia armónica."
        ];
        headss_hogar = opciones[Math.floor(Math.random() * opciones.length)];
    }

    let headss_educacion = "Buen rendimiento escolar.";
    if (Math.random() < 0.3) {
        const opciones = ["Asiste regularmente a clases.", "Sin dificultades académicas.", "Estudiante destacado.", "Presenta bajo rendimiento en matemáticas."];
        headss_educacion = opciones[Math.floor(Math.random() * opciones.length)];
    }

    let headss_actividades = "Actividad física diaria.";
    if (!realiza_actividad_fisica) {
        headss_actividades = "Sedentario, prefiere actividades pasivas.";
    } else if (Math.random() < 0.4) {
        const opciones = ["Practica deporte 3 veces por semana.", "Camina al colegio.", "Activo en deportes."];
        headss_actividades = opciones[Math.floor(Math.random() * opciones.length)];
    }

    let headss_drogas = "No consumo.";
    if (tamizaje_consumo_alcohol) {
        headss_drogas = "Ha probado alcohol en reuniones sociales.";
    } else if (tamizaje_consumo_spa) {
        headss_drogas = "Ha consumido sustancias psicoactivas esporádicamente.";
    } else if (Math.random() < 0.2) {
        headss_drogas = "Sin exposición a drogas.";
    }

    let headss_sexualidad = "No relaciones. Consejería SSR.";
    if (inicio_relaciones_sexuales) {
        if (esMasculino) {
            headss_sexualidad = `Inició relaciones sexuales a los ${Math.floor(Math.random() * 3 + 14)} años, ${usa_metodo_anticonceptivo ? "usa condón" : "sin método anticonceptivo"}.`;
        } else {
            headss_sexualidad = `Inició relaciones sexuales a los ${Math.floor(Math.random() * 3 + 14)} años, ${usa_metodo_anticonceptivo ? "usa anticonceptivos" : "sin método anticonceptivo"}.`;
        }
    } else {
        if (Math.random() < 0.2) {
            headss_sexualidad = "Sin actividad sexual. Consejería SSR.";
        }
    }

    let headss_suicidio = "Sin ideación.";
    if (tamizaje_riesgo_suicida) {
        headss_suicidio = "Refiere ideación suicida pasiva. Requiere valoración por salud mental.";
    } else if (Math.random() < 0.2) {
        headss_suicidio = "Niega ideación suicida. Refiere tristeza ocasional.";
    }

    // --- SEGURIDAD: SIN VIOLENCIA, solo entorno seguro ---
    let headss_seguridad = "Entorno seguro.";
    if (Math.random() < 0.2) {
        headss_seguridad = "Se siente seguro en su barrio y colegio.";
    }

    // 6. Observaciones generales coherentes (SIN VIOLENCIA)
    let observaciones = esMasculino ? "Adolescente sano, sin hallazgos." : "Adolescente sana, sin hallazgos.";
    if (tamizaje_riesgo_suicida || tamizaje_consumo_alcohol || tamizaje_consumo_spa || tamizaje_trastorno_alimenticio) {
        observaciones = esMasculino 
            ? "Adolescente con factores de riesgo identificados (conductuales). Requiere seguimiento." 
            : "Adolescente con factores de riesgo identificados (conductuales). Requiere seguimiento.";
    } else if (Math.random() < 0.3) {
        observaciones = esMasculino 
            ? "Control de rutina sin novedades." 
            : "Control de rutina sin novedades.";
    }

    // 7. Datos antropométricos y signos vitales (rangos normales)
    let rangoPeso, rangoTalla, rangoPA_sist, rangoPA_diast, rangoFC, rangoFR;

    if (edad >= 10 && edad <= 11) {
        rangoPeso = [30, 45];
        rangoTalla = [130, 150];
        rangoPA_sist = [100, 115];
        rangoPA_diast = [60, 70];
        rangoFC = [70, 100];
        rangoFR = [16, 20];
    } else if (edad >= 12 && edad <= 13) {
        rangoPeso = [40, 55];
        rangoTalla = [145, 160];
        rangoPA_sist = [105, 120];
        rangoPA_diast = [65, 75];
        rangoFC = [70, 95];
        rangoFR = [16, 20];
    } else if (edad >= 14 && edad <= 15) {
        rangoPeso = [45, 60];
        rangoTalla = [150, 170];
        rangoPA_sist = [110, 125];
        rangoPA_diast = [65, 80];
        rangoFC = [65, 90];
        rangoFR = [14, 18];
    } else if (edad >= 16 && edad <= 17) {
        rangoPeso = [50, 70];
        rangoTalla = [155, 175];
        rangoPA_sist = [110, 130];
        rangoPA_diast = [70, 80];
        rangoFC = [60, 85];
        rangoFR = [14, 18];
    } else if (edad >= 18 && edad <= 19) {
        rangoPeso = [55, 75];
        rangoTalla = [160, 180];
        rangoPA_sist = [115, 135];
        rangoPA_diast = [70, 85];
        rangoFC = [60, 80];
        rangoFR = [12, 16];
    } else {
        rangoPeso = [40, 70];
        rangoTalla = [140, 175];
        rangoPA_sist = [100, 130];
        rangoPA_diast = [60, 80];
        rangoFC = [60, 100];
        rangoFR = [14, 20];
    }

    if (esMasculino) {
        rangoPeso = rangoPeso.map(v => v + 2);
        rangoTalla = rangoTalla.map(v => v + 3);
    }

    const random = (min, max) => Math.round((Math.random() * (max - min) + min) * 10) / 10;
    const peso = random(rangoPeso[0], rangoPeso[1]);
    const talla = random(rangoTalla[0], rangoTalla[1]);
    const imc = peso / ((talla / 100) ** 2);

    // Detectar posible sobrepeso/bajo peso
    let estadoNutricional = "normal";
    if (imc > 25) estadoNutricional = "sobrepeso";
    else if (imc < 18.5) estadoNutricional = "bajo peso";

    // Ajustar observaciones si hay alteración nutricional
    if (estadoNutricional !== "normal") {
        observaciones += ` Se detecta ${estadoNutricional} (IMC ${imc.toFixed(1)}). Requiere valoración nutricional.`;
    }

    const pa_sist = Math.round(random(rangoPA_sist[0], rangoPA_sist[1]));
    const pa_diast = Math.round(random(rangoPA_diast[0], rangoPA_diast[1]));
    const fc = Math.round(random(rangoFC[0], rangoFC[1]));
    const fr = Math.round(random(rangoFR[0], rangoFR[1]));
    const temp = random(36.0, 37.0);
    const saturacion = Math.round(random(95, 99));

    const agudezaVisual = ["20/20", "20/25", "20/20", "20/20", "20/30"];
    const saludOral = [
        "Higiene adecuada.",
        "Remisión a odontología.",
        "Control odontológico pendiente.",
        "Caries en tratamiento."
    ];

    return {
        peso,
        talla,
        imc,
        pa_sist,
        pa_diast,
        fc,
        fr,
        temp,
        saturacion,
        estadoNutricional,
        tamizaje_riesgo_suicida,
        tamizaje_violencia_fisica,   // siempre false
        tamizaje_violencia_sexual,   // siempre false
        tamizaje_consumo_alcohol,
        tamizaje_consumo_spa,
        tamizaje_trastorno_alimenticio,
        inicio_relaciones_sexuales,
        usa_metodo_anticonceptivo,
        antecedente_embarazo,
        antecedente_its,
        realiza_actividad_fisica,
        frecuencia_actividad_fisica,
        consumo_alimentos_ultraprocesados,
        horas_sueno_diario,
        vacuna_tdpa_refuerzo,
        participa_grupo_juvenil,
        headss_hogar,
        headss_educacion,
        headss_actividades,
        headss_drogas,
        headss_sexualidad,
        headss_suicidio,
        headss_seguridad,
        observaciones,
        agudeza_visual_od: agudezaVisual[Math.floor(Math.random() * agudezaVisual.length)],
        agudeza_visual_oi: agudezaVisual[Math.floor(Math.random() * agudezaVisual.length)],
        salud_oral_evaluacion: saludOral[Math.floor(Math.random() * saludOral.length)]
    };
};

/**
 * Transforma los datos crudos de admisión al formato JSON de adolescencia,
 * con coherencia total entre campos.
 * SIN VIOLENCIA EN NINGÚN CAMPO.
 */
const adolescencia = (data, genero, edad) => {
    const { admision, paciente, entidad, historia, facturacion } = data;

    const hora = admision.hora_admision;
    const horaStr = `${String(hora.Hours).padStart(2, '0')}:${String(hora.Minutes).padStart(2, '0')}`;

    const esMasculino = (genero === 2 || genero === 'M' || genero === 'm');

    // Tanner
    let tanner = '';
    if (edad >= 10 && edad <= 11) tanner = 'I';
    else if (edad >= 12 && edad <= 13) tanner = 'II';
    else if (edad >= 14 && edad <= 15) tanner = 'III';
    else if (edad >= 16 && edad <= 17) tanner = 'IV';
    else if (edad >= 18) tanner = 'V';
    else tanner = 'No determinado';

    // VPH
    let vacunaHpvCompleta = false;
    let dosisHpvAplicadas = 0;
    if (!esMasculino) {
        if (edad >= 9 && edad <= 17) {
            vacunaHpvCompleta = true;
            dosisHpvAplicadas = 2;
        }
    } else {
        if (edad >= 9 && edad <= 14) {
            vacunaHpvCompleta = true;
            dosisHpvAplicadas = 2;
        }
    }

    const perfil = generarPerfilAdolescente(edad, esMasculino);

    // CIE-10 dinámico según edad
    const codigoDiagnosticoAdolescencia = (edad >= 10 && edad <= 19) ? "Z003" : "Z002";

    // Causa externa: SIEMPRE "15" (otra / enfermedad general) – sin violencia
    const causaExterna = "15";

    // Texto de enfermedad actual con CIE-10 y sin violencia
    let enfermedadActual = `Sin síntomas. Control de rutina en adolescencia (CIE-10: ${codigoDiagnosticoAdolescencia} - Examen del estado de desarrollo del adolescente). `;
    
    if (perfil.tamizaje_riesgo_suicida || perfil.tamizaje_consumo_alcohol || perfil.tamizaje_consumo_spa) {
        enfermedadActual += "Se identifican factores de riesgo psicosocial (conductuales). Requiere seguimiento por psicología. ";
    } else {
        enfermedadActual += "HEADSS: sin factores de riesgo. Consejería SSR. ";
    }

    if (perfil.estadoNutricional !== "normal") {
        enfermedadActual += `Paciente en ${perfil.estadoNutricional} (IMC ${perfil.imc.toFixed(1)}). Requiere valoración nutricional. `;
    }

    let analisis = `Tanner ${tanner}. Desarrollo acorde. Tamizajes `;
    if (perfil.tamizaje_riesgo_suicida || perfil.tamizaje_consumo_alcohol || perfil.tamizaje_consumo_spa) {
        analisis += "con hallazgos positivos (conductuales). ";
    } else {
        analisis += "ok. ";
    }
    analisis += "Remisiones a opto y odonto.";

    const motivoConsultaExterna = esMasculino
        ? `Control del joven sano masculino (${edad} años)`
        : `Control del joven sano femenino (${edad} años)`;

    // Construir adolescenciaData con perfil coherente (sin violencia)
    const adolescenciaData = {
        tamizaje_riesgo_suicida: perfil.tamizaje_riesgo_suicida,
        tamizaje_violencia_fisica: perfil.tamizaje_violencia_fisica,   // false
        tamizaje_violencia_sexual: perfil.tamizaje_violencia_sexual,   // false
        tamizaje_consumo_alcohol: perfil.tamizaje_consumo_alcohol,
        tamizaje_consumo_spa: perfil.tamizaje_consumo_spa,
        tamizaje_trastorno_alimenticio: perfil.tamizaje_trastorno_alimenticio,
        inicio_relaciones_sexuales: perfil.inicio_relaciones_sexuales,
        usa_metodo_anticonceptivo: perfil.usa_metodo_anticonceptivo,
        antecedente_embarazo: perfil.antecedente_embarazo,
        antecedente_its: perfil.antecedente_its,
        realiza_actividad_fisica: perfil.realiza_actividad_fisica,
        frecuencia_actividad_fisica: perfil.frecuencia_actividad_fisica,
        consumo_alimentos_ultraprocesados: perfil.consumo_alimentos_ultraprocesados,
        horas_sueno_diario: perfil.horas_sueno_diario,
        vacuna_hpV_completa: vacunaHpvCompleta,
        dosis_hpV_aplicadas: dosisHpvAplicadas,
        vacuna_tdpa_refuerzo: perfil.vacuna_tdpa_refuerzo,
        participa_grupo_juvenil: perfil.participa_grupo_juvenil,
        observaciones_adolescencia: perfil.observaciones,
        hallazgos_fisicos_signos_vitales_ta_adolescencia: `${perfil.pa_sist}/${perfil.pa_diast}`,
        hallazgos_fisicos_signos_vitales_fc_adolescencia: perfil.fc,
        hallazgos_fisicos_signos_vitales_fr_adolescencia: perfil.fr,
        hallazgos_fisicos_signos_vitales_t_adolescencia: perfil.temp.toFixed(1),
        hallazgos_fisicos_signos_vitales_peso_adolescencia: perfil.peso,
        hallazgos_fisicos_signos_vitales_talla_adolescencia: perfil.talla,
        hallazgos_fisicos_signos_vitales_imc_adolescencia: parseFloat(perfil.imc.toFixed(1)),
        headss_hogar: perfil.headss_hogar,
        headss_educacion: perfil.headss_educacion,
        headss_actividades: perfil.headss_actividades,
        headss_drogas: perfil.headss_drogas,
        headss_sexualidad: perfil.headss_sexualidad,
        headss_suicidio: perfil.headss_suicidio,
        headss_seguridad: perfil.headss_seguridad,
        agudeza_visual_od: perfil.agudeza_visual_od,
        agudeza_visual_oi: perfil.agudeza_visual_oi,
        salud_oral_evaluacion: perfil.salud_oral_evaluacion
    };

    if (esMasculino) {
        adolescenciaData.estadio_tanner_genitales = tanner;
        adolescenciaData.estadio_tanner_vello_pubico = tanner;
    } else {
        adolescenciaData.estadio_tanner_mamas = tanner;
        adolescenciaData.estadio_tanner_vello_pubico = tanner;
    }

    // Campos de contacto con valores por defecto
    const telefonoPaciente = paciente.telefono && paciente.telefono.trim() !== "" 
        ? paciente.telefono 
        : "No registrado";
    const direccionPaciente = paciente.direccion && paciente.direccion.trim() !== "" 
        ? paciente.direccion 
        : "No registrada";

    const nombreAcompanante = admision.nombre_acompanante && admision.nombre_acompanante.trim() !== ""
        ? admision.nombre_acompanante
        : "No registrado";
    const telefonoAcompanante = admision.telefono_acompanante && admision.telefono_acompanante.trim() !== ""
        ? admision.telefono_acompanante
        : "No registrado";
    const nombreResponsable = admision.nombre_responsable && admision.nombre_responsable.trim() !== ""
        ? admision.nombre_responsable
        : "No registrado";
    const parentescoResponsable = admision.parentesco_responsable && admision.parentesco_responsable.trim() !== ""
        ? admision.parentesco_responsable
        : "No registrado";
    const telefonoResponsable = admision.telefono_responsable && admision.telefono_responsable.trim() !== ""
        ? admision.telefono_responsable
        : "No registrado";

    // Objeto final
    return {
        id_historia: historia.id_historia,
        numero_historia: historia.numero_historia,
        hora_historia: horaStr,
        fk_servicio_ingreso: 2,
        fk_admision: admision.id_admision,
        fk_paciente: paciente.id_paciente,
        numero_admision: admision.numero_admision,
        telefono_paciente: telefonoPaciente,
        fk_factura_consultas: facturacion.id_factura_consultas,
        fk_finalidad_consulta: 12,
        IdActividad: 10,
        fk_procedimiento: 8138,

        facturacion_admisiones: {
            fk_paciente: paciente.id_paciente,
            numero_admision: admision.numero_admision,
            nombre_acompanante: nombreAcompanante,
            direccion_acompanante: direccionPaciente,
            telefono_acompanante: telefonoAcompanante,
            nombre_responsable: nombreResponsable,
            parentesco_responsable: parentescoResponsable,
            telefono_responsable: telefonoResponsable,
            pacientes: {
                direccion_paciente: direccionPaciente,
                fk_ocupacion: 999,
                fk_nivel_educativo: 13,
                fk_grupo_etnico: 6,
                fk_discapacidad: 6,
                EnfoqueDiferencialIdGenero: "1",
                IdOrientacionSexualEnfoqueDiferencial: "5"
            }
        },

        motivo_consulta_historia: "Paciente entra a ruta de ADOLESCENCIA",
        motivo_consulta_consulta_externa: motivoConsultaExterna,
        enfermedad_actual_historia: enfermedadActual,
        analisis_historia: analisis,
        hallazgos_fisicos_signos_vitales_ta_historia: `${perfil.pa_sist}/${perfil.pa_diast}`,
        hallazgos_fisicos_signos_vitales_fr_historia: perfil.fr.toString(),
        hallazgos_fisicos_signos_vitales_t_historia: perfil.temp.toFixed(1),
        hallazgos_fisicos_signos_vitales_fc_historia: perfil.fc.toString(),
        hallazgos_fisicos_signos_vitales_talla_historia: perfil.talla,
        hallazgos_fisicos_signos_vitales_peso_historia: perfil.peso,
        hallazgos_fisicos_signos_vitales_saturacion_oxigeno: perfil.saturacion,
        hallazgos_fisicos_signos_vitales_idmc_historia: perfil.imc.toFixed(2),
        hallazgos_fisicos_signos_vitales_sc_historia: (Math.random() * 0.5 + 1.0).toFixed(2),

        historia_clinica_enfermedades_diagnostico_ingreso: [
            { fk_enfermedad: codigoDiagnosticoAdolescencia }
        ],

        historia_pym_adolescencia: [adolescenciaData],

        diagnostico_ingreso_tipo_historia: 2,
        diagnostico_ingreso_fk_causa_externa: causaExterna, // siempre "15"
        fk_usuario: historia.fk_usuario_historia,
        fk_institucion: admision.fk_institucion,
        bloqueada: true,
        prescripcion_medicamentos: []
    };
};

module.exports = { adolescencia };