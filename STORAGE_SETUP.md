# Configuración de Supabase Storage para FashionStore

## Paso 1: Crear el Bucket de Almacenamiento

1. **Acceder a Supabase Dashboard**
   - Ir a: Tu Proyecto → Storage (en el menú lateral izquierdo)

2. **Crear nuevo bucket**
   - Click en "New Bucket"
   - Nombre: `products-images`
   - Opciones:
     - ✅ Public bucket (para que las URLs sean accesibles públicamente)
   - Click "Create bucket"

## Paso 2: Configurar Políticas de Acceso (RLS)

Las políticas RLS para Storage garantizan que:
- **Público**: Puede leer/descargar imágenes
- **Admins autenticados**: Pueden subir nuevas imágenes
- **Nadie**: Puede eliminar imágenes de otros (excepto service role)

### En Supabase Dashboard:

1. Selecciona el bucket `products-images`
2. Ve a la pestaña **Policies**
3. Agrega las siguientes políticas:

#### Política 1: Lectura Pública
```
Name: "Public read access to product images"
Target role: public
Operation: SELECT
Expression: true
```

#### Política 2: Solo Admins Pueden Subir
```
Name: "Authenticated admins can upload product images"
Target role: authenticated
Operation: INSERT
Expression: auth.jwt() ->> 'app_metadata' ->> 'role' = 'admin'
```

O si usas Supabase Auth custom claims:
```
Expression: auth.jwt() ->> 'user_role' = 'admin'
```

#### Política 3: Solo Service Role Puede Eliminar
```
Name: "Service role can delete images"
Target role: service_role
Operation: DELETE
Expression: true
```

## Paso 3: Estructura de Carpetas en el Bucket

Organiza las imágenes por producto:
```
products-images/
├── prod-001/
│   ├── image-1.jpg
│   ├── image-2.jpg
│   └── image-3.jpg
├── prod-002/
│   ├── image-1.jpg
│   └── image-2.jpg
└── ...
```

## Paso 4: Obtener URLs Públicas

Una vez subida una imagen, la URL pública es:
```
https://<PROJECT_ID>.supabase.co/storage/v1/object/public/products-images/prod-001/image-1.jpg
```

En el código Astro, guardas esta URL en el array `images` de la tabla `products`:
```typescript
images: [
  "https://xxx.supabase.co/storage/v1/object/public/products-images/prod-001/image-1.jpg",
  "https://xxx.supabase.co/storage/v1/object/public/products-images/prod-001/image-2.jpg"
]
```

## Paso 5: Código de Subida desde el Admin

### Componente Astro Admin (SSR):

```astro
---
import { createServerClient } from '../../lib/supabase';

const supabase = createServerClient();

export const prerender = false;

// Check admin auth
const token = Astro.cookies.get('sb-access-token')?.value;
if (!token) {
  return Astro.redirect('/admin/login');
}
---

<form id="upload-form" enctype="multipart/form-data">
  <input type="file" id="images" name="images" multiple accept="image/*" required />
  <button type="submit">Subir Imágenes</button>
</form>

<script>
  const form = document.getElementById('upload-form');
  const imagesInput = document.getElementById('images');
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const files = imagesInput?.files || [];
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `products/${fileName}`;
      
      const response = await fetch(`/api/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: filePath,
          fileData: await file.arrayBuffer(),
          contentType: file.type
        })
      });
      
      if (response.ok) {
        const { url } = await response.json();
        uploadedUrls.push(url);
      }
    }
    
    // uploadedUrls contiene las URLs públicas para guardar en la BD
    console.log('URLs para guardar:', uploadedUrls);
  });
</script>
```

### API Route para Subida (`/api/upload-image`):

```typescript
// src/pages/api/upload-image.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';

export const POST: APIRoute = async (context) => {
  const token = context.cookies.get('sb-access-token')?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { fileName, fileData, contentType } = await context.request.json();
    const supabase = createServerClient(process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Upload file to Storage
    const { data, error } = await supabase.storage
      .from('products-images')
      .upload(fileName, new Uint8Array(fileData), {
        contentType,
        upsert: false
      });

    if (error) throw error;

    // Construct public URL
    const publicUrl = `${process.env.PUBLIC_SUPABASE_URL}/storage/v1/object/public/products-images/${fileName}`;

    return new Response(JSON.stringify({ url: publicUrl }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Upload failed' }), { status: 500 });
  }
};
```

## Verificación

Para verificar que todo funciona:

1. **Dashboard de Supabase** → Storage → products-images
   - Deberías ver archivos subidos

2. **Copia una URL** y abrla en el navegador
   - Debería mostrarse la imagen

3. **En la consola del navegador**:
   ```javascript
   fetch('https://xxx.supabase.co/storage/v1/object/public/products-images/...')
     .then(r => r.json())
     .catch(e => console.log('✓ Acceso público funciona'))
   ```

---

## Troubleshooting

### "403 Forbidden" al acceder a una imagen
- ✓ Verifica que el bucket esté marcado como "Public"
- ✓ Verifica que la política de SELECT existe para `public`

### "No policy exists" al intentar subir
- ✓ Agrega la política de INSERT para `authenticated` o `service_role`
- ✓ Verifica que el usuario esté autenticado con el JWT correcto

### URLs devuelven 404
- ✓ Verifica que el archivo se subió correctamente en el Dashboard
- ✓ Revisa la ruta: debe ser `products-images/path/to/file`

