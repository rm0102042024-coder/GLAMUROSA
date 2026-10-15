import { getSession, logout, readData, writeData } from './storage.js';

const status = document.getElementById('admin-access-status');
const dashboard = document.getElementById('admin-dashboard');
const actions = document.getElementById('admin-access-actions');
const logoutButton = document.getElementById('admin-logout');
const session = getSession();

function showStatus(title, message) {
    dashboard.hidden = true; status.hidden = false; actions.hidden = false;
    status.querySelector('h2').textContent = title; status.querySelector('p').textContent = message;
}
if (!session) showStatus('Inicia sesión', 'Usa la cuenta de administrador para acceder al panel.');
else if (session.role !== 'admin') showStatus('Acceso restringido', 'Esta sección está disponible únicamente para administradores.');
else {
    status.hidden = true; actions.hidden = true; dashboard.hidden = false; logoutButton.hidden = false;
    document.getElementById('welcome-title').textContent = `Bienvenida, ${session.name}`;
    renderReservations();
    renderSchedules();
}
logoutButton.addEventListener('click', () => { logout(); location.replace('login.html'); });

function renderReservations() {
    const container = document.getElementById('reservas-container');
    const reservations = readData().reservas.slice().sort((a,b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
    container.replaceChildren();
    if (!reservations.length) { const empty = document.createElement('p'); empty.className='admin-placeholder'; empty.textContent='Aún no hay reservas registradas.'; container.append(empty); return; }
    for (const item of reservations) {
        const card = document.createElement('article'); card.className='reservation-item';
        const heading = document.createElement('h3'); heading.textContent=`${item.nombre} · ${item.servicio}`;
        const details = document.createElement('p'); details.textContent=`${item.fecha} a las ${item.hora} · ${item.telefono} · @${item.usuario} · Estado: ${item.estado}`;
        const notes = document.createElement('p'); notes.textContent=item.notas ? `Notas: ${item.notas}` : 'Sin notas.';
        const controls = document.createElement('div'); controls.className='reservation-actions';
        const select = document.createElement('select'); select.setAttribute('aria-label', `Estado de la cita de ${item.nombre}`);
        for (const value of ['pendiente','confirmada','cancelada','completada']) { const option=document.createElement('option'); option.value=value; option.textContent=value; option.selected=item.estado===value; select.append(option); }
        select.addEventListener('change', () => { const data=readData(); const target=data.reservas.find(reserva=>reserva.id===item.id); if(target){target.estado=select.value;writeData(data);renderReservations();} });
        const remove = document.createElement('button'); remove.type='button'; remove.textContent='Eliminar';
        remove.addEventListener('click', () => { const data=readData(); data.reservas=data.reservas.filter(reserva=>reserva.id!==item.id); writeData(data); renderReservations(); });
        controls.append(select,remove); card.append(heading,details,notes,controls); container.append(card);
    }
}

function renderSchedules() {
    const container = document.getElementById('horarios-container'); container.replaceChildren();
    const data = readData();
    for (const time of ['08:00', '10:30', '14:00']) {
        const label=document.createElement('label'); const input=document.createElement('input'); input.type='checkbox'; input.checked=data.horarios.includes(time);
        input.addEventListener('change',()=>{const current=readData();current.horarios=input.checked?[...new Set([...current.horarios,time])]:current.horarios.filter(value=>value!==time);writeData(current);});
        label.append(input,document.createTextNode(` ${time}`)); container.append(label);
    }
}

window.addEventListener('storage', event => { if (event.key === 'glamurosa-data-v1' && session?.role === 'admin') { renderReservations(); renderSchedules(); } });
