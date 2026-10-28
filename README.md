# GLAMUROSA Nails & Brows

Sitio web estático de GLAMUROSA conectado a Firebase Authentication y Cloud Firestore. Ejecútalo mediante un servidor estático local (por ejemplo, Live Server). Los datos heredados de `localStorage` se conservan en el navegador y no se importan ni modifican automáticamente.

## Acceso

- Los clientes pueden crear una cuenta con correo y contraseña desde `login.html`.
- El acceso administrativo requiere una cuenta Firebase a la que un entorno confiable haya asignado el custom claim `admin: true`. El sitio no permite asignar ese permiso desde el navegador.

## Activación y prueba

1. Habilita el proveedor **Correo electrónico/contraseña** en Firebase Authentication.
2. Crea Cloud Firestore y publica `firestore.rules` en el proyecto `glamurosa-3a5ad`.
3. Sirve el sitio desde un dominio autorizado en Firebase Authentication.
4. Registra una cuenta cliente y prueba una reserva; asigna el custom claim administrativo de forma segura para probar el panel.
