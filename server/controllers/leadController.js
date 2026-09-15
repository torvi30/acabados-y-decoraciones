const leadService = require('../services/leadService');

/**
 * Sanitiza una cadena de texto para evitar inyecciones o caracteres de control
 */
function sanitizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return str.trim().replace(/[<>]/g, '');
}

/**
 * Valida un número de teléfono básico (mínimo 7 dígitos numéricos)
 */
function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 7 && cleaned.length <= 15;
}

/**
 * Genera la URL preformateada para redirigir a WhatsApp
 */
function generateWhatsAppUrl(leadData, presupuesto) {
    const adminPhone = process.env.WHATSAPP_ADMIN_NUMBER || '573001234567';
    const presupuestoStr = presupuesto > 0
        ? `$${Number(presupuesto).toLocaleString('es-CO')} COP aprox.`
        : 'A convenir tras visita técnica';

    const texto = `👋 Hola, solicité una cotización en su plataforma web:%0A%0A` +
        `👤 *Nombre:* ${encodeURIComponent(leadData.nombre_completo)}%0A` +
        `📱 *Teléfono:* ${encodeURIComponent(leadData.telefono)}%0A` +
        `🏢 *Inmueble:* ${encodeURIComponent(leadData.tipo_inmueble || 'Apartamento')}%0A` +
        `🛠️ *Servicio:* ${encodeURIComponent(leadData.tipo_servicio || 'Obra Blanca Completa')}%0A` +
        `📐 *Área:* ${leadData.area_m2_estimada ? leadData.area_m2_estimada + ' m²' : 'Por definir'}%0A` +
        `📍 *Zona:* ${encodeURIComponent(leadData.ciudad_zona || 'Área Metropolitana')}%0A` +
        `💰 *Presupuesto Estimado:* ${encodeURIComponent(presupuestoStr)}%0A%0A` +
        `¿Cuándo podríamos agendar la visita técnica de valoración?`;

    return `https://wa.me/${adminPhone}?text=${texto}`;
}

/**
 * Controlador para recibir y registrar una cotización
 */
async function submitLead(req, res) {
    try {
        const {
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
            utm_campaign
        } = req.body;

        // 1. Validaciones estrictas
        const cleanNombre = sanitizeString(nombre_completo);
        const cleanTelefono = sanitizeString(telefono);

        if (!cleanNombre || cleanNombre.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'El nombre completo es obligatorio (mínimo 3 caracteres).'
            });
        }

        if (!isValidPhone(cleanTelefono)) {
            return res.status(400).json({
                success: false,
                error: 'Por favor ingresa un número de teléfono o celular válido.'
            });
        }

        let cleanEmail = null;
        if (email && typeof email === 'string' && email.trim().length > 0) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                return res.status(400).json({
                    success: false,
                    error: 'El correo electrónico no tiene un formato válido.'
                });
            }
            cleanEmail = email.trim().toLowerCase();
        }

        const areaNum = parseFloat(area_m2_estimada) || 0;
        if (area_m2_estimada && (isNaN(areaNum) || areaNum < 0 || areaNum > 10000)) {
            return res.status(400).json({
                success: false,
                error: 'El área en m² ingresada no es válida.'
            });
        }

        // 2. Preparación del payload sanitizado
        const leadPayload = {
            nombre_completo: cleanNombre,
            telefono: cleanTelefono,
            email: cleanEmail,
            ciudad_zona: sanitizeString(ciudad_zona) || 'Área Metropolitana',
            tipo_inmueble: sanitizeString(tipo_inmueble) || 'apartamento',
            estado_actual_obra: sanitizeString(estado_actual_obra) || 'obra_gris',
            tipo_servicio: sanitizeString(tipo_servicio) || 'obra_blanca_completa',
            area_m2_estimada: areaNum,
            presupuesto_estimado: presupuesto_estimado ? parseFloat(presupuesto_estimado) : null,
            detalles_adicionales: sanitizeString(detalles_adicionales),
            origen_lead: sanitizeString(origen_lead) || 'web_funnel',
            utm_source: sanitizeString(utm_source) || null,
            utm_medium: sanitizeString(utm_medium) || null,
            utm_campaign: sanitizeString(utm_campaign) || null
        };

        // 3. Persistencia en la capa de servicios (MySQL)
        const savedLead = await leadService.createLead(leadPayload);

        // 4. Generación del link de WhatsApp enriquecido para CRO instantáneo
        const whatsappUrl = generateWhatsAppUrl(leadPayload, savedLead.presupuesto_estimado);

        return res.status(201).json({
            success: true,
            message: '¡Cotización registrada con éxito! En breve te contactaremos.',
            data: {
                id: savedLead.id,
                nombre_completo: savedLead.nombre_completo,
                presupuesto_estimado: savedLead.presupuesto_estimado,
                whatsapp_url: whatsappUrl
            }
        });

    } catch (error) {
        console.error('Error procesando lead en el controlador:', error);
        // Regla: Nunca exponer errores crudos de MySQL al cliente
        return res.status(500).json({
            success: false,
            error: 'Ocurrió un inconveniente al registrar tu solicitud. Por favor intenta de nuevo o comunícate vía WhatsApp.'
        });
    }
}

/**
 * Obtener listado de cotizaciones para el Mini-CRM
 */
async function listLeads(req, res) {
    try {
        const limit = parseInt(req.query.limit, 10) || 50;
        const offset = parseInt(req.query.offset, 10) || 0;
        const leads = await leadService.getAllLeads(limit, offset);

        return res.json({
            success: true,
            count: leads.length,
            data: leads
        });
    } catch (error) {
        console.error('Error listando leads:', error);
        return res.status(500).json({
            success: false,
            error: 'No se pudieron recuperar las cotizaciones.'
        });
    }
}

/**
 * Actualizar estado en el Mini-CRM
 */
async function changeStatus(req, res) {
    try {
        const { id } = req.params;
        const { estado_lead, notas } = req.body;

        if (!estado_lead) {
            return res.status(400).json({
                success: false,
                error: 'El campo estado_lead es requerido.'
            });
        }

        const updated = await leadService.updateLeadStatus(id, estado_lead, notas);
        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Cotización no encontrada.'
            });
        }

        return res.json({
            success: true,
            message: `Estado actualizado a: ${estado_lead}`
        });
    } catch (error) {
        console.error('Error actualizando estado:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error al actualizar el estado del lead.'
        });
    }
}

/**
 * Métricas generales para el dashboard
 */
async function getMetrics(req, res) {
    try {
        const metrics = await leadService.getLeadMetrics();
        return res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        console.error('Error obteniendo métricas:', error);
        return res.status(500).json({
            success: false,
            error: 'No se pudieron calcular las métricas.'
        });
    }
}

/**
 * Cotizador rápido en tiempo real (endpoint auxiliar de cálculo)
 */
async function estimatePrice(req, res) {
    try {
        const { tipo_servicio, area_m2 } = req.query;
        const estimado = leadService.calcularPresupuestoEstimado(tipo_servicio, area_m2);
        return res.json({
            success: true,
            tipo_servicio: tipo_servicio || 'obra_blanca_completa',
            area_m2: parseFloat(area_m2) || 0,
            presupuesto_estimado: estimado
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Error al calcular estimación.'
        });
    }
}

module.exports = {
    submitLead,
    listLeads,
    changeStatus,
    getMetrics,
    estimatePrice
};
