document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // 1. DEFINICIÓN COMPLETA DEL ICONO DE CAFETERÍA
    // Es crucial para el tamaño y la precisión del centrado.
    const CoffeeIcon = L.icon({
        iconUrl: './assets/icono.png', 
        iconSize: [38, 50],         // Tamaño del icono (ej. 38x50 píxeles)
        iconAnchor: [19, 50],       // El punto del icono que está sobre la coordenada (centro inferior)
        popupAnchor: [0, -45]       // Posición del pop-up sobre el icono
    });
    // ----------------------------------------------------------------------

    // Elementos de Autenticación
    const nombreUsuario = localStorage.getItem('nombreUsuario');
    const loginButton = document.getElementById('login-button');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');

    if (nombreUsuario) {
        loginButton.style.display = 'none';
        welcomeMessage.textContent = 'Hola, ' + nombreUsuario;
        welcomeMessage.style.display = 'block';
        logoutButton.style.display = 'block';
    } else {
        loginButton.style.display = 'block';
        welcomeMessage.style.display = 'none';
        logoutButton.style.display = 'none';
    }
    
    // Listener de cierre de sesión
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('nombreUsuario');
        window.location.reload();
    });

    const map = L.map('mapid').setView([0, 0], 2);

    // 2. Añadir la capa base (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 3. Obtener la ubicación del usuario (con opciones para mejor precisión)
    function obtenerUbicacion() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const accuracy = position.coords.accuracy; // Precisión en metros

                    // Centra el mapa en la ubicación del usuario
                    map.setView([lat, lng], 14); 
                    
                    // Marcador de tu ubicación
                    L.marker([lat, lng]).addTo(map)
                        .bindPopup(`¡Estás aquí! (Precisión: ${Math.round(accuracy)}m)`).openPopup();
                    
                    // Dibuja el círculo de precisión para visualizar el margen de error
                    L.circle([lat, lng], {
                        color: '#47302e',
                        fillColor: '#47302e',
                        fillOpacity: 0.1, 
                        radius: accuracy 
                    }).addTo(map);

                    // Carga las cafeterías cercanas
                    cargarCafeterias(lat, lng); 
                },
                (error) => {
                    console.error("Error al obtener la ubicación:", error);
                    alert("No pudimos obtener tu ubicación. El mapa se centrará en una posición por defecto.");
                    map.setView([20.0, -99.0], 10); // Centrar en una posición por defecto
                },
                {
                    // Opciones para mejorar la precisión de la geolocalización
                    enableHighAccuracy: true,
                    timeout: 10000, 
                    maximumAge: 0
                }
            );
        } else {
            console.log("Geolocalización no soportada por el navegador.");
            alert("Tu navegador no soporta geolocalización. El mapa no funcionará correctamente.");
        }
    }

    // 4. Función para cargar y mostrar los marcadores de las cafeterías
    async function cargarCafeterias(usuarioLat, usuarioLng) {
        // Llama a la nueva ruta en el servidor
        const response = await fetch('/api/cafeterias-cercanas');
        const data = await response.json();

        if (data.success && data.data) {
            data.data.forEach(cafeteria => {
                if (cafeteria.latitud && cafeteria.longitud) {
                    // USO DEL ICONO PERSONALIZADO
                    L.marker([cafeteria.latitud, cafeteria.longitud], {icon: CoffeeIcon}) 
                        .addTo(map)
                        .bindPopup(`<b>${cafeteria.nombre}</b><br>${cafeteria.direccion}`);
                }
            });
        }
    }

    // Iniciar el proceso de geolocalización al cargar la página
    obtenerUbicacion();

    // 1. Selecciona el checkbox (el interruptor del menú)
    const menuToggle = document.getElementById('open-menu');

    // 2. Selecciona todos los enlaces (<a>) dentro del menú
    // Esto selecciona: Mapa, Pasaporte de Cafe, Promociones
    const navLinks = document.querySelectorAll('.header__nav .navbar-item a'); 

    // 3. Añade un escuchador de eventos a cada enlace
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Al hacer clic, forzamos al checkbox a estar deschequeado (cerrado)
            menuToggle.checked = false; 
        });
    });
    
});