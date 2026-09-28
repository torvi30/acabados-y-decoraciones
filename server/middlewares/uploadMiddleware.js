const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que el directorio de subidas exista
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento en disco
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, ext)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-');
        cb(null, `obra-${baseName}-${uniqueSuffix}${ext}`);
    }
});

// Filtro de tipos de imagen permitidos
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes en formato JPG, PNG o WEBP.'), false);
    }
};

// Instancia de Multer configurada
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15 MB máximo por foto
    }
});

// Middleware para subir las fotos de Antes y Después en una sola petición
const uploadProjectImages = upload.fields([
    { name: 'foto_antes', maxCount: 1 },
    { name: 'foto_despues', maxCount: 1 }
]);

const uploadSingle = upload.single('imagen');

module.exports = {
    upload,
    uploadProjectImages,
    uploadSingle
};
