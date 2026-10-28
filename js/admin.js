import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { auth } from './firebase-config.js';
import { deleteReservation, getAllReservations, getSchedule, saveSchedule, updateReservationStatus } from './storage.js';

const status = document.getElementById('admin-access-status');
const dashboard = document.getElementById('admin-dashboard');
const actions = document.getElementById('admin-access-actions');
const logoutButton = document.getElementById('admin-logout');
let isAdmin = false;

function showStatus(title, message) {
    dashboard.hidden = true; status.hidden = false; actions.hidden = false; logoutButton.hidden = true;
    status.querySelector('h2').textContent = title;
    status.querySelector('p').textContent = message;
}

function showActionMessage(title, message) {
    status.hidden = false; actions.hidden = true;
    status.querySelector('h2').textContent = title;
    status.querySelector('p').textContent = message;
}

function showFirestoreError(error) {
    console.error('Error de Firestore en el panel:', error.code || error.message);
    const text = error.code === 'permission-denied'
        ? 'Firebase denegó el acceso. Confirma que esta cuenta tenga el permiso administrativo y que las reglas estén publicadas.'
        : 'No se pudieron cargar o guardar los datos. Revisa la conexión y la configuración de Firebase.';
    showStatus('No se pudo cargar el panel', text);
}

onAuthStateChanged(auth, async user => {
    isAdmin = false;
    if (!user) { showStatus('Inicia sesión', 'Usa una cuenta autorizada para acceder al panel.'); return; }
    try {
        const token = await user.getIdTokenResult(true);
        if (token.claims.admin !== true) {
            showStatus('Acceso restringido', 'Esta sección está disponible únicamente para administradores autorizados.');
            return;
        }
        isAdmin = true;
        status.hidden = true; actions.hidden = true; dashboard.hidden = false; logoutButton.hidden = false;
        document.getElementById('welcome-title').textContent = `Bienvenida, ${user.displayName || user.email}`;
        await Promise.all([renderReservations(), renderSchedules()]);
    } catch (error) {
        showFirestoreError(error);
    }
});

logoutButton.addEventListener('click', async () => {
    try { await signOut(auth); location.replace('login.html'); }
    catch (error) { console.error('No se pudo cerrar la sesión:', error.code || error.message); showStatus('Error al cerrar sesión', 'Intenta cerrar sesión de nuevo.'); }
});

async function renderReservations() {
    if (!isAdmin) return;
    const container = document.getElementById('reservas-container');
    const reservations = (await getAllReservations()).sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
    container.replaceChildren();
    if (!reservations.length) { const empty = document.createElement('p'); empty.className = 'admin-placeholder'; empty.textContent = 'Aún no hay reservas registradas.'; container.append(empty); return; }
    for (const item of reservations) {
        const card = document.createElement('article'); card.className = 'reservation-item';
        const heading = document.createElement('h3'); heading.textContent = `${item.nombre} · ${item.servicio}`;
        const details = document.createElement('p'); details.textContent = `${item.fecha} a las ${item.hora} · ${item.telefono} · ${item.email} · Estado: ${item.estado}`;
        const notes = document.createElement('p'); notes.textContent = item.notas ? `Notas: ${item.notas}` : 'Sin notas.';
        const controls = document.createElement('div'); controls.className = 'reservation-actions';
        const select = document.createElement('select'); select.setAttribute('aria-label', `Estado de la cita de ${item.nombre}`);
        for (const value of ['pendiente', 'confirmada', 'cancelada', 'completada']) {
            const option = document.createElement('option'); option.value = value; option.textContent = value; option.selected = item.estado === value; select.append(option);
        }
        select.addEventListener('change', async () => {
            select.disabled = true;
            try { await updateReservationStatus(item.id, select.value); await renderReservations(); }
            catch (error) {
                try { await renderReservations(); }
                catch (refreshError) { showFirestoreError(refreshError); return; }
                if (error.code === 'slot-unavailable') showActionMessage('Horario ocupado', 'Otra reserva ya utiliza ese horario; la cita no se reactivó.');
                else showFirestoreError(error);
            }
            finally { select.disabled = false; }
        });
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Eliminar';
        remove.addEventListener('click', async () => {
            remove.disabled = true;
            try { await deleteReservation(item.id); await renderReservations(); }
            catch (error) { showFirestoreError(error); remove.disabled = false; }
        });
        controls.append(select, remove); card.append(heading, details, notes, controls); container.append(card);
    }
}

async function renderSchedules() {
    if (!isAdmin) return;
    const container = document.getElementById('horarios-container');
    const enabled = new Set(await getSchedule());
    container.replaceChildren();
    for (const time of ['08:00', '10:30', '14:00']) {
        const label = document.createElement('label'); const input = document.createElement('input');
        input.type = 'checkbox'; input.checked = enabled.has(time);
        input.addEventListener('change', async () => {
            input.disabled = true;
            const next = new Set(enabled);
            if (input.checked) next.add(time); else next.delete(time);
            try {
                await saveSchedule([...next]);
                enabled.clear(); next.forEach(value => enabled.add(value));
            } catch (error) {
                input.checked = !input.checked;
                showFirestoreError(error);
            } finally { input.disabled = false; }
        });
        label.append(input, document.createTextNode(` ${time}`)); container.append(label);
    }
}
