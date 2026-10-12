const page = document.querySelector('script[data-page]').dataset.page;
document.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", event => event.preventDefault());
});
try {
    await import(page === 'auth' ? './auth.js' : './reserva.js');
    document.querySelectorAll('form button[type="submit"]').forEach(button => button.disabled = false);
} catch (error) {
    console.error('No se pudo cargar la conexión de la cuenta:', error);
    const message = document.getElementById(page === 'auth' ? 'auth-message' : 'form-message');
    message.textContent = 'No se pudo conectar. Comprueba tu conexión a internet y recarga la página.';
    message.dataset.type = 'error';
    document.querySelectorAll('form button[type="submit"]').forEach(button => button.disabled = true);
}
