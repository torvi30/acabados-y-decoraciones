const { query, isDbConnected } = require('../config/db');

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
 * Guarda un nuevo lead / solicitud de cotización utilizando consultas parametrizadas
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

    // Si la base de datos está activa, ejecutar consulta parametrizada
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

    // Almacenamiento fallback en memoria si DB aún no fue conectada
    const memoryRecord = {
        id: memoryAutoId++,
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
        created_at: new Date()
    };
    memoryLeads.unshift(memoryRecord);
    return memoryRecord;
}

/**
 * Obtiene el listado de leads ordenados por fecha descendente
 */
async function getAllLeads(limit = 50, offset = 0) {
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

    if (isDbConnected()) {
        const sql = `
            UPDATE leads_cotizaciones
            SET estado_lead = ?, notas_seguimiento = COALESCE(?, notas_seguimiento)
            WHERE id = ?
        `;
        const result = await query(sql, [nuevoEstado, notas, id]);
        return result.affectedRows > 0;
    }

    const lead = memoryLeads.find(item => item.id === parseInt(id, 10));
    if (lead) {
        lead.estado_lead = nuevoEstado;
        if (notas) lead.notas_seguimiento = notas;
        return true;
    }
    return false;
}

/**
 * Retorna métricas generales para el panel de control
 */
async function getLeadMetrics() {
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

module.exports = {
    createLead,
    getAllLeads,
    updateLeadStatus,
    getLeadMetrics,
    calcularPresupuestoEstimado
};
