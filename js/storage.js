import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, setDoc, Timestamp, where } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import { db } from './firebase-config.js';

const LEGACY_STORAGE_KEY = 'glamurosa-data-v1';
const DEFAULT_SCHEDULE = ['08:00', '10:30', '14:00'];

// Legacy browser data is deliberately left in place and is never migrated.
export function readLegacyData() {
    try {
        const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!raw) return { reservas: [], horarios: DEFAULT_SCHEDULE.slice(), users: [] };
        const parsed = JSON.parse(raw);
        return {
            reservas: Array.isArray(parsed?.reservas) ? parsed.reservas : [],
            horarios: Array.isArray(parsed?.horarios) ? parsed.horarios : DEFAULT_SCHEDULE.slice(),
            users: Array.isArray(parsed?.users) ? parsed.users : [],
        };
    } catch (error) {
        console.error('No se pudieron leer los datos locales antiguos:', error);
        return { reservas: [], horarios: DEFAULT_SCHEDULE.slice(), users: [] };
    }
}

export async function getMyReservations(uid) {
    const reservationsQuery = query(collection(db, 'reservations'), where('uid', '==', uid));
    const snapshot = await getDocs(reservationsQuery);
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function getAllReservations() {
    const snapshot = await getDocs(collection(db, 'reservations'));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

function slotDocumentId(fecha, hora) {
    return `${fecha}_${hora}`;
}

function appointmentTimestamp(fecha, hora) {
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
        || typeof hora !== 'string' || !['08:00', '10:30', '14:00'].includes(hora)) {
        const error = new Error('La fecha o el horario no son válidos.');
        error.code = 'invalid-appointment';
        throw error;
    }
    const instant = new Date(`${fecha}T${hora}:00-06:00`);
    const local = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(instant);
    const fields = Object.fromEntries(local.map(part => [part.type, part.value]));
    if (`${fields.year}-${fields.month}-${fields.day}` !== fecha
        || `${fields.hour}:${fields.minute}` !== hora
        || instant.getTime() <= Date.now()
        || new Date(`${fecha}T12:00:00Z`).getUTCDay() === 0) {
        const error = new Error('La fecha debe ser futura, de lunes a sábado, y el horario debe ser válido.');
        error.code = 'invalid-appointment';
        throw error;
    }
    return Timestamp.fromDate(instant);
}

export function createReservation(data) {
    const fechaHora = appointmentTimestamp(data.fecha, data.hora);
    const reservationRef = doc(collection(db, 'reservations'));
    const slotRef = doc(db, 'bookingSlots', slotDocumentId(data.fecha, data.hora));
    const setupRef = doc(db, 'settings', 'bookingSetup');
    const scheduleRef = doc(db, 'settings', 'schedule');
    return runTransaction(db, async transaction => {
        const setup = await transaction.get(setupRef);
        if (!setup.exists() || setup.data().ready !== true) {
            const error = new Error('La disponibilidad de reservas todavía no está inicializada.');
            error.code = 'booking-setup-required';
            throw error;
        }
        const schedule = await transaction.get(scheduleRef);
        const configuredHours = schedule.exists() && Array.isArray(schedule.data().horarios)
            ? schedule.data().horarios
            : DEFAULT_SCHEDULE;
        if (!configuredHours.includes(data.hora)) {
            const error = new Error('Ese horario ya no está configurado.');
            error.code = 'invalid-appointment';
            throw error;
        }
        const slot = await transaction.get(slotRef);
        if (slot.exists()) {
            const error = new Error('Ese horario ya está ocupado.');
            error.code = 'slot-unavailable';
            throw error;
        }
        transaction.set(reservationRef, { ...data, fechaHora, fechaCreacion: serverTimestamp() });
        transaction.set(slotRef, {
            reservationId: reservationRef.id,
            fecha: data.fecha,
            hora: data.hora,
        });
        return reservationRef;
    });
}

export function updateReservationStatus(id, estado) {
    const reservationRef = doc(db, 'reservations', id);
    return runTransaction(db, async transaction => {
        const reservation = await transaction.get(reservationRef);
        if (!reservation.exists()) throw new Error('La reserva ya no existe.');
        const data = reservation.data();
        const slotRef = doc(db, 'bookingSlots', slotDocumentId(data.fecha, data.hora));
        const slot = await transaction.get(slotRef);
        if (estado === 'cancelada') {
            transaction.update(reservationRef, { estado });
            if (slot.exists() && slot.data().reservationId === id) transaction.delete(slotRef);
            return;
        }
        if (slot.exists() && slot.data().reservationId !== id) {
            const error = new Error('Ese horario ya fue reservado por otra persona.');
            error.code = 'slot-unavailable';
            throw error;
        }
        transaction.update(reservationRef, { estado });
        if (!slot.exists()) transaction.set(slotRef, { reservationId: id, fecha: data.fecha, hora: data.hora });
    });
}

export function deleteReservation(id) {
    const reservationRef = doc(db, 'reservations', id);
    return runTransaction(db, async transaction => {
        const reservation = await transaction.get(reservationRef);
        if (!reservation.exists()) return;
        const data = reservation.data();
        const slotRef = doc(db, 'bookingSlots', slotDocumentId(data.fecha, data.hora));
        const slot = await transaction.get(slotRef);
        transaction.delete(reservationRef);
        if (slot.exists() && slot.data().reservationId === id) transaction.delete(slotRef);
    });
}

export async function getSchedule() {
    const snapshot = await getDoc(doc(db, 'settings', 'schedule'));
    const horarios = snapshot.exists() ? snapshot.data().horarios : DEFAULT_SCHEDULE;
    return Array.isArray(horarios) ? horarios : DEFAULT_SCHEDULE.slice();
}

export function saveSchedule(horarios) {
    return setDoc(doc(db, 'settings', 'schedule'), { horarios });
}
