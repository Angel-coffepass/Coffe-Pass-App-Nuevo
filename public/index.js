document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 1. DEFINICIÓN DEL ICONO DE CAFETERÍA
    const CoffeeIcon = L.icon({
        iconUrl: './assets/icono.png', 
        iconSize: [38, 50],         
        iconAnchor: [19, 50],       
        popupAnchor: [0, -45]       
    });
    // ----------------------------------------------------------------------

    // Elementos de Autenticación y Perfil
    const loginButton = document.getElementById('login-button');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const adminLink = document.getElementById('adminbutton'); // <-- (Corregido a 'adminbutton' para que coincida con tu HTML)
    const dropdownMenu = document.getElementById('profile-dropdown-menu');
    
    // --- LÓGICA DE AUTENTICACIÓN (JWT) ---
    const token = localStorage.getItem('authToken');

    function mostrarEstadoDesconectado() {
        loginButton.style.display = 'block';
        welcomeMessage.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        if (dropdownMenu) dropdownMenu.classList.remove('show');
        if (logoutButton) logoutButton.style.display = 'none'; 
    }

    if (token) {
        fetch('/api/verificar-sesion', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                loginButton.style.display = 'none';
                welcomeMessage.textContent = 'Hola, ' + data.usuario; 
                welcomeMessage.style.display = 'block';

                if (data.rol === 'admin' && adminLink) {
                    adminLink.style.display = 'block'; // <-- (Corregido a 'adminLink')
                }
            } else {
                localStorage.removeItem('authToken');
                localStorage.removeItem('nombreUsuario');
                mostrarEstadoDesconectado();
            }
        })
        .catch(err => {
            console.error('Error de verificación:', err);
            mostrarEstadoDesconectado();
        });
    } else {
        mostrarEstadoDesconectado();
    }
    
    // --- (NUEVO) REFERENCIAS A LOS ELEMENTOS DEL MODAL ---
    const modal = document.getElementById('cafeteria-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalImg = document.getElementById('modal-img');
    const modalTitle = document.getElementById('modal-title');
    const modalAddress = document.getElementById('modal-address');
    const modalMapDiv = document.getElementById('modal-map');
    let modalMapInstance = null; 

    // Lógica del Menú Desplegable de Perfil
    if (welcomeMessage && dropdownMenu) {
        welcomeMessage.addEventListener('click', (e) => {
            e.preventDefault();
            dropdownMenu.classList.toggle('show'); 
        });
        window.addEventListener('click', (e) => {
            if (!welcomeMessage.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // Lógica de Cerrar Sesión
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('nombreUsuario');
            localStorage.removeItem('authToken'); 
            window.location.reload();
        });
    }

    // ----------------------------------------------------
    // LÓGICA DEL MAPA
    // ----------------------------------------------------
    const map = L.map('mapid').setView([0, 0], 2); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    function obtenerUbicacion() {
        // ... (Tu código de obtenerUbicacion) ...
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const accuracy = position.coords.accuracy;
                    map.setView([lat, lng], 14); 
                    L.marker([lat, lng]).addTo(map).bindPopup(`¡Estás aquí! (Precisión: ${Math.round(accuracy)}m)`).openPopup();
                    L.circle([lat, lng], { color: '#47302e', fillColor: '#47302e', fillOpacity: 0.1, radius: accuracy }).addTo(map);
                    cargarCafeterias(lat, lng); 
                },
                (error) => {
                    console.error("Error al obtener la ubicación:", error);
                    alert("No pudimos obtener tu ubicación.");
                    map.setView([20.0, -99.0], 10); 
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } 
            );
        } else {
            console.log("Geolocalización no soportada.");
            alert("Tu navegador no soporta geolocalización.");
        }
    }

    async function cargarCafeterias(usuarioLat, usuarioLng) {
        const listaContainer = document.getElementById('cafeteria-list-grid');
        if (!listaContainer) return; 
        try {
            const response = await fetch('/api/cafeterias-cercanas');
            const data = await response.json();

            if (data.success && data.data) {
                listaContainer.innerHTML = ''; 
                data.data.forEach(cafeteria => {
                    // --- A. LÓGICA DEL MAPA ---
                    if (cafeteria.latitud && cafeteria.longitud) {
                        L.marker([cafeteria.latitud, cafeteria.longitud], { icon: CoffeeIcon })
                            .addTo(map)
                            .bindPopup(`<b>${cafeteria.nombre}</b><br>${cafeteria.direccion || 'Dirección no disponible'}`);
                    }
                    
                    // --- B. LÓGICA (Para construir la lista) ---
                    const link = document.createElement('a');
                    link.className = 'coffee-link';
                    link.href = `#cafeteria-${cafeteria.id}`; 

                    // --- (NUEVO) AÑADE EL LISTENER PARA EL MODAL ---
                    link.addEventListener('click', (e) => {
                        e.preventDefault(); 
                        mostrarModal(cafeteria); // Llama a la función con los datos
                    });
                    
                    const calificacionDiv = document.createElement('div');
                    calificacionDiv.className = 'cafeteria-calificacion';
                    calificacionDiv.innerHTML = `⭐ ${cafeteria.calificacion_promedio || 0}`; 

                    const div = document.createElement('div');
                    div.className = 'link-container';
                    const img = document.createElement('img');    
                    img.src = cafeteria.imagen_url || 'comingsoon.png'; 
                    img.alt = cafeteria.nombre;
                    const p = document.createElement('p');
                    p.className = 'link-container-title';
                    p.textContent = cafeteria.nombre;

                    // 1. Crear botón Seguir
                    const btnSeguir = document.createElement('button');
                    btnSeguir.textContent = 'seguir';
                    btnSeguir.className = 'btn-seguir'; // (Dale estilos en CSS si quieres)
                    btnSeguir.style.cssText = "margin-top:5px; cursor:pointer; z-index:10; position:relative;";

                    // 2. Evento del botón Seguir
                    btnSeguir.addEventListener('click', async (e) => {
                        e.preventDefault(); // Evita abrir el enlace <a> de la tarjeta
                        e.stopPropagation(); // Evita que el click se propague a la tarjeta

                        const token = localStorage.getItem('authToken');
                        if(!token) {
                            alert("Inicia sesión para seguir cafeterías");
                            return;
                        }

                        // Llamada al servidor
                        try {
                            const response = await fetch('/api/seguir', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ id_cafeteria: cafeteria.id })
                            });
                            const result = await response.json();

                            if(result.success && result.estado === 'siguiendo') {
                                // --- AQUÍ LLAMAMOS A LA NOTIFICACIÓN ---
                                mostrarNotificacion(cafeteria);
                                btnSeguir.textContent = 'Olvidar';
                            } else if (result.success) {
                                btnSeguir.textContent = 'Seguir'; // Si dejó de seguir
                            }
                        } catch(err) {
                            console.error(err);
                        }
                    });
                    
                    div.appendChild(calificacionDiv);
                    div.appendChild(img);                  
                    div.appendChild(p);                
                    link.appendChild(div);
                    listaContainer.appendChild(link);
                });
                
                // ... (Tu código while para 'Coming Soon') ...
            }
        } catch(error) {
            console.error("Error en fetch de cafeterías:", error);
        }
    }
    
    // --- (NUEVO) LÓGICA DEL MODAL ---
    function mostrarModal(cafeteria) {
        modalTitle.textContent = cafeteria.nombre;
        modalAddress.textContent = cafeteria.direccion || 'Dirección no disponible';
        modalImg.src = cafeteria.imagen_url || './assets/coming-soon.png';
        
        modal.classList.add('active');
        modalOverlay.classList.add('active');

        setTimeout(() => {
            if (modalMapInstance) {
                modalMapInstance.remove(); 
            }
            modalMapInstance = L.map(modalMapDiv).setView([cafeteria.latitud, cafeteria.longitud], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(modalMapInstance);
            L.marker([cafeteria.latitud, cafeteria.longitud], { icon: CoffeeIcon }).addTo(modalMapInstance);
        }, 100); 
    }

    // --- (NUEVO) LÓGICA PARA CERRAR EL MODAL ---
    function cerrarModal() {
        modal.classList.remove('active');
        modalOverlay.classList.remove('active');
    }
    modalCloseBtn.addEventListener('click', cerrarModal);
    modalOverlay.addEventListener('click', cerrarModal); 

    // --- FUNCIÓN PARA MOSTRAR NOTIFICACIÓN ---
function mostrarNotificacion(cafeteria) {
    const container = document.getElementById('notification-container');
    
    // Crear el elemento de notificación
    const notif = document.createElement('div');
    notif.className = 'notificacion-toast';
    notif.innerHTML = `
        <span class="material-symbols-outlined">notifications_active</span>
        <div>
            <strong>¡Siguiendo!</strong><br>
            Ahora sigues a ${cafeteria.nombre}.<br>
            <small>(Click para ver detalles)</small>
        </div>
    `;

    // --- CLAVE: AL HACER CLICK EN LA NOTIFICACIÓN, ABRE EL MODAL ---
    notif.addEventListener('click', () => {
        mostrarModal(cafeteria); // Reutilizamos tu función de modal existente
        notif.remove(); // Borra la notificación al hacer click
    });

    // Añadir al contenedor
    container.appendChild(notif);

    // Borrar automáticamente después de 5 segundos
    setTimeout(() => {
        if (notif.parentNode) { // Verifica si aun existe
            notif.remove();
        }
    }, 5000);
}

    obtenerUbicacion();

    // Lógica para cerrar el menú principal (hamburguesa)
    const menuToggle = document.getElementById('open-menu');
    const navLinks = document.querySelectorAll('.header__nav .navbar-item a');
    if (menuToggle && navLinks) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.checked = false;
            });
        });
    }
});