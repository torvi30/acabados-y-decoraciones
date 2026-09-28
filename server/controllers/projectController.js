const projectService = require('../services/projectService');

/**
 * Obtener proyectos (público o admin)
 */
async function getProjects(req, res) {
    try {
        const isAdmin = req.query.all === 'true' || req.user;
        const projects = isAdmin 
            ? await projectService.getAllProjects() 
            : await projectService.getActiveProjects();

        res.json({
            success: true,
            count: projects.length,
            data: projects
        });
    } catch (error) {
        console.error('Error al listar proyectos:', error);
        res.status(500).json({ success: false, error: 'Error al obtener proyectos.' });
    }
}

/**
 * Obtener la transformación destacada para el comparador de la página web
 */
async function getFeatured(req, res) {
    try {
        const featured = await projectService.getFeaturedProject();
        res.json({
            success: true,
            data: featured
        });
    } catch (error) {
        console.error('Error al obtener transformación destacada:', error);
        res.status(500).json({ success: false, error: 'Error al obtener transformación destacada.' });
    }
}

/**
 * Crear un nuevo proyecto con fotos de Antes y Después
 */
async function create(req, res) {
    try {
        const { titulo, categoria, sector, descripcion, destacado_principal, orden, activo } = req.body;

        // Rutas de fotos subidas
        let foto_antes = req.body.foto_antes;
        let foto_despues = req.body.foto_despues;

        if (req.files) {
            if (req.files.foto_antes && req.files.foto_antes[0]) {
                foto_antes = `/uploads/${req.files.foto_antes[0].filename}`;
            }
            if (req.files.foto_despues && req.files.foto_despues[0]) {
                foto_despues = `/uploads/${req.files.foto_despues[0].filename}`;
            }
        }

        if (!titulo || !titulo.trim()) {
            return res.status(400).json({ success: false, error: 'El título de la obra es requerido.' });
        }

        if (!foto_antes) {
            return res.status(400).json({ success: false, error: 'Debes subir o seleccionar la foto de Antes (Obra Gris).' });
        }

        if (!foto_despues) {
            return res.status(400).json({ success: false, error: 'Debes subir o seleccionar la foto de Después (Acabado Final).' });
        }

        const project = await projectService.createProject({
            titulo,
            categoria,
            sector,
            foto_antes,
            foto_despues,
            descripcion,
            destacado_principal,
            orden,
            activo
        });

        res.status(201).json({
            success: true,
            message: '¡Proyecto de transformación creado con éxito!',
            data: project
        });
    } catch (error) {
        console.error('Error al crear proyecto:', error);
        res.status(400).json({ success: false, error: error.message || 'Error al crear proyecto.' });
    }
}

/**
 * Editar un proyecto existente y/o cambiar fotos
 */
async function update(req, res) {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (req.files) {
            if (req.files.foto_antes && req.files.foto_antes[0]) {
                updateData.foto_antes = `/uploads/${req.files.foto_antes[0].filename}`;
            }
            if (req.files.foto_despues && req.files.foto_despues[0]) {
                updateData.foto_despues = `/uploads/${req.files.foto_despues[0].filename}`;
            }
        }

        const updated = await projectService.updateProject(id, updateData);

        res.json({
            success: true,
            message: '¡Proyecto actualizado correctamente!',
            data: updated
        });
    } catch (error) {
        console.error('Error al actualizar proyecto:', error);
        res.status(400).json({ success: false, error: error.message || 'Error al actualizar proyecto.' });
    }
}

/**
 * Destacar un proyecto en el comparador de la web pública
 */
async function setFeatured(req, res) {
    try {
        const { id } = req.params;
        await projectService.setFeaturedProject(id);
        res.json({
            success: true,
            message: '¡Proyecto marcado como destacado en el comparador web!'
        });
    } catch (error) {
        console.error('Error al destacar proyecto:', error);
        res.status(400).json({ success: false, error: 'No se pudo destacar el proyecto.' });
    }
}

/**
 * Eliminar un proyecto
 */
async function deleteProj(req, res) {
    try {
        const { id } = req.params;
        const success = await projectService.deleteProject(id);
        if (success) {
            res.json({ success: true, message: 'Proyecto eliminado correctamente.' });
        } else {
            res.status(404).json({ success: false, error: 'Proyecto no encontrado.' });
        }
    } catch (error) {
        console.error('Error al eliminar proyecto:', error);
        res.status(500).json({ success: false, error: 'Error al eliminar proyecto.' });
    }
}

/**
 * Subir una imagen individual
 */
async function uploadImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No se envió ningún archivo de imagen.' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            success: true,
            message: 'Imagen subida con éxito',
            url: fileUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Error al subir imagen:', error);
        res.status(500).json({ success: false, error: 'Error al procesar la subida.' });
    }
}

module.exports = {
    getProjects,
    getFeatured,
    create,
    update,
    setFeatured,
    deleteProj,
    uploadImage
};
