import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    updateProfile,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { auth } from './firebase-config.js';

const loginForm = document.getElementById('form-login');
const registerForm = document.getElementById('form-register');
const recoveryForm = document.getElementById('form-recovery');
const message = document.getElementById('auth-message');
const tabs = document.querySelector('.auth-tabs');
const loginTab = document.getElementById('tab-login');
const registerTab = document.getElementById('tab-register');
const showRecovery = document.getElementById('show-recovery');

const showMessage = (text, type = 'error') => {
    message.textContent = text;
    message.dataset.type = type;
};

function displayForm(name) {
    loginForm.hidden = name !== 'login';
    registerForm.hidden = name !== 'register';
    recoveryForm.hidden = name !== 'recovery';
    tabs.hidden = name === 'recovery';
    showRecovery.hidden = name !== 'login';
    loginTab.setAttribute('aria-selected', String(name === 'login'));
    registerTab.setAttribute('aria-selected', String(name === 'register'));
    loginTab.tabIndex = name === 'login' ? 0 : -1;
    registerTab.tabIndex = name === 'register' ? 0 : -1;
    message.textContent = '';
    message.dataset.type = '';
}

displayForm('login');

function firebaseMessage(error) {
    const messages = {
        'auth/invalid-credential': 'Correo o contraseña incorrectos.',
        'auth/user-not-found': 'No encontramos una cuenta con ese correo.',
        'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
        'auth/invalid-email': 'Escribe un correo electrónico válido.',
        'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a intentar.',
        'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisa tu conexión.',
    };
    return messages[error.code] || 'No se pudo completar la operación. Verifica la configuración de Firebase e intenta de nuevo.';
}

async function redirectForUser(user) {
    const token = await user.getIdTokenResult(true);
    location.replace(token.claims.admin === true ? 'admin.html' : 'reserva.html');
}

onAuthStateChanged(auth, user => {
    if (!user) return;
    redirectForUser(user).catch(error => {
        console.error('No se pudo verificar el permiso de la cuenta:', error);
        showMessage('No se pudieron verificar tus permisos. Cierra sesión y vuelve a intentarlo.');
    });
});

loginTab.addEventListener('click', () => displayForm('login'));
registerTab.addEventListener('click', () => displayForm('register'));
showRecovery.addEventListener('click', () => displayForm('recovery'));
document.getElementById('back-to-login').addEventListener('click', () => displayForm('login'));

loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await redirectForUser(result.user);
    } catch (error) {
        console.error('Error de inicio de sesión:', error.code || error.message);
        showMessage(firebaseMessage(error));
    }
});

registerForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!registerForm.reportValidity()) return;
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmation = document.getElementById('register-password-confirm').value;
    if (name.length < 2) return showMessage('Escribe tu nombre completo.');
    if (password !== confirmation) return showMessage('Las contraseñas no coinciden.');
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        showMessage('Cuenta creada. Ahora puedes solicitar una cita.', 'success');
        location.replace('reserva.html');
    } catch (error) {
        console.error('Error de registro:', error.code || error.message);
        showMessage(firebaseMessage(error));
    }
});

recoveryForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!recoveryForm.reportValidity()) return;
    try {
        await sendPasswordResetEmail(auth, document.getElementById('recovery-email').value.trim());
        showMessage('Si existe una cuenta con ese correo, recibirás instrucciones para restablecer la contraseña.', 'success');
    } catch (error) {
        console.error('Error al solicitar recuperación:', error.code || error.message);
        showMessage(firebaseMessage(error));
    }
});
