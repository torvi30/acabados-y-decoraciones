/**
 * ==========================================================================
 * MAIN SCRIPT: OPTIMIZACIÓN CINEMÁTICA, CRO Y VISOR MINI-CRM
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Optimización del Video Hero (Carga diferida para proteger el FCP)
    const heroVideo = document.getElementById('heroCinematicVideo');
    if (heroVideo) {
        // Cargar video solo después de que los assets críticos (CSS/Fuentes) hayan pintado la pantalla
        window.addEventListener('load', () => {
            const videoSrc = heroVideo.getAttribute('data-src');
            if (videoSrc) {
                heroVideo.src = videoSrc;
                heroVideo.load();
                heroVideo.play().catch(() => {
                    // Si el navegador bloquea autoplay o el video no existe aún, se mantiene el poster de alta gama
                    console.log('Video autoplay en pausa o pendiente de archivo .mp4');
                });
            }
        });
    }

    // 2. Desplazamiento suave para botones de llamada a la acción
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 3. Mini-CRM Modal Viewer & Pipeline Comercial para el Ingeniero
    const openCrmBtn = document.getElementById('btnOpenCrm');
    const crmModal = document.getElementById('crmModal');
    const closeCrmBtn = document.getElementById('btnCloseCrm');
    const crmTableBody = document.getElementById('crmTableBody');
    const crmMetricLeads = document.getElementById('crmMetricLeads');
    const crmMetricM2 = document.getElementById('crmMetricM2');
    const crmMetricValue = document.getElementById('crmMetricValue');
    const filterButtons = document.querySelectorAll('.crm-filter-btn');

    let allLoadedLeads = [];
    let activeFilter = 'all';

    async function loadCrmLeads() {
        if (!crmTableBody) return;
        crmTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#94a3b8;">Cargando cotizaciones...</td></tr>';
        
        try {
            const res = await fetch('/api/leads');
            const data = await res.json();
            
            if (!data.success || !data.data || data.data.length === 0) {
                allLoadedLeads = [];
                renderCrmTable([]);
                updateMetrics([]);
                return;
            }

            allLoadedLeads = data.data;
            updateMetrics(allLoadedLeads);
            applyFilterAndRender();

        } catch (error) {
            console.error('Error cargando leads:', error);
            crmTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#ef4444;">Error al cargar leads desde la API.</td></tr>';
        }
    }

    function updateMetrics(leads) {
        const totalLeads = leads.length;
        const totalM2 = leads.reduce((acc, curr) => acc + (parseFloat(curr.area_m2_estimada) || 0), 0);
        const totalVal = leads.reduce((acc, curr) => acc + (parseFloat(curr.presupuesto_estimado) || 0), 0);

        if (crmMetricLeads) crmMetricLeads.textContent = totalLeads;
        if (crmMetricM2) crmMetricM2.textContent = `${totalM2} m²`;
        if (crmMetricValue) crmMetricValue.textContent = `$${totalVal.toLocaleString('es-CO')} COP`;
    }

    function applyFilterAndRender() {
        let filtered = allLoadedLeads;
        if (activeFilter !== 'all') {
            filtered = allLoadedLeads.filter(l => l.estado_lead === activeFilter);
        }
        renderCrmTable(filtered);
    }

    function renderCrmTable(leads) {
        if (!crmTableBody) return;

        if (leads.length === 0) {
            crmTableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:2.5rem; color:#94a3b8;">
                        No se encontraron cotizaciones para el filtro actual.
                    </td>
                </tr>
            `;
            return;
        }

        const estadosDisponibles = [
            { key: 'nuevo', label: 'Nuevo Lead' },
            { key: 'contactado', label: 'Contactado' },
            { key: 'visita_tecnica_agendada', label: 'Visita Agendada' },
            { key: 'cotizacion_enviada', label: 'Cotización Enviada' },
            { key: 'ganado_en_obra', label: 'Ganado en Obra' },
            { key: 'perdido', label: 'Perdido' }
        ];

        crmTableBody.innerHTML = leads.map(lead => {
            const fecha = new Date(lead.created_at).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });
            const presupuesto = lead.presupuesto_estimado 
                ? `$${Number(lead.presupuesto_estimado).toLocaleString('es-CO')}` 
                : 'A convenir';

            const cleanPhone = (lead.telefono || '').replace(/\D/g, '');
            const waLink = `https://wa.me/57${cleanPhone}?text=Hola%20${encodeURIComponent(lead.nombre_completo)},%20te%20escribo%20del%20equipo%20de%20Obra%20Blanca%20para%20revisar%20tu%20cotizaci%C3%B3n`;
            const telLink = `tel:+57${cleanPhone}`;

            const optionsHtml = estadosDisponibles.map(est => `
                <option value="${est.key}" ${lead.estado_lead === est.key ? 'selected' : ''}>
                    ${est.label}
                </option>
            `).join('');

            return `
                <tr data-lead-id="${lead.id}">
                    <td>
                        <strong style="color:#fff; display:block;">${lead.nombre_completo}</strong>
                        <span style="font-size:0.75rem; color:#94a3b8;">📍 ${lead.ciudad_zona || 'Área Metropol.'}</span>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <a href="${waLink}" target="_blank" class="crm-btn-action crm-btn-wa" title="Chatear por WhatsApp">
                                💬
                            </a>
                            <a href="${telLink}" class="crm-btn-action" title="Llamar directamente">
                                📞
                            </a>
                            <span style="font-size:0.8rem; color:#cbd5e1; margin-left:4px;">${lead.telefono}</span>
                        </div>
                    </td>
                    <td>
                        <span style="display:block; font-weight:600; color:#e2e8f0;">
                            ${lead.tipo_servicio.replace(/_/g, ' ')}
                        </span>
                        <span style="font-size:0.78rem; color:var(--accent);">
                            📐 ${lead.area_m2_estimada || 0} m² (${lead.tipo_inmueble || 'Apto'})
                        </span>
                    </td>
                    <td>
                        <strong style="color:var(--primary-light); font-size:0.95rem;">${presupuesto}</strong>
                    </td>
                    <td>
                        <select class="crm-select-status" onchange="handleLeadStatusChange(${lead.id}, this.value)">
                            ${optionsHtml}
                        </select>
                    </td>
                    <td style="color:#64748b; font-size:0.78rem;">${fecha}</td>
                </tr>
            `;
        }).join('');
    }

    // Manejador global para actualizar estado desde el select
    window.handleLeadStatusChange = async function(leadId, newStatus) {
        try {
            const res = await fetch(`/api/leads/${leadId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado_lead: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                // Actualizar en el estado local
                const item = allLoadedLeads.find(l => l.id === leadId);
                if (item) item.estado_lead = newStatus;
                console.log(`Estado del lead #${leadId} actualizado a: ${newStatus}`);
            } else {
                alert('No se pudo actualizar el estado: ' + data.error);
            }
        } catch (err) {
            console.error('Error actualizando estado:', err);
            alert('Error de conexión al actualizar estado.');
        }
    };

    // Filtros de estado
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.getAttribute('data-filter');
            applyFilterAndRender();
        });
    });

    if (openCrmBtn && crmModal) {
        openCrmBtn.addEventListener('click', (e) => {
            e.preventDefault();
            crmModal.style.display = 'flex';
            loadCrmLeads();
        });
    }

    if (closeCrmBtn && crmModal) {
        closeCrmBtn.addEventListener('click', () => {
            crmModal.style.display = 'none';
        });
    }

    if (crmModal) {
        crmModal.addEventListener('click', (e) => {
            if (e.target === crmModal) {
                crmModal.style.display = 'none';
            }
        });
    }

    // Atajo de teclado: Ctrl + Shift + L para abrir el Mini-CRM directamente
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            if (crmModal) {
                crmModal.style.display = crmModal.style.display === 'flex' ? 'none' : 'flex';
                if (crmModal.style.display === 'flex') loadCrmLeads();
            }
        }
    });
});
