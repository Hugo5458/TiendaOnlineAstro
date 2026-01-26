# Progreso del proyecto (Tienda + Usuarios + Admin)

## Contexto
Proyecto de tienda online con:
- Astro (SSR en secciones del admin)
- Supabase (Auth + DB)
- Stripe (checkout + webhook)
- TailwindCSS

Objetivo: tienda funcional + área de usuario + panel de administración completo, robusto y con buen UX.

---

## Implementado (hecho)

### Autenticación / Login
- Botones de "Continuar con Google" corregidos y robustos.
- Callback OAuth funcionando con PKCE.
- Redirección tras login a `/admin`.
- Flujo de completar perfil redirige a `/admin` tras finalizar.

### Tienda pública (navegación y catálogo)
- Home `/`.
- Listados por categoría `/categoria/[slug]`.
- Ficha de producto `/productos/[slug]`.

### Carrito y compra
- Carrito `/carrito`.
- Checkout Stripe vía API `/api/checkout`.
- Webhook Stripe `/api/webhook` para procesar pedidos.

### Pedidos (usuario)
- Página de éxito `/pedido/exito`.
- Página de detalle `/pedido/[id]`.

### Cuenta de usuario
- Página de cuenta `/cuenta` (perfil, datos personales y dirección de envío).
- Logout de cliente vía `POST /api/auth/customer-logout`.

### Admin: estructura y navegación
- `AdminLayout` con comprobación de sesión mediante cookies (`sb-access-token`) + validación de usuario.
- Nuevas secciones para evitar 404:
  - Categorías
  - Pedidos
  - Configuración
- Enlace del admin cambiado de "Ver tienda" a "Volver a mi cuenta" (`/cuenta`).

### Logout (Admin)
- `/api/auth/logout` redirige a `/login` (login principal con Google).
- Prevención de volver atrás viendo admin cacheado (BFCache):
  - `Cache-Control: no-store` en páginas admin.
  - `pageshow` con recarga cuando `event.persisted`.

### Categorías (Admin CRUD)
- `/admin/categorias` listado con búsqueda, editar y borrar.
- `/admin/categorias/nuevo` crear categoría.
- `/admin/categorias/[id]` editar categoría.
- API: `DELETE /api/categories/[id]`.

### Pedidos (Admin)
- `/admin/pedidos` listado con búsqueda y filtro por estado.
- `/admin/pedidos/[id]` detalle del pedido:
  - visualización de items (`order_items`)
  - actualización de `status` y `notes`.

### Configuración (Admin)
- `/admin/configuracion` creado.
- Toggle de ofertas flash conectado a `POST /api/settings/flash-offers`.

### Validación
- `npx astro check` y `npm run build` pasan sin errores en los cambios realizados.

---

## Pendiente (por implementar) — PRIORIDAD ALTA

### 1) Rediseño de la tienda (muy importante)
- Mejorar diseño/UX de:
  - home, fichas de producto, categorías.
  - carrito y checkout.
- Mejorar estados vacíos, mensajes de error, y microcopy.
- Mejorar performance percibida:
  - skeletons, placeholders, imágenes, loading.

### 2) Área de usuario (muy importante)
- Implementar páginas enlazadas desde `/cuenta`:
  - `/cuenta/pedidos` (listado de pedidos del usuario).
  - `/cuenta/direcciones` (gestión de direcciones).
- Mejorar seguridad y consistencia de sesión:
  - evitar UI basada solo en `localStorage`.
- Mejorar UX:
  - edición de perfil con validaciones, mensajes y estados de guardado.

### 3) Checkout/Pedidos (usuario) — mejoras
- Confirmación de pedido más completa:
  - resumen, direcciones, estado, timeline.
- Emails transaccionales (confirmación de pedido, envío, etc.) si aplica.
- Mejorar resiliencia y trazabilidad:
  - reintentos de webhook, logs, estados coherentes.

### 4) Rediseño del Admin (muy importante)
- Unificar diseño de:
  - tablas, formularios, inputs, selects, modales, badges, alerts, empty states.
- Mejoras UX:
  - responsive en móvil
  - sidebar mejorado (activo más claro, colapsable en móvil, mejor jerarquía)
  - estados de carga (skeletons), feedback visual al guardar/borrar
- Crear componentes reutilizables para el admin:
  - `Table`, `ModalConfirm`, `Toast`, `BadgeStatus`, `SearchBar`, `Pagination`, `EmptyState`, `CardStat`, etc.
- Accesibilidad:
  - focus states, labels, aria, contraste.

### 5) Pedidos: funcionalidades avanzadas (Admin) (muy importante)
- Paginación + filtros avanzados:
  - por fecha, total, estado, email, nº pedido.
- Detalle del pedido más completo:
  - direcciones envío/facturación bien presentadas
  - timeline/historial de estados
  - botón copiar nº pedido / `payment_intent_id`
- Acciones:
  - marcar como enviado con tracking
  - cancelación/reembolso (si aplica)
  - imprimir albarán/factura PDF
- Clarificar estados:
  - estado de pago vs estado de fulfillment.
- Seguridad:
  - solo admins, evitar exponer lógica sensible en cliente.

### 6) Categorías: mejoras (Admin)
- Añadir soporte completo:
  - `slug`, imagen, descripción, orden.
- Validaciones:
  - slug único, nombre obligatorio.
- Mejor UX:
  - confirm modal al borrar + toast.
- Reordenación (si es viable):
  - drag & drop.

### 7) Configuración: ampliar sección (Admin)
- Más settings en `site_settings`:
  - costes de envío, impuestos, moneda
  - activar/desactivar secciones (destacados)
  - modo mantenimiento
  - gestión de banners/hero home.
- UI para editar settings de forma segura y robusta.

### 8) Seguridad / Roles (global)
- Sustituir whitelist fija por roles en DB:
  - `profiles.role` (admin/user) o tabla `user_roles`.
- Aplicar RLS y políticas correctas en Supabase.
- Proteger endpoints:
  - no solo cookie, también verificación de admin.
- Evitar que el admin sea accesible por usuarios normales.

### 9) Limpieza técnica / arquitectura (global)
- Centralizar helpers:
  - auth guard, redirects, lectura de settings.
- Reducir duplicación entre páginas admin.
- Mejorar tipado de `Order`/`OrderItem` y queries.
- Manejo de errores consistente.

---

## Próximos pasos recomendados
1) Definir un "UI kit" (componentes base + estilos consistentes) para tienda y admin.
2) Implementar `/cuenta/pedidos` y `/cuenta/direcciones`.
3) Mejorar checkout/pedidos (resiliencia, UX, estados y trazabilidad).
4) Refactor del admin para tabla/filtros/paginación/toasts reutilizables.
5) Migrar control de permisos a roles en DB y reforzar RLS.
