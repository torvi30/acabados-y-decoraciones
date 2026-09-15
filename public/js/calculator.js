/**
 * ==========================================================================
 * CALCULADORA Y FORMULARIO INTELIGENTE MULTI-PASO (CRO FUNNEL)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // Tarifas de referencia en COP por metro cuadrado
    const TARIFAS_M2 = {
        obra_blanca_completa: 185000,
        estuco_y_pintura: 48000,
        cielo_raso_drywall: 65000,
        enchapes_y_pisos: 55000
    };

    // Estado local del embudo
    const funnelState = {
        currentStep: 1,
        totalSteps: 3,
        tipo_inmueble: 'apartamento',
        estado_actual_obra: 'obra_gris',
        tipo_servicio: 'obra_blanca_completa',
        area_m2: 65,
        presupuesto_estimado: 0,
        nombre_completo: '',
        telefono: '',
        ciudad_zona: 'Medellín / Área Metropolitana',
        detalles_adicionales: '',
        utm_source: null,
        utm_medium: null,
        utm_campaign: null
    };

    // Capturar parámetros UTM de la URL (Meta Ads, Google, TikTok, Reels)
    const urlParams = new URLSearchParams(window.location.search);
    funnelState.utm_source = urlParams.get('utm_source');
    funnelState.utm_medium = urlParams.get('utm_medium');
    funnelState.utm_campaign = urlParams.get('utm_campaign');

    // Elementos DOM
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const successScreen = document.getElementById('successScreen');

    const bubble1 = document.getElementById('stepBubble1');
    const bubble2 = document.getElementById('stepBubble2');
    const bubble3 = document.getElementById('stepBubble3');
    const stepIndicatorLabel = document.getElementById('stepIndicatorLabel');

    const m2Range = document.getElementById('m2Range');
    const m2Display = document.getElementById('m2Display');
    const liveEstimateDisplay = document.getElementById('liveEstimateDisplay');

    const btnNext1 = document.getElementById('btnNext1');
    const btnNext2 = document.getElementById('btnNext2');
    const btnPrev2 = document.getElementById('btnPrev2');
    const btnPrev3 = document.getElementById('btnPrev3');
    const leadForm = document.getElementById('leadForm');
    const submitBtn = document.getElementById('btnSubmitLead');

    // Sincronizar selección de radio cards en el DOM
    function setupRadioCards(selector, stateKey) {
        const cards = document.querySelectorAll(selector);
        cards.forEach(card => {
            card.addEventListener('click', () => {
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                const radio = card.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    funnelState[stateKey] = radio.value;
                    updateLiveEstimate();
                }
            });
        });
    }

    setupRadioCards('.option-card-inmueble', 'tipo_inmueble');
    setupRadioCards('.option-card-estado', 'estado_actual_obra');
    setupRadioCards('.option-card-servicio', 'tipo_servicio');

    // Actualizador de estimación en tiempo real
    function updateLiveEstimate() {
        const tarifa = TARIFAS_M2[funnelState.tipo_servicio] || TARIFAS_M2.obra_blanca_completa;
        const total = Math.round(funnelState.area_m2 * tarifa);
        funnelState.presupuesto_estimado = total;

        if (m2Display) m2Display.textContent = `${funnelState.area_m2} m²`;
        if (liveEstimateDisplay) {
            liveEstimateDisplay.textContent = `$${total.toLocaleString('es-CO')} COP`;
        }
    }

    // Slider de metros cuadrados
    if (m2Range) {
        m2Range.addEventListener('input', (e) => {
            funnelState.area_m2 = parseInt(e.target.value, 10) || 50;
            updateLiveEstimate();
        });
    }

    // Navegación entre pasos
    function goToStep(stepNumber) {
        funnelState.currentStep = stepNumber;

        // Ocultar todos los pasos
        [step1, step2, step3].forEach(s => s && s.classList.remove('active'));

        // Restablecer burbujas
        [bubble1, bubble2, bubble3].forEach((b, idx) => {
            if (!b) return;
            b.classList.remove('active', 'completed');
            if (idx + 1 < stepNumber) {
                b.classList.add('completed');
                b.innerHTML = '✓';
            } else if (idx + 1 === stepNumber) {
                b.classList.add('active');
                b.textContent = idx + 1;
            } else {
                b.textContent = idx + 1;
            }
        });

        if (stepNumber === 1 && step1) {
            step1.classList.add('active');
            if (stepIndicatorLabel) stepIndicatorLabel.textContent = 'Paso 1: Tu Proyecto';
        } else if (stepNumber === 2 && step2) {
            step2.classList.add('active');
            if (stepIndicatorLabel) stepIndicatorLabel.textContent = 'Paso 2: Servicios y Área';
        } else if (stepNumber === 3 && step3) {
            step3.classList.add('active');
            if (stepIndicatorLabel) stepIndicatorLabel.textContent = 'Paso 3: Contacto Directo';
        }

        // Scroll suave al contenedor del formulario en móvil
        const funnelCard = document.querySelector('.funnel-card');
        if (funnelCard) {
            funnelCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Botones de avanzar / retroceder
    if (btnNext1) btnNext1.addEventListener('click', () => goToStep(2));
    if (btnPrev2) btnPrev2.addEventListener('click', () => goToStep(1));
    if (btnNext2) btnNext2.addEventListener('click', () => goToStep(3));
    if (btnPrev3) btnPrev3.addEventListener('click', () => goToStep(2));

    // Envío del Formulario (Fase de Cierre y CRO)
    if (leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombreInput = document.getElementById('inputNombre');
            const telefonoInput = document.getElementById('inputTelefono');
            const emailInput = document.getElementById('inputEmail');
            const ciudadInput = document.getElementById('inputCiudad');
            const detallesInput = document.getElementById('inputDetalles');
            const errorBox = document.getElementById('formErrorNotice');

            const nombre = nombreInput.value.trim();
            const telefono = telefonoInput.value.trim();

            // Validación de campos obligatorios
            if (!nombre || nombre.length < 3) {
                showError('Por favor ingresa tu nombre completo.');
                nombreInput.focus();
                return;
            }

            const cleanPhone = telefono.replace(/\D/g, '');
            if (cleanPhone.length < 7 || cleanPhone.length > 15) {
                showError('Por favor ingresa un número celular válido para enviarte la cotización.');
                telefonoInput.focus();
                return;
            }

            hideError();

            // Estado de carga en el botón
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm" role="status" style="display:inline-block; width:18px; height:18px; border:2px solid #000; border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:8px;"></span>
                Calculando y Enviando...
            `;

            // Construir payload
            const payload = {
                nombre_completo: nombre,
                telefono: telefono,
                email: emailInput ? emailInput.value.trim() : null,
                ciudad_zona: ciudadInput ? ciudadInput.value.trim() : 'Medellín / Área Metropolitana',
                tipo_inmueble: funnelState.tipo_inmueble,
                estado_actual_obra: funnelState.estado_actual_obra,
                tipo_servicio: funnelState.tipo_servicio,
                area_m2_estimada: funnelState.area_m2,
                presupuesto_estimado: funnelState.presupuesto_estimado,
                detalles_adicionales: detallesInput ? detallesInput.value.trim() : '',
                origen_lead: 'funnel_calculadora_web',
                utm_source: funnelState.utm_source,
                utm_medium: funnelState.utm_medium,
                utm_campaign: funnelState.utm_campaign
            };

            try {
                const response = await fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Ocurrió un error al procesar tu solicitud.');
                }

                // Ocultar cuerpo del formulario y mostrar pantalla de éxito
                step3.classList.remove('active');
                if (successScreen) {
                    successScreen.style.display = 'block';

                    // Actualizar datos en la tarjeta de éxito
                    const successName = document.getElementById('successClientName');
                    const successEstimate = document.getElementById('successEstimatedAmount');
                    const successM2 = document.getElementById('successAreaM2');
                    const btnWhatsappSuccess = document.getElementById('btnWhatsappSuccess');

                    if (successName) successName.textContent = nombre;
                    if (successEstimate) {
                        successEstimate.textContent = `$${Number(data.data.presupuesto_estimado).toLocaleString('es-CO')} COP`;
                    }
                    if (successM2) successM2.textContent = `${funnelState.area_m2} m²`;
                    if (btnWhatsappSuccess && data.data.whatsapp_url) {
                        btnWhatsappSuccess.href = data.data.whatsapp_url;
                    }

                    // Marcar todos los pasos como completados
                    [bubble1, bubble2, bubble3].forEach(b => {
                        if (b) {
                            b.classList.remove('active');
                            b.classList.add('completed');
                            b.innerHTML = '✓';
                        }
                    });

                    if (stepIndicatorLabel) stepIndicatorLabel.textContent = '¡Cotización Lista!';
                }

            } catch (err) {
                console.error('Error al enviar cotización:', err);
                showError(err.message || 'No se pudo enviar la cotización. Por favor escríbenos directamente a WhatsApp.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Solicitar Cotización y Agendar Visita</span> ➔`;
            }
        });
    }

    function showError(msg) {
        const errorBox = document.getElementById('formErrorNotice');
        if (errorBox) {
            errorBox.textContent = msg;
            errorBox.style.display = 'block';
        } else {
            alert(msg);
        }
    }

    function hideError() {
        const errorBox = document.getElementById('formErrorNotice');
        if (errorBox) {
            errorBox.style.display = 'none';
        }
    }

    // Inicializar cálculo en vivo
    updateLiveEstimate();
});
