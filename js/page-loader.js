
const pageScript = document.querySelector('script[data-page]');
const page = pageScript?.dataset.page;

try {
    // Comprobar que la página solicitada sea válida.
    if (!['auth', 'reserva'].includes(page)) {
        throw new Error(`Página no reconocida: ${page || 'sin definir'}`);
    }

    // Cargar el JavaScript correspondiente a la página.
    if (page === 'auth') {
        await import('./auth.js');
    } else if (page === 'reserva') {
        await import('./reserva.js');
    }

    // Habilitar los botones de envío después de cargar el módulo.
    document
        .querySelectorAll('form button[type="submit"]')
        .forEach(button => {
            button.disabled = false;
        });

} catch (error) {
    console.error('No se pudo cargar el módulo de la página:', error);

    // Mostrar el mensaje en el área correspondiente.
    const messageId = page === 'auth'
        ? 'auth-message'
        : 'form-message';

    const message = document.getElementById(messageId);

    if (message) {
        message.textContent =
            'No se pudo cargar el formulario. Recarga la pagina e intenta de nuevo.';
        message.dataset.type = 'error';
    }

    // Mantener deshabilitados los botones si falla la carga.
    document
        .querySelectorAll('form button[type="submit"]')
        .forEach(button => {
            button.disabled = true;
        });
}
