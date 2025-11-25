document.addEventListener('DOMContentLoaded', () => {
    
    // 🛑 IMPORTANTE: ASEGÚRATE DE DEFINIR LA URL BASE AQUÍ O PASARLA GLOBALMENTE.
    // Si este es un archivo JS separado, debe definirse la URL absoluta de tu API.
    const API_BASE_URL = "https://coffe-pass-app-nuevo-production.up.railway.app";
    // --------------------------------------------------------------------------

    // 1. REFERENCIAS A LOS ELEMENTOS DEL HTML
    const paginaActiva = document.querySelector('.pagina-activa');
    const btnAnterior = document.querySelector('.btn-anterior');
    const btnSiguiente = document.querySelector('.btn-siguiente');

    let todasLasCafeterias = []; // Aquí guardaremos los datos de la API
    let indiceActual = -1; // Para saber qué página (cafetería) estamos viendo

    // 2. FUNCIÓN PARA CARGAR LOS DATOS DEL SERVIDOR
    async function cargarPasaporte() {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            paginaActiva.innerHTML = "<h2>Error</h2><p>Debes iniciar sesión para ver tu pasaporte.</p>";
            return;
        }

        try {
            // Llama a la ruta GET /api/pasaporte que creaste en server.js
            const response = await fetch('/api/pasaporte', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                todasLasCafeterias = data.data; // Guardamos la lista de cafeterías
                if (todasLasCafeterias.length > 0) {
                    // Si el índice actual es -1, mostrará la portada.
                    // Si se carga por primera vez y queremos mostrar la primera cafetería, 
                    // deberíamos inicializar indiceActual a 0, o llamarlo con 0.
                    // Pero manteniendo tu lógica de -1 para la portada, usamos -1.
                    mostrarPagina(indiceActual); 
                } else {
                    paginaActiva.innerHTML = "<p>Aún no has visitado ninguna cafetería.</p>";
                }
            } else {
                paginaActiva.innerHTML = `<p>Error al cargar: ${data.message}</p>`;
            }
        } catch (error) {
            console.error('Error de red:', error);
            paginaActiva.innerHTML = "<p>Error de conexión al cargar el pasaporte.</p>";
        }
    }

    // 3. FUNCIÓN PARA MOSTRAR LA PÁGINA ESPECÍFICA
    function mostrarPagina(indice) {
        if (indice === -1) {
            // Si el índice es -1, muestra la portada
            paginaActiva.innerHTML = `
                <div class="portada-pasaporte">
                    
                </div>
            `;
        } else {
            const cafeteria = todasLasCafeterias[indice];
            
            // ✅ CORRECCIÓN CLAVE: CONSTRUCCIÓN DE LA RUTA ABSOLUTA DE LA IMAGEN
            const rutaImagenCompleta = cafeteria.imagen_url 
                ? `${API_BASE_URL}/uploads/${cafeteria.imagen_url}` 
                : './assets/default-image.png'; // Fallback local

            // Asigna la clase 'estampado' al contenedor principal si fue visitado
            const estadoClase = cafeteria.visitado ? 'estampado' : 'bloqueado';
            paginaActiva.className = `pagina-activa cafeteria-pasaporte ${estadoClase}`;
            
            // Creamos el HTML para esa cafetería
            paginaActiva.innerHTML = `
                <div class="imagen-contenedor">
                    <img src="${rutaImagenCompleta}" alt="${cafeteria.nombre}"> 
                    
                    <div class="candado-icono">
                        <span class="material-symbols-outlined">lock</span>
                    </div>
                </div>

                <h3>${cafeteria.nombre}</h3>
                <p>ubi: ${cafeteria.direccion || 'Dirección no disponible'}</p>

                <img src="./assets/Sello.png" class="sello-imagen" alt="Sellado">
            `;
        }
        // Actualiza el estado de los botones
        actualizarBotones();
    }

    // 4. FUNCIÓN PARA HABILITAR/DESHABILITAR BOTONES
    function actualizarBotones() {
        // Lógica del botón ANTERIOR:
        if (indiceActual === -1) {
            btnAnterior.style.visibility = 'hidden';
            
        } else {
            btnAnterior.style.visibility = 'visible';
        }
        
        // Lógica del botón SIGUIENTE:
        // Si el índice es el último de la lista, deshabilita el botón "Siguiente"
        if (indiceActual === todasLasCafeterias.length - 1) {
            btnSiguiente.style.display = 'none';
        } else {
            btnSiguiente.style.display = 'block';
        }
    }

    // 5. EVENTOS DE LOS BOTONES
    btnSiguiente.addEventListener('click', () => {
        if (indiceActual < todasLasCafeterias.length - 1) {
            indiceActual++; // Avanza el índice
            mostrarPagina(indiceActual); // Muestra la nueva página
        }
    });

    btnAnterior.addEventListener('click', () => {
        if (indiceActual > -1) {
            indiceActual--; // Retrocede el índice
            mostrarPagina(indiceActual); // Muestra la página anterior
        }
    });

    // 6. Carga inicial
    cargarPasaporte();
});