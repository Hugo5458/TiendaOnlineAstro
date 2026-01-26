# 🚀 Guía de Despliegue en Coolify

## FashionStore - E-commerce de Moda Premium

Esta guía te ayudará a desplegar FashionStore en tu servidor Coolify.

---

## 📋 Requisitos Previos

1. **Servidor Coolify** funcionando (v4.x recomendado)
2. **Repositorio Git** con el código (GitHub, GitLab, etc.)
3. **Cuenta de Supabase** con proyecto configurado
4. **Cuenta de Stripe** con claves de API

---

## 🔧 Paso 1: Preparar el Repositorio

### Subir a GitHub/GitLab

```bash
# Desde el directorio del proyecto
cd TrabajoTiendaOnlineAstro

# Inicializar git (si no existe)
git init

# Añadir archivos
git add .

# Commit inicial
git commit -m "Preparar para Coolify"

# Añadir remote y push
git remote add origin https://github.com/tu-usuario/fashionstore.git
git push -u origin main
```

---

## 🐳 Paso 2: Configurar en Coolify

### 2.1 Crear Nueva Aplicación

1. Accede a tu panel de Coolify
2. Haz clic en **"+ Add New Resource"**
3. Selecciona **"Application"**
4. Elige tu servidor de destino

### 2.2 Conectar Repositorio

1. Selecciona **"GitHub"** (o tu proveedor)
2. Autoriza Coolify si es necesario
3. Selecciona el repositorio `fashionstore`
4. Branch: `main`

### 2.3 Configuración del Build

| Campo | Valor |
|-------|-------|
| Build Pack | **Dockerfile** |
| Dockerfile Location | `./Dockerfile` |
| Base Directory | `/` |
| Publish Directory | (dejar vacío) |

### 2.4 Configuración de Red

| Campo | Valor |
|-------|-------|
| Port Expuesto | `4321` |
| Dominio | `tu-dominio.com` |
| HTTPS | ✅ Habilitado |

---

## 🔐 Paso 3: Variables de Entorno

En Coolify, ve a la pestaña **"Environment Variables"** y añade:

### Variables Públicas (Build-time)

```env
PUBLIC_SUPABASE_URL=https://kllsprhtysxukblqfmgr.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_tu-clave-aqui
PUBLIC_SITE_URL=https://tu-dominio.com
```

### Variables Secretas (Runtime)

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_SECRET_KEY=sk_live_tu-clave-secreta
STRIPE_WEBHOOK_SECRET=whsec_tu-secreto-webhook
```

⚠️ **IMPORTANTE**: Marca las variables secretas como "Secret" en Coolify.

---

## 🔄 Paso 4: Build Arguments

Para que las variables PUBLIC_* estén disponibles durante el build, añádelas también como **Build Arguments**:

1. Ve a **Settings > Build**
2. En "Docker Build Arguments" añade:

```
PUBLIC_SUPABASE_URL=https://kllsprhtysxukblqfmgr.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-clave
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
PUBLIC_SITE_URL=https://tu-dominio.com
```

---

## ▶️ Paso 5: Desplegar

1. Haz clic en **"Deploy"**
2. Espera a que el build termine (~2-5 minutos)
3. Verifica los logs para errores
4. Accede a tu dominio

---

## 🔗 Paso 6: Configurar Stripe Webhook

Después del despliegue, configura el webhook de Stripe:

1. Ve a [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Añade nuevo endpoint:
   - **URL**: `https://tu-dominio.com/api/webhook`
   - **Eventos**:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
3. Copia el **Signing Secret** y añádelo a las variables de Coolify:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```
4. Redespliega la aplicación

---

## ✅ Verificación

Comprueba que todo funciona:

- [ ] La página principal carga correctamente
- [ ] Los productos se muestran desde Supabase
- [ ] El carrito funciona
- [ ] El checkout redirige a Stripe
- [ ] Los webhooks se procesan (ver logs)

---

## 🔍 Troubleshooting

### Error: "Invalid API Key" (Supabase)
- Verifica que `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` sean correctos
- Asegúrate de que estén como Build Arguments

### Error: "Failed to fetch products"
- El RLS (Row Level Security) de Supabase puede estar bloqueando
- Verifica las políticas de la tabla `products`

### Error en Stripe Checkout
- Verifica que `STRIPE_SECRET_KEY` sea correcto
- Comprueba que `PUBLIC_SITE_URL` tenga HTTPS

### El container no inicia
```bash
# Ver logs en Coolify o con Docker
docker logs fashionstore
```

---

## 📦 Comandos Útiles

```bash
# Build local para probar
docker build -t fashionstore .

# Ejecutar localmente
docker run -p 4321:4321 --env-file .env fashionstore

# Ver logs
docker logs -f fashionstore
```

---

## 🔄 Redeploys Automáticos

Para habilitar deploys automáticos cuando haces push:

1. En Coolify, ve a **Settings > General**
2. Activa **"Auto Deploy"**
3. Configura el webhook en tu repositorio GitHub

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs de Coolify
2. Verifica las variables de entorno
3. Comprueba la conectividad con Supabase y Stripe

---

*Última actualización: Enero 2026*
