import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const form = document.getElementById('booking-form');
const fields = document.getElementById('booking-fields');
const message = document.getElementById('form-message');
const dateInput = document.getElementById('fecha');
const logout = document.getElementById('logout');
let submitting = false;

function salonNow() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}
function showMessage(text, type = 'info') {
    message.textContent = text;
    message.dataset.type = type;
}
dateInput.min = salonNow().date;
onAuthStateChanged(auth, user => {
    fields.disabled = !user || submitting;
    if (!user) {
        location.replace('login.html');
        return;
    }
    document.getElementById('session-user').textContent = `Tu cuenta: ${user.displayName || user.email}`;
    document.getElementById('nombre').value ||= user.displayName || '';
    logout.hidden = false;
}, () => showMessage('No se pudo comprobar tu sesión. Recarga la página.', 'error'));

logout.addEventListener('click', async () => {
    logout.disabled = true;
    try { await signOut(auth); }
    catch { showMessage('No se pudo cerrar la sesión. Inténtalo de nuevo.', 'error'); }
    finally { logout.disabled = false; }
});

form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    const user = auth.currentUser;
    if (!user) { location.replace('login.html'); return; }
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    const now = salonNow();
    dateInput.min = now.date;
    if (data.nombre.trim().length < 2) { showMessage('Escribe tu nombre completo.', 'error'); return; }
    if (!/^\+?[\d\s()-]{8,20}$/.test(data.telefono.trim()) || data.telefono.replace(/\D/g, '').length < 8) {
        showMessage('Escribe un teléfono válido con al menos 8 dígitos.', 'error'); return;
    }
    if (data.fecha < now.date || (data.fecha === now.date && data.hora <= now.time)) {
        showMessage('Selecciona una fecha y hora futuras.', 'error'); return;
    }
    if (new Date(`${data.fecha}T12:00:00`).getDay() === 0) {
        showMessage('Selecciona una fecha de lunes a sábado.', 'error'); return;
    }
    submitting = true;
    fields.disabled = true;
    logout.disabled = true;
    showMessage('Enviando tu solicitud…');
    try {
        await addDoc(collection(db, 'reservas'), {
            uid: user.uid, email: user.email,
            nombre: data.nombre.trim(), telefono: data.telefono.trim(), servicio: data.servicio,
            fecha: data.fecha, hora: data.hora, notas: data.notas.trim(),
            estado: 'pendiente', fechaCreacion: serverTimestamp(),
        });
        form.reset();
        document.getElementById('nombre').value = user.displayName || '';
        showMessage('¡Solicitud enviada! Tu cita está pendiente de confirmación por el salón.', 'success');
    } catch (error) {
        console.error('Error al solicitar la cita:', error);
        if (error && error.code === 'permission-denied') {
            showMessage('No se pudo enviar tu solicitud: permisos insuficientes en Firestore. Verifica que las reglas de seguridad estén publicadas en Firebase.', 'error');
        } else {
            showMessage('No se pudo enviar tu solicitud. Comprueba tu conexión e inténtalo de nuevo.', 'error');
        }
    } finally {
        submitting = false;
        fields.disabled = !auth.currentUser;
        logout.disabled = false;
    }
});
