// Importar la instancia de la base de datos que configuramos previamente
import { db } from './firebase-config.js';
// Importar las funciones necesarias de Firestore desde el CDN
import {
    collection,
    addDoc,
    serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';

// Esperar a que el DOM cargue completamente
document.addEventListener('DOMContentLoaded', () => {
    const bookingForm = document.getElementById('booking-form');
    const formMessage = document.getElementById('form-message');

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue al enviar el formulario

        // Capturar los valores ingresados por el usuario
        const nombre = document.getElementById('nombre').value;
        const telefono = document.getElementById('telefono').value;
        const servicio = document.getElementById('servicio').value;
        const fecha = document.getElementById('fecha').value;
        const hora = document.getElementById('hora').value;
        const notas = document.getElementById('notas').value;

        // Mostrar estado de carga al usuario
        formMessage.textContent = 'Procesando tu reserva...';
        formMessage.style.color = '#333'; // Color neutro para el mensaje de carga

        try {
            // Guardar los datos en una colección llamada 'reservas' en Firestore
            const docRef = await addDoc(collection(db, 'reservas'), {
                nombre: nombre,
                telefono: telefono,
                servicio: servicio,
                fecha: fecha,
                hora: hora,
                notas: notas,
                estado: 'pendiente', // Por defecto entra como pendiente para que el admin la revise
                fechaCreacion: serverTimestamp(), // Marca de tiempo exacta del servidor
            });

            console.log('Reserva guardada con el ID: ', docRef.id);

            // Mostrar mensaje de éxito
            formMessage.textContent =
                '¡Tu reserva ha sido confirmada con éxito! Te esperamos.';
            formMessage.style.color = 'green';

            // Limpiar los campos del formulario
            bookingForm.reset();

            // Ocultar el mensaje de éxito después de 5 segundos
            setTimeout(() => {
                formMessage.textContent = '';
            }, 5000);
        } catch (error) {
            console.error('Error al guardar la reserva: ', error);

            // Mostrar mensaje de error al usuario
            formMessage.textContent =
                'Hubo un error al procesar la reserva. Por favor, intenta de nuevo.';
            formMessage.style.color = 'red';
        }
    });
});
