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
                        email: usuario, // El servidor espera 'email' (que es el 'usuario')
                        password: contraseña
                    })
                });
                const data = await response.json();
                // --- INICIO DE LA MODIFICACIÓN ---
                // Comprobamos si la respuesta del servidor fue exitosa Y si la data es correcta
                if (response.ok && data.success) {
                    alert('¡Inicio de sesión exitoso! Bienvenido, ' + data.usuario);
                    // 1. Guardamos el TOKEN (lo más importante para la seguridad)
                    localStorage.setItem('authToken', data.token);
                    // 2. Guardamos el nombre de usuario (solo para el saludo "Hola, ...")
                    localStorage.setItem('nombreUsuario', data.usuario); 
                    
                    // 3. (Importante) Nos aseguramos de NO guardar el rol de forma insegura
                    localStorage.removeItem('userRole'); 
                    // 4. Redirigimos al index
                    window.location.href = '../index.html';
                } else {
                    // Si data.success es false o la respuesta no fue OK
                    alert('Error al iniciar sesión: ' + data.message);
                }
                // --- FIN DE LA MODIFICACIÓN ---
            } catch (error) {
                console.error('Error al conectar con el servidor:', error);
                alert('No se pudo conectar con el servidor. Inténtalo más tarde.');
            }
        });
    } else {
        console.error('No se encontró el formulario de login en esta página.');
    }
});