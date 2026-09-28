/**
 * ==========================================================================
 * SLIDER INTERACTIVO ANTES Y DESPUÉS (Mobile-First Touch & Quick Full View)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('beforeAfterSlider');
    if (!container) return;

    const afterWrapper = container.querySelector('.slider-after-wrapper');
    const afterImg = afterWrapper ? afterWrapper.querySelector('.slider-img') : null;
    const handleLine = container.querySelector('.slider-handle-line');
    
    // Botones flotantes sobre la imagen
    const btnSlideAfter = document.getElementById('btnSlideAfter');
    const btnSlideBefore = document.getElementById('btnSlideBefore');

    // Botones de acceso rápido debajo del slider
    const pillShowAfter = document.getElementById('pillShowAfter');
    const pillShowSplit = document.getElementById('pillShowSplit');
    const pillShowBefore = document.getElementById('pillShowBefore');

    let isDragging = false;
    let currentPosition = 50;
    let transitionTimeout = null;

    // Sincronizar el ancho de la imagen interna con el contenedor padre para evitar desfase de escala
    function syncImageWidth() {
        const containerWidth = container.offsetWidth;
        if (afterImg) {
            afterImg.style.width = `${containerWidth}px`;
        }
    }

    // Actualiza los estados visuales (active) de los botones según la posición actual
    function updateButtonStates(percentage) {
        // Estado de botones flotantes sobre la foto
        if (btnSlideAfter) {
            btnSlideAfter.classList.toggle('active', percentage >= 95);
        }
        if (btnSlideBefore) {
            btnSlideBefore.classList.toggle('active', percentage <= 5);
        }

        // Estado de pills de control debajo
        if (pillShowAfter) {
            pillShowAfter.classList.toggle('active', percentage >= 95);
        }
        if (pillShowBefore) {
            pillShowBefore.classList.toggle('active', percentage <= 5);
        }
        if (pillShowSplit) {
            pillShowSplit.classList.toggle('active', percentage > 25 && percentage < 75);
        }
    }

    // Actualizar la posición de la barra y el recorte
    function setSliderPosition(percentage, animate = false) {
        // Limitar entre 0% y 100%
        const clamped = Math.max(0, Math.min(100, percentage));
        currentPosition = clamped;

        if (transitionTimeout) {
            clearTimeout(transitionTimeout);
            transitionTimeout = null;
        }

        if (animate) {
            container.classList.add('has-transition');
            // Quitar clase de transición luego de que finalice la animación para que el arrastre vuelva a ser instantáneo
            transitionTimeout = setTimeout(() => {
                container.classList.remove('has-transition');
            }, 650);
        } else {
            container.classList.remove('has-transition');
        }
        
        if (afterWrapper) {
            afterWrapper.style.width = `${clamped}%`;
        }
        if (handleLine) {
            handleLine.style.left = `${clamped}%`;
        }

        updateButtonStates(clamped);
    }

    // Calcular el porcentaje desde un evento de puntero / táctil
    function getPercentageFromEvent(e) {
        const rect = container.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const position = clientX - rect.left;
        return (position / rect.width) * 100;
    }

    // Handlers de arrastre unificados con Pointer Events (Touch, Stylus, Mouse)
    function onPointerDown(e) {
        // Si el clic viene de un botón interactivo, no activar el arrastre
        if (e.target.closest('.slider-badge') || e.target.closest('.slider-quick-pill')) {
            return;
        }

        isDragging = true;
        container.classList.add('is-dragging');
        container.classList.remove('has-transition');
        setSliderPosition(getPercentageFromEvent(e), false);
        if (container.setPointerCapture && e.pointerId) {
            container.setPointerCapture(e.pointerId);
        }
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        setSliderPosition(getPercentageFromEvent(e), false);
    }

    function onPointerUp(e) {
        if (!isDragging) return;
        isDragging = false;
        container.classList.remove('is-dragging');
        if (container.releasePointerCapture && e.pointerId) {
            container.releasePointerCapture(e.pointerId);
        }
    }

    // Eventos de arrastre en contenedor
    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Soporte táctil nativo complementario para navegadores móviles
    container.addEventListener('touchstart', (e) => {
        if (e.target.closest('.slider-badge') || e.target.closest('.slider-quick-pill')) return;
        isDragging = true;
        container.classList.remove('has-transition');
        setSliderPosition(getPercentageFromEvent(e), false);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        setSliderPosition(getPercentageFromEvent(e), false);
    }, { passive: true });

    window.addEventListener('touchend', () => {
        isDragging = false;
    });

    // =========================================================================
    // ACCIONES DE BOTONES: MOSTRAR FOTO COMPLETA (ACABADO FINAL vs OBRA GRIS)
    // =========================================================================

    // Botón flotante "✨ Acabado Final"
    if (btnSlideAfter) {
        ['pointerdown', 'touchstart'].forEach(evt => {
            btnSlideAfter.addEventListener(evt, (e) => e.stopPropagation());
        });

        btnSlideAfter.addEventListener('click', (e) => {
            e.stopPropagation();
            // Si ya está 100% visible, alternar de vuelta al centro (50%), si no, ir al 100%
            if (currentPosition >= 95) {
                setSliderPosition(50, true);
            } else {
                setSliderPosition(100, true);
            }
        });
    }

    // Botón flotante "🧱 Obra Gris"
    if (btnSlideBefore) {
        ['pointerdown', 'touchstart'].forEach(evt => {
            btnSlideBefore.addEventListener(evt, (e) => e.stopPropagation());
        });

        btnSlideBefore.addEventListener('click', (e) => {
            e.stopPropagation();
            // Si ya está 100% visible, alternar de vuelta al centro (50%), si no, ir al 0%
            if (currentPosition <= 5) {
                setSliderPosition(50, true);
            } else {
                setSliderPosition(0, true);
            }
        });
    }

    // Botones rápidos de control inferior
    if (pillShowAfter) {
        pillShowAfter.addEventListener('click', (e) => {
            e.preventDefault();
            setSliderPosition(100, true);
        });
    }

    if (pillShowSplit) {
        pillShowSplit.addEventListener('click', (e) => {
            e.preventDefault();
            setSliderPosition(50, true);
        });
    }

    if (pillShowBefore) {
        pillShowBefore.addEventListener('click', (e) => {
            e.preventDefault();
            setSliderPosition(0, true);
        });
    }

    // Accesibilidad con teclado (Flechas izquierda y derecha)
    container.setAttribute('tabindex', '0');
    container.setAttribute('role', 'slider');
    container.setAttribute('aria-label', 'Comparador interactivo de obra gris frente a obra blanca');

    container.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            setSliderPosition(currentPosition - 10, true);
        } else if (e.key === 'ArrowRight') {
            setSliderPosition(currentPosition + 10, true);
        } else if (e.key === 'Home') {
            setSliderPosition(0, true);
        } else if (e.key === 'End') {
            setSliderPosition(100, true);
        }
    });

    // Ajustar tamaño de imagen interna en resize
    window.addEventListener('resize', syncImageWidth);
    syncImageWidth();

    // Posición inicial centrada al 50%
    setSliderPosition(50, false);

    // Animación de bienvenida sutil al hacer scroll para invitar a la interacción
    let hasAnimated = false;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;
                // Breve movimiento de vaivén suave para invitar a interactuar
                setTimeout(() => setSliderPosition(65, true), 350);
                setTimeout(() => setSliderPosition(35, true), 950);
                setTimeout(() => setSliderPosition(50, true), 1550);
            }
        });
    }, { threshold: 0.4 });

    observer.observe(container);
});
