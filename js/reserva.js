import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { auth } from './firebase-config.js';
import { createReservation, getMyReservations, getSchedule } from './storage.js';

const form = document.getElementById('booking-form');
const fields = document.getElementById('booking-fields');
const message = document.getElementById('form-message');
const dateInput = document.getElementById('fecha');
const logoutButton = document.getElementById('logout');
let currentUser = null;
let allowedSchedule = [];

const showMessage = (text, type = 'info') => {
    message.textContent = text;
    message.dataset.type = type;
};

function salonNow() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

function renderMyReservations(reservations) {
    const container = document.getElementById('my-reservations');
    const rows = reservations.sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
    container.replaceChildren();
    if (!rows.length) { container.textContent = 'Aún no tienes reservas.'; return; }
    for (const item of rows) {
        const card = document.createElement('article'); card.className = 'reservation-item';
        const heading = document.createElement('h3'); heading.textContent = `${item.servicio} · ${item.fecha} a las ${item.hora}`;
        const detail = document.createElement('p'); detail.textContent = `Estado: ${item.estado}`;
        card.append(heading, detail); container.append(card);
    }
}

async function refreshReservations() {
    renderMyReservations(await getMyReservations(currentUser.uid));
}

onAuthStateChanged(auth, async user => {
    if (!user) { location.replace('login.html'); return; }
    currentUser = user;
    try {
        const token = await user.getIdTokenResult(true);
        if (token.claims.admin === true) { location.replace('admin.html'); return; }
        fields.disabled = false;
        logoutButton.hidden = false;
        const name = user.displayName || user.email?.split('@')[0] || 'Cliente';
        document.getElementById('session-user').textContent = `Tu cuenta: ${name} (${user.email})`;
        document.getElementById('nombre').value = name;
        dateInput.min = salonNow().date;
        allowedSchedule = await getSchedule();
        const hourSelect = document.getElementById('hora');
        [...hourSelect.options].forEach(option => { if (option.value) option.disabled = !allowedSchedule.includes(option.value); });
        await refreshReservations();
    } catch (error) {
        console.error('No se pudieron cargar los datos de Firebase:', error.code || error.message);
        fields.disabled = true;
        showMessage('No se pudieron cargar tus reservas o los horarios. Revisa la configuración y las reglas de Firestore.', 'error');
    }
});

logoutButton.addEventListener('click', async () => {
    try { await signOut(auth); location.replace('login.html'); }
    catch (error) { console.error('No se pudo cerrar la sesión:', error.code || error.message); showMessage('No se pudo cerrar la sesión.', 'error'); }
});

form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!currentUser || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    const now = salonNow();
    dateInput.min = now.date;
    if (data.nombre.trim().length < 2) return showMessage('Escribe tu nombre completo.', 'error');
    if (!/^\+?[\d\s()-]{8,20}$/.test(data.telefono.trim()) || data.telefono.replace(/\D/g, '').length < 8) return showMessage('Escribe un teléfono válido con al menos 8 dígitos.', 'error');
    if (!allowedSchedule.includes(data.hora)) return showMessage('Ese horario no está disponible actualmente.', 'error');
    if (data.fecha < now.date || (data.fecha === now.date && data.hora <= now.time)) return showMessage('Selecciona una fecha y hora futuras.', 'error');
    if (new Date(`${data.fecha}T12:00:00`).getDay() === 0) return showMessage('Selecciona una fecha de lunes a sábado.', 'error');
    try {
        await createReservation({
            uid: currentUser.uid,
            email: currentUser.email,
            nombre: data.nombre.trim(),
            telefono: data.telefono.trim(),
            servicio: data.servicio,
            fecha: data.fecha,
            hora: data.hora,
            notas: data.notas.trim(),
            estado: 'pendiente',
        });
        form.reset();
        document.getElementById('nombre').value = currentUser.displayName || data.nombre.trim();
        showMessage('¡Solicitud enviada! Tu cita está pendiente de confirmación por el salón.', 'success');
        await refreshReservations();
    } catch (error) {
        console.error('No se pudo guardar la cita:', error.code || error.message);
        showMessage(error.code === 'slot-unavailable'
            ? 'Ese horario ya está reservado. Selecciona otro horario.'
            : error.code === 'invalid-appointment'
            ? 'La fecha debe ser futura, de lunes a sÃ¡bado, y el horario debe estar habilitado.'
            : error.code === 'booking-setup-required'
            ? 'Las reservas todavía no están habilitadas. Contacta al salón para más información.'
            : error.code === 'permission-denied'
            ? 'Firebase rechazó la reserva. Revisa las reglas de Firestore y la cuenta activa.'
            : 'No se pudo guardar la reserva. Comprueba tu conexión e inténtalo de nuevo.', 'error');
    }
});
