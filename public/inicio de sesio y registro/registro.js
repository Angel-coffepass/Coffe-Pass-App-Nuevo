document.addEventListener('DOMContentLoaded', () => {
    // ⚠️ Asegúrate de que la clase o ID coincida con tu formulario en el HTML
    const registerForm = document.querySelector('.form__form'); 

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita recargar la página

            // 1. OBTENER VALORES (Asegúrate de que los ID coincidan con tu HTML)
            const nombre = document.getElementById('nombre').value;
            const apellido = document.getElementById('apellido').value;
            const correo = document.getElementById('correo').value;
            const usuario = document.getElementById('usuario').value;
            const clave = document.getElementById('clave').value;

            // Validación básica (opcional)
            if(!nombre || !apellido || !correo || !usuario || !clave) {
                if (typeof showNotification === 'function') {
                    showNotification('Por favor completa todos los campos', 'warning');
                } else {
                    alert('Completa todos los campos');
                }
                return;
            }

            try {
                const response = await fetch('/api/registro', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        nombre, 
                        apellido, 
                        correo, 
                        usuario, 
                        clave 
                    })
                });

                const data = await response.json();

                // --- AQUÍ ESTÁ LA MAGIA DE LA NOTIFICACIÓN ---
                if (response.ok && data.success) {
                    
                    // ✅ ÉXITO
                    if (typeof showNotification === 'function') {
                        showNotification('¡Cuenta creada con éxito! Redirigiendo...', 'success');
                    } else {
                        alert('¡Cuenta creada con éxito!');
                    }

                    // Redirigir al Login después de 2 segundos
                    setTimeout(() => {
                        // Ajusta la ruta si tu login está en otra carpeta
                        window.location.href = 'Inicio de sesion.html'; 
                    }, 2000);

                } else {
                    // ❌ ERROR (Usuario ya existe, etc.)
                    const mensajeError = data.message || 'Error al registrarse.';
                    if (typeof showNotification === 'function') {
                        showNotification(mensajeError, 'error');
                    } else {
                        alert(mensajeError);
                    }
                }

            } catch (error) {
                console.error('Error al registrar:', error);
                // ❌ ERROR DE RED
                if (typeof showNotification === 'function') {
                    showNotification('Error de conexión. Intenta más tarde.', 'error');
                }
            }
        });
    } else {
        console.error('Formulario de registro no encontrado en el HTML.');
    }
});