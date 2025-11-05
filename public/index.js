document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 1. DEFINICIÓN DEL ICONO DE CAFETERÍA
    // Es crucial para el tamaño y la precisión del centrado.
    const CoffeeIcon = L.icon({
        iconUrl: './assets/icono.png', // Asegúrate de que esta ruta sea correcta
        iconSize: [38, 50],         // Tamaño del icono (ajusta si es necesario)
        iconAnchor: [19, 50],       // Punto del icono sobre la coordenada (centro inferior)
        popupAnchor: [0, -45]       // Posición del pop-up sobre el icono
    });
    // ----------------------------------------------------------------------

    // Elementos de Autenticación y Perfil
    const nombreUsuario = localStorage.getItem('nombreUsuario');
    const userRole = localStorage.getItem('userRole'); // Obtenemos el rol
    const loginButton = document.getElementById('login-button');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const adminLink = document.getElementById('admin-panel-link'); // Enlace del panel de admin

    // Elementos del Menú Desplegable de Perfil
    const dropdownMenu = document.getElementById('profile-dropdown-menu');

    // Lógica de Autenticación (Mostrar/Ocultar elementos)
    if (nombreUsuario) {
        // Usuario Logueado
        loginButton.style.display = 'none'; // Oculta botón de login
        welcomeMessage.textContent = 'Hola, ' + nombreUsuario; // Muestra saludo
        welcomeMessage.style.display = 'block'; // Hace visible el saludo (que es el botón del dropdown)

        // Lógica de Roles: Muestra enlace de admin si el rol es 'admin'
        if (userRole === 'admin' && adminLink) {
            adminLink.style.display = 'block';
        }
    
        // El botón de logout está dentro del menú desplegable, así que no necesita control directo aquí
        // Asegúrate de que el menú (#profile-dropdown-menu) esté oculto al inicio

    } else {
        // Usuario NO Logueado
        loginButton.style.display = 'block'; // Muestra botón de login
        welcomeMessage.style.display = 'none'; // Oculta saludo
        if (adminLink) adminLink.style.display = 'none'; // Oculta enlace admin
        if (dropdownMenu) dropdownMenu.classList.remove('show'); // Asegura que el dropdown esté cerrado
        // Ocultar logout button explícitamente si está fuera del dropdown y lo necesitas
        if(logoutButton) logoutButton.style.display = 'none';
    }
    if (userRole === 'admin') {
        adminbutton.style.display = 'block'; // 4. Muestra el botón de admin
        }

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
            localStorage.removeItem('userRole'); // También elimina el rol al cerrar sesión
            window.location.reload();
        });
    }

    // ----------------------------------------------------
    // LÓGICA DEL MAPA
    // ----------------------------------------------------
    const map = L.map('mapid').setView([0, 0], 2); // Inicializa el mapa

    // Añade la capa base (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Obtener la ubicación del usuario
    function obtenerUbicacion() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const accuracy = position.coords.accuracy;

                    map.setView([lat, lng], 14); // Centra el mapa

                    // Marcador de ubicación del usuario
                    L.marker([lat, lng]).addTo(map)
                        .bindPopup(`¡Estás aquí! (Precisión: ${Math.round(accuracy)}m)`).openPopup();

                    // Círculo de precisión
                    L.circle([lat, lng], {
                        color: '#47302e', // Color del borde del círculo
                        fillColor: '#47302e', // Color de relleno
                        fillOpacity: 0.1,
                        radius: accuracy
                    }).addTo(map);

                    cargarCafeterias(lat, lng); // Llama a cargar cafeterías
                },
                (error) => {
                    console.error("Error al obtener la ubicación:", error);
                    alert("No pudimos obtener tu ubicación.");
                    map.setView([20.0, -99.0], 10); // Posición por defecto
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Opciones de precisión
            );
        } else {
            console.log("Geolocalización no soportada.");
            alert("Tu navegador no soporta geolocalización.");
        }
    }

    // Cargar y mostrar marcadores de cafeterías
    async function cargarCafeterias(usuarioLat, usuarioLng) {
        try {
            // Llama a la ruta del backend
            const response = await fetch('/api/cafeterias-cercanas');
            const data = await response.json();

            if (data.success && data.data) {
                data.data.forEach(cafeteria => {
                    if (cafeteria.latitud && cafeteria.longitud) {
                        // Crea marcador con icono personalizado
                        L.marker([cafeteria.latitud, cafeteria.longitud], { icon: CoffeeIcon })
                            .addTo(map)
                            .bindPopup(`<b>${cafeteria.nombre}</b><br>${cafeteria.direccion || 'Dirección no disponible'}`);
                    }
                });
            } else {
                console.error("No se pudieron cargar las cafeterías:", data.message);
            }
        } catch(error) {
            console.error("Error en fetch de cafeterías:", error);
        }
    }

    // Iniciar geolocalización al cargar la página
    obtenerUbicacion();

    // Lógica para cerrar el menú principal al hacer clic en un enlace (si aplica)
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