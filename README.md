# GLAMUROSA

Sitio estático con cuentas mediante Firebase Authentication y solicitudes de citas en Firestore.

## Flujo de clientes

`login.html` permite iniciar sesión, crear una cuenta y solicitar recuperación de contraseña. Al autenticarse, el cliente pasa a `reserva.html` y la cuenta con el permiso `admin: true` pasa a `admin.html`. La misma comprobación se realiza al abrir Mi cuenta con una sesión activa. El menú muestra Administración únicamente para cuentas administradoras y lo oculta al cerrar sesión o si falla la verificación. Cada solicitud guarda el UID y correo de la cuenta y permanece **pendiente** hasta que el salón la confirme. El formulario no representa disponibilidad en tiempo real ni impide que distintos clientes soliciten el mismo horario.

Los módulos usan la misma versión de Firebase (13.0.0). Se necesita conexión para autenticar y enviar solicitudes. La caché PWA se actualizó a v7; consulta primero la red para obtener cambios y utiliza los recursos guardados cuando no hay conexión.

## Configuración del servicio

Antes de validar en producción:

- Comprobar que Email/Password esté habilitado en Firebase Authentication y que el dominio del sitio esté autorizado.
- Revisar las reglas existentes del proyecto antes de publicar `firestore.rules`. El archivo local permite crear solicitudes propias y leerlas; no permite a clientes confirmar, modificar ni eliminar citas. Otras colecciones quedan denegadas por defecto.
- Publicar las reglas revisadas en el proyecto `glamurosa-3a5ad` mediante Firebase Console o la CLI existente.
- Probar una cuenta y una solicitud de prueba autorizadas contra el servicio real.

Las reglas se prepararon localmente; no se desplegaron ni se validaron con el emulador. Las fechas futuras y el cierre de domingo se validan en el formulario; el servidor valida identidad, campos permitidos y estado inicial, pero no calcula disponibilidad ni horarios pasados. `admin.html` comprueba la sesión y exige el custom claim de Firebase `admin: true`, asignado desde un entorno de servidor de confianza. No se confía en roles del almacenamiento del navegador. Incluye estados de invitado, acceso denegado, error de conexión y cierre de sesión; las secciones de reservas, servicios y clientes siguen pendientes de implementación. Esta comprobación controla la interfaz, no sustituye las reglas de Firestore: no se han ampliado los permisos de datos ni asignado administradores reales.

## Verificación de navegador

`tests/browser_flow.py` requiere Python con Selenium y Chrome/ChromeDriver compatibles ya instalados. Admite las variables `CHROME_BINARY` y `CHROMEDRIVER` para sus rutas. Ejecutar desde cualquier directorio:

```sh
python tests/browser_flow.py
```

La prueba levanta un servidor en `127.0.0.1:8765` y sustituye Firebase por un doble local; no crea cuentas ni reservas reales. Verifica acceso de invitados, login inválido, recuperación, registro, contraseñas distintas, precarga del nombre, vistas de 375/768/1440 px, rechazo de domingos, conservación del formulario ante errores, asociación de la reserva al usuario, prevención de doble envío y cierre de sesión. También revisa las páginas públicas en tres tamaños, los enlaces de navegación, las dimensiones de los iconos y la navegación sin conexión con parámetros en la URL. Guarda capturas en `/tmp/glamurosa-*.png`.

## Ajustes del sitio

Las páginas Servicios y Nosotros utilizan únicamente el catálogo y la descripción ya presentes en el proyecto. Los enlaces de Instagram y Facebook del pie usan los destinos existentes en Contacto. Se retiró el enlace vacío de WhatsApp porque no hay un número del salón documentado. La portada usa la imagen local existente. Los iconos PNG de la app se renderizaron desde `assets/icons/icon.svg`.
