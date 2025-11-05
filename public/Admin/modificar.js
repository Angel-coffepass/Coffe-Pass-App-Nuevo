
// Espera a que la página cargue
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. OBTENER EL ID DE LA URL
    // (La URL debe ser "modificar-cafeteria.html?id=5")
    const params = new URLSearchParams(window.location.search);
    const cafeteriaId = params.get('id');

    // Referencias a los campos del formulario
    const form = document.getElementById('form-cafeteria-modificar');
    const idField = document.getElementById('cafeteria_id');
    const nombreField = document.getElementById('nombre');
    const dirField = document.getElementById('dir');
    const latField = document.getElementById('lat');
    const lonField = document.getElementById('lon');

    if (!cafeteriaId) {
        alert('Error: No se especificó un ID de cafetería.');
        window.location.href = 'lista.html'; // Devuelve al admin
    }

    // 2. CARGAR DATOS EXISTENTES DE LA CAFETERÍA
    // Usamos una nueva ruta GET que debes crear en tu server.js
    fetch(`/api/cafeterias/${cafeteriaId}`) 
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const cafeteria = data.data;
                // Rellenar el formulario
                nombreField.value = cafeteria.nombre;
                dirField.value = cafeteria.direccion;
                latField.value = cafeteria.latitud;
                lonField.value = cafeteria.longitud;
                idField.value = cafeteriaId; // Guarda el ID en el campo oculto
            } else {
                alert('Error al cargar la cafetería: ' + data.message);
            }
        })
        .catch(error => console.error('Error de red:', error));

    // 3. ENVIAR ACTUALIZACIONES (AL HACER SUBMIT)
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            // Usamos el método PUT y la ruta específica con el ID
            const response = await fetch(`/api/cafeterias/${cafeteriaId}`, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            
            if (result.success) {
                alert('¡Cafetería actualizada con éxito!');
                window.location.href = 'lista.html'; // Regresa a la lista
            } else {
                alert('Error al actualizar: ' + result.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Hubo un error de conexión.');
        }
    });
});