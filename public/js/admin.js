/**
 * ==========================================================================
 * ADMIN DASHBOARD & MINI-CRM SCRIPT (Responsive Móvil + Desktop)
 * Obra Blanca & Acabados Arquitectónicos
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // Estado del Dashboard
    let allLeads = [];
    let currentFilter = 'all';
    let searchQuery = '';
    let selectedLeadForNotes = null;
    let currentView = 'list';
    let draggedLeadId = null;

    // Etapas del Tablero Kanban (Pipeline de Obras)
    const KANBAN_STAGES = [
        { key: 'nuevo', label: 'Nuevos Leads', color: 'amber', prev: null, next: 'contactado' },
        { key: 'contactado', label: 'Contactados', color: 'sky', prev: 'nuevo', next: 'visita_tecnica_agendada' },
        { key: 'visita_tecnica_agendada', label: 'Visitas Agendadas', color: 'purple', prev: 'contactado', next: 'cotizacion_enviada' },
        { key: 'cotizacion_enviada', label: 'Cotización Enviada', color: 'indigo', prev: 'visita_tecnica_agendada', next: 'ganado_en_obra' },
        { key: 'ganado_en_obra', label: 'Obras Ganadas', color: 'emerald', prev: 'cotizacion_enviada', next: 'perdido' },
        { key: 'perdido', label: 'Perdidos', color: 'rose', prev: 'ganado_en_obra', next: 'nuevo' }
    ];

    // Elementos DOM
    const crmTableBody = document.getElementById('crmTableBody');
    const crmCardsMobile = document.getElementById('crmCardsMobile');
    const searchInput = document.getElementById('searchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');
    const filterPills = document.querySelectorAll('.filter-tab-pill');
    const filteredCountBadge = document.getElementById('filteredCountBadge');
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
    const toastIconContainer = document.getElementById('toastIconContainer');

    // Mapeo de Estados
    const ESTADOS = [
        { key: 'nuevo', label: 'Nuevo Lead' },
        { key: 'contactado', label: 'Contactado' },
        { key: 'visita_tecnica_agendada', label: 'Visita Agendada' },
        { key: 'cotizacion_enviada', label: 'Cotización Enviada' },
        { key: 'ganado_en_obra', label: 'Ganado en Obra' },
        { key: 'perdido', label: 'Perdido' }
    ];

    // Helper Toast
    function showToast(msg, icon = '✓', isError = false) {
        if (!toastNotice) return;
        toastMessage.textContent = msg;
        if (toastIconContainer) {
            toastIconContainer.textContent = icon;
            if (isError) {
                toastIconContainer.className = 'w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold';
            } else {
                toastIconContainer.className = 'w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold';
            }
        }
        toastNotice.classList.add('toast-show');
        setTimeout(() => {
            toastNotice.classList.remove('toast-show');
        }, 3000);
    }

    // Copiar al portapapeles
    window.copyToClipboard = function(text, label = 'Teléfono') {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Error al copiar:', err);
            }
            document.body.removeChild(textArea);
        }
        showToast(`${label} copiado`, '📋');
    };

    // Helper para iniciales de Avatar
    function getInitials(name) {
        if (!name) return 'OB';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    // 1. Diagnóstico del Backend y Firebase
    async function checkBackendHealth() {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            if (data.database && data.database.firebase_connected) {
                if (engineBadgeText) engineBadgeText.textContent = '🔥 Firestore (En Vivo)';
            } else if (data.database && data.database.mysql_connected) {
                if (engineBadgeText) engineBadgeText.textContent = '🐬 MySQL Conectado';
            } else {
                if (engineBadgeText) engineBadgeText.textContent = '💾 Base Local';
            }
        } catch (err) {
            if (engineBadgeText) engineBadgeText.textContent = '⚠️ Sin conexión';
        }
    }

    // 2. Carga Principal de Leads
    async function loadLeads() {
        const loadingHtml = `
            <div class="py-12 text-center text-slate-400">
                <div class="inline-flex items-center gap-2">
                    <svg class="animate-spin h-5 w-5 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span class="text-xs">Cargando prospectos...</span>
                </div>
            </div>
        `;

        if (crmCardsMobile) crmCardsMobile.innerHTML = loadingHtml;
        if (crmTableBody) {
            crmTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400">
                        <div class="inline-flex items-center gap-3">
                            <svg class="animate-spin h-5 w-5 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Cargando cotizaciones desde Firebase Firestore...</span>
                        </div>
                    </td>
                </tr>
            `;
        }

        try {
            const res = await fetch('/api/leads');
            if (res.status === 401) {
                window.location.href = '/login';
                return;
            }
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
                renderEmpty();
            }
        } catch (error) {
            console.error('Error al cargar leads:', error);
            if (crmCardsMobile) {
                crmCardsMobile.innerHTML = `
                    <div class="p-6 text-center text-rose-400 bg-dark-900 border border-slate-800 rounded-2xl">
                        <p class="font-bold text-sm">Error de conexión al cargar datos.</p>
                        <span class="text-xs text-slate-500">Verifica que el servidor esté activo.</span>
                    </div>
                `;
            }
            if (crmTableBody) {
                crmTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="py-12 text-center text-rose-400 font-bold">
                            Error de conexión al cargar datos de Firebase.
                        </td>
                    </tr>
                `;
            }
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
        if (kpiNewLeads) kpiNewLeads.textContent = `${nuevos} nuevos`;
        if (kpiTotalValue) kpiTotalValue.textContent = `$${totalCOP.toLocaleString('es-CO')} COP`;
        if (kpiTotalM2) kpiTotalM2.textContent = `${totalM2.toLocaleString('es-CO')} m²`;
        if (kpiWonLeads) kpiWonLeads.textContent = ganados;
        if (kpiConversionRate) kpiConversionRate.textContent = `Cierre: ${convRate}%`;
    }

    // 4. Actualización de Contadores en las Pestañas
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

        const elAll = document.getElementById('tabCountAll');
        const elNuevo = document.getElementById('tabCountNuevo');
        const elContactado = document.getElementById('tabCountContactado');
        const elVisita = document.getElementById('tabCountVisita');
        const elCotizacion = document.getElementById('tabCountCotizacion');
        const elGanado = document.getElementById('tabCountGanado');
        const elPerdido = document.getElementById('tabCountPerdido');

        if (elAll) elAll.textContent = counts.all;
        if (elNuevo) elNuevo.textContent = counts.nuevo;
        if (elContactado) elContactado.textContent = counts.contactado;
        if (elVisita) elVisita.textContent = counts.visita_tecnica_agendada;
        if (elCotizacion) elCotizacion.textContent = counts.cotizacion_enviada;
        if (elGanado) elGanado.textContent = counts.ganado_en_obra;
        if (elPerdido) elPerdido.textContent = counts.perdido;
    }

    // Helper para filtrar prospectos por búsqueda en el Tablero Kanban
    function getFilteredKanbanLeads() {
        if (!searchQuery) return allLeads;
        const q = searchQuery.toLowerCase();
        return allLeads.filter(l => {
            const nombre = (l.nombre_completo || '').toLowerCase();
            const tel = (l.telefono || '').toLowerCase();
            const zona = (l.ciudad_zona || '').toLowerCase();
            const serv = (l.tipo_servicio || '').toLowerCase();
            const notas = (l.notas_seguimiento || '').toLowerCase();
            const detalles = (l.detalles_adicionales || '').toLowerCase();
            return nombre.includes(q) || tel.includes(q) || zona.includes(q) || serv.includes(q) || notas.includes(q) || detalles.includes(q);
        });
    }

    // 5. Filtrado y Renderizado
    function filterAndRender() {
        let filtered = allLeads;

        // Filtro por Estado (aplica a la vista de lista/tabla)
        if (currentFilter !== 'all') {
            filtered = filtered.filter(l => (l.estado_lead || 'nuevo') === currentFilter);
        }

        // Filtro por Buscador
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(l => {
                const nombre = (l.nombre_completo || '').toLowerCase();
                const tel = (l.telefono || '').toLowerCase();
                const zona = (l.ciudad_zona || '').toLowerCase();
                const serv = (l.tipo_servicio || '').toLowerCase();
                const notas = (l.notas_seguimiento || '').toLowerCase();
                const detalles = (l.detalles_adicionales || '').toLowerCase();
                return nombre.includes(q) || tel.includes(q) || zona.includes(q) || serv.includes(q) || notas.includes(q) || detalles.includes(q);
            });
        }

        if (filteredCountBadge) {
            filteredCountBadge.textContent = `${filtered.length} de ${allLeads.length} leads`;
        }

        if (!filtered || filtered.length === 0) {
            renderEmpty();
        } else {
            renderMobileCards(filtered);
            renderDesktopTable(filtered);
        }

        // Mantener sincronizado y renderizado el Tablero Kanban
        renderKanbanBoard(getFilteredKanbanLeads());
    }

    function renderEmpty() {
        const emptyMsg = `
            <div class="py-12 px-4 text-center text-slate-400 bg-dark-900 border border-slate-800 rounded-2xl">
                <div class="w-14 h-14 rounded-2xl bg-dark-950 border border-slate-800 flex items-center justify-center mx-auto text-2xl text-slate-500 mb-2">
                    📂
                </div>
                <strong class="text-white text-sm block font-bold">No hay cotizaciones para mostrar</strong>
                <p class="text-xs text-slate-500 mt-1">Prueba seleccionando otro filtro o limpiando la búsqueda.</p>
            </div>
        `;
        if (crmCardsMobile) crmCardsMobile.innerHTML = emptyMsg;
        if (crmTableBody) {
            crmTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="py-16 text-center text-slate-400">
                        <strong class="text-white text-base block font-bold">No se encontraron cotizaciones</strong>
                        <p class="text-xs text-slate-500 mt-1">No hay registros con los filtros seleccionados.</p>
                    </td>
                </tr>
            `;
        }
    }

    // 5A. Renderizado de Tarjetas Táctiles para Móviles (Fácil manejo con una mano)
    function renderMobileCards(leads) {
        if (!crmCardsMobile) return;

        crmCardsMobile.innerHTML = leads.map(lead => {
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
            const initials = getInitials(lead.nombre_completo);
            const hasNotes = lead.notas_seguimiento && lead.notas_seguimiento.trim().length > 0;

            const optionsHtml = ESTADOS.map(est => `
                <option value="${est.key}" ${lead.estado_lead === est.key ? 'selected' : ''}>
                    ${est.label}
                </option>
            `).join('');

            return `
                <div class="bg-dark-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
                    
                    <!-- Fila Superior: Avatar + Nombre + Fecha -->
                    <div class="flex items-start justify-between gap-2.5">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-dark-850 border border-slate-700 flex items-center justify-center font-display font-bold text-xs text-brand-400 shrink-0">
                                ${initials}
                            </div>
                            <div>
                                <h3 class="text-sm font-bold text-white leading-tight">${lead.nombre_completo}</h3>
                                <span class="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <svg class="w-3 h-3 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    ${lead.ciudad_zona || 'Área Metropolitana'}
                                </span>
                            </div>
                        </div>
                        <span class="text-[10px] text-slate-500 font-medium shrink-0">${fecha}</span>
                    </div>

                    <!-- Fila de Estado del Embudo (Selector táctil a lo ancho) -->
                    <div>
                        <select class="w-full status-select st-${lead.estado_lead || 'nuevo'} py-2.5 px-3 text-xs font-bold rounded-xl" onchange="changeStatus('${lead.id}', this.value, this)">
                            ${optionsHtml}
                        </select>
                    </div>

                    <!-- Fila de Proyecto & Presupuesto -->
                    <div class="bg-dark-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-2">
                        <div class="min-w-0">
                            <span class="text-xs text-white font-bold block capitalize truncate">${serviceName}</span>
                            <div class="flex items-center gap-1.5 mt-1">
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 whitespace-nowrap">
                                    <svg class="w-3 h-3 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                    <span>${Number(lead.area_m2_estimada || 0).toLocaleString('es-CO')} m²</span>
                                </span>
                                <span class="text-[11px] text-slate-400 capitalize truncate">
                                    • ${lead.tipo_inmueble ? lead.tipo_inmueble.replace(/_/g, ' ') : 'Apartamento'}
                                </span>
                            </div>
                        </div>
                        <div class="text-right shrink-0">
                            <span class="text-xs sm:text-sm font-black text-brand-400 font-display block">${presupuesto}</span>
                            <span class="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Presupuesto</span>
                        </div>
                    </div>

                    <!-- Fila de Botones de Acción Elegantes (Grandes y fáciles de tocar) -->
                    <div class="grid grid-cols-3 gap-2 pt-1">
                        <!-- WhatsApp -->
                        <a href="${waLink}" target="_blank" 
                           class="inline-flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 font-bold text-xs active:scale-95 transition-all shadow-sm">
                            <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.299.144.35.49 1.199.533 1.287.043.088.072.19.014.305-.058.115-.087.187-.173.289l-.26.309c-.087.098-.179.204-.077.379.101.175.452.746.97 1.208.667.595 1.23.78 1.403.867.174.088.275.073.376-.044.101-.116.433-.506.549-.68.116-.174.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                            </svg>
                            <span>WhatsApp</span>
                        </a>

                        <!-- Llamar -->
                        <a href="${telLink}" 
                           class="inline-flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-sky-500/15 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/30 font-bold text-xs active:scale-95 transition-all shadow-sm">
                            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>Llamar</span>
                        </a>

                        <!-- Bitácora -->
                        <button type="button" onclick="openDetailModal('${lead.id}')" 
                                class="inline-flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-purple-500/15 hover:bg-purple-500 text-purple-400 hover:text-white border border-purple-500/30 font-bold text-xs active:scale-95 transition-all shadow-sm">
                            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>${hasNotes ? 'Notas •' : 'Ficha'}</span>
                        </button>
                    </div>

                    <!-- Fila Inferior: Copiar Teléfono y Eliminar -->
                    <div class="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                        <button type="button" onclick="copyToClipboard('${cleanPhone}', 'Teléfono')" class="text-[11px] font-mono text-slate-400 hover:text-brand-400 flex items-center gap-1.5 py-1 px-2 rounded-lg bg-dark-950 border border-slate-800">
                            <span>📞 ${lead.telefono || 'Sin número'}</span>
                            <svg class="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>

                        <button type="button" onclick="deleteLead('${lead.id}', '${encodeURIComponent(lead.nombre_completo)}')" class="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors" title="Eliminar cotización">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>

                </div>
            `;
        }).join('');
    }

    // 5B. Renderizado de la Tabla para Escritorio (Espaciosa y elegante)
    function renderDesktopTable(leads) {
        if (!crmTableBody) return;

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
            const initials = getInitials(lead.nombre_completo);
            const hasNotes = lead.notas_seguimiento && lead.notas_seguimiento.trim().length > 0;

            const optionsHtml = ESTADOS.map(est => `
                <option value="${est.key}" ${lead.estado_lead === est.key ? 'selected' : ''}>
                    ${est.label}
                </option>
            `).join('');

            return `
                <tr class="hover:bg-slate-800/30 transition-colors group">
                    
                    <!-- Cliente & Ubicación -->
                    <td class="py-4 px-5">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-dark-850 border border-slate-700 flex items-center justify-center font-display font-bold text-xs text-brand-400 shrink-0">
                                ${initials}
                            </div>
                            <div>
                                <strong class="text-white text-sm font-bold block group-hover:text-brand-400 transition-colors">
                                    ${lead.nombre_completo}
                                </strong>
                                <span class="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                    <svg class="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    ${lead.ciudad_zona || 'Área Metropolitana'}
                                </span>
                            </div>
                        </div>
                    </td>

                    <!-- Contacto Directo: Botones organizados y claros -->
                    <td class="py-4 px-4">
                        <div class="flex items-center gap-2">
                            <!-- Botón WhatsApp -->
                            <a href="${waLink}" target="_blank" data-tooltip="Abrir WhatsApp" 
                               class="action-btn p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 transition-all duration-200 shadow-sm">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.299.144.35.49 1.199.533 1.287.043.088.072.19.014.305-.058.115-.087.187-.173.289l-.26.309c-.087.098-.179.204-.077.379.101.175.452.746.97 1.208.667.595 1.23.78 1.403.867.174.088.275.073.376-.044.101-.116.433-.506.549-.68.116-.174.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                                </svg>
                            </a>

                            <!-- Botón Teléfono -->
                            <a href="${telLink}" data-tooltip="Llamar" 
                               class="action-btn p-2 rounded-xl bg-sky-500/15 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/30 transition-all duration-200 shadow-sm">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </a>

                            <!-- Número con botón de copiar -->
                            <button type="button" onclick="copyToClipboard('${cleanPhone}', 'Teléfono')" data-tooltip="Copiar teléfono" 
                                    class="text-xs font-mono text-slate-300 hover:text-brand-400 px-2.5 py-1.5 rounded-xl bg-dark-950 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5">
                                <span>${lead.telefono || 'Sin número'}</span>
                                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    </td>

                    <!-- Proyecto & Metraje (Diseño Arquitectónico Profesional) -->
                    <td class="py-4 px-4 whitespace-nowrap">
                        <span class="text-xs font-bold text-white capitalize block leading-tight tracking-tight">
                            ${serviceName}
                        </span>
                        <div class="flex items-center gap-2 mt-1.5">
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 shadow-sm whitespace-nowrap">
                                <svg class="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                                <span>${Number(lead.area_m2_estimada || 0).toLocaleString('es-CO')} m²</span>
                            </span>
                            <span class="text-xs text-slate-400 capitalize font-medium whitespace-nowrap">
                                ${lead.tipo_inmueble ? lead.tipo_inmueble.replace(/_/g, ' ') : 'Apartamento'}
                            </span>
                        </div>
                    </td>

                    <!-- Presupuesto Estimado -->
                    <td class="py-4 px-4">
                        <span class="text-xs font-extrabold text-brand-400 block tracking-tight font-display">
                            ${presupuesto}
                        </span>
                        <span class="text-[10px] text-slate-500 uppercase font-semibold">Valor Estimado</span>
                    </td>

                    <!-- Estado del Embudo -->
                    <td class="py-4 px-4">
                        <select class="status-select st-${lead.estado_lead || 'nuevo'}" onchange="changeStatus('${lead.id}', this.value, this)">
                            ${optionsHtml}
                        </select>
                    </td>

                    <!-- Fecha & Origen -->
                    <td class="py-4 px-4">
                        <span class="text-xs text-slate-300 block font-medium">${fecha}</span>
                        <span class="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            <svg class="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            ${lead.utm_campaign || lead.utm_source || lead.origen_lead || 'Directo / Web'}
                        </span>
                    </td>

                    <!-- Gestión / Bitácora -->
                    <td class="py-4 px-5 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <!-- Botón Ficha & Bitácora -->
                            <button type="button" onclick="openDetailModal('${lead.id}')" data-tooltip="Ficha & Bitácora" 
                                    class="action-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500 text-purple-400 hover:text-white border border-purple-500/30 text-xs font-semibold transition-all">
                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>${hasNotes ? 'Bitácora •' : 'Ficha'}</span>
                            </button>

                            <!-- Botón Eliminar -->
                            <button type="button" onclick="deleteLead('${lead.id}', '${encodeURIComponent(lead.nombre_completo)}')" data-tooltip="Eliminar" 
                                    class="action-btn p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </td>

                </tr>
            `;
        }).join('');
    }

    // 5C. Renderizado del Tablero Kanban (Pipeline por Etapas)
    function renderKanbanBoard(leads) {
        KANBAN_STAGES.forEach(st => {
            const colLeads = leads.filter(l => (l.estado_lead || 'nuevo') === st.key);
            const colTotalCOP = colLeads.reduce((acc, curr) => acc + (parseFloat(curr.presupuesto_estimado) || 0), 0);

            const countEl = document.getElementById(`kbCount-${st.key}`);
            const totalEl = document.getElementById(`kbTotal-${st.key}`);
            const dropEl = document.getElementById(`kbDrop-${st.key}`);

            if (countEl) countEl.textContent = colLeads.length;
            if (totalEl) totalEl.textContent = `$${colTotalCOP.toLocaleString('es-CO')} COP`;

            if (!dropEl) return;

            if (colLeads.length === 0) {
                dropEl.innerHTML = `
                    <div class="h-32 border-2 border-dashed border-slate-800/80 rounded-xl flex flex-col items-center justify-center text-slate-500 text-xs text-center p-3 select-none pointer-events-none">
                        <span class="text-xl opacity-30">📥</span>
                        <span class="mt-1 font-medium text-[11px]">Arrastra aquí una obra</span>
                    </div>
                `;
                return;
            }

            dropEl.innerHTML = colLeads.map(lead => {
                const fecha = new Date(lead.created_at).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'short'
                });
                const presupuesto = lead.presupuesto_estimado 
                    ? `$${Number(lead.presupuesto_estimado).toLocaleString('es-CO')} COP` 
                    : 'A convenir';

                const cleanPhone = (lead.telefono || '').replace(/\D/g, '');
                const waMsg = `Hola ${encodeURIComponent(lead.nombre_completo)}, te escribo de Obra Blanca para revisar los acabados de tu proyecto en ${encodeURIComponent(lead.ciudad_zona || 'Medellín')}`;
                const waLink = `https://wa.me/57${cleanPhone}?text=${waMsg}`;
                const telLink = `tel:+57${cleanPhone}`;
                const serviceName = (lead.tipo_servicio || 'obra_blanca_completa').replace(/_/g, ' ');

                const prevBtnHtml = st.prev ? `
                    <button type="button" onclick="moveLeadStage('${lead.id}', '${st.prev}')" 
                            class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-xs font-bold active:scale-95" 
                            title="Mover a etapa anterior">
                        ←
                    </button>
                ` : '<span class="w-6"></span>';

                const nextBtnHtml = st.next ? `
                    <button type="button" onclick="moveLeadStage('${lead.id}', '${st.next}')" 
                            class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-xs font-bold active:scale-95" 
                            title="Avanzar etapa">
                        →
                    </button>
                ` : '<span class="w-6"></span>';

                return `
                    <div class="kanban-card group bg-dark-950/90 hover:bg-dark-950 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3 shadow-md space-y-2.5 cursor-grab active:cursor-grabbing select-none"
                         draggable="true" 
                         data-id="${lead.id}" 
                         data-status="${st.key}">
                        
                        <!-- Fila 1: Grip + Cliente + Fecha -->
                        <div class="flex items-center justify-between gap-1.5">
                            <div class="flex items-center gap-1.5 min-w-0">
                                <span class="text-slate-600 group-hover:text-amber-400 transition-colors cursor-grab text-xs font-bold">⋮⋮</span>
                                <h4 class="text-xs font-bold text-white truncate max-w-[170px]" title="${lead.nombre_completo}">
                                    ${lead.nombre_completo}
                                </h4>
                            </div>
                            <span class="text-[10px] text-slate-500 font-mono shrink-0">${fecha}</span>
                        </div>

                        <!-- Fila 2: Servicio & Ubicación -->
                        <div class="space-y-0.5">
                            <span class="text-[11px] font-semibold text-slate-300 block capitalize truncate">
                                ${serviceName}
                            </span>
                            <span class="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                                <svg class="w-3 h-3 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                ${lead.ciudad_zona || 'Medellín'}
                            </span>
                        </div>

                        <!-- Fila 3: Metraje & Presupuesto -->
                        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 whitespace-nowrap">
                                <svg class="w-3 h-3 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                                <span>${Number(lead.area_m2_estimada || 0).toLocaleString('es-CO')} m²</span>
                            </span>
                            <span class="text-xs font-black font-display text-brand-400 truncate">${presupuesto}</span>
                        </div>

                        <!-- Fila 4: Acciones Rápidas (WA, Llamar, Ficha) + Botones de Movimiento ← / → -->
                        <div class="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60">
                            <!-- Flecha retroceder -->
                            ${prevBtnHtml}

                            <!-- Acciones directas -->
                            <div class="flex items-center gap-1">
                                <a href="${waLink}" target="_blank" class="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 transition-all text-xs" title="WhatsApp">
                                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.299.144.35.49 1.199.533 1.287.043.088.072.19.014.305-.058.115-.087.187-.173.289l-.26.309c-.087.098-.179.204-.077.379.101.175.452.746.97 1.208.667.595 1.23.78 1.403.867.174.088.275.073.376-.044.101-.116.433-.506.549-.68.116-.174.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                                    </svg>
                                </a>
                                <a href="${telLink}" class="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/30 transition-all text-xs" title="Llamar">
                                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </a>
                                <button type="button" onclick="openDetailModal('${lead.id}')" class="p-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500 text-purple-400 hover:text-white border border-purple-500/30 transition-all text-xs" title="Ficha / Bitácora">
                                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                            </div>

                            <!-- Flecha avanzar -->
                            ${nextBtnHtml}
                        </div>

                    </div>
                `;
            }).join('');
        });

        initKanbanDragAndDrop();
    }

    // 5D. Manejo de Arrastrar y Soltar (HTML5 Drag & Drop)
    function initKanbanDragAndDrop() {
        const cards = document.querySelectorAll('.kanban-card');
        const dropzones = document.querySelectorAll('.kanban-dropzone');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select')) {
                    e.preventDefault();
                    return;
                }
                draggedLeadId = card.getAttribute('data-id');
                e.dataTransfer.setData('text/plain', draggedLeadId);
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => card.classList.add('is-dragging'), 0);
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('is-dragging');
                draggedLeadId = null;
                dropzones.forEach(dz => dz.classList.remove('drag-over'));
            });
        });

        dropzones.forEach(dz => {
            dz.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (!dz.classList.contains('drag-over')) {
                    dz.classList.add('drag-over');
                }
            });

            dz.addEventListener('dragleave', (e) => {
                if (!dz.contains(e.relatedTarget)) {
                    dz.classList.remove('drag-over');
                }
            });

            dz.addEventListener('drop', (e) => {
                e.preventDefault();
                dz.classList.remove('drag-over');
                const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
                const targetStatus = dz.getAttribute('data-drop-status');

                if (leadId && targetStatus) {
                    moveLeadStage(leadId, targetStatus);
                }
            });
        });
    }

    // 5E. Mover Etapa de Lead (Optimista + Sincronización en vivo con Firebase Firestore)
    window.moveLeadStage = async function(leadId, targetStatus) {
        const lead = allLeads.find(l => String(l.id) === String(leadId));
        if (!lead) return;
        if (lead.estado_lead === targetStatus) return;

        const oldStatus = lead.estado_lead || 'nuevo';
        lead.estado_lead = targetStatus;

        // Actualización optimista de la interfaz
        updateKPIs(allLeads);
        updateTabCounters(allLeads);
        filterAndRender();

        const stageObj = KANBAN_STAGES.find(s => s.key === targetStatus);
        const stageLabel = stageObj ? stageObj.label : targetStatus.replace(/_/g, ' ');
        showToast(`Movido a: ${stageLabel}`);

        try {
            const res = await fetch(`/api/leads/${leadId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado_lead: targetStatus })
            });
            const data = await res.json();
            if (!data.success) {
                // Revertir estado si falla en Firestore
                lead.estado_lead = oldStatus;
                updateKPIs(allLeads);
                updateTabCounters(allLeads);
                filterAndRender();
                showToast(`Error: ${data.error || 'No se pudo actualizar'}`, '⚠️', true);
            }
        } catch (err) {
            console.error('Error al actualizar estado:', err);
            lead.estado_lead = oldStatus;
            updateKPIs(allLeads);
            updateTabCounters(allLeads);
            filterAndRender();
            showToast('Error de conexión con Firebase', '⚠️', true);
        }
    };

    // 6. Cambio de Estado en Vivo (Dropdowns de Lista / Tabla)
    window.changeStatus = async function(id, newStatus, selectElement) {
        if (selectElement) {
            selectElement.className = selectElement.className.replace(/st-\w+/, `st-${newStatus}`);
        }
        await moveLeadStage(id, newStatus);
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
        document.getElementById('modalM2').textContent = `${Number(lead.area_m2_estimada || 0).toLocaleString('es-CO')} m²`;
        document.getElementById('modalBudget').textContent = lead.presupuesto_estimado ? `$${Number(lead.presupuesto_estimado).toLocaleString('es-CO')} COP` : 'A convenir';
        
        document.getElementById('modalClientNotes').textContent = lead.detalles_adicionales || 'Sin notas adicionales ingresadas por el cliente.';
        modalAdminNotes.value = lead.notas_seguimiento || '';

        detailModal.classList.add('modal-active');
    };

    function closeDetailModal() {
        detailModal.classList.remove('modal-active');
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
                btnSaveAdminNotes.innerHTML = `
                    <svg class="animate-spin h-4 w-4 text-dark-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Guardando...</span>
                `;

                const res = await fetch(`/api/leads/${selectedLeadForNotes.id}/notes`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notas })
                });
                const data = await res.json();

                if (data.success) {
                    selectedLeadForNotes.notas_seguimiento = notas;
                    showToast('Bitácora guardada en Firestore');
                    closeDetailModal();
                    filterAndRender();
                } else {
                    showToast(`Error: ${data.error}`, '⚠️', true);
                }
            } catch (err) {
                console.error(err);
                showToast('Error al guardar bitácora', '⚠️', true);
            } finally {
                btnSaveAdminNotes.disabled = false;
                btnSaveAdminNotes.innerHTML = `
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span>Guardar Bitácora</span>
                `;
            }
        });
    }

    // 8. Eliminar Cotización
    window.deleteLead = async function(id, clientNameEncoded) {
        const clientName = decodeURIComponent(clientNameEncoded);
        const confirmDelete = confirm(`¿Deseas eliminar la cotización de "${clientName}"? Se borrará de Firebase.`);
        if (!confirmDelete) return;

        try {
            const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                allLeads = allLeads.filter(l => String(l.id) !== String(id));
                updateKPIs(allLeads);
                updateTabCounters(allLeads);
                filterAndRender();
                showToast(`Cotización eliminada`, '🗑️');
            } else {
                showToast(`Error: ${data.error}`, '⚠️', true);
            }
        } catch (err) {
            console.error('Error al eliminar lead:', err);
            showToast('Error de conexión al eliminar', '⚠️', true);
        }
    };

    // 9. Registrar Nuevo Prospecto
    function openNewLeadModal() {
        newLeadForm.reset();
        newLeadModal.classList.add('modal-active');
    }
    function closeNewLeadModal() {
        newLeadModal.classList.remove('modal-active');
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
                submitBtn.innerHTML = `
                    <svg class="animate-spin h-4 w-4 text-dark-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Guardando...</span>
                `;

                const res = await fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (data.success) {
                    showToast('Prospecto guardado en Firestore');
                    closeNewLeadModal();
                    await loadLeads();
                } else {
                    showToast(`Error: ${data.error}`, '⚠️', true);
                }
            } catch (err) {
                console.error(err);
                showToast('Error de conexión', '⚠️', true);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Guardar Prospecto</span>
                `;
            }
        });
    }

    // 10. Filtrado por Estado (Píldoras y KPIs)
    window.filterByState = function(stateKey) {
        currentFilter = stateKey;
        
        filterPills.forEach(btn => {
            const f = btn.getAttribute('data-filter');
            if (f === stateKey) {
                btn.className = 'filter-tab-pill active flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 bg-brand-500 text-dark-950 border-brand-400 shadow-md shadow-brand-500/20';
            } else {
                btn.className = 'filter-tab-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shrink-0 bg-dark-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200';
            }
        });

        filterAndRender();
    };

    filterPills.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            filterByState(filter);
        });
    });

    // 11. Búsqueda y Limpieza
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            if (btnClearSearch) {
                if (searchQuery.length > 0) {
                    btnClearSearch.classList.remove('hidden');
                } else {
                    btnClearSearch.classList.add('hidden');
                }
            }
            filterAndRender();
        });
    }

    if (btnClearSearch) {
        btnClearSearch.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            btnClearSearch.classList.add('hidden');
            filterAndRender();
            searchInput.focus();
        });
    }

    // 12. Switcher de Vista (Lista vs Tablero Kanban vs Proyectos Fotos)
    window.switchView = function(viewName) {
        currentView = viewName;
        const btnViewList = document.getElementById('btnViewList');
        const btnViewKanban = document.getElementById('btnViewKanban');
        const btnViewProjects = document.getElementById('btnViewProjects');

        const crmListView = document.getElementById('crmListView');
        const crmKanbanSection = document.getElementById('crmKanbanSection');
        const crmProjectsSection = document.getElementById('crmProjectsSection');

        const btnBottomNavList = document.getElementById('btnBottomNavList');
        const btnBottomNavKanban = document.getElementById('btnBottomNavKanban');
        const btnBottomNavProjects = document.getElementById('btnBottomNavProjects');

        const navTabBtns = document.querySelectorAll('.nav-tab-btn');

        // Reset all view buttons
        [btnViewList, btnViewKanban, btnViewProjects].forEach(b => {
            if (b) b.className = 'view-switch-btn px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all flex items-center gap-1.5';
        });

        // Hide all sections
        if (crmListView) crmListView.classList.add('hidden');
        if (crmKanbanSection) crmKanbanSection.classList.add('hidden');
        if (crmProjectsSection) crmProjectsSection.classList.add('hidden');

        // Reset bottom nav colors
        if (btnBottomNavList) {
            btnBottomNavList.className = 'flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-brand-400 transition-colors';
            const svg = btnBottomNavList.querySelector('svg');
            if (svg) svg.className = 'w-5 h-5 text-slate-400';
        }
        if (btnBottomNavKanban) {
            btnBottomNavKanban.className = 'flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-purple-400 transition-colors';
            const svg = btnBottomNavKanban.querySelector('svg');
            if (svg) svg.className = 'w-5 h-5 text-slate-400';
        }
        if (btnBottomNavProjects) {
            btnBottomNavProjects.className = 'flex flex-col items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-amber-400 transition-colors';
            const svg = btnBottomNavProjects.querySelector('svg');
            if (svg) svg.className = 'w-5 h-5 text-slate-400';
        }

        // Reset desktop nav buttons
        navTabBtns.forEach(b => {
            b.className = 'nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all flex items-center gap-2';
        });

        if (viewName === 'kanban') {
            if (btnViewKanban) {
                btnViewKanban.className = 'view-switch-btn active px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-slate-800 shadow-sm flex items-center gap-1.5 transition-all';
            }
            if (crmKanbanSection) crmKanbanSection.classList.remove('hidden');

            if (btnBottomNavKanban) {
                btnBottomNavKanban.className = 'flex flex-col items-center gap-1 text-[10px] font-bold text-purple-400 transition-colors';
                const svg = btnBottomNavKanban.querySelector('svg');
                if (svg) svg.className = 'w-5 h-5 text-purple-400';
            }

            navTabBtns.forEach(b => {
                if (b.getAttribute('data-nav') === 'kanban') {
                    b.className = 'nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 border border-slate-700/80 transition-all flex items-center gap-2';
                }
            });

            renderKanbanBoard(getFilteredKanbanLeads());
        } else if (viewName === 'projects') {
            if (btnViewProjects) {
                btnViewProjects.className = 'view-switch-btn active px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-slate-800 shadow-sm flex items-center gap-1.5 transition-all';
            }
            if (crmProjectsSection) crmProjectsSection.classList.remove('hidden');

            if (btnBottomNavProjects) {
                btnBottomNavProjects.className = 'flex flex-col items-center gap-1 text-[10px] font-bold text-amber-400 transition-colors';
                const svg = btnBottomNavProjects.querySelector('svg');
                if (svg) svg.className = 'w-5 h-5 text-amber-400';
            }

            navTabBtns.forEach(b => {
                if (b.getAttribute('data-nav') === 'projects') {
                    b.className = 'nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 border border-slate-700/80 transition-all flex items-center gap-2';
                }
            });

            loadProjects();
        } else {
            // viewName === 'list'
            if (btnViewList) {
                btnViewList.className = 'view-switch-btn active px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-slate-800 shadow-sm flex items-center gap-1.5 transition-all';
            }
            if (crmListView) crmListView.classList.remove('hidden');

            if (btnBottomNavList) {
                btnBottomNavList.className = 'flex flex-col items-center gap-1 text-[10px] font-bold text-brand-400 transition-colors';
                const svg = btnBottomNavList.querySelector('svg');
                if (svg) svg.className = 'w-5 h-5 text-brand-400';
            }

            navTabBtns.forEach(b => {
                if (b.getAttribute('data-nav') === 'dashboard' || b.getAttribute('data-nav') === 'leads') {
                    b.className = 'nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 border border-slate-700/80 transition-all flex items-center gap-2';
                }
            });

            filterAndRender();
        }
    };

    const btnViewList = document.getElementById('btnViewList');
    const btnViewKanban = document.getElementById('btnViewKanban');
    const btnViewProjects = document.getElementById('btnViewProjects');
    if (btnViewList) btnViewList.addEventListener('click', () => switchView('list'));
    if (btnViewKanban) btnViewKanban.addEventListener('click', () => switchView('kanban'));
    if (btnViewProjects) btnViewProjects.addEventListener('click', () => switchView('projects'));

    // 13. Pestañas del Navbar
    const navTabBtns = document.querySelectorAll('.nav-tab-btn');
    navTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const nav = btn.getAttribute('data-nav');
            if (nav === 'dashboard' || nav === 'leads') {
                switchView('list');
                filterByState('all');
            } else if (nav === 'kanban') {
                switchView('kanban');
            } else if (nav === 'projects') {
                switchView('projects');
            }
        });
    });

    // =========================================================================
    // 14. GESTOR DE TRANSFORMACIONES "ANTES Y DESPUÉS" (Subida y Edición de Fotos)
    // =========================================================================
    let allProjects = [];
    let selectedFotoAntesFile = null;
    let selectedFotoDespuesFile = null;

    const projectsGrid = document.getElementById('projectsGrid');
    const projectModal = document.getElementById('projectModal');
    const btnOpenNewProjectModal = document.getElementById('btnOpenNewProjectModal');
    const btnCloseProjectModal = document.getElementById('btnCloseProjectModal');
    const btnCancelProjectModal = document.getElementById('btnCancelProjectModal');
    const projectForm = document.getElementById('projectForm');
    const projectModalTitle = document.getElementById('projectModalTitle');
    const btnSubmitProject = document.getElementById('btnSubmitProject');
    const btnSubmitProjectText = document.getElementById('btnSubmitProjectText');

    // Dropzones y Previews
    const dropzoneAntes = document.getElementById('dropzoneAntes');
    const inputFotoAntes = document.getElementById('inputFotoAntes');
    const imgPreviewAntes = document.getElementById('imgPreviewAntes');
    const previewAntesContainer = document.getElementById('previewAntesContainer');
    const placeholderAntes = document.getElementById('placeholderAntes');
    const btnResetFotoAntes = document.getElementById('btnResetFotoAntes');

    const dropzoneDespues = document.getElementById('dropzoneDespues');
    const inputFotoDespues = document.getElementById('inputFotoDespues');
    const imgPreviewDespues = document.getElementById('imgPreviewDespues');
    const previewDespuesContainer = document.getElementById('previewDespuesContainer');
    const placeholderDespues = document.getElementById('placeholderDespues');
    const btnResetFotoDespues = document.getElementById('btnResetFotoDespues');

    async function loadProjects() {
        if (!projectsGrid) return;
        projectsGrid.innerHTML = `
            <div class="py-12 col-span-full text-center text-slate-400">
                <div class="inline-flex items-center gap-2">
                    <svg class="animate-spin h-5 w-5 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span class="text-xs">Cargando proyectos desde Firebase...</span>
                </div>
            </div>
        `;

        try {
            const res = await fetch('/api/projects?all=true');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                allProjects = data.data;
                renderProjectsGrid(allProjects);
            } else {
                allProjects = [];
                renderEmptyProjects();
            }
        } catch (error) {
            console.error('Error al cargar proyectos:', error);
            projectsGrid.innerHTML = `
                <div class="py-12 col-span-full text-center text-rose-400 font-bold bg-dark-900 border border-slate-800 rounded-2xl">
                    Error al cargar proyectos de transformación.
                </div>
            `;
        }
    }

    function renderEmptyProjects() {
        if (!projectsGrid) return;
        projectsGrid.innerHTML = `
            <div class="col-span-full py-16 px-4 text-center text-slate-400 bg-dark-900 border border-slate-800 rounded-2xl">
                <div class="w-16 h-16 rounded-2xl bg-dark-950 border border-slate-800 flex items-center justify-center mx-auto text-3xl mb-3">
                    📸
                </div>
                <h3 class="text-white text-base font-bold">Aún no has registrado transformaciones</h3>
                <p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Sube tu primer proyecto con fotos de obra gris y obra blanca para que tus clientes lo vean en la página web.
                </p>
                <button type="button" onclick="openNewProjectModal()" class="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-dark-950 bg-gradient-to-r from-brand-400 to-amber-500 hover:from-brand-300 hover:to-amber-400 transition-all shadow-md">
                    + Subir Primera Transformación
                </button>
            </div>
        `;
    }

    function renderProjectsGrid(projects) {
        if (!projectsGrid) return;
        if (!projects || projects.length === 0) {
            renderEmptyProjects();
            return;
        }

        projectsGrid.innerHTML = projects.map(proj => {
            const isFeatured = proj.destacado_principal === true;
            const fecha = new Date(proj.created_at || Date.now()).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short', year: 'numeric'
            });

            return `
                <div class="bg-dark-900 border ${isFeatured ? 'border-amber-500/60 ring-1 ring-amber-500/40 shadow-amber-500/10' : 'border-slate-800 hover:border-slate-700/80'} rounded-2xl overflow-hidden shadow-xl flex flex-col transition-all group">
                    
                    <!-- Previsualizador Visual Dual (Antes vs Después) -->
                    <div class="relative h-48 sm:h-52 bg-dark-950 overflow-hidden grid grid-cols-2 divide-x divide-slate-800">
                        <!-- Foto Antes -->
                        <div class="relative h-full overflow-hidden group/antes">
                            <img src="${proj.foto_antes}" alt="Foto Antes - ${proj.titulo}" class="w-full h-full object-cover group-hover/antes:scale-105 transition-transform duration-300">
                            <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-dark-950/85 backdrop-blur-sm text-[10px] font-bold text-amber-400 border border-amber-500/30">
                                🧱 Antes
                            </span>
                        </div>

                        <!-- Foto Después -->
                        <div class="relative h-full overflow-hidden group/despues">
                            <img src="${proj.foto_despues}" alt="Foto Después - ${proj.titulo}" class="w-full h-full object-cover group-hover/despues:scale-105 transition-transform duration-300">
                            <span class="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-dark-950/85 backdrop-blur-sm text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                                ✨ Después
                            </span>
                        </div>

                        <!-- Badge Destacado en Home -->
                        ${isFeatured ? `
                            <div class="absolute bottom-2 inset-x-2 text-center">
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-brand-500 text-dark-950 text-[10px] font-extrabold shadow-lg shadow-amber-500/30 uppercase tracking-wider">
                                    <span>🌟</span> Activo en Comparador Web
                                </span>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Datos del Proyecto -->
                    <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div class="space-y-1.5">
                            <div class="flex items-center justify-between gap-2">
                                <span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                                    ${proj.categoria || 'Obra Blanca'}
                                </span>
                                <span class="text-[10px] text-slate-500 font-mono">${fecha}</span>
                            </div>
                            <h3 class="text-sm font-bold text-white leading-snug group-hover:text-amber-400 transition-colors">
                                ${proj.titulo}
                            </h3>
                            <p class="text-xs text-slate-400 flex items-center gap-1">
                                <svg class="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>${proj.sector || 'Medellín / Área Metropolitana'}</span>
                            </p>
                            ${proj.descripcion ? `
                                <p class="text-xs text-slate-400/90 line-clamp-2 pt-1 leading-relaxed">
                                    ${proj.descripcion}
                                </p>
                            ` : ''}
                        </div>

                        <!-- Botones de Acción -->
                        <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                            <!-- Botón Destacar en Home -->
                            ${isFeatured ? `
                                <span class="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                                    <svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                    </svg>
                                    Slider Activo
                                </span>
                            ` : `
                                <button type="button" onclick="setFeaturedProject('${proj.id}')" 
                                        class="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-dark-950 border border-amber-500/25 text-xs font-bold transition-all flex items-center gap-1 active:scale-95">
                                    <span>🌟</span>
                                    <span>Destacar en Web</span>
                                </button>
                            `}

                            <div class="flex items-center gap-1.5">
                                <!-- Botón Editar -->
                                <button type="button" onclick="openEditProjectModal('${proj.id}')" 
                                        class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-xs" title="Editar proyecto">
                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>

                                <!-- Botón Eliminar -->
                                <button type="button" onclick="deleteProject('${proj.id}', '${encodeURIComponent(proj.titulo)}')" 
                                        class="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all text-xs" title="Eliminar proyecto">
                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            `;
        }).join('');
    }

    // Abrir Modal para Crear
    window.openNewProjectModal = function() {
        if (!projectForm) return;
        projectForm.reset();
        document.getElementById('projectId').value = '';
        document.getElementById('projectExistingFotoAntes').value = '';
        document.getElementById('projectExistingFotoDespues').value = '';
        selectedFotoAntesFile = null;
        selectedFotoDespuesFile = null;

        // Reset previews
        if (previewAntesContainer) previewAntesContainer.classList.add('hidden');
        if (placeholderAntes) placeholderAntes.classList.remove('hidden');
        if (btnResetFotoAntes) btnResetFotoAntes.classList.add('hidden');
        if (imgPreviewAntes) imgPreviewAntes.src = '';

        if (previewDespuesContainer) previewDespuesContainer.classList.add('hidden');
        if (placeholderDespues) placeholderDespues.classList.remove('hidden');
        if (btnResetFotoDespues) btnResetFotoDespues.classList.add('hidden');
        if (imgPreviewDespues) imgPreviewDespues.src = '';

        if (projectModalTitle) projectModalTitle.textContent = 'Nueva Transformación';
        if (btnSubmitProjectText) btnSubmitProjectText.textContent = 'Guardar Transformación';

        if (projectModal) projectModal.classList.add('modal-active');
    };

    // Abrir Modal para Editar
    window.openEditProjectModal = function(id) {
        const proj = allProjects.find(p => String(p.id) === String(id));
        if (!proj) return;

        openNewProjectModal();
        if (projectModalTitle) projectModalTitle.textContent = 'Editar Transformación';
        if (btnSubmitProjectText) btnSubmitProjectText.textContent = 'Actualizar Cambios';

        document.getElementById('projectId').value = proj.id;
        document.getElementById('projectTitulo').value = proj.titulo || '';
        document.getElementById('projectCategoria').value = proj.categoria || 'Apartamento Completo';
        document.getElementById('projectSector').value = proj.sector || '';
        document.getElementById('projectDescripcion').value = proj.descripcion || '';
        document.getElementById('projectDestacado').checked = proj.destacado_principal === true;

        document.getElementById('projectExistingFotoAntes').value = proj.foto_antes || '';
        document.getElementById('projectExistingFotoDespues').value = proj.foto_despues || '';

        // Cargar vista previa existente de foto Antes
        if (proj.foto_antes) {
            imgPreviewAntes.src = proj.foto_antes;
            previewAntesContainer.classList.remove('hidden');
            placeholderAntes.classList.add('hidden');
            btnResetFotoAntes.classList.remove('hidden');
        }

        // Cargar vista previa existente de foto Después
        if (proj.foto_despues) {
            imgPreviewDespues.src = proj.foto_despues;
            previewDespuesContainer.classList.remove('hidden');
            placeholderDespues.classList.add('hidden');
            btnResetFotoDespues.classList.remove('hidden');
        }

        if (projectModal) projectModal.classList.add('modal-active');
    };

    function closeProjectModal() {
        if (projectModal) projectModal.classList.remove('modal-active');
    }

    if (btnOpenNewProjectModal) btnOpenNewProjectModal.addEventListener('click', openNewProjectModal);
    if (btnCloseProjectModal) btnCloseProjectModal.addEventListener('click', closeProjectModal);
    if (btnCancelProjectModal) btnCancelProjectModal.addEventListener('click', closeProjectModal);

    // Manejo de Dropzone y Archivos para Foto ANTES
    if (dropzoneAntes && inputFotoAntes) {
        dropzoneAntes.addEventListener('click', () => inputFotoAntes.click());

        inputFotoAntes.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFotoAntesSelected(file);
        });

        dropzoneAntes.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzoneAntes.classList.add('drag-active');
        });

        dropzoneAntes.addEventListener('dragleave', () => {
            dropzoneAntes.classList.remove('drag-active');
        });

        dropzoneAntes.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzoneAntes.classList.remove('drag-active');
            const file = e.dataTransfer.files[0];
            if (file) handleFotoAntesSelected(file);
        });
    }

    function handleFotoAntesSelected(file) {
        selectedFotoAntesFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imgPreviewAntes.src = e.target.result;
            previewAntesContainer.classList.remove('hidden');
            placeholderAntes.classList.add('hidden');
            btnResetFotoAntes.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    if (btnResetFotoAntes) {
        btnResetFotoAntes.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedFotoAntesFile = null;
            document.getElementById('projectExistingFotoAntes').value = '';
            inputFotoAntes.value = '';
            imgPreviewAntes.src = '';
            previewAntesContainer.classList.add('hidden');
            placeholderAntes.classList.remove('hidden');
            btnResetFotoAntes.classList.add('hidden');
        });
    }

    // Manejo de Dropzone y Archivos para Foto DESPUÉS
    if (dropzoneDespues && inputFotoDespues) {
        dropzoneDespues.addEventListener('click', () => inputFotoDespues.click());

        inputFotoDespues.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFotoDespuesSelected(file);
        });

        dropzoneDespues.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzoneDespues.classList.add('drag-active');
        });

        dropzoneDespues.addEventListener('dragleave', () => {
            dropzoneDespues.classList.remove('drag-active');
        });

        dropzoneDespues.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzoneDespues.classList.remove('drag-active');
            const file = e.dataTransfer.files[0];
            if (file) handleFotoDespuesSelected(file);
        });
    }

    function handleFotoDespuesSelected(file) {
        selectedFotoDespuesFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imgPreviewDespues.src = e.target.result;
            previewDespuesContainer.classList.remove('hidden');
            placeholderDespues.classList.add('hidden');
            btnResetFotoDespues.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    if (btnResetFotoDespues) {
        btnResetFotoDespues.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedFotoDespuesFile = null;
            document.getElementById('projectExistingFotoDespues').value = '';
            inputFotoDespues.value = '';
            imgPreviewDespues.src = '';
            previewDespuesContainer.classList.add('hidden');
            placeholderDespues.classList.remove('hidden');
            btnResetFotoDespues.classList.add('hidden');
        });
    }

    // Guardar / Actualizar Proyecto
    if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('projectId').value;
            const isEditing = Boolean(id);

            const existingAntes = document.getElementById('projectExistingFotoAntes').value;
            const existingDespues = document.getElementById('projectExistingFotoDespues').value;

            if (!selectedFotoAntesFile && !existingAntes) {
                showToast('Debes seleccionar la foto del ANTES (Obra Gris)', '⚠️', true);
                return;
            }

            if (!selectedFotoDespuesFile && !existingDespues) {
                showToast('Debes seleccionar la foto del DESPUÉS (Acabado Final)', '⚠️', true);
                return;
            }

            const formData = new FormData();
            formData.append('titulo', document.getElementById('projectTitulo').value.trim());
            formData.append('categoria', document.getElementById('projectCategoria').value);
            formData.append('sector', document.getElementById('projectSector').value.trim());
            formData.append('descripcion', document.getElementById('projectDescripcion').value.trim());
            formData.append('destacado_principal', document.getElementById('projectDestacado').checked);

            if (selectedFotoAntesFile) {
                formData.append('foto_antes', selectedFotoAntesFile);
            } else if (existingAntes) {
                formData.append('foto_antes', existingAntes);
            }

            if (selectedFotoDespuesFile) {
                formData.append('foto_despues', selectedFotoDespuesFile);
            } else if (existingDespues) {
                formData.append('foto_despues', existingDespues);
            }

            try {
                btnSubmitProject.disabled = true;
                btnSubmitProject.innerHTML = `
                    <svg class="animate-spin h-4 w-4 text-dark-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Subiendo y guardando...</span>
                `;

                const url = isEditing ? `/api/projects/${id}` : '/api/projects';
                const method = isEditing ? 'PUT' : 'POST';

                const res = await fetch(url, {
                    method,
                    body: formData
                });
                const data = await res.json();

                if (data.success) {
                    showToast(isEditing ? '¡Transformación actualizada!' : '¡Transformación subida con éxito!');
                    closeProjectModal();
                    await loadProjects();
                } else {
                    showToast(`Error: ${data.error || 'No se pudo guardar'}`, '⚠️', true);
                }
            } catch (err) {
                console.error('Error al guardar proyecto:', err);
                showToast('Error de conexión al guardar', '⚠️', true);
            } finally {
                btnSubmitProject.disabled = false;
                btnSubmitProject.innerHTML = `
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>${isEditing ? 'Actualizar Cambios' : 'Guardar Transformación'}</span>
                `;
            }
        });
    }

    // Destacar en Home
    window.setFeaturedProject = async function(id) {
        try {
            const res = await fetch(`/api/projects/${id}/featured`, { method: 'PATCH' });
            const data = await res.json();
            if (data.success) {
                showToast('¡Obra marcada como destacada en el comparador web!', '🌟');
                await loadProjects();
            } else {
                showToast(`Error: ${data.error}`, '⚠️', true);
            }
        } catch (err) {
            console.error('Error al destacar proyecto:', err);
            showToast('Error de conexión', '⚠️', true);
        }
    };

    // Eliminar Proyecto
    window.deleteProject = async function(id, titleEncoded) {
        const title = decodeURIComponent(titleEncoded);
        const confirmDelete = confirm(`¿Estás seguro de eliminar la transformación "${title}"? Se borrará de la web y de Firebase.`);
        if (!confirmDelete) return;

        try {
            const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                showToast('Proyecto eliminado correctamente', '🗑️');
                await loadProjects();
            } else {
                showToast(`Error: ${data.error}`, '⚠️', true);
            }
        } catch (err) {
            console.error('Error al eliminar proyecto:', err);
            showToast('Error de conexión', '⚠️', true);
        }
    };

    // Cierre de sesión
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch (err) {
                console.error('Error al cerrar sesión:', err);
            }
            window.location.href = '/login';
        });
    }

    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            loadLeads();
            checkBackendHealth();
            if (currentView === 'projects') loadProjects();
            showToast('Datos sincronizados con Firebase');
        });
    }

    // Cierre de modales
    window.addEventListener('click', (e) => {
        if (e.target === detailModal) closeDetailModal();
        if (e.target === newLeadModal) closeNewLeadModal();
        if (e.target === projectModal) closeProjectModal();
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDetailModal();
            closeNewLeadModal();
            closeProjectModal();
        }
    });

    // Carga inicial
    checkBackendHealth();
    loadLeads();
});

