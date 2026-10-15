import { getSession, login } from './storage.js';

const form = document.getElementById('form-login');
const message = document.getElementById('auth-message');
const showMessage = (text, type = 'error') => { message.textContent = text; message.dataset.type = type; };
const redirect = role => location.replace(role === 'admin' ? 'admin.html' : 'reserva.html');

const current = getSession();
if (current) redirect(current.role);

form.addEventListener('submit', event => {
    event.preventDefault();
    const user = login(document.getElementById('login-email').value.trim(), document.getElementById('login-password').value);
    if (!user) { showMessage('Usuario o contraseña incorrectos.'); return; }
    redirect(user.role);
});
