import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { deleteApp, initializeApp } from 'firebase/app';
import {
    connectAuthEmulator,
    createUserWithEmailAndPassword,
    inMemoryPersistence,
    initializeAuth,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import {
    Timestamp,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

const projectId = 'demo-glamurosa';
const testEmail = `glamurosa-test-${Date.now()}@example.test`;
const testPassword = `${randomUUID()}A7!`;
let environment;
let authApp;
let auth;

function dateInElSalvador(daysAhead, weekday = null) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const date = new Date(`${values.year}-${values.month}-${values.day}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + daysAhead);
    while (weekday !== null && date.getUTCDay() !== weekday) date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
}

function appointmentData(uid, email, fecha, hora = '08:00') {
    return {
        uid,
        email,
        nombre: 'Cliente de prueba',
        telefono: '70000000',
        servicio: 'Servicio de prueba',
        fecha,
        hora,
        fechaHora: Timestamp.fromDate(new Date(`${fecha}T${hora}:00-06:00`)),
        notas: 'Prueba local del emulador',
        estado: 'pendiente',
    };
}

function slotId(fecha, hora) {
    return `${fecha}_${hora}`;
}

async function createBooking(clientDb, data) {
    const reservationRef = doc(collection(clientDb, 'reservations'));
    const slotRef = doc(clientDb, 'bookingSlots', slotId(data.fecha, data.hora));
    const setupRef = doc(clientDb, 'settings', 'bookingSetup');
    const scheduleRef = doc(clientDb, 'settings', 'schedule');
    await runTransaction(clientDb, async transaction => {
        const setup = await transaction.get(setupRef);
        assert.equal(setup.data()?.ready, true);
        const schedule = await transaction.get(scheduleRef);
        assert.ok((schedule.data()?.horarios ?? ['08:00', '10:30', '14:00']).includes(data.hora));
        const occupied = await transaction.get(slotRef);
        assert.equal(occupied.exists(), false);
        transaction.set(reservationRef, { ...data, fechaCreacion: serverTimestamp() });
        transaction.set(slotRef, {
            reservationId: reservationRef.id,
            fecha: data.fecha,
            hora: data.hora,
        });
    });
    return reservationRef;
}

before(async () => {
    const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
    environment = await initializeTestEnvironment({
        projectId,
        firestore: { host: '127.0.0.1', port: 8180, rules },
    });

    authApp = initializeApp({
        apiKey: 'emulator-only-key',
        authDomain: 'localhost',
        projectId,
        appId: '1:123456789:web:emulatoronly',
    }, 'glamurosa-auth-emulator-tests');
    auth = initializeAuth(authApp, { persistence: inMemoryPersistence });
    connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
});

beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async context => {
        const db = context.firestore();
        await setDoc(doc(db, 'settings', 'bookingSetup'), { ready: true });
        await setDoc(doc(db, 'settings', 'schedule'), { horarios: ['08:00', '10:30', '14:00'] });
    });
});

after(async () => {
    if (auth) await signOut(auth).catch(() => {});
    if (authApp) await deleteApp(authApp);
    if (environment) await environment.cleanup();
});

test('Auth emulator registers and signs in a synthetic email/password user', async () => {
    const created = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    assert.equal(created.user.email, testEmail);
    await signOut(auth);
    const signedIn = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    assert.equal(signedIn.user.uid, created.user.uid);
});

test('client creates a reservation and matching slot; owner and admin can read it', async () => {
    const uid = 'client-integration-test';
    const email = 'client-integration-test@example.test';
    const client = environment.authenticatedContext(uid, { email }).firestore();
    const admin = environment.authenticatedContext('admin-integration-test', { admin: true }).firestore();
    const data = appointmentData(uid, email, dateInElSalvador(3, 2));

    const reservationRef = await createBooking(client, data);
    const stored = await assertSucceeds(getDoc(doc(client, 'reservations', reservationRef.id)));
    const slot = await assertSucceeds(getDoc(doc(client, 'bookingSlots', slotId(data.fecha, data.hora))));
    assert.equal(stored.data().uid, uid);
    assert.equal(slot.data().reservationId, reservationRef.id);

    const ownerQuery = await assertSucceeds(getDocs(query(collection(client, 'reservations'), where('uid', '==', uid))));
    assert.equal(ownerQuery.size, 1);
    await assertFails(getDoc(doc(environment.authenticatedContext('other-client').firestore(), 'reservations', reservationRef.id)));
    await assertFails(getDocs(collection(client, 'reservations')));
    assert.equal((await assertSucceeds(getDocs(collection(admin, 'reservations')))).size, 1);
});

test('rules reject past dates, Sundays and times outside the configured schedule', async () => {
    const client = environment.authenticatedContext('invalid-date-client', { email: 'invalid@example.test' }).firestore();
    const past = '2020-01-01';
    const sunday = dateInElSalvador(7, 0);
    const futureWeekday = dateInElSalvador(3, 2);

    for (const [fecha, hora] of [[past, '08:00'], [sunday, '08:00'], [futureWeekday, '09:00']]) {
        const ref = doc(collection(client, 'reservations'));
        const slot = doc(client, 'bookingSlots', slotId(fecha, hora));
        const data = appointmentData('invalid-date-client', 'invalid@example.test', fecha, hora);
        await assertFails(runTransaction(client, async transaction => {
            transaction.set(ref, { ...data, fechaCreacion: serverTimestamp() });
            transaction.set(slot, { reservationId: ref.id, fecha, hora });
        }));
    }
});

test('admin status changes and deletes must preserve reservation-slot consistency', async () => {
    const uid = 'state-test-client';
    const email = 'state-test@example.test';
    const client = environment.authenticatedContext(uid, { email }).firestore();
    const admin = environment.authenticatedContext('state-test-admin', { admin: true }).firestore();
    const data = appointmentData(uid, email, dateInElSalvador(3, 2));
    const reservationRef = await createBooking(client, data);
    const slotRef = doc(admin, 'bookingSlots', slotId(data.fecha, data.hora));
    const adminReservationRef = doc(admin, 'reservations', reservationRef.id);

    await assertFails(updateDoc(adminReservationRef, { estado: 'cancelada' }));
    await assertFails(deleteDoc(slotRef));
    await assertFails(deleteDoc(adminReservationRef));

    await runTransaction(admin, async transaction => {
        const reservation = await transaction.get(adminReservationRef);
        const slot = await transaction.get(slotRef);
        assert.ok(reservation.exists() && slot.exists());
        transaction.update(adminReservationRef, { estado: 'confirmada' });
    });
    assert.equal((await getDoc(adminReservationRef)).data().estado, 'confirmada');

    await runTransaction(admin, async transaction => {
        const reservation = await transaction.get(adminReservationRef);
        const slot = await transaction.get(slotRef);
        assert.ok(reservation.exists() && slot.exists());
        transaction.update(adminReservationRef, { estado: 'cancelada' });
        transaction.delete(slotRef);
    });
    assert.equal((await getDoc(adminReservationRef)).data().estado, 'cancelada');
    assert.equal((await getDoc(slotRef)).exists(), false);
});

test('only admin claim can list reservations and duplicate direct writes are rejected', async () => {
    const uid = 'duplicate-test-client';
    const email = 'duplicate-test@example.test';
    const client = environment.authenticatedContext(uid, { email }).firestore();
    const data = appointmentData(uid, email, dateInElSalvador(3, 2));
    const first = await createBooking(client, data);
    const second = doc(collection(client, 'reservations'));
    const existingSlot = doc(client, 'bookingSlots', slotId(data.fecha, data.hora));
    await assertFails(runTransaction(client, async transaction => {
        transaction.set(second, { ...data, fechaCreacion: serverTimestamp() });
        transaction.set(existingSlot, { reservationId: second.id, fecha: data.fecha, hora: data.hora });
    }));
    assert.ok((await getDoc(doc(client, 'reservations', first.id))).exists());
    await assertFails(getDocs(collection(environment.authenticatedContext('not-admin').firestore(), 'reservations')));
});
