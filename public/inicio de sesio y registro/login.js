document.addEventListener('DOMContentLoaded', () => {

    const checkAutofill = () => {
        // Selecciona todos los campos que pueden ser auto-rellenados
        // Ajusta estos selectores según los tipos de input que uses (ej. 'text', 'email', 'password')
        const inputFields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');

        // Usamos un pequeño retraso para asegurar que el navegador haya terminado el auto-relleno
        setTimeout(() => {
            inputFields.forEach(input => {
                // 1. Condición de detección: si tiene valor O si el navegador le ha dado el estilo de autofill
                //    El segundo check es una medida extra de seguridad para navegadores WebKit/Chromium
                if (input.value.trim() !== '' || input.matches(':-webkit-autofill')) {
                    
                    // 2. Encuentra el contenedor o elemento que necesita la clase 'activo'
                    //    Ajusta este selector según tu estructura HTML. 
                    //    Asumimos que el contenedor (el padre) es el que tiene la clase 'activo'.
                    const fieldContainer = input.parentElement; 
                    
                    // 3. Agrega la clase CSS que sube el título/etiqueta
                    if (fieldContainer) {
                        fieldContainer.classList.add('activo');
                    }
                }
            });
        }, 100); // 100 ms de retraso
    };
    
    // Llama a la función de detección inmediatamente al cargar la página
    checkAutofill();

    const loginForm = document.querySelector('.form__form');
    // Asegúrate de que el formulario exista antes de añadir el listener
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita que la página se recargue

            const usuario = document.getElementById('usuario').value;
            const contraseña = document.getElementById('contraseña').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: usuario, // El servidor espera 'email' (que es el 'usuario')
                        password: contraseña
                    })
                });
                const data = await response.json();
                
                // --- INICIO DE LA MODIFICACIÓN ---
                if (response.ok && data.success) {
                    
                    // ✅ ÉXITO: USAR NOTIFICACIÓN EN LUGAR DE ALERT
                    if (typeof showNotification === 'function') {
                        showNotification('¡Inicio de sesión exitoso! Bienvenido.', 'success');
                    } else {
                        // Fallback si la función no se carga
                        console.log('¡Inicio de sesión exitoso! Bienvenido.');
                    }
                    
                    // 1. Guardamos el TOKEN
                    localStorage.setItem('authToken', data.token);
                    // 2. Guardamos el nombre de usuario
                    localStorage.setItem('nombreUsuario', data.usuario); 
                    // 3. (Importante) Nos aseguramos de NO guardar el rol de forma insegura
                    localStorage.removeItem('userRole'); 
                    
                    // 4. Redirigimos con un pequeño retraso para que el usuario vea la notificación
                    setTimeout(() => {
                        window.location.href = '../index.html';
                    }, 1000); 
                    
                } else {
                    // ❌ ERROR: USAR NOTIFICACIÓN EN LUGAR DE ALERT
                    const mensajeError = data.message || 'Credenciales incorrectas.';
                    if (typeof showNotification === 'function') {
                        showNotification('Error al iniciar sesión: ' + mensajeError, 'error');
                    } else {
                        alert('Error al iniciar sesión: ' + mensajeError);
                    }
                }
                // --- FIN DE LA MODIFICACIÓN ---
            } catch (error) {
                console.error('Error al conectar con el servidor:', error);
                // ❌ ERROR DE CONEXIÓN: USAR NOTIFICACIÓN EN LUGAR DE ALERT
                if (typeof showNotification === 'function') {
                    showNotification('No se pudo conectar con el servidor. Inténtalo más tarde.', 'error');
                } else {
                    alert('No se pudo conectar con el servidor. Inténtalo más tarde.');
                }
            }
        });
    } else {
        console.error('No se encontró el formulario de login en esta página.');
    }
});