document.addEventListener('DOMContentLoaded', async () => {
    
    const mensajeEl = document.getElementById('sello-mensaje');

    // 🛑 URL DE TU SERVIDOR EN RAILWAY
    const API_BASE_URL = "https://coffe-pass-app-nuevo-production.up.railway.app";

    // 1. Obtiene el ID de la cafetería desde la URL (Ej. sellar.html?id=5)
    const params = new URLSearchParams(window.location.search);
    const idCafeteria = params.get('id');

    // 2. Obtiene el token del usuario logueado
    const token = localStorage.getItem('authToken');

    if (!token) {
        mensajeEl.textContent = 'Error: Debes iniciar sesión en CoffeePass para sellar tu pasaporte.';
        return;
    }

    if (!idCafeteria) {
        mensajeEl.textContent = 'Error: Código QR inválido (no se encontró ID de cafetería).';
        return;
    }

    // 3. Intenta sellar el pasaporte
    try {
        // CORRECCIÓN 1: La URL completa va dentro de comillas invertidas ``
        const response = await fetch(`${API_BASE_URL}/api/pasaporte/sellar`, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // CORRECCIÓN 2: El valor del encabezado va dentro de comillas invertidas `` y lleva una coma al final
                'Authorization': `Bearer ${token}`, 
            },
            body: JSON.stringify({
                id_cafeteria: idCafeteria
            })
        });

        const data = await response.json();

        if (data.success) {
            mensajeEl.textContent = '¡Felicidades! Has sellado esta cafetería.';
            mensajeEl.style.color = 'green';
        } else {
            mensajeEl.textContent = data.message;
            mensajeEl.style.color = 'red';
        }

    } catch (error) {
        console.error(error);
        mensajeEl.textContent = 'Error de conexión con el servidor.';
    }
});