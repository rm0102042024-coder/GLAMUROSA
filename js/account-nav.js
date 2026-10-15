import { getSession } from './storage.js';

const menu = document.querySelector('header nav ul');
const session = getSession();
if (menu && session?.role === 'admin') {
    const item = document.createElement('li'); const link = document.createElement('a');
    link.href = 'admin.html'; link.textContent = 'Administración'; item.append(link); menu.append(item);
}
