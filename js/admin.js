const status = document.getElementById('admin-access-status');
const dashboard = document.getElementById('admin-dashboard');
const actions = document.getElementById('admin-access-actions');
const logout = document.getElementById('admin-logout');
let revision = 0;

function showStatus(title, message) {
    dashboard.hidden = true;
    status.hidden = false;
    status.querySelector('h2').textContent = title;
    status.querySelector('p').textContent = message;
    actions.hidden = false;
}

// Dynamic imports keep connection failures visible instead of leaving a spinner forever.
const timeout = setTimeout(() => {
    showStatus('No se pudo verificar el acceso', 'La conexión está tardando demasiado. Comprueba tu conexión y recarga la página.');
}, 15000);

try {
    const [{ auth }, { onIdTokenChanged, getIdTokenResult, signOut }] = await Promise.all([
        import('./firebase-config.js'),
        import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'),
    ]);

    onIdTokenChanged(auth, async user => {
        const current = ++revision;
        dashboard.hidden = true;
        logout.hidden = !user;
        showStatus('Verificando acceso', 'Estamos comprobando tu sesión y tus permisos administrativos.');
        try {
            if (!user) {
                showStatus('Inicia sesión', 'Necesitas una cuenta con permisos administrativos para acceder a este panel.');
                return;
            }
            const token = await getIdTokenResult(user);
            if (current !== revision) return;
            // Only a trusted Firebase custom claim grants access, never browser storage.
            if (token.claims.admin !== true) {
                showStatus('Acceso restringido', 'Tu cuenta no tiene permisos administrativos. Contacta con la persona responsable del salón.');
                return;
            }
            status.hidden = true;
            actions.hidden = true;
            dashboard.hidden = false;
        } catch (error) {
            if (current !== revision) return;
            console.error('No se pudieron comprobar los permisos:', error);
            showStatus('No se pudo verificar el acceso', 'Comprueba tu conexión y recarga la página para intentarlo de nuevo.');
        } finally {
            clearTimeout(timeout);
        }
    }, error => {
        ++revision;
        clearTimeout(timeout);
        console.error('No se pudo comprobar la sesión:', error);
        showStatus('No se pudo verificar el acceso', 'Comprueba tu conexión y recarga la página.');
    });

    logout.addEventListener('click', async () => {
        logout.disabled = true;
        try {
            await signOut(auth);
        } catch (error) {
            console.error('No se pudo cerrar la sesión:', error);
            showStatus('No se pudo cerrar la sesión', 'Inténtalo de nuevo o recarga la página.');
        } finally {
            logout.disabled = false;
        }
    });
} catch (error) {
    clearTimeout(timeout);
    console.error('No se pudo cargar la conexión administrativa:', error);
    showStatus('No se pudo conectar', 'Comprueba tu conexión a internet y recarga la página.');
}
