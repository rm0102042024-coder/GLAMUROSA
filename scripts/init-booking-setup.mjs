import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const expectedProjectId = 'glamurosa-3a5ad';
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serviceAccountPath = process.env.FIREBASE_ADMIN_CREDENTIALS
    || process.env.GOOGLE_APPLICATION_CREDENTIALS
    || resolve(projectRoot, 'serviceAccountKey.json');
const configPath = new URL('../js/firebase-config.js', import.meta.url);
const configSource = await readFile(configPath, 'utf8');
const configuredProjectId = configSource.match(/\bprojectId\s*:\s*['"]([^'"]+)['"]/u)?.[1];

if (configuredProjectId !== expectedProjectId) {
    throw new Error('El projectId de js/firebase-config.js no coincide con el proyecto esperado. No se escribió ningún dato.');
}

let serviceAccount;
try {
    serviceAccount = JSON.parse(await readFile(resolve(serviceAccountPath), 'utf8'));
} catch {
    throw new Error('No se pudo leer el JSON de Firebase Admin. Coloca serviceAccountKey.json en la raÃ­z o configura FIREBASE_ADMIN_CREDENTIALS con su ruta local.');
}

if (serviceAccount.type !== 'service_account'
    || serviceAccount.project_id !== expectedProjectId
    || typeof serviceAccount.client_email !== 'string'
    || typeof serviceAccount.private_key !== 'string') {
    throw new Error('El JSON indicado no es una cuenta de servicio vÃ¡lida para el proyecto esperado. No se escribiÃ³ ningÃºn dato.');
}

const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: expectedProjectId,
}, 'glamurosa-booking-setup-once');

try {
    const db = getFirestore(app);
    const setupRef = db.doc('settings/bookingSetup');
    const current = await setupRef.get();

    if (current.exists) {
        if (current.get('ready') === true) {
            console.log('settings/bookingSetup ya está inicializado. No se realizaron cambios.');
            process.exitCode = 0;
        } else {
            throw new Error('settings/bookingSetup ya existe y no está listo. Se conserva intacto; revísalo antes de cambiarlo.');
        }
    } else {
        const terminal = createInterface({ input, output });
        let confirmation;
        try {
            confirmation = await terminal.question(`Proyecto verificado: ${expectedProjectId}. Para crear settings/bookingSetup con ready=true, escribe exactamente ${expectedProjectId}: `);
        } finally {
            terminal.close();
        }

        if (confirmation !== expectedProjectId) {
            console.log('Confirmación no válida. No se escribió ningún dato.');
            process.exitCode = 1;
        } else {
            await db.runTransaction(async transaction => {
                const latest = await transaction.get(setupRef);
                if (latest.exists) throw new Error('El documento apareció durante la inicialización. No se sobrescribió.');
                transaction.create(setupRef, { ready: true });
            });
            console.log('Inicialización completada para settings/bookingSetup.');
        }
    }
} finally {
    await app.delete();
}
