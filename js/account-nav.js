// Public pages remain usable if authentication cannot be loaded.
const menu = document.querySelector('header nav ul');
if (menu) {
    const item = document.createElement('li');
    item.hidden = true;
    const link = document.createElement('a');
    link.href = 'admin.html';
    link.textContent = 'Administración';
    if (location.pathname.endsWith('/admin.html')) {
        link.setAttribute('aria-current', 'page');
    }
    item.append(link);
    menu.append(item);
    let revision = 0;
    try {
        const [{ auth }, { onIdTokenChanged, getIdTokenResult }] = await Promise.all([
            import('./firebase-config.js'),
            import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),
        ]);
        onIdTokenChanged(auth, async user => {
            const current = ++revision;
            item.hidden = true;
            if (!user) return;
            try {
                const { claims } = await getIdTokenResult(user);
                if (current === revision) item.hidden = claims.admin !== true;
            } catch (error) {
                console.error('No se pudo comprobar el acceso administrativo:', error);
            }
        }, error => {
            ++revision;
            item.hidden = true;
            console.error('No se pudo comprobar la sesión del menú:', error);
        });
    } catch (error) {
        console.error('No se pudo cargar la sesión del menú:', error);
    }
}
