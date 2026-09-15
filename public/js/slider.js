/**
 * ==========================================================================
 * SLIDER INTERACTIVO ANTES Y DESPUÉS (Mobile-First Touch & Pointer Events)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('beforeAfterSlider');
    if (!container) return;

    const afterWrapper = container.querySelector('.slider-after-wrapper');
    const afterImg = afterWrapper.querySelector('.slider-img');
    const handleLine = container.querySelector('.slider-handle-line');
    
    let isDragging = false;

    // Sincronizar el ancho de la imagen interna con el contenedor padre para evitar desfase de escala
    function syncImageWidth() {
        const containerWidth = container.offsetWidth;
        if (afterImg) {
            afterImg.style.width = `${containerWidth}px`;
        }
    }

    // Actualizar la posición de la barra y el recorte
    function setSliderPosition(percentage) {
        // Limitar entre 2% y 98% para que la manija no se salga de los bordes
        const clamped = Math.max(2, Math.min(98, percentage));
        
        if (afterWrapper) {
            afterWrapper.style.width = `${clamped}%`;
        }
        if (handleLine) {
            handleLine.style.left = `${clamped}%`;
        }
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
        isDragging = true;
        container.classList.add('is-dragging');
        setSliderPosition(getPercentageFromEvent(e));
        if (container.setPointerCapture && e.pointerId) {
            container.setPointerCapture(e.pointerId);
        }
    }

    function onPointerMove(e) {
        if (!isDragging) return;
        setSliderPosition(getPercentageFromEvent(e));
    }

    function onPointerUp(e) {
        if (!isDragging) return;
        isDragging = false;
        container.classList.remove('is-dragging');
        if (container.releasePointerCapture && e.pointerId) {
            container.releasePointerCapture(e.pointerId);
        }
    }

    // Eventos
    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Soporte táctil nativo complementario para navegadores móviles antiguos
    container.addEventListener('touchstart', (e) => {
        isDragging = true;
        setSliderPosition(getPercentageFromEvent(e));
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        setSliderPosition(getPercentageFromEvent(e));
    }, { passive: true });

    window.addEventListener('touchend', () => {
        isDragging = false;
    });

    // Accesibilidad con teclado (Flechas izquierda y derecha)
    container.setAttribute('tabindex', '0');
    container.setAttribute('role', 'slider');
    container.setAttribute('aria-label', 'Comparador de obra gris vs obra blanca acabada');

    container.addEventListener('keydown', (e) => {
        const currentPercentage = parseFloat(afterWrapper.style.width) || 50;
        if (e.key === 'ArrowLeft') {
            setSliderPosition(currentPercentage - 5);
        } else if (e.key === 'ArrowRight') {
            setSliderPosition(currentPercentage + 5);
        }
    });

    // Ajustar en resize y al cargar imágenes
    window.addEventListener('resize', syncImageWidth);
    syncImageWidth();

    // Posición inicial centrada al 50%
    setSliderPosition(50);

    // Animación de bienvenida sutil al hacer scroll para invitar a la interacción
    let hasAnimated = false;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;
                // Breve movimiento de vaivén para demostrar que es interactivo
                setTimeout(() => setSliderPosition(65), 300);
                setTimeout(() => setSliderPosition(35), 800);
                setTimeout(() => setSliderPosition(50), 1300);
            }
        });
    }, { threshold: 0.4 });

    observer.observe(container);
});
