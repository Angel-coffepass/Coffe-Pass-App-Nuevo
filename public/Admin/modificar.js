document.addEventListener('DOMContentLoaded', () => {
    
    const params = new URLSearchParams(window.location.search);
    const cafeteriaId = params.get('id');

    // Referencias a los campos del formulario
    const form = document.getElementById('form-cafeteria-modificar');
    const idField = document.getElementById('cafeteria_id');
    const nombreField = document.getElementById('nombre');
    const dirField = document.getElementById('dir');
    const latField = document.getElementById('lat');
    const lonField = document.getElementById('lon');
    const imgPreview = document.getElementById('imagen-actual-preview'); // Preview de imagen

    if (!cafeteriaId) {
        alert('Error: No se especificó un ID de cafetería.');
        window.location.href = 'lista.html'; 
    }

    // 1. CARGAR DATOS EXISTENTES
    // (Asegúrate que tu server.js también devuelva 'imagen_url' en esta ruta)
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
                idField.value = cafeteriaId; 
                
                // Muestra la imagen actual
                if (cafeteria.imagen_url) {
                    imgPreview.src = cafeteria.imagen_url;
                } else {
                    imgPreview.style.display = 'none'; // Oculta si no hay imagen
                }
            } else {
                alert('Error al cargar la cafetería: ' + data.message);
            }
        })
        .catch(error => console.error('Error de red:', error));

    // 2. ENVIAR ACTUALIZACIONES (AL HACER SUBMIT)
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); 
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            alert('Error: No estás autenticado.');
            return;
        }

        // --- CORRECCIÓN: USAR FORMDATA ---
        // 1. Obtenemos el FormData (incluye la imagen si se seleccionó)
        const formData = new FormData(form);

        try {
            // 2. Enviamos el FormData (ya no JSON)
            const response = await fetch(`/api/cafeterias/${cafeteriaId}`, { 
                method: 'PUT',
                headers: { 
                    // (No pongas Content-Type, el navegador lo pone solo)
                    'Authorization': `Bearer ${token}`
                },
                body: formData, // <-- Envía el FormData
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
        // --- FIN DE LA CORRECCIÓN ---
    });
});