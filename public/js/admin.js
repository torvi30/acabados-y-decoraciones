/**
 * ==========================================================================
 * ADMIN DASHBOARD & MINI-CRM SCRIPT (Firebase Firestore & REST API)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // Estado del Dashboard
    let allLeads = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedLeadForNotes = null;

    // Elementos DOM
    const crmTableBody = document.getElementById('crmTableBody');
    const searchInput = document.getElementById('searchInput');
    const filterTabs = document.querySelectorAll('.crm-tab-btn');
    const btnRefresh = document.getElementById('btnRefreshLeads');
    const engineBadgeText = document.getElementById('engineBadgeText');

    // Elementos KPI
    const kpiTotalLeads = document.getElementById('kpiTotalLeads');
    const kpiNewLeads = document.getElementById('kpiNewLeads');
    const kpiTotalValue = document.getElementById('kpiTotalValue');
    const kpiTotalM2 = document.getElementById('kpiTotalM2');
    const kpiWonLeads = document.getElementById('kpiWonLeads');
    const kpiConversionRate = document.getElementById('kpiConversionRate');

    // Modales
    const detailModal = document.getElementById('leadDetailModal');
    const btnCloseDetailModal = document.getElementById('btnCloseDetailModal');
    const btnCancelDetailModal = document.getElementById('btnCancelDetailModal');
    const btnSaveAdminNotes = document.getElementById('btnSaveAdminNotes');
    const modalAdminNotes = document.getElementById('modalAdminNotes');

    const newLeadModal = document.getElementById('newLeadModal');
    const btnOpenNewLeadModal = document.getElementById('btnOpenNewLeadModal');
    const btnCloseNewLeadModal = document.getElementById('btnCloseNewLeadModal');
    const btnCancelNewLeadModal = document.getElementById('btnCancelNewLeadModal');
    const newLeadForm = document.getElementById('newLeadForm');

    // Toast
    const toastNotice = document.getElementById('toastNotice');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    // Configuración de Estados
    const ESTADOS = [
        { key: 'nuevo', label: 'Nuevo Lead' },
        { key: 'contactado', label: 'Contactado' },
        { key: 'visita_tecnica_agendada', label: 'Visita Agendada' },
        { key: 'cotizacion_enviada', label: 'Cotización Enviada' },
        { key: 'ganado_en_obra', label: 'Ganado en Obra' },
        { key: 'perdido', label: 'Perdido' }
    ];

    function showToast(msg, icon = '✓') {
        if (!toastNotice) return;
        toastMessage.textContent = msg;
        toastIcon.textContent = icon;
        toastNotice.style.display = 'flex';
        setTimeout(() => {
            toastNotice.style.display = 'none';
        }, 3200);
    }

    // 1. Diagnóstico del Backend y Base de Datos
    async function checkBackendHealth() {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            if (data.database && data.database.firebase_connected) {
                engineBadgeText.textContent = '🔥 Firebase Firestore (En Vivo)';
            } else if (data.database && data.database.mysql_connected) {
                engineBadgeText.textContent = '🐬 MySQL Conectado';
            } else {
                engineBadgeText.textContent = '💾 Modo Memoria (Pruebas)';
            }
        } catch (err) {
            engineBadgeText.textContent = '⚠️ Sin conexión';
        }
    }

    // 2. Carga Principal de Leads
    async function loadLeads() {
        crmTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:3rem; color:var(--adm-text-muted);">
                    Cargando cotizaciones desde la base de datos...
                </td>
            </tr>
        `;

        try {
            const res = await fetch('/api/leads');
            const data = await res.json();

            if (data.success && Array.isArray(data.data)) {
                allLeads = data.data;
                updateKPIs(allLeads);
                updateTabCounters(allLeads);
                filterAndRender();
            } else {
                allLeads = [];
                updateKPIs([]);
                updateTabCounters([]);
                renderEmptyTable();
            }
        } catch (error) {
            console.error('Error al cargar leads:', error);
            crmTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:3rem; color:#ef4444;">
                        Error de conexión al cargar datos del servidor.
                    </td>
                </tr>
            `;
        }
    }

    // 3. Cálculo de Métricas y KPIs
    function updateKPIs(leads) {
        const total = leads.length;
        const nuevos = leads.filter(l => l.estado_lead === 'nuevo').length;
        const ganados = leads.filter(l => l.estado_lead === 'ganado_en_obra').length;
        const totalM2 = leads.reduce((acc, curr) => acc + (parseFloat(curr.area_m2_estimada) || 0), 0);
        const totalCOP = leads.reduce((acc, curr) => acc + (parseFloat(curr.presupuesto_estimado) || 0), 0);
        const convRate = total > 0 ? Math.round((ganados / total) * 100) : 0;

        if (kpiTotalLeads) kpiTotalLeads.textContent = total;
        if (kpiNewLeads) kpiNewLeads.textContent = `${nuevos} nuevos sin contactar`;
        if (kpiTotalValue) kpiTotalValue.textContent = `$${totalCOP.toLocaleString('es-CO')} COP`;
        if (kpiTotalM2) kpiTotalM2.textContent = `${totalM2.toLocaleString('es-CO')} m²`;
        if (kpiWonLeads) kpiWonLeads.textContent = ganados;
        if (kpiConversionRate) kpiConversionRate.textContent = `Tasa de cierre: ${convRate}%`;
    }

    // 4. Contadores de las pestañas
    function updateTabCounters(leads) {
        const counts = {
            all: leads.length,
            nuevo: 0,
            contactado: 0,
            visita_tecnica_agendada: 0,
            cotizacion_enviada: 0,
            ganado_en_obra: 0,
            perdido: 0
        };

        leads.forEach(l => {
            const st = l.estado_lead || 'nuevo';
            if (counts[st] !== undefined) counts[st]++;
        });

        document.getElementById('tabCountAll').textContent = counts.all;
        document.getElementById('tabCountNuevo').textContent = counts.nuevo;
        document.getElementById('tabCountContactado').textContent = counts.contactado;
        document.getElementById('tabCountVisita').textContent = counts.visita_tecnica_agendada;
        document.getElementById('tabCountCotizacion').textContent = counts.cotizacion_enviada;
        document.getElementById('tabCountGanado').textContent = counts.ganado_en_obra;
        document.getElementById('tabCountPerdido').textContent = counts.perdido;
    }

    // 5. Filtrado y Renderizado
    function filterAndRender() {
        let filtered = allLeads;

        // Filtro por Tab
        if (currentFilter !== 'all') {
            filtered = filtered.filter(l => l.estado_lead === currentFilter);
        }

        // Filtro por Buscador
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(l => {
                const nombre = (l.nombre_completo || '').toLowerCase();
                const tel = (l.telefono || '').toLowerCase();
                const zona = (l.ciudad_zona || '').toLowerCase();
                const serv = (l.tipo_servicio || '').toLowerCase();
                return nombre.includes(q) || tel.includes(q) || zona.includes(q) || serv.includes(q);
            });
        }

        renderTable(filtered);
    }

    function renderEmptyTable() {
        crmTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:3.5rem 1rem; color:var(--adm-text-muted);">
                    <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📂</div>
                    <strong style="color:#fff; font-size:1rem; display:block;">No hay cotizaciones para mostrar</strong>
                    <span>No se encontraron registros con los filtros seleccionados.</span>
                </td>
            </tr>
        `;
    }

    function renderTable(leads) {
        if (!leads || leads.length === 0) {
            renderEmptyTable();
            return;
        }

        crmTableBody.innerHTML = leads.map(lead => {
            const fecha = new Date(lead.created_at).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });
            const presupuesto = lead.presupuesto_estimado 
                ? `$${Number(lead.presupuesto_estimado).toLocaleString('es-CO')} COP` 
                : 'A convenir';

            const cleanPhone = (lead.telefono || '').replace(/\D/g, '');
            const waMsg = `Hola ${encodeURIComponent(lead.nombre_completo)}, te escribo de Obra Blanca para revisar los acabados de tu proyecto en ${encodeURIComponent(lead.ciudad_zona || 'Medellín')}`;
            const waLink = `https://wa.me/57${cleanPhone}?text=${waMsg}`;
            const telLink = `tel:+57${cleanPhone}`;

            const serviceName = (lead.tipo_servicio || 'obra_blanca_completa').replace(/_/g, ' ');

            const optionsHtml = ESTADOS.map(est => `
                <option value="${est.key}" ${lead.estado_lead === est.key ? 'selected' : ''}>
                    ${est.label}
                </option>
            `).join('');

            return `
                <tr data-id="${lead.id}">
                    <td>
                        <strong style="color:#fff; font-size:0.95rem; display:block;">${lead.nombre_completo}</strong>
                        <span style="font-size:0.78rem; color:var(--adm-text-muted);">📍 ${lead.ciudad_zona || 'Área Metropolitana'}</span>
                    </td>
                    <td>
                        <div class="row-actions">
                            <a href="${waLink}" target="_blank" class="action-icon-btn wa-btn" title="Chatear por WhatsApp">
                                💬
                            </a>
                            <a href="${telLink}" class="action-icon-btn" title="Llamar directamente">
                                📞
                            </a>
                            <span style="font-size:0.82rem; color:#cbd5e1; margin-left:4px;">${lead.telefono}</span>
                        </div>
                    </td>
                    <td>
                        <strong style="display:block; color:#e2e8f0; text-transform:capitalize;">${serviceName}</strong>
                        <span style="font-size:0.78rem; color:var(--adm-accent);">
                            📐 ${lead.area_m2_estimada || 0} m² (${lead.tipo_inmueble || 'Apto'})
                        </span>
                    </td>
                    <td>
                        <strong style="color:var(--adm-primary-light); font-size:0.92rem;">${presupuesto}</strong>
                    </td>
                    <td>
                        <select class="status-select st-${lead.estado_lead || 'nuevo'}" onchange="changeStatus('${lead.id}', this.value, this)">
                            ${optionsHtml}
                        </select>
                    </td>
                    <td>
                        <span style="font-size:0.8rem; color:#cbd5e1; display:block;">${fecha}</span>
                        <span style="font-size:0.72rem; color:var(--adm-text-subtle);">
                            🏷️ ${lead.utm_campaign || lead.utm_source || 'Directo / Web'}
                        </span>
                    </td>
                    <td style="text-align:right;">
                        <div class="row-actions" style="justify-content: flex-end;">
                            <button type="button" class="action-icon-btn" title="Ver detalles y bitácora" onclick="openDetailModal('${lead.id}')">
                                📝
                            </button>
                            <button type="button" class="action-icon-btn del-btn" title="Eliminar cotización" onclick="deleteLead('${lead.id}', '${encodeURIComponent(lead.nombre_completo)}')">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 6. Cambio de Estado en Vivo (Sincronizado con Firebase)
    window.changeStatus = async function(id, newStatus, selectElement) {
        try {
            const res = await fetch(`/api/leads/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado_lead: newStatus })
            });
            const data = await res.json();

            if (data.success) {
                // Actualizar estado local
                const item = allLeads.find(l => String(l.id) === String(id));
                if (item) item.estado_lead = newStatus;

                // Actualizar clase de color en select
                selectElement.className = `status-select st-${newStatus}`;
                updateKPIs(allLeads);
                updateTabCounters(allLeads);
                showToast(`Estado actualizado a: ${newStatus.replace(/_/g, ' ')}`);
            } else {
                alert('No se pudo actualizar el estado: ' + (data.error || 'Error desconocido'));
            }
        } catch (err) {
            console.error('Error al actualizar estado:', err);
            alert('Error de conexión al actualizar el estado.');
        }
    };

    // 7. Modal de Ficha Técnica & Bitácora de Seguimiento
    window.openDetailModal = function(id) {
        const lead = allLeads.find(l => String(l.id) === String(id));
        if (!lead) return;

        selectedLeadForNotes = lead;

        document.getElementById('modalClientName').textContent = lead.nombre_completo;
        document.getElementById('modalLeadId').textContent = `ID: ${lead.id}`;
        document.getElementById('modalPhone').textContent = lead.telefono || '--';
        document.getElementById('modalZone').textContent = lead.ciudad_zona || 'Área Metropolitana';
        document.getElementById('modalProperty').textContent = `${lead.tipo_inmueble || 'Apartamento'} (${(lead.estado_actual_obra || 'obra_gris').replace(/_/g, ' ')})`;
        document.getElementById('modalService').textContent = (lead.tipo_servicio || 'obra_blanca_completa').replace(/_/g, ' ');
        document.getElementById('modalM2').textContent = `${lead.area_m2_estimada || 0} m²`;
        document.getElementById('modalBudget').textContent = lead.presupuesto_estimado ? `$${Number(lead.presupuesto_estimado).toLocaleString('es-CO')} COP` : 'A convenir';
        
        document.getElementById('modalClientNotes').textContent = lead.detalles_adicionales || 'Sin comentarios adicionales por parte del cliente.';
        modalAdminNotes.value = lead.notas_seguimiento || '';

        detailModal.classList.add('active');
    };

    function closeDetailModal() {
        detailModal.classList.remove('active');
        selectedLeadForNotes = null;
    }

    if (btnCloseDetailModal) btnCloseDetailModal.addEventListener('click', closeDetailModal);
    if (btnCancelDetailModal) btnCancelDetailModal.addEventListener('click', closeDetailModal);

    // Guardar Notas de Seguimiento en Firebase
    if (btnSaveAdminNotes) {
        btnSaveAdminNotes.addEventListener('click', async () => {
            if (!selectedLeadForNotes) return;
            const notas = modalAdminNotes.value.trim();

            try {
                btnSaveAdminNotes.disabled = true;
                btnSaveAdminNotes.textContent = 'Guardando...';

                const res = await fetch(`/api/leads/${selectedLeadForNotes.id}/notes`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notas })
                });
                const data = await res.json();

                if (data.success) {
                    selectedLeadForNotes.notas_seguimiento = notas;
                    showToast('Bitácora de seguimiento guardada');
                    closeDetailModal();
                } else {
                    alert('Error guardando notas: ' + data.error);
                }
            } catch (err) {
                console.error(err);
                alert('Error de conexión al guardar bitácora.');
            } finally {
                btnSaveAdminNotes.disabled = false;
                btnSaveAdminNotes.textContent = '💾 Guardar Bitácora';
            }
        });
    }

    // 8. Eliminar Cotización
    window.deleteLead = async function(id, clientNameEncoded) {
        const clientName = decodeURIComponent(clientNameEncoded);
        const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar la cotización de "${clientName}"? Esta acción no se puede deshacer.`);
        if (!confirmDelete) return;

        try {
            const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                allLeads = allLeads.filter(l => String(l.id) !== String(id));
                updateKPIs(allLeads);
                updateTabCounters(allLeads);
                filterAndRender();
                showToast(`Cotización de ${clientName} eliminada`, '🗑️');
            } else {
                alert('No se pudo eliminar: ' + data.error);
            }
        } catch (err) {
            console.error('Error al eliminar lead:', err);
            alert('Error de conexión al eliminar.');
        }
    };

    // 9. Registrar Nuevo Prospecto Manualmente
    function openNewLeadModal() {
        newLeadForm.reset();
        newLeadModal.classList.add('active');
    }
    function closeNewLeadModal() {
        newLeadModal.classList.remove('active');
    }

    if (btnOpenNewLeadModal) btnOpenNewLeadModal.addEventListener('click', openNewLeadModal);
    if (btnCloseNewLeadModal) btnCloseNewLeadModal.addEventListener('click', closeNewLeadModal);
    if (btnCancelNewLeadModal) btnCancelNewLeadModal.addEventListener('click', closeNewLeadModal);

    if (newLeadForm) {
        newLeadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = newLeadForm.querySelector('button[type="submit"]');

            const payload = {
                nombre_completo: document.getElementById('newLeadNombre').value.trim(),
                telefono: document.getElementById('newLeadTelefono').value.trim(),
                ciudad_zona: document.getElementById('newLeadCiudad').value.trim() || 'Medellín / Área Metrop.',
                tipo_inmueble: document.getElementById('newLeadInmueble').value,
                tipo_servicio: document.getElementById('newLeadServicio').value,
                area_m2_estimada: parseFloat(document.getElementById('newLeadM2').value) || 0,
                presupuesto_estimado: parseFloat(document.getElementById('newLeadPresupuesto').value) || null,
                detalles_adicionales: document.getElementById('newLeadDetalles').value.trim(),
                origen_lead: 'admin_dashboard'
            };

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Guardando...';

                const res = await fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (data.success) {
                    showToast('Prospecto registrado en Firebase Firestore');
                    closeNewLeadModal();
                    await loadLeads();
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (err) {
                console.error(err);
                alert('Error al registrar prospecto.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>✅</span> Guardar en CRM';
            }
        });
    }

    // 10. Eventos de Búsqueda y Filtros
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            filterAndRender();
        });
    }

    filterTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            filterTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            filterAndRender();
        });
    });

    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            loadLeads();
            checkBackendHealth();
            showToast('Datos sincronizados con Firebase');
        });
    }

    // Cierre de modales al dar clic en el fondo oscuro
    window.addEventListener('click', (e) => {
        if (e.target === detailModal) closeDetailModal();
        if (e.target === newLeadModal) closeNewLeadModal();
    });

    // Carga inicial
    checkBackendHealth();
    loadLeads();
});
