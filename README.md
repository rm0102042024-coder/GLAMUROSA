# GLAMUROSA Nails & Brows

Sitio web y Progressive Web App (PWA) para salón de belleza con autenticación de usuarios mediante **Firebase Authentication** y gestión de citas en **Cloud Firestore**.

---

## Guía Paso a Paso: Configuración de Firebase

Para que el agendamiento de citas en `reserva.html` y el inicio de sesión funcionen correctamente en producción (por ejemplo, en GitHub Pages), la persona encargada debe completar los siguientes pasos en la consola de Firebase:

### 1. Habilitar Authentication (Correo electrónico y contraseña)
1. Ingresa a [Firebase Console](https://console.firebase.google.com/) y selecciona el proyecto **`glamurosa-3a5ad`**.
2. En el menú lateral izquierdo, ve a **Compilación (Build)** > **Authentication**.
3. Haz clic en la pestaña **Método de inicio de sesión (Sign-in method)**.
4. Si aún no está habilitado, selecciona **Correo electrónico/Contraseña (Email/Password)**.
5. Activa la primera casilla: **Habilitar** (no es necesario activar el vínculo por correo electrónico sin contraseña).
6. Haz clic en **Guardar**.

---

### 2. Registrar Dominios Autorizados
Para permitir que los usuarios inicien sesión y soliciten citas desde la web publicada:
1. Dentro de **Authentication**, haz clic en la pestaña **Ajustes (Settings)**.
2. Desplázate hasta la sección **Dominios autorizados (Authorized domains)**.
3. Verifica que estén agregados los siguientes dominios:
   - `localhost` (para desarrollo local).
   - `rm0102042024-coder.github.io` (o el dominio exacto donde está alojado el sitio en GitHub Pages).
4. Si tu dominio no está en la lista, pulsa **Agregar dominio**, escribe el dominio (sin `https://` ni barras finales) y guarda.

---

### 3. Crear la Base de Datos Cloud Firestore
1. En el menú lateral izquierdo, ve a **Compilación (Build)** > **Firestore Database**.
2. Si la base de datos no está creada:
   - Haz clic en **Crear base de datos**.
   - Selecciona la ubicación de tu preferencia (ej. `nam5 (us-central)`).
   - Selecciona **Modo de producción** (las reglas se actualizarán en el siguiente paso).
   - Haz clic en **Crear**.

---

### 4. Publicar las Reglas de Seguridad de Firestore
> [!IMPORTANT]
> Si este paso no se realiza, Firebase denegará el permiso con `permission-denied` y el formulario mostrará un error al intentar solicitar una cita.

1. Dentro de **Firestore Database**, entra a la pestaña **Reglas (Rules)**.
2. Copia todo el contenido del archivo [`firestore.rules`](./firestore.rules) de este repositorio.
3. Pégalo en el editor de reglas de la consola de Firebase, reemplazando el código existente:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated()
        && ('admin' in request.auth.token)
        && request.auth.token.admin == true;
    }

    function isValidReservaData(data) {
      return data.nombre is string
        && data.nombre.size() >= 2 && data.nombre.size() <= 100
        && data.telefono is string
        && data.telefono.size() >= 8 && data.telefono.size() <= 20
        && data.servicio in ['Semipermanentes', 'Builder Gel', 'Acrílicos', 'Pedicure Spa', 'Diseño y Depilación de Cejas', 'Laminado de Cejas', 'Lash Lifting']
        && data.fecha is string
        && data.fecha.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        && data.hora in ['08:00', '10:30', '14:00']
        && data.notas is string && data.notas.size() <= 1000
        && data.estado in ['pendiente', 'confirmada', 'cancelada', 'completada', 'rechazada', 'confirmado', 'cancelado', 'completado', 'rechazado'];
    }

    match /reservas/{reservaId} {
      // Clientes autenticados leen sus propias citas; administradores leen todas
      allow read: if isAuthenticated()
        && (resource.data.uid == request.auth.uid || isAdmin());

      // Clientes autenticados crean citas en estado 'pendiente'
      allow create: if isAuthenticated()
        && request.resource.data.keys().hasOnly(['uid', 'email', 'nombre', 'telefono', 'servicio', 'fecha', 'hora', 'notas', 'estado', 'fechaCreacion'])
        && request.resource.data.keys().hasAll(['uid', 'email', 'nombre', 'telefono', 'servicio', 'fecha', 'hora', 'notas', 'estado', 'fechaCreacion'])
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.email == request.auth.token.email
        && request.resource.data.estado == 'pendiente'
        && request.resource.data.fechaCreacion == request.time
        && isValidReservaData(request.resource.data);

      // Solo administradores actualizan estado o notas administrativas
      allow update: if isAdmin()
        && request.resource.data.keys().hasOnly(['uid', 'email', 'nombre', 'telefono', 'servicio', 'fecha', 'hora', 'notas', 'estado', 'fechaCreacion', 'notasAdmin'])
        && request.resource.data.keys().hasAll(['uid', 'email', 'nombre', 'telefono', 'servicio', 'fecha', 'hora', 'notas', 'estado', 'fechaCreacion'])
        && request.resource.data.uid == resource.data.uid
        && request.resource.data.email == resource.data.email
        && request.resource.data.fechaCreacion == resource.data.fechaCreacion
        && (!('notasAdmin' in request.resource.data) || (request.resource.data.notasAdmin is string && request.resource.data.notasAdmin.size() <= 1000))
        && isValidReservaData(request.resource.data);

      // Solo administradores pueden eliminar citas
      allow delete: if isAdmin();
    }
  }
}
```

4. Haz clic en el botón azul **Publicar (Publish)**.

---

### 5. Cómo Crear y Asignar Administradores

> [!NOTE]
> **¿Por qué no hay un registro directo de administradores en la web pública?**
> Por motivos estrictos de ciberseguridad, **ninguna persona puede registrarse como administrador directamente desde el formulario web público** (`login.html`). Si existiera esa opción, cualquier visitante o cliente podría darse permisos administrativos y acceder a las citas, teléfonos y datos privados de todos los clientes del salón.

Para dar de alta a una administradora o administrador, el sistema incluye el script [`set-admin.js`](./set-admin.js), que se conecta a Firebase con permisos seguros de servidor.

---

#### Paso 5.1: Descargar la clave de servicio de Firebase (Solo se hace una vez)
Para que el script tenga autorización de crear administradores en Firebase:
1. En [Firebase Console](https://console.firebase.google.com/), entra a tu proyecto **`glamurosa-3a5ad`**.
2. Haz clic en el ícono de engranaje ⚙️ (**Configuración del proyecto**) en la esquina superior izquierda.
3. Ve a la pestaña **Cuentas de servicio (Service accounts)**.
4. Haz clic en el botón azul **Generar nueva clave privada (Generate new private key)** y confirma.
5. Se descargará un archivo `.json`. Guárdalo en la raíz de esta carpeta con el nombre:
   ```
   serviceAccountKey.json
   ```
   *(Este archivo contiene credenciales privadas del proyecto y está protegido en [.gitignore](./.gitignore) para que **nunca** se suba a GitHub).*

---

#### Paso 5.2: Métodos para crear o nombrar Administradores

Elige la opción que prefieras:

##### Opción A: Crear la cuenta completa y nombrarla administrador en un solo comando (Terminal)
Si la persona aún no tiene cuenta, puedes crear la cuenta y asignarle los permisos en un único paso:
```bash
node set-admin.js correo_admin@ejemplo.com --password "TuContraseñaSegura123"
```
*Salida esperada:*
```text
Buscando usuario con correo: correo_admin@ejemplo.com...
Usuario no encontrado. Creando nueva cuenta para: correo_admin@ejemplo.com...
Cuenta creada exitosamente (UID: ...).
✅ Permiso de administrador ASIGNADO exitosamente a: correo_admin@ejemplo.com (UID: ...)
📌 Cuando esta persona inicie sesión, tendrá acceso al panel de administración (admin.html).
```

##### Opción B: Asignar permisos a una cuenta que ya se registró en la web
Si la administradora ya creó su cuenta previamente desde `login.html`:
```bash
node set-admin.js correo_admin@ejemplo.com
```

##### Opción C: Crear el administrador mediante el Asistente AI
Si prefieres no usar la terminal:
1. Coloca el archivo `serviceAccountKey.json` en la carpeta del proyecto.
2. Pídele al asistente: *"Crea el administrador con correo admin@glamurosa.com y contraseña X"*.
3. El asistente ejecutará el proceso de creación y confirmará el acceso.

---

#### Paso 5.3: Acceso y Verificación
* Al iniciar sesión con las credenciales de la cuenta administradora en `login.html`, el sistema detectará el permiso `admin: true` y la dirigirá automáticamente a **`admin.html`**.
* La barra superior de navegación mostrará el enlace **Administración**.
* Para **retirar** el permiso de administrador a un usuario en cualquier momento:
  ```bash
  node set-admin.js correo_admin@ejemplo.com --remove
  ```

---

## Flujo del Sistema

1. **Clientes (`login.html` & `reserva.html`)**:
   - Un cliente crea una cuenta o inicia sesión con su correo y contraseña.
   - El sistema lo redirige automáticamente a `reserva.html`.
   - El formulario precarga el nombre del usuario y valida los campos requeridos (mínimo 2 caracteres en nombre, teléfono válido de 8+ dígitos, horario comercial de lunes a sábado, y turnos: 08:00 AM, 10:30 AM o 02:00 PM).
   - Al hacer clic en **Solicitar cita**, se almacena el documento en la colección `reservas` con `estado: 'pendiente'`.
2. **Panel de Salón (`admin.html`)**:
   - Si una cuenta con `admin: true` inicia sesión, el sistema la redirige al panel de administración.
   - El menú de navegación muestra el enlace a **Administración** solo si la cuenta posee dicho permiso.
   - El panel permite supervisar las reservas registradas.

---

## Verificación de Navegador y Tests

`tests/browser_flow.py` permite validar de forma automática el flujo de la aplicación con Selenium y Chrome en modo headless:
- Simula navegación como invitado, login con credenciales erróneas, recuperación de contraseña y registro de cuenta nueva.
- Comprueba la validación de domingos cerrados, conservación de formulario ante errores y prevención de doble envío.
- Valida la responsividad en 375px, 768px y 1440px, así como el funcionamiento del Service Worker y la navegación offline.

Ejecutar:
```sh
python tests/browser_flow.py
```
