import { getSession, logout, readData, writeData, makeId } from './storage.js';

const form = document.getElementById('booking-form');
const fields = document.getElementById('booking-fields');
const message = document.getElementById('form-message');
const dateInput = document.getElementById('fecha');
const session = getSession();
const logoutButton = document.getElementById('logout');
const showMessage = (text, type = 'info') => { message.textContent = text; message.dataset.type = type; };
function salonNow() {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}
if (!session || session.role !== 'cliente') location.replace('login.html');
else {
    fields.disabled = false; logoutButton.hidden = false;
    document.getElementById('session-user').textContent = `Tu cuenta: ${session.name} (${session.username})`;
    document.getElementById('nombre').value = session.name;
    dateInput.min = salonNow().date;
    const hourSelect = document.getElementById('hora');
    const available = readData().horarios;
    [...hourSelect.options].forEach(option => { if (option.value) option.disabled = !available.includes(option.value); });
}
logoutButton.addEventListener('click', () => { logout(); location.replace('login.html'); });

function renderMyReservations() {
    const container = document.getElementById('my-reservations');
    const data = readData();
    const rows = data.reservas.filter(item => item.usuario === session?.username).sort((a,b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
    container.replaceChildren();
    if (!rows.length) { container.textContent = 'Aún no tienes reservas.'; return; }
    for (const item of rows) {
        const card = document.createElement('article'); card.className = 'reservation-item';
        const heading = document.createElement('h3'); heading.textContent = `${item.servicio} · ${item.fecha} a las ${item.hora}`;
        const detail = document.createElement('p'); detail.textContent = `Estado: ${item.estado}`;
        card.append(heading, detail); container.append(card);
    }
}
renderMyReservations();

form.addEventListener('submit', event => {
    event.preventDefault();
    if (!session || session.role !== 'cliente' || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form)); const now = salonNow();
    dateInput.min = now.date;
    if (data.nombre.trim().length < 2) return showMessage('Escribe tu nombre completo.', 'error');
    if (!/^\+?[\d\s()-]{8,20}$/.test(data.telefono.trim()) || data.telefono.replace(/\D/g, '').length < 8) return showMessage('Escribe un teléfono válido con al menos 8 dígitos.', 'error');
    if (data.fecha < now.date || (data.fecha === now.date && data.hora <= now.time)) return showMessage('Selecciona una fecha y hora futuras.', 'error');
    if (new Date(`${data.fecha}T12:00:00`).getDay() === 0) return showMessage('Selecciona una fecha de lunes a sábado.', 'error');
    const stored = readData();
    if (stored.reservas.some(item => item.fecha === data.fecha && item.hora === data.hora && item.estado !== 'cancelada')) return showMessage('Ese horario ya está reservado. Selecciona otro horario.', 'error');
    stored.reservas.push({ id: makeId(), uid: session.username, usuario: session.username, email: session.username, nombre: data.nombre.trim(), telefono: data.telefono.trim(), servicio: data.servicio, fecha: data.fecha, hora: data.hora, notas: data.notas.trim(), estado: 'pendiente', fechaCreacion: new Date().toISOString() });
    try { writeData(stored); form.reset(); document.getElementById('nombre').value = session.name; showMessage('¡Solicitud enviada! Tu cita está pendiente de confirmación por el salón.', 'success'); renderMyReservations(); }
    catch (error) { console.error('No se pudo guardar la cita:', error); showMessage('No se pudo guardar la reserva en este navegador.', 'error'); }
});
