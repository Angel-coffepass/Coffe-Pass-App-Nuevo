document.addEventListener('DOMContentLoaded', () => {
    // 1. Selecciona el contenedor vacío
    const container = document.getElementById('lista-items-container');

    // 2. Llama a la API (Corregido el error de tipeo)
    fetch('/api/cafeterias-cercanas') 
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                container.innerHTML = ''; 
                
                data.data.forEach(cafeteria => {
                    const cafeteriaDiv = document.createElement('div');
                    cafeteriaDiv.className = 'cafeteria-item';

                    // 5. HTML interno (Corregido: sin <a> en el botón modificar)
                    cafeteriaDiv.innerHTML = `
                        <span class="cafeteria-nombre">${cafeteria.nombre}</span>
                        <div class="cafeteria-acciones">
                            <button class="modificar-btn" data-id="${cafeteria.id}">Modificar</button>
                            <button class="eliminar-btn" data-id="${cafeteria.id}">Eliminar</button>
                        </div>
                    `;
                    container.appendChild(cafeteriaDiv);
                });
                
                // 7. Añadir los eventos
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
    
    // Eventos para botones ELIMINAR
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

    // Eventos para botones MODIFICAR (Añadido)
    document.querySelectorAll('.modificar-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            // Redirige a la página de modificar y pasa el ID
            window.location.href = `modifiitem.html?id=${id}`;
        });
    });
}