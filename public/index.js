        document.addEventListener('DOMContentLoaded', () => {
            const nombreUsuario = localStorage.getItem('nombreUsuario');
            const loginButton = document.getElementById('login-button');
            const welcomeMessage = document.getElementById('welcome-message');
            const logoutButton = document.getElementById('logout-button');

            if (nombreUsuario) {
                // Si existe el nombre de usuario, lo muestra y oculta el botón
                loginButton.style.display = 'none';
                welcomeMessage.textContent = 'Hola, ' + nombreUsuario;
                welcomeMessage.style.display = 'block';
                logoutButton.style.display = 'block';
            } else {
                // Si no hay usuario, asegura que el botón se muestre y el mensaje se oculte
                loginButton.style.display = 'block';
                welcomeMessage.style.display = 'none';
                logoutButton.style.display = 'none';
            }
            logoutButton.addEventListener('click', () => {
        // Elimina el nombre de usuario del localStorage.
        localStorage.removeItem('nombreUsuario');
        // Recarga la página para mostrar los elementos correctos.
        window.location.reload();
    });
        });