/**
 * ==========================================================================
 * LOGIN SCRIPT - AUTENTICACIÓN DEL PANEL DE ADMINISTRACIÓN
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const btnSubmit = document.getElementById('btnSubmitLogin');
    const loginAlert = document.getElementById('loginAlert');
    const loginAlertText = document.getElementById('loginAlertText');
    const btnTogglePassword = document.getElementById('btnTogglePassword');
    const eyeIcon = document.getElementById('eyeIcon');

    // Comprobar si ya hay una sesión activa
    async function checkExistingSession() {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    window.location.href = '/admin';
                }
            }
        } catch (e) {
            // No hay sesión activa o falló la verificación, permanecer en login
        }
    }
    checkExistingSession();

    // Toggle Mostrar / Ocultar Contraseña
    if (btnTogglePassword && passwordInput) {
        btnTogglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';

            if (eyeIcon) {
                if (isPassword) {
                    // Icono de ojo tachado
                    eyeIcon.innerHTML = `
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    `;
                } else {
                    // Icono de ojo normal
                    eyeIcon.innerHTML = `
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    `;
                }
            }
        });
    }

    function showAlert(message) {
        if (!loginAlert) return;
        loginAlertText.textContent = message;
        loginAlert.classList.remove('hidden');
    }

    function hideAlert() {
        if (!loginAlert) return;
        loginAlert.classList.add('hidden');
    }

    // Manejo del formulario de inicio de sesión
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideAlert();

            const email = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                showAlert('Por favor ingresa usuario y contraseña.');
                return;
            }

            try {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = `
                    <svg class="animate-spin h-4 w-4 text-dark-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Verificando credenciales...</span>
                `;

                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (data.success) {
                    btnSubmit.innerHTML = `
                        <svg class="w-4 h-4 text-dark-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Acceso autorizado...</span>
                    `;
                    // Redirigir al panel de administración
                    setTimeout(() => {
                        window.location.href = '/admin';
                    }, 400);
                } else {
                    showAlert(data.error || 'Credenciales inválidas.');
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            } catch (err) {
                console.error('Error al conectar:', err);
                showAlert('Error de conexión al servidor.');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>Ingresar al Sistema</span>
                `;
            }
        });
    }
});
