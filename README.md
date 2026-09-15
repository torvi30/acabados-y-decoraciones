# Máquina de Leads: Acabados y Decoraciones en Obra Blanca

Plataforma de captura de leads de alto rendimiento y mini-CRM para empresa de ingeniería en obra blanca y remodelaciones. Diseñada con enfoque **Mobile-First (80% tráfico)**, estética cinematográfica, video hero optimizado y embudo interactivo de cotización.

---

## Stack Tecnológico

- **Frontend:** HTML5 Semántico, CSS3 de alta fidelidad (Glassmorphism, Micro-animaciones, Mobile-Touch First) y JavaScript modular vanilla optimizado.
- **Backend:** Node.js con Express.
- **Base de Datos:** MySQL con consultas parametrizadas (`mysql2/promise`).
- **Seguridad:** Helmet, CORS, sanitización de inputs y validación estricta contra inyección SQL.
- **CRO & Analytics:** Atribución de tráfico con parámetros UTM (`utm_source`, `utm_medium`, `utm_campaign`) e integración instantánea con WhatsApp API.

---

## Estructura del Proyecto

```text
├── database/
│   └── schema.sql         # Script DDL de base de datos MySQL (mini-CRM)
├── server/
│   ├── config/            # Conexión a base de datos y pool de MySQL
│   ├── controllers/       # Lógica de negocio y validación de cotizaciones
│   ├── routes/            # Endpoints REST de la API
│   ├── services/          # Consultas parametrizadas y cálculos de presupuestos
│   └── server.js          # Punto de entrada de Express
├── public/                # Frontend (Landing page, slider, calculadora)
│   ├── css/
│   ├── js/
│   └── assets/
├── test/
│   └── api-test.js        # Pruebas automatizadas de la API
├── .env.example           # Variables de entorno de ejemplo
└── package.json
```

---

## Instalación y Ejecución

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   Copia el archivo `.env.example` a `.env` y configura tus credenciales de MySQL:
   ```bash
   cp .env.example .env
   ```

3. **Cargar la base de datos en MySQL:**
   ```bash
   mysql -u tu_usuario -p < database/schema.sql
   ```

4. **Ejecutar pruebas del backend:**
   ```bash
   npm test
   ```

5. **Iniciar en modo desarrollo:**
   ```bash
   npm run dev
   ```
