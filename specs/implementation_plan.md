# Implementation Plan: Midnight Premium Dark Mode

## Resumen
Transformación visual completa a dark mode premium con glassmorphism, glow effects, y animaciones cinematográficas. Diseño "floating in space" con múltiples capas de profundidad.

---

## Tareas

### Fase 1: Base Color System (~15 min)

- [x] **1.1** Actualizar variables de color en globals.css
  - Archivo: `app/globals.css`
  - Cambio: Reemplazar todas las variables en `:root` con las nuevas variables OKLch dark mode
  - Incluir: Base layers, glass layers, borders, accents, status, text, glow effects
  - Referencia: `specs/midnight-dark-mode.md` sección 1

### Fase 2: Background System (~20 min)

- [x] **2.1** Implementar gradientes de fondo en body
  - Archivo: `app/globals.css`
  - Cambio: Agregar regla `body` con radial-gradients multi-capa
  - Incluir: `background-attachment: fixed` para efecto parallax
  - Referencia: `specs/midnight-dark-mode.md` sección 2

- [x] **2.2** Agregar clases utility para glass effects
  - Archivo: `app/globals.css`
  - Cambio: Crear clases `.glass-dark`, `.glass-medium`, `.glass-light`
  - Cada una con background + backdrop-filter + border correspondiente
  - Referencia: `specs/midnight-dark-mode.md` sección 2

### Fase 3: Component Enhancements - Team Slot (~30 min)

- [x] **3.1** Agregar keyframes de animación en globals.css
  - Archivo: `app/globals.css`
  - Cambio: Agregar `@keyframes pulse-glow` y `@keyframes rotate-ring`
  - Referencia: `specs/midnight-dark-mode.md` sección 3 (Team Slot)

- [x] **3.2** Mejorar team-slot.tsx con glow effects
  - Archivo: `components/team-slot.tsx`
  - Cambio: Actualizar clases de Tailwind para slots activos
  - Agregar: radial-gradient background, stronger backdrop-blur, pulse-glow animation
  - Clase objetivo: slots con `task` (usuarios con tarea activa)
  - Referencia: `specs/midnight-dark-mode.md` sección 3 (Team Slot - estado activo)

- [x] **3.3** Implementar rotating ring indicator
  - Archivo: `components/team-slot.tsx`
  - Cambio: Agregar wrapper div con clase `active-task-ring` alrededor del avatar
  - Agregar: CSS para pseudo-element `::before` con conic-gradient
  - Solo aplicar: en slots con tarea activa
  - Referencia: `specs/midnight-dark-mode.md` sección 3 (Rotating Ring)

### Fase 4: Component Enhancements - Task Card (~15 min)

- [x] **4.1** Mejorar task-card.tsx con hover effects
  - Archivo: `components/task-card.tsx`
  - Cambio: Actualizar clases base y hover
  - Base: glass-dark background, blur(40px), border-subtle
  - Hover: glass-medium, blur(60px), border-primary, transform translateY(-2px), glow shadow
  - Transición: `transition-all duration-300 ease-in-out`
  - Referencia: `specs/midnight-dark-mode.md` sección 3 (Task Card)

### Fase 5: Component Enhancements - Kanban (~20 min)

- [x] **5.1** Mejorar kanban-column.tsx con gradient headers
  - Archivo: `components/kanban-column.tsx`
  - Cambio: Actualizar header de columna
  - Background: linear-gradient de glass-medium a glass-dark
  - Border-bottom: 2px solid accent-primary
  - Agregar: pseudo-element `::after` con gradient blur effect
  - Referencia: `specs/midnight-dark-mode.md` sección 3 (Kanban Column Headers)

### Fase 6: Typography & Headers (~15 min)

- [ ] **6.1** Agregar clases para gradient text en globals.css
  - Archivo: `app/globals.css`
  - Cambio: Crear clase `.dashboard-title`
  - Incluir: gradient background, background-clip, text-fill-color
  - Referencia: `specs/midnight-dark-mode.md` sección 4

- [ ] **6.2** Aplicar gradient text a headers del dashboard
  - Archivo: `app/(dashboard)/dashboard/page.tsx`
  - Cambio: Agregar clase `dashboard-title` al título principal
  - Buscar: `<h1>` o elemento con "Team Pulse" u otros títulos principales
  - Referencia: `specs/midnight-dark-mode.md` sección 4

### Fase 7: Page Load Animations (~15 min)

- [ ] **7.1** Agregar keyframe fade-in-up en globals.css
  - Archivo: `app/globals.css`
  - Cambio: Agregar `@keyframes fade-in-up` con opacity + transform
  - Referencia: `specs/midnight-dark-mode.md` sección 5

- [ ] **7.2** Aplicar staggered animation al dashboard grid
  - Archivo: `app/(dashboard)/dashboard/page.tsx`
  - Cambio: Agregar clase `dashboard-grid` al contenedor de los 8 team slots
  - CSS: Crear regla en globals.css para `.dashboard-grid > *` con animation + delays
  - Delays: 0.05s increments para cada slot (8 slots total)
  - Referencia: `specs/midnight-dark-mode.md` sección 5

### Fase 8: Testing & Polish (~20 min)

- [ ] **8.1** Testing visual completo
  - Navegar a `/dashboard` y verificar background gradients + staggered animation
  - Verificar hover states en task cards con transform + glow
  - Verificar active slots con glow cyan pulsante
  - Verificar rotating ring indicator en avatars activos
  - Abrir `/dashboard/kanban` y verificar column headers con gradient borders
  - Probar en diferentes tamaños de viewport (mobile, tablet, desktop)
  - Tomar screenshots para documentación

---

## Criterios de Aceptación Global

### Visual
- ✅ Paleta OKLch dark mode aplicada
- ✅ Background con gradientes radiales multi-capa
- ✅ Glassmorphism oscuro con blur 40-80px
- ✅ Glow effects pulsantes en active states
- ✅ Rotating ring indicator visible
- ✅ Hover effects premium con transform + glow
- ✅ Gradient borders animados en headers
- ✅ Staggered fade-in animations

### Técnico
- ✅ Sin errores en `pnpm lint`
- ✅ Build exitoso con `pnpm build`
- ✅ Variables CSS (no hardcoded colors)
- ✅ Animaciones CSS puro (no JS)
- ✅ Responsive mobile/tablet/desktop
- ✅ Performance 60fps

---

## Notas para Ralph

- Una tarea = una sesión = un commit
- Lint + Build antes de cada commit
- Actualizar discoveries.md SIEMPRE (back pressure)
- NO agrupar tareas aunque sean pequeñas
- Usar variables CSS del spec, no inventar nuevas
- Testing manual visual (no E2E para este feature)
