const { getDb, isFirebaseConnected } = require('../config/firebase');
const fs = require('fs');
const path = require('path');

// Proyectos iniciales en memoria (fallback y datos por defecto)
const memoryProjects = [
    {
        id: 'default-transformacion-1',
        titulo: 'Apartamento Modelo 72m² - Sala y Luces Indirectas',
        categoria: 'Apartamento Completo',
        sector: 'El Poblado, Medellín',
        foto_antes: '/assets/images/obra_gris_before.jpg',
        foto_despues: '/assets/images/obra_blanca_after.jpg',
        descripcion: 'Transformación integral de obra gris con cielorraso en drywall, gargantas de luz LED cálida y piso en porcelanato de gran formato.',
        destacado_principal: true,
        orden: 1,
        activo: true,
        created_at: new Date('2026-03-01T10:00:00Z').toISOString(),
        updated_at: new Date('2026-03-01T10:00:00Z').toISOString()
    }
];

let memoryProjectId = 2;

/**
 * Inicializa y asegura que exista al menos una transformación destacada
 */
async function ensureDefaultProject() {
    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                const snapshot = await firestoreDb.collection('proyectos_transformaciones').limit(1).get();
                if (snapshot.empty) {
                    const defaultProj = {
                        titulo: 'Apartamento Modelo 72m² - Sala y Luces Indirectas',
                        categoria: 'Apartamento Completo',
                        sector: 'El Poblado, Medellín',
                        foto_antes: '/assets/images/obra_gris_before.jpg',
                        foto_despues: '/assets/images/obra_blanca_after.jpg',
                        descripcion: 'Transformación integral de obra gris con cielorraso en drywall, gargantas de luz LED cálida y piso en porcelanato de gran formato.',
                        destacado_principal: true,
                        orden: 1,
                        activo: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    await firestoreDb.collection('proyectos_transformaciones').add(defaultProj);
                }
            } catch (err) {
                console.warn('⚠️ Error al verificar proyecto inicial en Firestore:', err.message);
            }
        }
    }
}

// Ejecutar verificación inicial
ensureDefaultProject();

/**
 * Obtener todos los proyectos de Antes y Después para el panel de administración
 */
async function getAllProjects() {
    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                const snapshot = await firestoreDb.collection('proyectos_transformaciones')
                    .orderBy('orden', 'asc')
                    .get();

                if (snapshot.empty) {
                    return memoryProjects;
                }

                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (err) {
                console.warn('⚠️ Error al consultar proyectos en Firestore, usando fallback:', err.message);
            }
        }
    }

    return [...memoryProjects].sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

/**
 * Obtener proyectos activos para mostrar en la web pública
 */
async function getActiveProjects() {
    const all = await getAllProjects();
    return all.filter(p => p.activo !== false);
}

/**
 * Obtener el proyecto destacado actual para el slider principal
 */
async function getFeaturedProject() {
    const active = await getActiveProjects();
    if (active.length === 0) return null;
    const featured = active.find(p => p.destacado_principal === true);
    return featured || active[0];
}

/**
 * Crear un nuevo proyecto Antes y Después
 */
async function createProject(projectData) {
    const {
        titulo,
        categoria = 'Apartamento Completo',
        sector = 'Medellín / Área Metrop.',
        foto_antes,
        foto_despues,
        descripcion = '',
        destacado_principal = false,
        orden = 1,
        activo = true
    } = projectData;

    if (!titulo || !foto_antes || !foto_despues) {
        throw new Error('El título y ambas fotos (Antes y Después) son obligatorios.');
    }

    const isFeatured = destacado_principal === true || destacado_principal === 'true';

    // Si es destacado, quitar destacado a los demás
    if (isFeatured) {
        await unsetAllFeatured();
    }

    const newRecord = {
        titulo: titulo.trim(),
        categoria: categoria.trim(),
        sector: sector.trim(),
        foto_antes,
        foto_despues,
        descripcion: descripcion ? descripcion.trim() : '',
        destacado_principal: isFeatured,
        orden: parseInt(orden, 10) || 1,
        activo: activo !== false && activo !== 'false',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                const docRef = await firestoreDb.collection('proyectos_transformaciones').add(newRecord);
                return {
                    id: docRef.id,
                    ...newRecord
                };
            } catch (err) {
                console.error('⚠️ Error al guardar proyecto en Firestore:', err.message);
            }
        }
    }

    // Fallback memoria
    const memRecord = {
        id: `proj-${memoryProjectId++}`,
        ...newRecord
    };
    memoryProjects.unshift(memRecord);
    return memRecord;
}

/**
 * Actualizar un proyecto existente
 */
async function updateProject(id, projectData) {
    const isFeatured = projectData.destacado_principal === true || projectData.destacado_principal === 'true';

    if (isFeatured) {
        await unsetAllFeatured(id);
    }

    const updateFields = {
        updated_at: new Date().toISOString()
    };

    if (projectData.titulo !== undefined) updateFields.titulo = projectData.titulo.trim();
    if (projectData.categoria !== undefined) updateFields.categoria = projectData.categoria.trim();
    if (projectData.sector !== undefined) updateFields.sector = projectData.sector.trim();
    if (projectData.foto_antes !== undefined && projectData.foto_antes) updateFields.foto_antes = projectData.foto_antes;
    if (projectData.foto_despues !== undefined && projectData.foto_despues) updateFields.foto_despues = projectData.foto_despues;
    if (projectData.descripcion !== undefined) updateFields.descripcion = projectData.descripcion.trim();
    if (projectData.destacado_principal !== undefined) updateFields.destacado_principal = isFeatured;
    if (projectData.orden !== undefined) updateFields.orden = parseInt(projectData.orden, 10) || 1;
    if (projectData.activo !== undefined) updateFields.activo = projectData.activo !== false && projectData.activo !== 'false';

    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                await firestoreDb.collection('proyectos_transformaciones').doc(String(id)).update(updateFields);
                const updatedDoc = await firestoreDb.collection('proyectos_transformaciones').doc(String(id)).get();
                return {
                    id,
                    ...updatedDoc.data()
                };
            } catch (err) {
                console.error('⚠️ Error al actualizar proyecto en Firestore:', err.message);
            }
        }
    }

    // Fallback memoria
    const item = memoryProjects.find(p => String(p.id) === String(id));
    if (item) {
        Object.assign(item, updateFields);
        return item;
    }
    throw new Error('Proyecto no encontrado.');
}

/**
 * Marcar una transformación como el slider destacado principal de la página web
 */
async function setFeaturedProject(id) {
    await unsetAllFeatured(id);

    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                await firestoreDb.collection('proyectos_transformaciones').doc(String(id)).update({
                    destacado_principal: true,
                    updated_at: new Date().toISOString()
                });
                return true;
            } catch (err) {
                console.error('⚠️ Error al destacar proyecto en Firestore:', err.message);
            }
        }
    }

    const item = memoryProjects.find(p => String(p.id) === String(id));
    if (item) {
        item.destacado_principal = true;
        return true;
    }
    return false;
}

/**
 * Quita el atributo destacado a todos los demás proyectos
 */
async function unsetAllFeatured(exceptId = null) {
    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                const snapshot = await firestoreDb.collection('proyectos_transformaciones')
                    .where('destacado_principal', '==', true)
                    .get();

                const batch = firestoreDb.batch();
                snapshot.forEach(doc => {
                    if (doc.id !== String(exceptId)) {
                        batch.update(doc.ref, { destacado_principal: false });
                    }
                });
                await batch.commit();
            } catch (err) {
                console.warn('⚠️ Error al desmarcar destacados en Firestore:', err.message);
            }
        }
    }

    memoryProjects.forEach(p => {
        if (String(p.id) !== String(exceptId)) {
            p.destacado_principal = false;
        }
    });
}

/**
 * Eliminar un proyecto de transformación
 */
async function deleteProject(id) {
    let deletedProject = null;

    if (isFirebaseConnected()) {
        const firestoreDb = getDb();
        if (firestoreDb) {
            try {
                const docRef = firestoreDb.collection('proyectos_transformaciones').doc(String(id));
                const doc = await docRef.get();
                if (doc.exists) {
                    deletedProject = doc.data();
                    await docRef.delete();
                }
            } catch (err) {
                console.error('⚠️ Error al eliminar proyecto en Firestore:', err.message);
            }
        }
    }

    if (!deletedProject) {
        const idx = memoryProjects.findIndex(p => String(p.id) === String(id));
        if (idx !== -1) {
            deletedProject = memoryProjects[idx];
            memoryProjects.splice(idx, 1);
        }
    }

    // Si las fotos eran archivos subidos localmente a /uploads/, borrarlos para liberar espacio
    if (deletedProject) {
        cleanupUploadedFile(deletedProject.foto_antes);
        cleanupUploadedFile(deletedProject.foto_despues);
        return true;
    }

    return false;
}

function cleanupUploadedFile(fileUrl) {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) return;
    try {
        const fileName = path.basename(fileUrl);
        const filePath = path.join(__dirname, '../../public/uploads', fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (e) {
        console.warn('No se pudo borrar archivo:', e.message);
    }
}

module.exports = {
    getAllProjects,
    getActiveProjects,
    getFeaturedProject,
    createProject,
    updateProject,
    setFeaturedProject,
    deleteProject
};
