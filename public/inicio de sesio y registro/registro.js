document.addEventListener('DOMContentLoaded', () => {
    const registroForm = document.getElementById('registroForm');

    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue

        // Obtener los valores de los campos del formulario
        const nombre = document.getElementById('nombre').value;
        const apellido = document.getElementById('apellido').value;
        const correo = document.getElementById('correo').value;
        const usuario = document.getElementById('usuario').value;
        const clave = document.getElementById('clave').value;
        const confirmarClave = document.getElementById('confirmar').value;

        // Validar que las contraseñas coincidan
        if (clave !== confirmarClave) {
            alert('Las contraseñas no coinciden. Por favor, inténtalo de nuevo.');
            return;
        }

        try {
            // Envía los datos al servidor de Node.js
            const response = await fetch('http://localhost:3000/api/registro', {
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

            if (data.success) {
                alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
                window.location.href = 'inicio de sesion.html';
            } else {
                alert('Error al registrarse: ' + data.message);
            }
        } catch (error) {
            console.error('Error al conectar con el servidor:', error);
            alert('No se pudo conectar con el servidor. Inténtalo más tarde.');
        }
    });
});