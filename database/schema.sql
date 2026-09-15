-- ==========================================================
-- SCHEMA: Base de Datos para Embudo y Mini-CRM de Obra Blanca
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `obra_blanca_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `obra_blanca_db`;

-- Tabla principal de leads y cotizaciones (Mini-CRM)
CREATE TABLE IF NOT EXISTS `leads_cotizaciones` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- Datos de Contacto (Prioridad WhatsApp / Llamadas en Móvil)
    `nombre_completo` VARCHAR(150) NOT NULL,
    `telefono` VARCHAR(30) NOT NULL,
    `email` VARCHAR(150) NULL,
    `ciudad_zona` VARCHAR(100) NOT NULL DEFAULT 'Área Metropolitana',
    
    -- Parámetros de la Obra / Cotización
    `tipo_inmueble` ENUM('apartamento', 'casa', 'oficina_comercial', 'otro') NOT NULL DEFAULT 'apartamento',
    `estado_actual_obra` ENUM('obra_gris', 'obra_negra', 'remodelacion_habitada', 'remodelacion_desocupada') NOT NULL DEFAULT 'obra_gris',
    `tipo_servicio` ENUM(
        'obra_blanca_completa',
        'estuco_y_pintura',
        'cielo_raso_drywall',
        'enchapes_y_pisos',
        'carpinteria_y_acabados',
        'otro'
    ) NOT NULL DEFAULT 'obra_blanca_completa',
    `area_m2_estimada` DECIMAL(8, 2) NULL COMMENT 'Metros cuadrados aproximados indicados por el cliente',
    `presupuesto_estimado` DECIMAL(12, 2) NULL COMMENT 'Cálculo preliminar generado por el cotizador en COP/USD',
    `detalles_adicionales` TEXT NULL,
    
    -- Tracking & Marketing (CRO, Attribution & Analytics)
    `origen_lead` VARCHAR(50) NOT NULL DEFAULT 'web_funnel',
    `utm_source` VARCHAR(100) NULL COMMENT 'Ej: facebook, instagram, tiktok, google, bio_link',
    `utm_medium` VARCHAR(100) NULL COMMENT 'Ej: cpc, organic, qr_volante',
    `utm_campaign` VARCHAR(100) NULL COMMENT 'Campaña publicitaria específica',
    
    -- Gestión de Ventas / Mini-CRM
    `estado_lead` ENUM(
        'nuevo',
        'contactado',
        'visita_tecnica_agendada',
        'cotizacion_enviada',
        'ganado_en_obra',
        'perdido'
    ) NOT NULL DEFAULT 'nuevo',
    `notas_seguimiento` TEXT NULL,
    
    -- Marcas de tiempo
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices para búsquedas optimizadas
    INDEX `idx_telefono` (`telefono`),
    INDEX `idx_estado_lead` (`estado_lead`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
