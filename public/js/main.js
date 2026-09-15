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

    // 3. Mini-CRM Modal Viewer (Para que el ingeniero y el equipo vean sus leads al instante)
    const openCrmBtn = document.getElementById('btnOpenCrm');
    const crmModal = document.getElementById('crmModal');
    const closeCrmBtn = document.getElementById('btnCloseCrm');
    const crmTableBody = document.getElementById('crmTableBody');
    const crmTotalCount = document.getElementById('crmTotalCount');

    async function loadCrmLeads() {
        if (!crmTableBody) return;
        crmTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem;">Cargando cotizaciones...</td></tr>';
        
        try {
            const res = await fetch('/api/leads');
            const data = await res.json();
            
            if (!data.success || !data.data || data.data.length === 0) {
                crmTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#94a3b8;">No hay cotizaciones registradas aún. ¡Usa el formulario para probar el embudo!</td></tr>';
                if (crmTotalCount) crmTotalCount.textContent = '0';
                return;
            }

            if (crmTotalCount) crmTotalCount.textContent = data.data.length;

            crmTableBody.innerHTML = data.data.map(lead => {
                const fecha = new Date(lead.created_at).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                });
                const presupuesto = lead.presupuesto_estimado 
                    ? `$${Number(lead.presupuesto_estimado).toLocaleString('es-CO')}` 
                    : 'A convenir';

                const cleanPhone = (lead.telefono || '').replace(/\D/g, '');
                const waLink = `https://wa.me/57${cleanPhone}?text=Hola%20${encodeURIComponent(lead.nombre_completo)},%20te%20escribo%20respecto%20a%20tu%20cotizaci%C3%B3n%20de%20obra%20blanca`;

                return `
                    <tr>
                        <td><strong>${lead.nombre_completo}</strong></td>
                        <td>
                            <a href="${waLink}" target="_blank" style="color:#25d366; text-decoration:none; font-weight:bold;">
                                📱 ${lead.telefono}
                            </a>
                        </td>
                        <td>${lead.tipo_servicio.replace(/_/g, ' ')} (${lead.area_m2_estimada || 0} m²)</td>
                        <td><span style="color:#fbbf24; font-weight:700;">${presupuesto}</span></td>
                        <td><span class="crm-status-badge crm-status-${lead.estado_lead}">${lead.estado_lead}</span></td>
                        <td style="color:#64748b; font-size:0.8rem;">${fecha}</td>
                    </tr>
                `;
            }).join('');

        } catch (error) {
            console.error('Error cargando leads:', error);
            crmTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#ef4444;">Error al cargar leads desde la API.</td></tr>';
        }
    }

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
