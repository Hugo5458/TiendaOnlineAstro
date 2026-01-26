# FashionStore - Guía de Implementación

## Estructura de Carpetas Confirmada

```
fashionstore/
├── public/
│   └── fonts/                    # Custom brand fonts
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.astro      # Reusable button component
│   │   │   └── CartSlideOver.astro # Cart sidebar panel
│   │   ├── product/
│   │   │   ├── ProductCard.astro # Product card for listings
│   │   │   └── ProductGallery.astro # Product image gallery
│   │   └── islands/              # Interactive React components
│   │       ├── AddToCartButton.tsx # Add to cart button (hydrated)
│   │       └── CartIcon.tsx       # Cart icon with badge
│   ├── layouts/
│   │   ├── BaseLayout.astro      # Base HTML shell
│   │   ├── PublicLayout.astro    # Storefront layout
│   │   └── AdminLayout.astro     # Admin panel layout
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client & functions
│   │   └── utils.ts              # Helper utilities
│   ├── pages/
│   │   ├── index.astro           # Homepage (SSG)
│   │   ├── productos/
│   │   │   ├── index.astro       # Product listing (SSG)
│   │   │   └── [slug].astro      # Product detail (SSG)
│   │   ├── categoria/
│   │   │   └── [slug].astro      # Category filter (SSG)
│   │   ├── carrito.astro         # Cart page (SSR)
│   │   ├── checkout.astro        # Checkout page (SSR)
│   │   └── admin/
│   │       ├── index.astro       # Dashboard (SSR)
│   │       ├── login.astro       # Admin login (SSR)
│   │       ├── configuracion.astro # Settings toggle (SSR)
│   │       └── productos/
│   │           ├── index.astro   # Product management (SSR)
│   │           ├── nuevo.astro   # New product form (SSR)
│   │           └── [id].astro    # Edit product (SSR)
│   ├── stores/
│   │   └── cart.ts               # Nano Stores cart state
│   ├── middleware.ts             # Auth & routing middleware
│   └── env.d.ts                  # TypeScript env types
├── supabase/
│   └── migrations/
│       └── 001_complete_schema.sql # DB schema
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── .env.local (git-ignored)
└── README.md
```

---

## Hitos de Entrega

### Hito 1: Arquitectura (20% - COMPLETADO)
- ✅ Documento `ARQUITECTURA_FASHIONSTORE.md` con justificación del stack
- ✅ Esquema SQL en `supabase/migrations/001_complete_schema.sql`
- ✅ Guía de Storage en `STORAGE_SETUP.md`
- ✅ Diagrama ER de la base de datos

**Entregables**: Documentación técnica + SQL schema

---

### Hito 2: Prototipo Funcional (60%)

#### A. Base de Datos Conectada
- [ ] Ejecutar SQL schema en Supabase
- [ ] Verificar tablas creadas: `categories`, `products`, `orders`, `site_settings`
- [ ] Insertar datos de prueba (6 categorías, 10 productos)
- [ ] Crear bucket `products-images` en Storage

#### B. Autenticación Admin
- [ ] Implementar `/admin/login` con Supabase Auth
- [ ] Crear usuario admin de prueba
- [ ] Middleware de protección en `/admin`
- [ ] JWT validation en cookies

#### C. Visualización de Productos
- [ ] `/productos` página SSG con listado desde Supabase
- [ ] `/productos/[slug]` página individual
- [ ] `/categoria/[slug]` filtrado por categoría
- [ ] ProductCard y ProductGallery renders

#### D. Carrito Funcional
- [ ] Nano Stores implementado y persistente
- [ ] AddToCartButton isla React integrada
- [ ] CartIcon con contador
- [ ] `/carrito` página SSR mostrando items

**Requisito**: `npm run build` sin errores

---

### Hito 3: Tienda Viva (100%)

#### A. Panel de Administración Completo
- [ ] `/admin/productos` CRUD (crear, leer, actualizar, borrar)
- [ ] Formulario de "Nuevo Producto" con:
  - [ ] Upload de múltiples imágenes (drag & drop)
  - [ ] Campos: nombre, descripción, precio, stock, categoría, tallas, colores
  - [ ] Guardar en Supabase + Storage
- [ ] Listado de productos editable
- [ ] `/admin/configuracion` con toggle de "Ofertas Flash"

#### B. Lógica de Stock
- [ ] Al crear pedido: restar stock automáticamente
- [ ] Validación: no vender si stock = 0
- [ ] Transacción ACID en Supabase para evitar oversell

#### C. Pasarela Stripe (Opcional para MVP)
- [ ] `/api/checkout` endpoint que crea intent de pago
- [ ] Webhook `/api/webhooks` que actualiza estado de pedido
- [ ] Modo test (no dinero real)

#### D. Interruptor "Ofertas Flash"
- [ ] BD: tabla `site_settings` con key `show_flash_offers`
- [ ] Admin: toggle en `/admin/configuracion`
- [ ] Frontend: sección aparece/desaparece según valor
- [ ] Propagación: caché de 30s o revalidación manual

#### E. Despliegue en Coolify
- [ ] Docker: `Dockerfile` con Node.js adapter
- [ ] Env vars: SUPABASE_URL, SUPABASE_KEY, STRIPE_KEY (si aplica)
- [ ] Build: `npm run build` genera `/dist`
- [ ] Test URL pública: Comprar (test) y verificar stock decrementa

---

## Usando Nano Stores en Componentes

### Ejemplo 1: Leer el carrito en Astro (SSR page)

```astro
---
// src/pages/carrito.astro
import { cartItems, cartSubtotal } from '../stores/cart';

// Note: Nano Stores works in both SSG and SSR contexts
const items = cartItems.get();
const subtotal = cartSubtotal.get();
---

<PublicLayout title="Mi Carrito">
  {items.length === 0 ? (
    <p>Carrito vacío</p>
  ) : (
    <div>
      {items.map(item => (
        <div class="flex justify-between">
          <span>{item.name}</span>
          <span>${(item.price * item.quantity / 100).toFixed(2)}</span>
        </div>
      ))}
      <h3>Total: €{(subtotal / 100).toFixed(2)}</h3>
    </div>
  )}
</PublicLayout>
```

### Ejemplo 2: Usar AddToCartButton en una página

```astro
---
// src/pages/productos/[slug].astro
import { getProductBySlug } from '../lib/supabase';
import AddToCartButton from '../components/islands/AddToCartButton';

const { slug } = Astro.params;
const product = await getProductBySlug(slug);
---

<PublicLayout title={product.name}>
  <ProductGallery images={product.images} />
  
  <div>
    <h1>{product.name}</h1>
    <p>{product.description}</p>
    <p class="text-2xl font-bold">€{(product.price / 100).toFixed(2)}</p>
    
    <!-- This island is hydrated only here -->
    <AddToCartButton client:load product={product} />
  </div>
</PublicLayout>
```

El `client:load` es directiva de Astro que dice "renderiza esta isla inmediatamente". Otras opciones:
- `client:idle` - cuando el navegador está inactivo
- `client:visible` - cuando se ve en pantalla
- `client:media="(max-width: 768px)"` - solo en mobile

---

## Configuración Requerida

### .env.local

```env
# Supabase
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (opcional para MVP)
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Node environment
NODE_ENV=production
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "deploy": "npm run build && docker build -t fashionstore . && ..."
  }
}
```

---

## Resumen de Tecnologías

| Aspecto | Tecnología | Razón |
|--------|-----------|-------|
| **Frontend** | Astro 5.0 (Hybrid) | SSG para SEO + SSR para admin |
| **Estilos** | Tailwind CSS | Utility-first, rápido |
| **Estado** | Nano Stores | Simple, sin boilerplate |
| **Backend** | Supabase | Auth + DB + Storage integrados |
| **Pagos** | Stripe | Best-in-class API |
| **Deploy** | Docker + Node.js adapter | Compatible con Coolify |

---

## Próximos Pasos

1. **Ejecutar SQL schema** en Supabase Dashboard
2. **Crear bucket** `products-images` en Storage
3. **Implementar `/admin/login`** con Supabase Auth
4. **Crear `/admin/productos`** CRUD form
5. **Listar productos** en `/productos` desde BD
6. **Integrar Stripe** para checkout real
7. **Desplegar en Coolify**

---

**Fin de la Guía de Implementación**
