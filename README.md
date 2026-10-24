# 📱 Gestión de Ventas, Envíos y Contabilidad (PWA)

Aplicación Web Progresiva (**PWA**) 100% en español, instalable en dispositivos móviles (Android / iOS) y optimizada tanto para Google Apps Script como para publicación directa en GitHub Pages.

Permite gestionar el catálogo de productos con precios mayoristas y márgenes permitidos, registrar ventas confirmadas en tiempo real, controlar el despacho y seguimiento de envíos con números de tracking, liquidar comisiones contables por ventas efectivamente enviadas, y administrar el equipo de vendedores con total privacidad y contraseñas aleatorias seguras.

---

## 🔐 1. Acceso y Privacidad en el Inicio de Sesión (Sin Desplegables)

Por motivos de estricta privacidad y seguridad, **la pantalla de acceso no muestra listas desplegables con los nombres de los vendedores**. Cada usuario accede de forma privada:

- **Rol Administrador**:
  - Contraseña por defecto: **`admin2026`**
- **Rol Vendedor**:
  - **Correo electrónico**: Introducido manualmente por el vendedor (ej. `mario.rossi@ejemplo.com`).
  - **Contraseña asignada**: Contraseña segura de 8 caracteres generada de forma aleatoria por el Administrador al darlo de alta.
  - Opción *"Recordar sesión en este dispositivo"* para acceso instantáneo en visitas posteriores sin tener que reescribir credenciales.

---

## 🔑 2. Generación y Cambio de Contraseñas de Vendedores

El Administrador tiene el control total de las claves de acceso de su equipo desde la pestaña **"Gestión de Vendedores"**:
- **Generación aleatoria automática**: Al crear un nuevo vendedor, el sistema genera automáticamente una contraseña alfanumérica segura (ej. `Vnt#9k2P`).
- **Cambio o reseteo en cualquier momento**: El Administrador puede regenerar o cambiar la contraseña de cualquier vendedor con un solo clic con el botón 🔑, **sin necesidad de conocer cuál era la contraseña anterior**.
- **Botón de copia rápida**: Permite copiar la nueva contraseña al portapapeles para enviársela de inmediato al vendedor por WhatsApp o correo.

---

## 📦 3. Envíos de Productos y Seguimiento en Tiempo Real

Para reflejar la operativa real de despacho físico de mercancía:
- **Pestaña "Envíos" dedicada**:
  - **Vista Administrador**: Lista todas las ventas confirmadas que están pendientes de envío o ya enviadas. Permite pulsar en *"Registrar Envío"*, seleccionar fecha, agencia de mensajería (Correos, SEUR, MRW, etc.), introducir el código de seguimiento (Tracking) y notas de entrega.
  - **Vista Vendedor (Tiempo Real)**: El vendedor ve inmediatamente el estado de sus pedidos (*En Tránsito* vs *Pendiente Admin*), la fecha de salida y el código de seguimiento para informar a sus clientes.

---

## 🧾 4. Ventas Confirmadas Directas (Sin división de Pendientes)

- Toda venta registrada en el sistema por un vendedor o por el Administrador se considera **Venta Confirmada** desde el primer instante.
- No existe estado ambiguo de "venta pendiente de confirmación": el vendedor ingresa el pedido con el cliente final y el pedido pasa directamente a la cola de despacho de **Envíos**.

---

## 💰 5. Contabilidad y Liquidación por Ventas Enviadas

Para garantizar que no se liquiden comisiones por productos que aún no han salido del almacén:
- **Separación contable estricta**:
  - Las ventas confirmadas que están **"Pendientes de Envío"** se contabilizan como volumen en espera, pero **no se incluyen en el saldo liquidable**.
  - Solo las ventas **"Enviadas"** generan derecho a cobro de comisión y deuda a favor del Administrador (precio base de coste).
- **Tratamiento de Devoluciones (`Devuelta`)**:
  - Si un cliente devuelve un producto de una venta ya liquidada y pagada en un período anterior, el sistema genera automáticamente un **saldo negativo (ajuste de compensación)** y una nota explicativa que se deduce en la liquidación del siguiente período.

---

## 🗑️ 6. Políticas de Borrado y Seguridad de Registros

- **Administrador**: Puede eliminar cualquier venta del sistema, pero para evitar pérdidas accidentales de datos contables, el sistema le exige **doble confirmación estricta** (aviso previo en ventana emergente y confirmación definitiva).
- **Vendedor**: Puede cancelar o eliminar una venta **ÚNICAMENTE si el Administrador aún no la ha marcado como "Enviada"**. Una vez que el Administrador registra el envío con su número de tracking, la opción de borrar queda **bloqueada por candado** para el vendedor (debiendo solicitar una devolución si el cliente rechaza la entrega).

---

## 👥 7. Estados y Ciclo de Vida de los Vendedores

Desde la pestaña de administración se puede definir la situación de cada vendedor:
- 🟢 **Activo**: Vendedor en activo con acceso a registrar ventas.
- 🏖️ **De Vacaciones**: En descanso transitorio.
- 🩺 **De Baja**: Baja médica o permiso temporal.
- 📦 **Archivado**: Inactivo o excolaborador.
- 🗑️ **Eliminación / Protección de Historial**:
  - Si el vendedor es nuevo y no tiene ventas registradas, se elimina físicamente de la base de datos.
  - Si el vendedor ya tiene ventas o liquidaciones en el historial, el sistema **lo Archiva automáticamente**, bloqueando su acceso pero manteniendo intactos todos los balances y libros contables históricos.

---

## 📂 Dónde Subir Cada Archivo: Guía Paso a Paso

### Opción A: Google Apps Script (Backend con Google Sheets)
Accede a [script.google.com](https://script.google.com/) en tu proyecto vinculado a la hoja de cálculo:
1. **`Code.gs`**: Pega el código del archivo `Code.gs`. Contiene todas las funciones de verificación de credenciales, despacho de envíos, doble confirmación y contabilidad.
2. **`index.html`**: Crea un archivo HTML y pega el código de `index.html`.

### Opción B: GitHub Pages (Aplicación Móvil Web PWA Instalable)
Sube todos los archivos de esta carpeta `github/` a tu repositorio:
- `index.html`: Aplicación completa y reactiva.
- `manifest.json`: Manifiesto de instalación PWA con iconos y pantalla de carga.
- `sw.js`: Service Worker para funcionamiento offline y caché ultra rápida.
- `icon-192.png` y `icon-512.png`: Iconos vectoriales de alta resolución.
- `apple-touch-icon.png` y `favicon.png`: Iconos para iPhone/iPad y pestañas de navegador.
- `Code.gs`: Código fuente de referencia para sincronización con Sheets.
- `README.md` y `.gitignore`.

Para activar GitHub Pages:
1. Ve a **Settings** > **Pages** en tu repositorio.
2. En **Source** selecciona **Deploy from a branch**.
3. Selecciona la rama **`main`** y la carpeta **`/(root)`** y pulsa **Save**.
4. En 1 minuto tendrás tu URL lista para compartir con tus vendedores con instalación directa en la pantalla de inicio del teléfono móvil.
