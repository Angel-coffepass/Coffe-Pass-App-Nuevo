document.addEventListener('DOMContentLoaded', () => {
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
                        email: usuario, // El servidor espera 'email' y 'password'
                        password: contraseña
                    })
                });

                // Primero, obtenemos la respuesta en JSON
                const data = await response.json();

                // --- INICIO DE LA CORRECCIÓN ---

                // Comprobamos si la respuesta del servidor fue exitosa (ej. 200 OK)
                // data.success es la lógica de tu API (ej. contraseña correcta)
                if (response.ok && data.success) {
                    
                    // 1. Guardamos AMBOS datos en localStorage
                    localStorage.setItem('nombreUsuario', data.usuario); 
                    localStorage.setItem('userRole', data.role); // <-- ¡Guardamos el rol!

                    // 2. Decidimos a dónde redirigir
                    if (data.role === 'admin') {
                        // Si es admin, va a la pantalla de bienvenida de admin
                        window.location.href = '/admin/selectorADMIN.html'; // O como se llame tu página
                    } else {
                        // Si es usuario normal, va a la página principal
                        window.location.href = '../index.html';
                    }

                } else {
                    // Si data.success es false o la respuesta no fue OK
                    alert('Error al iniciar sesión: ' + data.message);
                }
                // --- FIN DE LA CORRECCIÓN ---

            } catch (error) {
                console.error('Error al conectar con el servidor:', error);
                alert('No se pudo conectar con el servidor. Inténtalo más tarde.');
            }
        });
    } else {
        console.error('No se encontró el formulario de login en esta página.');
    }
});