/**
 * Script de prueba automatizada para la API de Cotizaciones y Seguridad Auth
 */
const http = require('http');
const app = require('../server/server');

const TEST_PORT = 3099;
let server;

function request(method, path, body = null, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: '127.0.0.1',
            port: TEST_PORT,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
                ...extraHeaders
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Iniciando pruebas de endpoints del Backend & Autenticación...\n');

    server = app.listen(TEST_PORT, async () => {
        try {
            // 1. Health check
            console.log('1️⃣ Probando GET /api/health ...');
            const health = await request('GET', '/api/health');
            console.log(`   Status: ${health.status} | Data:`, health.body);
            if (health.status !== 200) throw new Error('Health check falló');

            // 2. Estimate check (Público)
            console.log('\n2️⃣ Probando GET /api/leads/estimate?tipo_servicio=obra_blanca_completa&area_m2=65 ...');
            const estimate = await request('GET', '/api/leads/estimate?tipo_servicio=obra_blanca_completa&area_m2=65');
            console.log(`   Status: ${estimate.status} | Presupuesto estimado:`, estimate.body.presupuesto_estimado);
            if (estimate.status !== 200 || !estimate.body.presupuesto_estimado) throw new Error('Cálculo de presupuesto falló');

            // 3. Post lead (Validación de error de teléfono vacío - Público)
            console.log('\n3️⃣ Probando validación: POST /api/leads con teléfono inválido...');
            const invalidLead = await request('POST', '/api/leads', {
                nombre_completo: 'Carlos Perez',
                telefono: '123'
            });
            console.log(`   Status esperado 400: ${invalidLead.status} | Mensaje:`, invalidLead.body.error);
            if (invalidLead.status !== 400) throw new Error('Validación de teléfono falló');

            // 4. Post lead (Caso de éxito completo - Público)
            console.log('\n4️⃣ Probando POST /api/leads con datos completos (Cliente web)...');
            const validLead = await request('POST', '/api/leads', {
                nombre_completo: 'Mariana Gómez',
                telefono: '3124567890',
                email: 'mariana@example.com',
                ciudad_zona: 'Poblado, Medellín',
                tipo_inmueble: 'apartamento',
                estado_actual_obra: 'obra_gris',
                tipo_servicio: 'obra_blanca_completa',
                area_m2_estimada: 72,
                detalles_adicionales: 'Quiero drywall con luz led indirecta en la sala y piso laminado',
                utm_source: 'instagram',
                utm_campaign: 'remodelaciones_marzo'
            });
            console.log(`   Status: ${validLead.status} | Respuesta:`, validLead.body);
            if (validLead.status !== 201 || !validLead.body.data.whatsapp_url) throw new Error('Inserción de lead falló');

            // 5. Prueba de Seguridad: Intentar listar leads sin autenticación
            console.log('\n5️⃣ Probando seguridad: GET /api/leads sin token (Debe rechazar 401)...');
            const unauthList = await request('GET', '/api/leads');
            console.log(`   Status esperado 401: ${unauthList.status} | Mensaje:`, unauthList.body.error);
            if (unauthList.status !== 401) throw new Error('Fallo de seguridad: la ruta no está protegida');

            // 6. Prueba de Login con credenciales incorrectas
            console.log('\n6️⃣ Probando POST /api/auth/login con credenciales erróneas...');
            const badLogin = await request('POST', '/api/auth/login', {
                email: 'hacker@internet.com',
                password: 'wrongpassword'
            });
            console.log(`   Status esperado 401: ${badLogin.status} | Mensaje:`, badLogin.body.error);
            if (badLogin.status !== 401) throw new Error('Fallo de seguridad en login');

            // 7. Prueba de Login exitoso de Administrador
            console.log('\n7️⃣ Probando POST /api/auth/login con credenciales válidas...');
            const login = await request('POST', '/api/auth/login', {
                email: 'admin@obrablanca.com',
                password: 'admin1234'
            });
            console.log(`   Status: ${login.status} | Usuario:`, login.body.user);
            if (login.status !== 200 || !login.body.token) throw new Error('Autenticación de administrador falló');
            const adminToken = login.body.token;

            // 8. Prueba de Acceso al Mini-CRM con token autorizado
            console.log('\n8️⃣ Probando GET /api/leads con Token JWT de Administrador...');
            const authList = await request('GET', '/api/leads', null, {
                'Authorization': `Bearer ${adminToken}`
            });
            console.log(`   Status: ${authList.status} | Total leads en CRM:`, authList.body.count);
            if (authList.status !== 200 || !Array.isArray(authList.body.data)) throw new Error('Consulta de leads autorizada falló');

            // 9. Prueba de Logout
            console.log('\n9️⃣ Probando POST /api/auth/logout...');
            const logout = await request('POST', '/api/auth/logout');
            console.log(`   Status: ${logout.status} | Mensaje:`, logout.body.message);
            if (logout.status !== 200) throw new Error('Logout falló');

            console.log('\n✅ ¡TODAS LAS PRUEBAS DE SEGURIDAD Y ENDPOINTS PASARON AL 100%!\n');
        } catch (error) {
            console.error('\n❌ Error durante las pruebas:', error.message);
            process.exitCode = 1;
        } finally {
            server.close(() => {
                console.log('Servidor de prueba cerrado.');
            });
        }
    });
}

runTests();
