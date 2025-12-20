# Balance360 UI Guidelines

## Design Tokens
Use the CSS variables in `src/styles/tokens.css` exclusively.

### Palette
- Slate base: `--slate-50` … `--slate-900`
- Primary (indigo/violet): `--primary-50` … `--primary-800`
- Status:
  - Success: `--success-bg`, `--success-text`
  - Warning: `--warning-bg`, `--warning-text`
  - Danger: `--danger-bg`, `--danger-text`

### Surfaces
- `--surface-0`: solid white
- `--surface-1`: glass surface (primary card)
- `--surface-2`: semi-opaque surface
- `--surface-glass`: glassmorphism base
- `--surface-muted`: subtle background

### Radius
- `--radius-sm`: 10px
- `--radius-md`: 12px
- `--radius-lg`: 16px
- `--radius-xl`: 20px

### Shadows
- `--shadow-xs`: subtle lift
- `--shadow-sm`: card shadow
- `--shadow-md`: elevated card
- `--shadow`: deep modal shadow

### Blur
- `--blur-sm`, `--blur-md`, `--blur-lg`

### Spacing
Scale: 4 / 8 / 12 / 16 / 24 / 32 / 40 / 48
- `--space-1` … `--space-8`

### Typography
- Base: `--font-sans`
- Page titles: `.page-heading`
- Subtitle: `.page-subtitle`
- Eyebrow: `.eyebrow`

### Z-Index
- Base: `--z-base`
- Header: `--z-header`
- Overlay: `--z-overlay`
- Drawer: `--z-drawer`
- Dropdown: `--z-dropdown`
- Modal: `--z-modal`
- Toast: `--z-toast`
- Tooltip: `--z-tooltip`

## Layout Patterns
### Page Header
Use `.page-header` with:
- `.page-header-title`
- `.page-header-actions` (optional)

### Toolbars
Use `.page-toolbar` with `.toolbar-group` blocks.

### Sections
Use `.card` or `.section-card` with `.section-header` and `.section-title`.

## Components
### Buttons
- Primary: `.btn.btn-primary` or `.ui-btn.ui-btn-primary`
- Secondary: `.btn.btn-secondary` or `.ui-btn.ui-btn-secondary`
- Ghost: `.ui-btn-ghost`
- Danger: `.btn.btn-danger` or `.ui-btn.ui-btn-danger`

### Inputs
Use `.input-control`, `.select-control`, `.textarea-control` and `.ui-field`.
Focus ring is standard and should not be overridden.

### Cards
Use `.card` or `.ui-card` with glass surfaces and `--radius-lg`.

### Tables
- Desktop: `.table-container` + `.styled-table`
- Mobile stacked: add `data-label` to each `td`
- Optional sticky header: `.table-container.table-sticky`

### Modals
Use `.modal-overlay` and `.modal`.
Keep header/footer spacing consistent.

## Motion
- Use `--duration-fast` (150ms) and `--duration-md` (200ms)
- Easing: `--ease-smooth`

## Do / Don’t
Do:
- Reuse tokens and existing utility classes
- Keep spacing consistent using the scale
- Use `data-label` in tables for mobile

Don’t:
- Introduce new color palettes per page
- Override z-index ad-hoc
- Add external UI libraries
- Change handlers or endpoints

## Content & Copy Guidelines
### Voice & Tone
- Profesional, directo y claro
- Frases cortas, sin marketing exagerado
- Evitar sinónimos arbitrarios en etiquetas y acciones
- Usar voseo rioplatense en CTAs cuando aplique (registrá, administrá, agregá)

### Terminologia consistente
- Ventas, Productos, Usuarios, Reportes, Configuración, Perfil
- Punto de venta (POS) para ventas en mostrador

### Verbos permitidos
- Crear, Guardar, Editar, Eliminar, Anular, Reembolsar, Cancelar
- Preferir acciones explícitas: “Guardar cambios”, “Anular venta”

### Headers
- Título corto: “Ventas”, “Productos”, “Usuarios”
- Subtítulo que explique el objetivo de la pantalla

### Empty states
- Mensaje claro y útil
- CTA accionable si corresponde
- Evitar “No hay datos” sin contexto

### Formatos
- Moneda: `$` + separadores locales
- Fecha: `DD/MM/YYYY`
- Cantidades: incluir unidad cuando aplique (ej. “un.”)

### Ejemplos
Correcto:
- “No se encontraron productos. Probá con otra búsqueda o creá un producto.”
- “Anular venta” / “Cancelar”

Incorrecto:
- “Aceptar”
- “Crear nuevo”
