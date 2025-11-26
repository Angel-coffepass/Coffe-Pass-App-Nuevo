// perfil.js

document.addEventListener('DOMContentLoaded', () => {
    // URL base de tu API (Asegúrate de que sea la correcta)
    const API_BASE_URL = "https://coffe-pass-app-nuevo-production.up.railway.app";

    const token = localStorage.getItem('authToken');

    if (!token) {
        // Si no hay token, no hay perfil.
        alert('Debes iniciar sesión para ver tu perfil.');
        window.location.href = 'login.html';
        return;
    }

    const perfilNombreEl = document.getElementById('perfil-nombre');
    const perfilCorreoEl = document.getElementById('perfil-correo');
    const sellosContadorEl = document.getElementById('sellos-contador');
    const sellosMensajeEl = document.getElementById('sellos-mensaje');
    const listaSellosEl = document.getElementById('lista-sellos');
    const logoutBtn = document.getElementById('logout-btn');


    // 1. FUNCIÓN PARA OBTENER DATOS DEL PERFIL
    async function fetchPerfilData() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/perfil`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                // 2. MOSTRAR DATOS DEL USUARIO
                perfilNombreEl.textContent = data.usuario.nombre || 'N/A';
                perfilCorreoEl.textContent = data.usuario.correo || 'N/A';

                const sellos = data.usuario.sellos || [];
                const totalSellos = sellos.length;
                
                // 3. MOSTRAR DATOS DEL PASAPORTE
                sellosContadorEl.textContent = totalSellos;
                sellosMensajeEl.textContent = `Has visitado ${totalSellos} ¡Sigue coleccionando!`; 

                renderSellos(sellos);

                if (typeof showNotification === 'function') {
                    showNotification('Perfil cargado exitosamente.', 'success');
                }

            } else {
                if (typeof showNotification === 'function') {
                    showNotification('Error al cargar perfil: ' + data.message, 'error');
                }
                sellosMensajeEl.textContent = 'No se pudo cargar la información del perfil.';
            }

        } catch (error) {
            console.error('Error de conexión:', error);
            if (typeof showNotification === 'function') {
                showNotification('Error de red al conectar con la API.', 'error');
            }
            sellosMensajeEl.textContent = 'Error de conexión con el servidor.';
        }
    }


    // 4. FUNCIÓN PARA PINTAR LA LISTA DE SELLOS
    function renderSellos(sellos) {
        listaSellosEl.innerHTML = ''; // Limpiar lista
        
        if (sellos.length === 0) {
            listaSellosEl.innerHTML = '<p>Aún no tienes ningún sello en tu pasaporte.</p>';
            return;
        }

        sellos.forEach(sello => {
            // Asumiendo que el sello contiene info de la cafetería
            const div = document.createElement('div');
            div.className = 'sello-item';
            
            // Asumiendo que la respuesta incluye nombre de la cafetería y fecha
            div.innerHTML = `
            <img src="${API_BASE_URL}/uploads/${sello.imagen_url}" alt="${sello.nombre_cafeteria}" style="width: 100px; height: 100px; object-fit: cover;">
            <h3>${sello.nombre_cafeteria || 'Cafetería Desconocida'}</h3>
            <p>Sellado el: ${new Date(sello.fecha_sello).toLocaleDateString()}</p>
            `;
            listaSellosEl.appendChild(div);
        });
    }


    // 5. FUNCIÓN DE CERRAR SESIÓN (Logout)
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('nombreUsuario');
        
        if (typeof showNotification === 'function') {
            showNotification('Sesión cerrada correctamente.', 'info');
        }

        setTimeout(() => {
            window.location.href = 'index.html'; 
        }, 800);
    });

    // Iniciar la carga de datos
    fetchPerfilData();
});