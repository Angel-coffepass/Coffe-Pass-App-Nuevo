// notifications.js

/**
 * Muestra una notificación temporal (toast).
 * * NOTA: Requiere que exista un contenedor <div id="notification-container"> en el HTML
 * y que los estilos CSS para .toast-message, .toast-success, etc., estén definidos.
 * * @param {string} message - El texto del mensaje.
 * @param {string} type - El tipo de mensaje ('success', 'error', 'warning', 'info').
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) {
        console.error('Contenedor de notificaciones #notification-container no encontrado.');
        return; 
    }

    // 1. Crear el elemento de la notificación
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;

    // 2. Añadirlo al contenedor
    container.appendChild(toast);

    // 3. Mostrarlo con un pequeño retraso para activar la transición CSS
    setTimeout(() => {
        toast.classList.add('active');
    }, 10);

    // 4. Temporizador para ocultar y eliminar el mensaje
    const duration = 4000; // 4 segundos
    setTimeout(() => {
        // Inicia la transición para ocultar
        toast.classList.remove('active');

        // Eliminar del DOM después de que termine la transición (0.5s)
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 500); 
    }, duration);
}