# FashionStore - E-commerce de Moda Premium

Tienda online de moda masculina premium construida con Astro 5.0, Supabase y Tailwind CSS.

## 🚀 Stack Tecnológico

- **Frontend**: Astro 5.0 (Híbrido SSG/SSR)
- **Estilos**: Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Estado del Carrito**: Nano Stores
- **Deploy**: Docker / Coolify

## 📋 Requisitos

- Node.js 20+
- npm o pnpm
- Cuenta de Supabase

## ⚡ Instalación

1. **Clonar e instalar dependencias:**
```bash
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
```

Editar `.env` con tus credenciales de Supabase:
```
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

3. **Configurar la base de datos:**

Ejecuta el SQL en `supabase/migrations/001_initial_schema.sql` en tu dashboard de Supabase.

4. **Crear un usuario admin:**

En Supabase Dashboard > Authentication > Users > Invite User

5. **Iniciar el servidor de desarrollo:**
```bash
npm run dev
```

Visita `http://localhost:4321`

## 🏗️ Estructura del Proyecto

```
src/
├── components/         # Componentes Astro y React
│   ├── islands/       # Componentes React interactivos
│   ├── product/       # Componentes de producto
│   └── ui/            # Componentes UI genéricos
├── layouts/           # Layouts (Public, Admin)
├── lib/               # Utilidades y cliente Supabase
├── pages/             # Rutas de la aplicación
│   ├── admin/         # Panel de administración
│   ├── api/           # Endpoints API
│   ├── categoria/     # Páginas de categoría
│   └── productos/     # Listado y detalle de productos
└── stores/            # Estado global (carrito)
```

## 🎯 Funcionalidades

### Tienda Pública
- ✅ Catálogo de productos con filtros
- ✅ Páginas de detalle de producto
- ✅ Carrito de compra persistente
- ✅ Sección de ofertas flash (toggleable)
- ✅ SEO optimizado

### Panel Admin
- ✅ Login con Supabase Auth
- ✅ Dashboard con estadísticas
- ✅ CRUD de productos
- ✅ Control de stock
- ✅ Toggle de ofertas flash

## 🐳 Despliegue con Docker

```bash
docker-compose up -d
```

## 📦 Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |
| `npm run astro check` | Verificar TypeScript |

## 🔒 Configuración de Supabase Storage

1. Crear bucket `products-images` (público)
2. Políticas RLS:
   - SELECT: Permitir a todos
   - INSERT/UPDATE/DELETE: Solo usuarios autenticados

## 📄 Licencia

MIT