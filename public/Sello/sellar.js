document.addEventListener('DOMContentLoaded', async () => {
    
    const mensajeEl = document.getElementById('sello-mensaje');

    // 1. Obtiene el ID de la cafetería desde la URL
    // (Ej. sellar.html?id=5)
    const params = new URLSearchParams(window.location.search);
    const idCafeteria = params.get('id');

    // 2. Obtiene el token del usuario logueado
    const token = localStorage.getItem('authToken');

    if (!token) {
        mensajeEl.textContent = 'Error: Debes iniciar sesión en CoffePass para sellar tu pasaporte.';
        // Opcional: redirigir al login
        // window.location.href = '/inicio-de-sesion-y-registro/inicio-de-sesion.html';
        return;
    }

    if (!idCafeteria) {
        mensajeEl.textContent = 'Error: Código QR inválido (no se encontró ID de cafetería).';
        return;
    }

    // 3. Intenta sellar el pasaporte llamando a la API
    try {
        const response = await fetch('/api/pasaporte/sellar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Envía el token de seguridad
            },
            body: JSON.stringify({
                id_cafeteria: idCafeteria // Envía el ID del QR
            })
        });

        const data = await response.json();

        if (data.success) {
            mensajeEl.textContent = '¡Felicidades! Has sellado esta cafetería.';
        } else {
            // Muestra errores (ej. "Ya has sellado esta cafetería.")
            mensajeEl.textContent = 'Error: ' + data.message;
        }

    } catch (error) {
        mensajeEl.textContent = 'Error de conexión al intentar sellar.';
    }
});