document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('lista-items-container');

    fetch('/api/cafeterias-cercanas') 
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                container.innerHTML = ''; 
                
                data.data.forEach(cafeteria => {
                    const cafeteriaDiv = document.createElement('div');
                    cafeteriaDiv.className = 'cafeteria-item';

                    // --- 1. CORRECCIÓN DEL HTML ---
                    // Quitamos el <a> que rodeaba al botón Modificar.
                    // Ahora ambos botones son iguales.
                    cafeteriaDiv.innerHTML = `
                        <span class="cafeteria-nombre">${cafeteria.nombre}</span>
                        <div class="cafeteria-acciones">
                            <button class="modificar-btn" data-id="${cafeteria.id}">Modificar</button>
                            <button class="eliminar-btn" data-id="${cafeteria.id}">Eliminar</button>
                        </div>
                    `;
                    // --- FIN DE LA CORRECCIÓN 1 ---

                    container.appendChild(cafeteriaDiv);
                });
                
                agregarEventos(); 
            } else {
                container.innerHTML = 'Error al cargar las cafeterías.';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            container.innerHTML = 'Error de conexión con el servidor.';
        });
});

// Función para que los botones de eliminar/modificar funcionen
function agregarEventos() {
    
    // Eventos para botones ELIMINAR (Esta parte ya está bien)
    document.querySelectorAll('.eliminar-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            
            if (confirm(`¿Seguro que quieres eliminar la cafetería ID ${id}?`)) {
                try {
                    const response = await fetch(`/api/cafeterias/${id}`, {
                        method: 'DELETE' 
                    });
                    const data = await response.json();

                    if (data.success) {
                        alert('¡Eliminada con éxito!');
                        location.reload(); 
                    } else {
                        alert('Error al eliminar: ' + data.message);
                    }
                } catch (error) {
                    alert('Error de conexión al eliminar.');
                }
            }
        });
    });

    // --- 2. AÑADIR ESTE BLOQUE FALTANTE ---
    // Eventos para botones MODIFICAR
    document.querySelectorAll('.modificar-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            // 1. Obtenemos el ID de la cafetería (ej: 5)
            const id = e.target.dataset.id;
            
            // 2. Redirigimos al usuario a la página de modificar Y LE PASAMOS EL ID
            // Esto resuelve el error "No se especificó un ID"
            window.location.href = `modifiitem.html?id=${id}`;
            // (Asegúrate de que la página se llame 'modifiitem.html' 
            //  o 'modificar-cafeteria.html' como la llamaste antes)
        });
    });
    // --- FIN DEL BLOQUE AÑADIDO ---
}