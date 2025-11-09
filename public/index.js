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
    const adminLink = document.getElementById('adminbutton');
    const dropdownMenu = document.getElementById('profile-dropdown-menu');
    
    // --- INICIO DE LA NUEVA LÓGICA DE AUTENTICACIÓN ---
    const token = localStorage.getItem('authToken');

    // Función para mostrar la vista de "no logueado"
    function mostrarEstadoDesconectado() {
        loginButton.style.display = 'block';
        welcomeMessage.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        if (dropdownMenu) dropdownMenu.classList.remove('show');
        if (logoutButton) logoutButton.style.display = 'none'; 
    }

    if (token) {
        // --- SI HAY TOKEN, VERIFICAR CON EL SERVIDOR ---
        fetch('/api/verificar-sesion', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` // Enviamos el token al "guardia"
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // --- SESIÓN VÁLIDA (Confirmado por el servidor) ---
                loginButton.style.display = 'none';
                welcomeMessage.textContent = 'Hola, ' + data.usuario; // Usamos el nombre verificado
                welcomeMessage.style.display = 'block';

                // Mostramos el botón de admin SOLO SI EL SERVIDOR lo confirma
                if (data.rol === 'admin' && adminLink) {
                    adminbutton.style.display = 'block';
                }
            } else {
                // --- SESIÓN INVÁLIDA (Token expiró o es falso) ---
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
        // --- NO HAY TOKEN (Usuario no logueado) ---
        mostrarEstadoDesconectado();
    }
    // --- FIN DE LA NUEVA LÓGICA DE AUTENTICACIÓN ---


    // Lógica del Menú Desplegable de Perfil
    if (welcomeMessage && dropdownMenu) {
        welcomeMessage.addEventListener('click', (e) => {
            e.preventDefault();
            dropdownMenu.classList.toggle('show'); // Muestra/Oculta el menú
        });

        // Cierra el menú si se hace clic fuera
        window.addEventListener('click', (e) => {
            if (!welcomeMessage.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    // Lógica de Cerrar Sesión (Listener en el botón dentro del dropdown)
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('nombreUsuario');
            localStorage.removeItem('authToken'); // <-- (MODIFICADO)
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
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const accuracy = position.coords.accuracy;

                    map.setView([lat, lng], 14); 

                    L.marker([lat, lng]).addTo(map)
                        .bindPopup(`¡Estás aquí! (Precisión: ${Math.round(accuracy)}m)`).openPopup();

                    L.circle([lat, lng], {
                        color: '#47302e', 
                        fillColor: '#47302e', 
                        fillOpacity: 0.1,
                        radius: accuracy
                    }).addTo(map);

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
        if (!listaContainer) return; // Si no estamos en la página del grid, no hagas nada
        try {
            const response = await fetch('/api/cafeterias-cercanas');
            const data = await response.json();

            if (data.success && data.data) {
                data.data.forEach(cafeteria => {
                    if (cafeteria.latitud && cafeteria.longitud) {
                        L.marker([cafeteria.latitud, cafeteria.longitud], { icon: CoffeeIcon })
                            .addTo(map)
                            .bindPopup(`<b>${cafeteria.nombre}</b><br>${cafeteria.direccion || 'Dirección no disponible'}`);
                    }
// --- B. NUEVA LÓGICA (Para construir la lista) ---
                
                // 1. Crea el enlace <a> (la tarjeta)
                const link = document.createElement('a');
                link.className = 'coffee-link';
                link.href = `javascript:void(0)`; // O #0

                // 2. Crea el contenido interno
                const div = document.createElement('div');
                div.className = 'link-container';

                const img = document.createElement('img');
                
                // Usa la imagen de la DB, o una imagen por defecto si no existe
                img.src = cafeteria.imagen_url || 'comingsoon.png'; // <-- Asegúrate de que tu API devuelva imagen_url
                img.alt = cafeteria.nombre;

                const p = document.createElement('p');
                p.className = 'link-container-title';
                p.textContent = cafeteria.nombre;

                // 3. Ensambla la tarjeta
                div.appendChild(img);
                div.appendChild(p);
                link.appendChild(div);

                // 4. Añade la tarjeta al contenedor del grid
                listaContainer.appendChild(link);
                // --- FIN DE LA NUEVA LÓGICA ---
            });
            
            // (Opcional) Añadir las tarjetas "Coming Soon" estáticas si aún no hay 5
            while (listaContainer.childElementCount < 5) {
                listaContainer.innerHTML += `
                    <a class="coffee-link" href="javascript:void(0)">
                        <div class="link-container">
                            <img src="comingsoon.png" alt="Próximamente">
                            <p class="link-container-title">Próximamente</p>
                        </div>
                    </a>
                `;
            }
            } else {
                console.error("No se pudieron cargar las cafeterías:", data.message);
            }
        } catch(error) {
            console.error("Error en fetch de cafeterías:", error);
        }
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