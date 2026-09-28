const { query, isDbConnected } = require('../config/db');
const { getDb, isFirebaseConnected } = require('../config/firebase');

// Almacén en memoria temporal si la base de datos no está disponible (para desarrollo y testing inicial)
const memoryLeads = [];
let memoryAutoId = 1;

/**
 * Tabla de tarifas base estimadas por m² (COP) para cálculo preliminar
 */
const TARIFAS_BASE_M2 = {
    obra_blanca_completa: 185000,
    estuco_y_pintura: 48000,
    cielo_raso_drywall: 65000,
    enchapes_y_pisos: 55000,
    cocinas_y_carpinteria: 95000,
    iluminacion_y_domotica: 45000,
    carpinteria_y_acabados: 90000,
    otro: 80000
};

/**
 * Calcula un presupuesto preliminar sugerido
 * @param {string} tipoServicio 
 * @param {number} areaM2 
 * @returns {number}
 */
function calcularPresupuestoEstimado(tipoServicio, areaM2) {
    const tarifa = TARIFAS_BASE_M2[tipoServicio] || TARIFAS_BASE_M2.obra_blanca_completa;
    const metros = parseFloat(areaM2) || 0;
    if (metros <= 0) return 0;
    return Math.round(metros * tarifa);
}

/**
 * Guarda un nuevo lead / solicitud de cotización (Firebase Firestore > MySQL > Memoria)
 * @param {Object} leadData 
 * @returns {Promise<Object>}
 */
async function createLead(leadData) {
    const {
        nombre_completo,
        telefono,
        email = null,
        ciudad_zona = 'Área Metropolitana',
        tipo_inmueble = 'apartamento',
        estado_actual_obra = 'obra_gris',
        tipo_servicio = 'obra_blanca_completa',
        area_m2_estimada = 0,
        presupuesto_estimado = null,
        detalles_adicionales = '',
        origen_lead = 'web_funnel',
        utm_source = null,
        utm_medium = null,
        utm_campaign = null
    } = leadData;

    // Calcular presupuesto si no viene precalculado
    const presupuestoFinal = presupuesto_estimado !== null 
        ? parseFloat(presupuesto_estimado) 
        : calcularPresupuestoEstimado(tipo_servicio, area_m2_estimada);

    const m2Final = area_m2_estimada ? parseFloat(area_m2_estimada) : null;

    const leadRecord = {
        nombre_completo,
        telefono,
        email,
        ciudad_zona,
        tipo_inmueble,
        estado_actual_obra,
        tipo_servicio,
        area_m2_estimada: m2Final,
        presupuesto_estimado: presupuestoFinal,
        detalles_adicionales,
        origen_lead,
        utm_source,
        utm_medium,
        utm_campaign,
        estado_lead: 'nuevo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // 1. Prioridad: Firebase Firestore
    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                const docRef = await firestoreDb.collection('leads').add(leadRecord);
                return {
                    id: docRef.id,
                    ...leadRecord
                };
            } catch (fbError) {
                console.error('⚠️ Error guardando lead en Firebase Firestore:', fbError.message);
            }
        }
    }

    // 2. Prioridad: MySQL
    if (isDbConnected()) {
        const sql = `
            INSERT INTO leads_cotizaciones (
                nombre_completo,
                telefono,
                email,
                ciudad_zona,
                tipo_inmueble,
                estado_actual_obra,
                tipo_servicio,
                area_m2_estimada,
                presupuesto_estimado,
                detalles_adicionales,
                origen_lead,
                utm_source,
                utm_medium,
                utm_campaign,
                estado_lead
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nuevo')
        `;

        const params = [
            nombre_completo,
            telefono,
            email,
            ciudad_zona,
            tipo_inmueble,
            estado_actual_obra,
            tipo_servicio,
            m2Final,
            presupuestoFinal,
            detalles_adicionales,
            origen_lead,
            utm_source,
            utm_medium,
            utm_campaign
        ];

        const result = await query(sql, params);
        
        return {
            id: result.insertId,
            nombre_completo,
            telefono,
            tipo_servicio,
            area_m2_estimada: m2Final,
            presupuesto_estimado: presupuestoFinal,
            created_at: new Date()
        };
    }

    // 3. Fallback: Almacenamiento en memoria si DB aún no fue conectada
    const memoryRecord = {
        id: memoryAutoId++,
        ...leadRecord,
        created_at: new Date()
    };
    memoryLeads.unshift(memoryRecord);
    return memoryRecord;
}

/**
 * Obtiene el listado de leads ordenados por fecha descendente
 */
async function getAllLeads(limit = 50, offset = 0) {
    // 1. Firebase Firestore
    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                const snapshot = await firestoreDb.collection('leads')
                    .orderBy('created_at', 'desc')
                    .limit(parseInt(limit, 10))
                    .offset(parseInt(offset, 10))
                    .get();

                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (fbError) {
                console.error('⚠️ Error consultando leads en Firestore:', fbError.message);
            }
        }
    }

    // 2. MySQL
    if (isDbConnected()) {
        const sql = `
            SELECT 
                id,
                nombre_completo,
                telefono,
                email,
                ciudad_zona,
                tipo_inmueble,
                estado_actual_obra,
                tipo_servicio,
                area_m2_estimada,
                presupuesto_estimado,
                detalles_adicionales,
                utm_source,
                estado_lead,
                created_at
            FROM leads_cotizaciones
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        return await query(sql, [parseInt(limit, 10), parseInt(offset, 10)]);
    }

    // 3. Fallback en Memoria
    return memoryLeads.slice(offset, offset + limit);
}

/**
 * Actualiza el estado de un lead en el Mini-CRM
 */
async function updateLeadStatus(id, nuevoEstado, notas = null) {
    const estadosValidos = [
        'nuevo',
        'contactado',
        'visita_tecnica_agendada',
        'cotizacion_enviada',
        'ganado_en_obra',
        'perdido'
    ];

    if (!estadosValidos.includes(nuevoEstado)) {
        throw new Error(`Estado '${nuevoEstado}' no es válido.`);
    }

    // 1. Firebase Firestore
    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                const updateData = {
                    estado_lead: nuevoEstado,
                    updated_at: new Date().toISOString()
                };
                if (notas) updateData.notas_seguimiento = notas;

                await firestoreDb.collection('leads').doc(String(id)).update(updateData);
                return true;
            } catch (fbError) {
                console.error('⚠️ Error actualizando estado en Firestore:', fbError.message);
            }
        }
    }

    // 2. MySQL
    if (isDbConnected()) {
        const sql = `
            UPDATE leads_cotizaciones
            SET estado_lead = ?, notas_seguimiento = COALESCE(?, notas_seguimiento)
            WHERE id = ?
        `;
        const result = await query(sql, [nuevoEstado, notas, id]);
        return result.affectedRows > 0;
    }

    // 3. Fallback en Memoria
    const lead = memoryLeads.find(item => String(item.id) === String(id));
    if (lead) {
        lead.estado_lead = nuevoEstado;
        if (notas) lead.notas_seguimiento = notas;
        return true;
    }
    return false;
}

/**
 * Actualiza las notas de seguimiento de un lead
 */
async function updateLeadNotes(id, notas) {
    // 1. Firebase Firestore
    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                await firestoreDb.collection('leads').doc(String(id)).update({
                    notas_seguimiento: notas,
                    updated_at: new Date().toISOString()
                });
                return true;
            } catch (fbError) {
                console.error('⚠️ Error actualizando notas en Firestore:', fbError.message);
            }
        }
    }

    // 2. MySQL
    if (isDbConnected()) {
        const sql = `UPDATE leads_cotizaciones SET notas_seguimiento = ? WHERE id = ?`;
        const result = await query(sql, [notas, id]);
        return result.affectedRows > 0;
    }

    // 3. Fallback en Memoria
    const lead = memoryLeads.find(item => String(item.id) === String(id));
    if (lead) {
        lead.notas_seguimiento = notas;
        return true;
    }
    return false;
}

/**
 * Elimina una cotización (ideal para pruebas o spam)
 */
async function deleteLead(id) {
    // 1. Firebase Firestore
    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                await firestoreDb.collection('leads').doc(String(id)).delete();
                return true;
            } catch (fbError) {
                console.error('⚠️ Error eliminando lead en Firestore:', fbError.message);
            }
        }
    }

    // 2. MySQL
    if (isDbConnected()) {
        const sql = `DELETE FROM leads_cotizaciones WHERE id = ?`;
        const result = await query(sql, [id]);
        return result.affectedRows > 0;
    }

    // 3. Fallback en Memoria
    const idx = memoryLeads.findIndex(item => String(item.id) === String(id));
    if (idx !== -1) {
        memoryLeads.splice(idx, 1);
        return true;
    }
    return false;
}

/**
 * Retorna métricas generales para el panel de control
 */
async function getLeadMetrics() {
    // 1. Firebase Firestore
    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                const snapshot = await firestoreDb.collection('leads').get();
                let totalLeads = snapshot.size;
                let totalM2 = 0;
                let valorTotal = 0;
                const statusMap = {};

                snapshot.forEach(doc => {
                    const data = doc.data();
                    totalM2 += Number(data.area_m2_estimada) || 0;
                    valorTotal += Number(data.presupuesto_estimado) || 0;
                    const st = data.estado_lead || 'nuevo';
                    statusMap[st] = (statusMap[st] || 0) + 1;
                });

                return {
                    resumen: {
                        total_leads: totalLeads,
                        total_m2: totalM2,
                        valor_estimado_total: valorTotal
                    },
                    por_estado: Object.keys(statusMap).map(k => ({
                        estado_lead: k,
                        cantidad: statusMap[k]
                    }))
                };
            } catch (fbError) {
                console.error('⚠️ Error calculando métricas en Firestore:', fbError.message);
            }
        }
    }

    // 2. MySQL
    if (isDbConnected()) {
        const sqlTotales = `
            SELECT 
                COUNT(*) as total_leads,
                SUM(COALESCE(area_m2_estimada, 0)) as total_m2,
                SUM(COALESCE(presupuesto_estimado, 0)) as valor_estimado_total
            FROM leads_cotizaciones
        `;
        const [totales] = await query(sqlTotales);

        const sqlPorEstado = `
            SELECT estado_lead, COUNT(*) as cantidad
            FROM leads_cotizaciones
            GROUP BY estado_lead
        `;
        const porEstado = await query(sqlPorEstado);

        return {
            resumen: totales,
            por_estado: porEstado
        };
    }

    // 3. Fallback en Memoria
    const totalLeads = memoryLeads.length;
    const totalM2 = memoryLeads.reduce((acc, curr) => acc + (curr.area_m2_estimada || 0), 0);
    const valorTotal = memoryLeads.reduce((acc, curr) => acc + (curr.presupuesto_estimado || 0), 0);

    return {
        resumen: {
            total_leads: totalLeads,
            total_m2: totalM2,
            valor_estimado_total: valorTotal
        },
        por_estado: []
    };
}

/**
 * Genera el contenido CSV de todos los leads para Excel/Google Sheets
 */
async function exportLeadsToCsv() {
    const leads = await getAllLeads(1000, 0);
    const headers = [
        'ID',
        'Fecha',
        'Nombre Completo',
        'Telefono',
        'Email',
        'Ciudad/Zona',
        'Inmueble',
        'Estado Obra',
        'Servicio',
        'Area m2',
        'Presupuesto Estimado (COP)',
        'Estado CRM',
        'Origen',
        'Campana UTM',
        'Detalles'
    ];

    const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const stringified = String(str).replace(/"/g, '""');
        return `"${stringified}"`;
    };

    const rows = leads.map(l => [
        l.id,
        new Date(l.created_at).toLocaleString('es-CO'),
        escapeCsv(l.nombre_completo),
        escapeCsv(l.telefono),
        escapeCsv(l.email || ''),
        escapeCsv(l.ciudad_zona),
        escapeCsv(l.tipo_inmueble),
        escapeCsv(l.estado_actual_obra),
        escapeCsv(l.tipo_servicio),
        l.area_m2_estimada || 0,
        l.presupuesto_estimado || 0,
        escapeCsv(l.estado_lead),
        escapeCsv(l.origen_lead),
        escapeCsv(l.utm_campaign || l.utm_source || 'Directo'),
        escapeCsv(l.detalles_adicionales || '')
    ].join(','));

    // Incluir BOM UTF-8 (\uFEFF) para que Excel abra acentos y caracteres especiales automáticamente
    return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

module.exports = {
    createLead,
    getAllLeads,
    updateLeadStatus,
    updateLeadNotes,
    deleteLead,
    getLeadMetrics,
    calcularPresupuestoEstimado,
    exportLeadsToCsv
};
