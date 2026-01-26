#!/bin/bash
# ==============================================
# FashionStore - Script de preparación para deploy
# ==============================================

echo "🚀 Preparando FashionStore para despliegue..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecuta este script desde el directorio del proyecto"
    exit 1
fi

# Limpiar builds anteriores
echo "🧹 Limpiando builds anteriores..."
rm -rf dist .astro

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci

# Ejecutar build
echo "🔨 Construyendo aplicación..."
npm run build

# Verificar que el build fue exitoso
if [ ! -d "dist" ]; then
    echo "❌ Error: El build falló"
    exit 1
fi

echo "✅ Build completado exitosamente!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Sube los cambios a tu repositorio Git"
echo "   2. En Coolify, crea una nueva aplicación"
echo "   3. Configura las variables de entorno"
echo "   4. Despliega!"
echo ""
echo "📖 Ver DEPLOY_COOLIFY.md para instrucciones detalladas"
