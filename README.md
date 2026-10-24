# 📱 Gestión de Ventas y Contabilidad (PWA)

Aplicación Web Progresiva (**PWA**) en español para la gestión de productos, ventas pendientes, ventas confirmadas, devoluciones, vendedores y contabilidad de comisiones entre el Administrador y su equipo de ventas.

---

## 🔐 Acceso y Credenciales Iniciales

Al abrir el enlace de la aplicación por primera vez, el sistema solicita iniciar sesión:

- **Rol Administrador**:
  - Contraseña inicial por defecto: **`admin2026`**
- **Rol Vendedor**:
  - Seleccionar el nombre del vendedor en la lista.
  - Código PIN inicial por defecto: **`1234`**

*(La sesión se puede recordar en el teléfono para no tener que introducir la contraseña en cada visita, y se puede cerrar pulsando "Salir" en la esquina superior derecha).*

---

## 📤 Dónde Subir Cada Archivo: Guía Clara

### 1. ¿Qué subir a Google Apps Script (script.google.com)?
Google Apps Script solo admite archivos `.gs` (scripts) y `.html` (vistas). En tu proyecto de Google Apps Script debes tener únicamente:
- **`Code.gs`**: Copia y pega el contenido del archivo [`Code.gs`](./Code.gs).
- **`index.html`**: Crea un archivo HTML llamado `index` y copia y pega el contenido de [`index.html`](./index.html).

### 2. ¿Qué subir a GitHub (github.com)?
Para publicar la aplicación web móvil (PWA) accesible desde cualquier teléfono a través de GitHub Pages, sube **todos los archivos contenidos en esta carpeta `github/`**:
- `index.html`
- `manifest.json`
- `sw.js`
- `icon-192.png`
- `icon-512.png`
- `apple-touch-icon.png`
- `favicon.png`
- `Code.gs`
- `README.md`
- `.gitignore`

---

## 👥 Estados de Vendedores (Archivar, Vacaciones, Baja o Eliminar)

El Administrador puede gestionar la disponibilidad de cada vendedor desde la pestaña **"Gestión de Vendedores"**:
- 🟢 **Activo**: Colaborando con normalidad.
- 🏖️ **De Vacaciones**: En descanso temporal (no se le asignan ventas nuevas temporalmente).
- 🩺 **De Baja**: En baja médica o permiso transitorio.
- 📦 **Archivado / Inactivo**: Ya no colabora con el equipo.
- 🗑️ **Eliminar**: 
  - Si el vendedor **no tiene ventas**, se elimina permanentemente.
  - Si el vendedor **ya tiene ventas registradas en la contabilidad**, el sistema automáticamente lo **Archiva** para proteger la integridad y el balance de las liquidaciones pasadas.

---

## 🚀 Publicar en GitHub Pages en 3 Pasos

1. Crea un repositorio en [GitHub](https://github.com/new) (por ejemplo `app-ventas`) y sube todos los archivos de esta carpeta.
2. Ve a **Settings** > **Pages** de tu repositorio.
3. En **Source** selecciona **Deploy from a branch**, elige la rama **`main`** y la carpeta **`/(root)`** y pulsa **Save**.
4. En 1-2 minutos tendrás tu enlace web seguro (HTTPS) listo para compartir con tus vendedores y para instalar en sus móviles con 1 clic.
