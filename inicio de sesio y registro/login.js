document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.form__form');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue

        const usuario = document.getElementById('usuario').value;
        const contraseña = document.getElementById('contraseña').value;

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: usuario, // El servidor espera 'email' y 'password'
                    password: contraseña
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('¡Inicio de sesión exitoso! Bienvenido, ' + data.usuario);
                // Aquí podrías redirigir al usuario a su página de perfil
                // window.location.href = 'pagina_de_perfil.html';
                localStorage.setItem('nombreUsuario', data.usuario); 
                window.location.href = '../index.html';
            } else {
                alert('Error al iniciar sesión: ' + data.message);
            }
        } catch (error) {
            console.error('Error al conectar con el servidor:', error);
            alert('No se pudo conectar con el servidor. Inténtalo más tarde.');
        }
    });
});