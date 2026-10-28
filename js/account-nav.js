import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { auth } from './firebase-config.js';

const menu = document.querySelector('header nav ul');

onAuthStateChanged(auth, async user => {
    if (!menu || !user) return;
    try {
        const token = await user.getIdTokenResult();
        if (token.claims.admin !== true || menu.querySelector('a[href="admin.html"]')) return;
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = 'admin.html';
        link.textContent = 'Administración';
        item.append(link);
        menu.append(item);
    } catch (error) {
        console.error('No se pudo comprobar el permiso del menú:', error.code || error.message);
    }
});
