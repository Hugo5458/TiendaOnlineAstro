# FashionStore - Propuesta Técnica de Arquitectura

## Documento de Propuesta Tecnológica

**Proyecto**: E-commerce de Moda "FashionStore"  
**Fecha**: Enero 2026  
**Rol**: Arquitecto de Software Senior & Desarrollador Full-Stack  

---

## 1. Stack Frontend - Justificación Tecnológica

### Opción Seleccionada: **Astro 5.0 (Modo Híbrido)**

#### ¿Por qué Astro?

**Astro** es la opción óptima para un e-commerce de moda por las siguientes razones:

1. **SEO Superior para Tienda Online**
   - Astro genera HTML estático (SSG) por defecto, lo que significa que Google indexa páginas completamente renderizadas.
   - Las URLs de productos (`/productos/camisa-oxford-azul`) se pre-generan como archivos `.html` en el build, asegurando ranking inmediato.
   - Comparativa:
     - **Next.js**: Requiere configuración adicional de ISR/SSG; más complejo para ecommerce.
     - **React puro**: SPA = problemas de indexación sin SSR; lentitud inicial.
     - **Vue**: Igual que React; no diseñado para contenido estático masivo.

2. **Rendimiento Extremo**
   - Zero JavaScript por defecto. Las páginas de catálogo pesan <5KB gzipped.
   - Lighthouse scores de 95-100.
   - Crítico para conversión: cada 100ms de latencia = pérdida de 1% de ventas.

3. **Modo Híbrido (SSG + SSR)**
   - **SSG**: `/productos`, `/categoria/[slug]` → estáticos, indexables, rápidísimos.
   - **SSR**: `/admin`, `/carrito`, `/checkout` → dinámicos, seguros, protegidos con middleware.
   - Astro lo hace sin configuración compleja.

4. **Integración con Islas Interactivas**
   - Componentes React (AddToCartButton, CartIcon) se hidratan solo donde se necesitan.
   - El resto de la página sigue siendo HTML puro → sin overhead de hidratación.

---

## 2. Arquitectura de Datos - Esquema Supabase

### Modelo Entidad-Relación

```
┌─────────────────┐
│   categories    │
├─────────────────┤
│ id (PK)         │
│ name            │
│ slug (UNIQUE)   │
│ description     │
│ image_url       │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │ (1:N)
         │
         ▼
┌─────────────────────┐
│     products        │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ slug (UNIQUE)       │
│ description         │
│ price (cents)       │
│ compare_at_price    │
│ stock (integer)     │
│ category_id (FK)    │
│ images (text[])     │
│ sizes (text[])      │
│ colors (text[])     │
│ is_featured         │
│ is_flash_offer      │
│ is_active           │
│ created_at          │
│ updated_at          │
└─────────────────────┘

┌──────────────────┐
│  site_settings   │
├──────────────────┤
│ id (PK)          │
│ key (UNIQUE)     │
│ value (JSONB)    │
│ description      │
│ updated_at       │
└──────────────────┘
  (Ej: key="show_flash_offers", value=true)

┌──────────────────┐
│     orders       │
├──────────────────┤
│ id (PK)          │
│ order_number     │
│ customer_email   │
│ customer_name    │
│ shipping_address │
│ total (cents)    │
│ status           │
│ payment_status   │
│ created_at       │
└──────────────────┘

┌──────────────────┐
│   order_items    │
├──────────────────┤
│ id (PK)          │
│ order_id (FK)    │
│ product_id (FK)  │
│ quantity         │
│ unit_price       │
│ total_price      │
└──────────────────┘
```

### Relaciones Clave

- **categories ← products**: 1:N. Un producto pertenece a una categoría.
- **orders ← order_items**: 1:N. Un pedido contiene múltiples ítems.
- **products ← order_items**: 1:N. Un producto puede estar en múltiples pedidos.

### Almacenamiento de Imágenes

**Enfoque**: Array de URLs en la tabla `products`.

```sql
images: text[] = ['https://bucket.supabase.co/products/prod-001-1.jpg', ...]
```

**Ventajas**:
- Simple de iterar en Astro (map sobre array).
- Storage Bucket de Supabase genera URLs públicas automáticamente.
- Escalable para futuros usos (CDN, watermarking).

---

## 3. Pasarela de Pago - Selección: **Stripe**

### Comparativa de Proveedores

| Aspecto | Stripe | PayPal | Redsys |
|--------|--------|--------|---------|
| **Comisión** | 2,4% + €0,30 | 2,9% + €0,30 | 0,85%-2,5% (barato) |
| **Documentación** | Excelente | Buena | Pobre |
| **Integración Dev** | API moderna, webhooks | REST API compleja | XML/SOAP obsoleto |
| **Modo Test** | Fácil | Fácil | Difícil |
| **Cobertura Global** | 135+ países | 190+ países | España + Europa |
| **Soporte a Desarrolladores** | 24/7, comunidad activa | 24/7 | Limitado |
| **Recomendación** | ✅ **Seleccionado** | ❌ Overkill | ❌ Outdated |

**Decisión**: **Stripe**

**Razones**:
1. La mejor relación documentación/integración para Astro + Node.js.
2. Webhooks nativos para sincronizar estado de pedidos.
3. Entorno de prueba robusto (tarjetas de test).
4. SDK oficial para Node.js (`stripe` npm package).

**Integración prevista**:
```
Cliente → Astro (/api/checkout) → Stripe API → Webhook (/api/webhooks) → Supabase (update order)
```

---

## 4. Lógica del "Interruptor" (Flash Offers Toggle)

### Cómo Funciona

1. **Almacenamiento en BD**:
   ```sql
   INSERT INTO site_settings (key, value) VALUES 
   ('show_flash_offers', true);
   ```

2. **Admin Panel**:
   - Ruta `/admin/configuracion`
   - UI con toggle switch (Astro + React island)
   - Al cambiar: `PATCH /api/settings/flash-offers`
   - Backend actualiza `site_settings`

3. **Frontend Public**:
   - En build-time (SSG): Lee `site_settings` durante generación.
   - En runtime (SSR): Caché con TTL corto (30s).
   - Sección renderiza o no según valor.

4. **Propagación al Instante**:
   - Webhooks opcionales o polling cada 30s desde cliente.
   - Para MVP: reload manual o cache invalidation en admin.

---

## 5. Recomendaciones Adicionales

### Seguridad
- **RLS en Supabase**: Solo admins autenticados pueden editar productos.
- **Middleware**: Rutas `/admin/*` protegidas con `auth.middleware.ts`.

### Escalabilidad
- Stock como transacción ACID: `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`
- Índices en `category_id`, `slug`, `is_flash_offer`.

### Despliegue
- Docker + Node.js adapter en Coolify.
- Variables de entorno en `.env.local` (Supabase keys, Stripe keys).

---

**Fin del Documento de Arquitectura**
