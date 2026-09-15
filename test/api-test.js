/**
 * Script de prueba automatizada para la API de Cotizaciones
 */
const http = require('http');
const app = require('../server/server');

const TEST_PORT = 3099;
let server;

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: '127.0.0.1',
            port: TEST_PORT,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
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
    console.log('🧪 Iniciando pruebas de endpoints del Backend...\n');

    server = app.listen(TEST_PORT, async () => {
        try {
            // 1. Health check
            console.log('1️⃣ Probando GET /api/health ...');
            const health = await request('GET', '/api/health');
            console.log(`   Status: ${health.status} | Data:`, health.body);
            if (health.status !== 200) throw new Error('Health check falló');

            // 2. Estimate check
            console.log('\n2️⃣ Probando GET /api/leads/estimate?tipo_servicio=obra_blanca_completa&area_m2=65 ...');
            const estimate = await request('GET', '/api/leads/estimate?tipo_servicio=obra_blanca_completa&area_m2=65');
            console.log(`   Status: ${estimate.status} | Presupuesto estimado:`, estimate.body.presupuesto_estimado);
            if (estimate.status !== 200 || !estimate.body.presupuesto_estimado) throw new Error('Cálculo de presupuesto falló');

            // 3. Post lead (Validación de error de teléfono vacío)
            console.log('\n3️⃣ Probando validación: POST /api/leads con teléfono inválido...');
            const invalidLead = await request('POST', '/api/leads', {
                nombre_completo: 'Carlos Perez',
                telefono: '123'
            });
            console.log(`   Status esperado 400: ${invalidLead.status} | Mensaje:`, invalidLead.body.error);
            if (invalidLead.status !== 400) throw new Error('Validación de teléfono falló');

            // 4. Post lead (Caso de éxito completo)
            console.log('\n4️⃣ Probando POST /api/leads con datos completos...');
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
            console.log('   🔗 URL de WhatsApp generada:', validLead.body.data.whatsapp_url);

            // 5. List leads (Mini-CRM)
            console.log('\n5️⃣ Probando GET /api/leads (Mini-CRM)...');
            const list = await request('GET', '/api/leads');
            console.log(`   Status: ${list.status} | Total leads:`, list.body.count);
            if (list.status !== 200 || list.body.count === 0) throw new Error('Listado de leads falló');

            console.log('\n✅ ¡TODAS LAS PRUEBAS DEL BACKEND PASARON SATISFACTORIAMENTE!\n');
        } catch (error) {
            console.error('\n❌ Error durante las pruebas:', error.message);
            process.exitCode = 1;
        } finally {
            server.close(() => {
                console.log('Servidor de prueba cerrado.');
                process.exit(process.exitCode || 0);
            });
        }
    });
}

runTests();
