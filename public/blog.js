document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. REFERENCIAS A LOS ELEMENTOS DEL HTML ---
    const dropdownContainer = document.getElementById('opciones-scrollables');
    const toggleCheckbox = document.getElementById('toggle-menu'); // Checkbox oculto
    
    // Referencias al contenedor del "Chat"
    const chatPrincipal = document.getElementById('chat-principal');
    const chatTitulo = document.getElementById('chat-titulo');
    const comentariosLista = document.getElementById('comentarios-lista');
    const formOpinion = document.getElementById('form-opinion');
    const calificacionInput = document.getElementById('comentario-calificacion');
    const comentarioInput = document.getElementById('comentario-texto');

    // Variable para guardar el ID de la cafetería que está activa
    let idCafeteriaActual = null;

    // --- 2. FUNCIÓN PARA LLENAR EL MENÚ DESPLEGABLE ---
    async function cargarListaParaDropdown() {
        try {
            // Llama a la ruta GET que ya tienes en tu server.js
            const response = await fetch('/api/cafeterias-cercanas'); 
            const data = await response.json();

            if (data.success) {
                // (No limpiamos el contenedor para no borrar el título H1)
                
                data.data.forEach(cafeteria => {
                    // Por cada cafetería, crea un enlace <a>
                    const link = document.createElement('a');
                    link.href = `#`; // Usamos # para evitar recargar la página
                    link.textContent = cafeteria.nombre; // Pone el nombre
                    link.dataset.id = cafeteria.id; // Guarda el ID de la DB
                    link.classList.add('opcion-cafeteria'); // Clase para CSS y clics
                    
                    // "Mete" el enlace en el contenedor del menú
                    dropdownContainer.appendChild(link); 
                });
            }
        } catch (error) {
            console.error("Error cargando lista de cafeterías:", error);
            dropdownContainer.innerHTML += '<p>Error al cargar.</p>';
        }
    }

    // --- 3. FUNCIÓN PARA CARGAR LAS OPINIONES (EL CHAT) ---
    async function cargarOpiniones(idCafeteria) {
        if (!idCafeteria) return;
        const miUsuario = localStorage.getItem('nombreUsuario');
        // Llama a la ruta GET de opiniones que creaste en server.js
        const response = await fetch(`/api/opiniones/${idCafeteria}`);
        const data = await response.json();
        
        comentariosLista.innerHTML = ''; // Limpia el chat anterior

        if (data.success && data.data.length > 0) {
            data.data.forEach(opinion => {
                const div = document.createElement('div');
                div.className = 'opinion-item'; // (CSS para estilizar esto)

                if (miUsuario && opinion.usuario === miUsuario) {
                // Si coinciden, añade la clase 'mio'
                div.classList.add('mio');
                }
                div.innerHTML = `
                    <strong>${opinion.usuario}</strong> 
                    (Calificación: ${opinion.calificacion}/5)
                    <p>${opinion.comentario}</p>
                    <small>${new Date(opinion.fecha_creacion).toLocaleDateString()}</small>
                `;
                comentariosLista.appendChild(div);
            });
        } else {
            comentariosLista.innerHTML = '<p>Aún no hay opiniones. ¡Sé el primero!</p>';
        }
        comentariosLista.scrollTop = comentariosLista.scrollHeight;
    }

    // --- 4. EVENTO: AL HACER CLIC EN UNA CAFETERÍA DEL MENÚ ---
    dropdownContainer.addEventListener('click', (e) => {
        // Usamos delegación de eventos para escuchar clics en las opciones
        if (e.target.classList.contains('opcion-cafeteria')) {
            e.preventDefault();
            
            // Guarda el ID de la cafetería seleccionada
            idCafeteriaActual = e.target.dataset.id; 
            const nombreSeleccionado = e.target.textContent;

            // Muestra el chat y actualiza el título
            chatPrincipal.style.display = 'block'; 
            chatTitulo.textContent = `Opiniones de: ${nombreSeleccionado}`;
            
            // Cierra el menú desplegable (desmarcando el checkbox)
            toggleCheckbox.checked = false; 
            
            // Carga las opiniones (el "chat")
            cargarOpiniones(idCafeteriaActual); 
        }
    });
        // 5. EVENTO: ENVIAR CON "ENTER" EN EL TEXTAREA
    comentarioInput.addEventListener('keydown', (e) => {
        
        // e.key === 'Enter' -> Verifica si la tecla presionada fue "Enter"
        // !e.shiftKey     -> Verifica si la tecla "Shift" NO estaba presionada
        
        if (e.key === 'Enter' && !e.shiftKey) {
            // 1. Previene el comportamiento por defecto (evita el salto de línea)
            e.preventDefault(); 
            
            // 2. Simula un clic en el botón de enviar
            // (Esto dispara el evento 'submit' que ya programaste)
            formOpinion.requestSubmit(); 
        }
        
        // Si el usuario presiona Shift + Enter, el 'if' no se cumple
        // y el textarea se comportará normalmente (creando un salto de línea).
    });
    // --- 5. EVENTO: AL ENVIAR UNA NUEVA OPINIÓN ---
    formOpinion.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('authToken'); 
        
        if (!token) {
            alert('Debes iniciar sesión para poder opinar.');
            return;
        }
        if (!idCafeteriaActual) {
            alert('Por favor, selecciona una cafetería del menú primero.');
            return;
        }

        const calificacion = calificacionInput.value;
        const comentario = comentarioInput.value;

        try {
            // Llama a la ruta POST de opiniones
            const response = await fetch('/api/opiniones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Envía el token
                },
                body: JSON.stringify({
                    id_cafeteria: idCafeteriaActual,
                    calificacion: calificacion,
                    comentario: comentario
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                formOpinion.reset(); // Limpia el formulario
                cargarOpiniones(idCafeteriaActual); // Recarga el chat
            } else {
                alert('Error al enviar opinión: ' + data.message);
            }
        } catch (error) {
            alert('Error de conexión al enviar opinión.');
        }
        comentariosLista.scrollTop = comentariosLista.scrollHeight;
    });

    // --- 6. INICIA LA CARGA DE CAFETERÍAS AL ABRIR LA PÁGINA ---
    cargarListaParaDropdown();
});