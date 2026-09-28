# 🏗️ Máquina de Leads & Mini-CRM: Acabados y Decoraciones en Obra Blanca

Plataforma integral de captura de clientes potenciales de alta conversión y Mini-CRM comercial para empresas de ingeniería, acabados y remodelaciones en obra blanca. Diseñada con enfoque **Mobile-First (optimizado para el 80%+ del tráfico móvil)**, estética cinematográfica de lujo con Glassmorphism, cotizador dinámico en tiempo real y tablero Kanban interactivo para la gestión de proyectos.

---

## 🚀 Características Principales

### 1. 🌟 Landing Page de Alta Conversión (CRO & Mobile-First)
- **Hero Cinematográfico:** Soporte para video en bucle optimizado y fallback ultrarrápido con poster para garantizar métricas excelentes de Core Web Vitals (FCP/LCP).
- **Estética de Lujo:** Glassmorphism moderno, paleta cromática refinada (tonos oscuros y acentos dorados cálidos), microanimaciones fluidas y tipografía de alto impacto (*Outfit* y *Plus Jakarta Sans*).
- **Catálogo de Servicios Arquitectónicos:** Fichas interactivas para Obra Blanca Completa, Drywall con iluminación indirecta LED, Porcelanato rectificado, Estuco y Pintura de alta gama, Baños de lujo y Cocinas integrales.
- **Atribución de Tráfico (Marketing & Ads):** Captura y preservación de parámetros UTM (`utm_source`, `utm_medium`, `utm_campaign`) para trazabilidad de retorno de inversión publicitaria.

### 2. 🎚️ Comparador Interactivo "Antes y Después"
- Slider deslizante táctil y por cursor que contrasta la **Obra Gris** inicial frente al **Acabado Final**.
- **Sincronización en vivo con Firebase Firestore:** Muestra la obra marcada como "destacada" desde el panel de administración.
- **Controles de Inspección Rápida:** Botones interactivos para visualizar al 100% la foto de Obra Gris o el Acabado Final al instante.

### 3. ⚡ Cotizador Inteligente con Integración a WhatsApp
- Cálculo dinámico del presupuesto estimado en pesos colombianos (COP) en base a los metros cuadrados ($m^2$) y el tipo de servicio seleccionado.
- **Doble canal de conversión:** Al enviar el formulario, el prospecto se registra automáticamente en la base de datos y se le redirecciona a WhatsApp con un mensaje preformateado listo para agendar visita técnica.

### 4. 📋 Mini-CRM Comercial con Tablero Kanban Drag-and-Drop
- **Flujo comercial en 7 etapas:** `nuevo` ➔ `contactado` ➔ `visita_agendada` ➔ `cotizado` ➔ `en_obra` ➔ `completado` ➔ `descartado`.
- **Drag & Drop Nativo:** Movimiento fluido de tarjetas de leads entre columnas con actualización automática e inmediata en Firestore.
- **Vista de Tabla y Filtros Avanzados:** Búsqueda en tiempo real por nombre, teléfono o servicio, con filtros por estado y edición directa de notas y bitácora de seguimiento.
- **Exportación a CSV:** Descarga con un solo clic de la base de prospectos con métricas de presupuesto y fechas para análisis en Excel o Google Sheets.

### 5. 🖼️ Módulo de Gestión de Proyectos y Galería
- Panel dedicado para subir imágenes de proyectos reales (fotos de Antes y Después) con procesamiento multipart vía `multer`.
- Edición de información de obras: título, ubicación, metraje ($m^2$) y descripción.
- Selector de **"Obra Destacada"** para actualizar dinámicamente el slider de la landing page pública sin tocar código.

### 6. 🔒 Seguridad y Autenticación
- Acceso restringido al CRM y API mediante **JSON Web Tokens (JWT)** y cookies seguras `HttpOnly`.
- Protección contra vulnerabilidades web con **Helmet**, control de políticas de origen cruzado (**CORS**) y sanitización de entradas.
- Diseño totalmente adaptable para móviles: vista de tarjetas táctiles y barra de navegación inferior (*Bottom Nav*) para uso cómodo en campo u obra.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend Web** | HTML5 Semántico + CSS3 Vanilla (Glassmorphism) | Landing page pública ligera, de carga inmediata y alta fidelidad visual. |
| **Frontend Admin** | Tailwind CSS v3 (Compilado localmente) + JS Vanilla | Panel de administración reactivo, modular y sin dependencias de CDN externos. |
| **Backend** | Node.js con Express 5 | Servidor RESTful, middlewares de autenticación, subida de archivos y CORS. |
| **Base de Datos** | Google Cloud / Firebase Firestore | Almacenamiento en la nube NoSQL de alta disponibilidad y tiempo real. |
| **Seguridad** | JWT (`jsonwebtoken`) + Cookie-Parser + Helmet | Sesiones seguras persistentes por 7 días y cabeceras HTTP reforzadas. |
| **Multimedia** | Multer | Carga y gestión local de fotografías de proyectos. |

---

## 📂 Estructura del Proyecto

```text
├── public/                     # Frontend servido estáticamente
│   ├── index.html              # Landing page principal y embudo de conversión
│   ├── login.html              # Pantalla de acceso para administradores
│   ├── admin.html              # Panel de administración, CRM Kanban y proyectos
│   ├── css/
│   │   ├── styles.css          # Estilos visuales de la landing (Glassmorphism)
│   │   └── admin.css           # Estilos compilados de Tailwind para el CRM
│   ├── js/
│   │   ├── main.js             # Interacciones generales, scroll y FAQ
│   │   ├── slider.js           # Lógica interactiva del comparador Antes/Después
│   │   ├── calculator.js       # Estimación de presupuestos y conexión WhatsApp
│   │   ├── login.js            # Flujo de autenticación e inicio de sesión
│   │   └── admin.js            # Lógica del CRM, Kanban drag-and-drop y proyectos
│   ├── assets/                 # Recursos multimedia (iconos, fotos de stock)
│   └── uploads/                # Fotografías de proyectos subidas desde el admin
│
├── server/                     # Backend y lógica de la API REST
│   ├── config/
│   │   └── firebase.js         # Inicialización de Firebase Admin SDK y Firestore
│   ├── controllers/
│   │   ├── authController.js   # Login, validación JWT y logout
│   │   ├── leadController.js   # Registro, métricas, cambio de estados y CSV
│   │   └── projectController.js# CRUD de transformaciones y obras destacadas
│   ├── middlewares/
│   │   ├── authMiddleware.js   # Protección de rutas web y endpoints API
│   │   └── uploadMiddleware.js # Configuración de almacenamiento Multer
│   ├── routes/
│   │   ├── authRoutes.js       # Endpoints de autenticación (/api/auth)
│   │   ├── leadRoutes.js       # Endpoints de leads y cotizaciones (/api/leads)
│   │   └── projectRoutes.js    # Endpoints de proyectos (/api/projects)
│   ├── services/
│   │   ├── leadService.js      # Operaciones de persistencia en Firestore (leads)
│   │   └── projectService.js   # Operaciones de persistencia en Firestore (obras)
│   └── server.js               # Punto de entrada de la aplicación Express
│
├── src/
│   └── input.css               # Directivas base de Tailwind CSS
│
├── test/
│   └── api-test.js             # Suite de 11 pruebas automatizadas de integración
│
├── .env.example                # Plantilla documentada de variables de entorno
├── tailwind.config.js          # Configuración de rutas y estilos de Tailwind
└── package.json                # Dependencias y scripts de ejecución
```

---

## 🌐 Endpoints de la API REST

### 1. Autenticación (`/api/auth`)
- `POST /api/auth/login`: Autentica credenciales y emite cookie `HttpOnly` con JWT.
- `POST /api/auth/logout`: Revoca y limpia la cookie de autenticación.
- `GET /api/auth/me`: Retorna los datos del usuario autenticado (requiere token).

### 2. Leads & Cotizaciones (`/api`)
- `POST /api/leads`: Registra una nueva solicitud de cotización desde la web pública.
- `GET /api/leads/estimate`: Calcula el valor estimado según m² y servicio.
- `GET /api/leads`: Lista todos los leads registrados (🔒 Admin).
- `GET /api/leads/metrics`: Estadísticas de conversión y presupuesto en negociación (🔒 Admin).
- `PATCH /api/leads/:id/status`: Actualiza el estado comercial del lead (🔒 Admin).
- `PATCH /api/leads/:id/notes`: Guarda notas internas del asesor comercial (🔒 Admin).
- `DELETE /api/leads/:id`: Elimina un lead del sistema (🔒 Admin).
- `GET /api/leads/export/csv`: Exporta toda la base de datos a archivo CSV (🔒 Admin).

### 3. Proyectos & Galería Antes/Después (`/api`)
- `GET /api/projects`: Lista de transformaciones activas.
- `GET /api/projects/featured`: Retorna la obra destacada activa para el slider público.
- `POST /api/projects`: Crea una nueva transformación con fotos Antes/Después (🔒 Admin).
- `PUT /api/projects/:id`: Modifica los datos o fotos de una obra existente (🔒 Admin).
- `PATCH /api/projects/:id/featured`: Establece una obra como la destacada de la web (🔒 Admin).
- `DELETE /api/projects/:id`: Elimina una obra y sus referencias (🔒 Admin).

---

## ⚙️ Instalación y Configuración

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/torvi30/acabados-y-decoraciones.git
cd "proyecto-acabados y decoraciones obra blanca"
npm install
```

### 2. Configurar Firebase Firestore
1. Dirígete a la consola de [Firebase Console](https://console.firebase.google.com/) y crea un proyecto.
2. Crea una base de datos **Cloud Firestore** en modo de producción.
3. Ve a **Configuración del Proyecto > Cuentas de servicio** y haz clic en **Generar nueva clave privada**.
4. Descarga el archivo JSON y guárdalo en la raíz del proyecto con el nombre `serviceAccountKey.json`.
*(El archivo ya se encuentra incluido en el `.gitignore` para proteger tus credenciales).*

### 3. Configurar variables de entorno
Crea tu archivo `.env` a partir de la plantilla:
```bash
cp .env.example .env
```
Asegúrate de ajustar los valores según tu entorno:
```ini
PORT=3000
NODE_ENV=development
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
WHATSAPP_ADMIN_NUMBER=573001234567
COMPANY_NAME=Acabados y Decoraciones Obra Blanca
ADMIN_EMAIL=admin@obrablanca.com
ADMIN_PASSWORD=tu_clave_segura
JWT_SECRET=tu_secreto_super_seguro_jwt_2026_xyz
```

---

## 🚀 Comandos de Ejecución

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor backend en modo desarrollo con recarga automática vía `nodemon`. |
| `npm start` | Inicia el servidor Express en modo producción. |
| `npm run build:css` | Compila y minifica los estilos de Tailwind CSS en `public/css/admin.css`. |
| `npm test` | Ejecuta la suite de 11 pruebas automatizadas de endpoints, seguridad y base de datos. |

---

## 🧪 Pruebas Automatizadas

El proyecto incluye un script de pruebas de extremo a extremo que valida:
- Salud del sistema y estado de conexión con Firebase.
- Algoritmo de estimación de costos por metro cuadrado.
- Validaciones estrictas de teléfono y datos obligatorios.
- Protección de endpoints con códigos 401 Unauthorized sin credenciales.
- Generación de token JWT, inicio y cierre de sesión.
- Operaciones CRUD de proyectos y leads del CRM.

Para correr las pruebas:
```bash
npm test
```

---

## 👥 Acceso al Panel de Administración

1. Inicia el servidor con `npm run dev`.
2. Ingresa en tu navegador a: `http://localhost:3000/login`
3. Credenciales predeterminadas (configurables en `.env`):
   - **Usuario / Correo:** `admin@obrablanca.com` o simplemente `admin`
   - **Contraseña:** `admin1234`
4. Al ingresar, accederás directamente a `http://localhost:3000/admin` con el tablero Kanban y el gestor de proyectos.
