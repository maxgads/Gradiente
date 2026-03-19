# Link de IG propio - Ingeniería UNLP

Landing estática tipo Linktree, con identidad propia y estructura escalable.

## Qué incluye

- Rutas públicas:
  - `/` portada general
  - `/parciales` foco académico
  - `/ingresantes` foco primer contacto
  - `/mapa` mapa de facultad (futuro 3D)
  - `/consultas` redirección controlada al Google Form
- CTA sticky de `Hacer consulta` visible en móvil y desktop.
- Catálogo administrable vía `links.json`.
- UTM automático en salidas HTTP/HTTPS.
- Tracking de clicks (`gtag` y `plausible` si está configurado).

## Categorías sugeridas

- `Ingresantes`
- `Consultas frecuentes`
- `Parciales y apuntes`
- `Oportunidades`
- `Mapa Facultad`
- `Institucional`
- `Contacto`

## Configuración rápida

Editá [assets/config.js](assets/config.js):

- `consultationFormUrl`: URL real del formulario de consultas.
- `driveUrl`: URL real de la nube de apuntes.
- `avatarUrl`: logo circular (opcional).
- `wordmarkUrl`: logo principal ancho (opcional).
- `backgroundLogoUrl`: marca de agua de fondo (opcional).
- `slogan` y `wordmarkText`: texto de marca.
- `socialLinks`: redes del grupo.
- `analyticsMeasurementId`: ID de Google Analytics 4 (opcional).

## Gestión de contenido

Editá [links.json](links.json). Campos mínimos por ítem:

- `title`
- `url`
- `category`
- `audience`
- `priority`
- `active`

Campo opcional:

- `tags` (ejemplo: `"tags": ["mecánica", "1er año", "final"]`)

## Deploy

### Cloudflare Pages

1. Subí este repo a GitHub.
2. En Cloudflare Pages: `Create project` -> conectá repo.
3. Build command: vacío.
4. Output directory: `/` (root del repo).
5. Deploy.

### Netlify

1. `Add new site` -> `Import from Git`.
2. Build command: vacío.
3. Publish directory: `.`
4. Deploy.

## Medición mínima recomendada (2 semanas)

- Clicks en `Hacer consulta`.
- Clicks en `Nube de apuntes y parciales`.
- Tráfico a `/parciales`, `/ingresantes` y `/mapa`.

