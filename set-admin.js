<<<<<<< HEAD
/**
 * Script para asignar o retirar el rol de administrador (custom claim 'admin: true')
 * a una cuenta de usuario en Firebase Authentication.
 *
 * Uso:
 *   node set-admin.js <correo>
 *   node set-admin.js <correo> --remove
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const KEY_PATH = path.join(__dirname, 'serviceAccountKey.json');

function showHelp() {
    console.log(`
Uso:
  node set-admin.js <correo>                     Asigna permisos de administrador a un usuario existente
  node set-admin.js <correo> --password <clave>  Crea la cuenta (si no existe) y le asigna rol admin
  node set-admin.js <correo> --remove            Retira los permisos de administrador

Requisitos:
  1. Ve a Firebase Console (https://console.firebase.google.com/)
  2. Selecciona tu proyecto: 'glamurosa-3a5ad'
  3. Ve a Configuración del proyecto (icono de engranaje) > pestaña 'Cuentas de servicio'
  4. Haz clic en 'Generar nueva clave privada'
  5. Guarda el archivo descargado con el nombre: 'serviceAccountKey.json' en la raíz de este proyecto.
`);
}

async function main() {
    const args = process.argv.slice(2);
    const email = args.find(arg => !arg.startsWith('--'));
    const removeRole = args.includes('--remove');
    const showHelpFlag = args.includes('--help') || args.includes('-h');
    const passIndex = args.indexOf('--password');
    const password = passIndex !== -1 ? args[passIndex + 1] : null;

    if (showHelpFlag || !email) {
        showHelp();
        process.exit(showHelpFlag ? 0 : 1);
    }

    if (!fs.existsSync(KEY_PATH) && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.error('\n❌ ERROR: No se encontró el archivo de credenciales de Firebase.\n');
        console.error(`Buscado en: ${KEY_PATH}`);
        console.error('\nPara obtener este archivo:');
        console.error('1. Entra a Firebase Console > glamurosa-3a5ad > Configuración del proyecto > Cuentas de servicio.');
        console.error("2. Haz clic en 'Generar nueva clave privada'.");
        console.error("3. Guarda el archivo como 'serviceAccountKey.json' en esta carpeta.");
        console.error(`4. Ejecuta nuevamente: node set-admin.js ${email}\n`);
        process.exit(1);
    }

    try {
        if (!admin.apps.length) {
            const credential = fs.existsSync(KEY_PATH)
                ? admin.credential.cert(require(KEY_PATH))
                : admin.credential.applicationDefault();

            admin.initializeApp({ credential });
        }

        console.log(`Buscando usuario con correo: ${email}...`);
        let user;
        try {
            user = await admin.auth().getUserByEmail(email);
        } catch (err) {
            if (err.code === 'auth/user-not-found' && password) {
                console.log(`Usuario no encontrado. Creando nueva cuenta para: ${email}...`);
                user = await admin.auth().createUser({
                    email,
                    password,
                    displayName: 'Administrador Glamurosa',
                });
                console.log(`Cuenta creada exitosamente (UID: ${user.uid}).`);
            } else {
                throw err;
            }
        }

        const currentClaims = user.customClaims || {};
        const newClaims = { ...currentClaims, admin: !removeRole };

        if (removeRole) {
            delete newClaims.admin;
        }

        await admin.auth().setCustomUserClaims(user.uid, newClaims);

        if (removeRole) {
            console.log(`\n✅ Permiso de administrador RETIRADO a: ${email} (UID: ${user.uid})`);
        } else {
            console.log(`\n✅ Permiso de administrador ASIGNADO exitosamente a: ${email} (UID: ${user.uid})`);
            console.log('📌 Cuando esta persona inicie sesión (o recargue la página si ya está conectada),');
            console.log('   tendrá acceso al panel de administración (admin.html).');
        }
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error(`\n❌ No existe ningún usuario registrado con el correo: ${email}`);
            console.error('Pide a la persona que primero cree su cuenta en login.html o regístrala desde Firebase Console > Authentication > Users.');
        } else {
            console.error('\n❌ Ocurrió un error al asignar el permiso:', error.message);
        }
        process.exit(1);
    }
}

main();
=======


const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// La clave privada debe guardarse fuera del repositorio y de la carpeta pública.
const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credentialPath) {
    console.error('Define GOOGLE_APPLICATION_CREDENTIALS con la ruta del JSON privado.');
    process.exit(1);
}

const serviceAccountPath = path.resolve(credentialPath);

const serviceAccount = require(serviceAccountPath);

initializeApp({
    credential: cert(serviceAccount),
});

async function makeAdmin(email) {
    if (!email) {
        throw new Error('Debes indicar el correo del administrador.');
    }

    const auth = getAuth();
    const user = await auth.getUserByEmail(email);

    await auth.setCustomUserClaims(user.uid, {
        ...(user.customClaims || {}),
        admin: true,
    });

    console.log(`Permiso de administrador asignado a ${user.email}`);
}

makeAdmin(process.argv[2]).catch((error) => {
    console.error('No se pudo asignar el administrador:', error.message);
    process.exitCode = 1;
});

>>>>>>> cd00324 (integracion completa)
