# Specs Lookup Table

Tabla de búsqueda para funcionalidades en desarrollo. Usa sinónimos y descriptores para mejorar la tasa de acierto en búsquedas.

---

## Midnight Premium Dark Mode

| Campo | Valores |
|-------|---------|
| **Slug** | `midnight-dark-mode` |
| **Nombres alternativos** | Dark Mode, Midnight Premium, Dark Theme, Night Mode, Premium Glassmorphism |
| **Descripción corta** | Sistema de dark mode completo con glassmorphism premium para Mira |
| **Descripción larga** | Transformación visual completa de light mode a "Midnight Premium" dark mode. Incluye paleta OKLch oscura, gradientes radiales multi-capa, glow effects pulsantes, rotating ring indicators, glassmorphism con blur intenso (40-80px), y animaciones staggered. Concepto: interfaz flotante en espacio oscuro profundo con profundidad tridimensional. |
| **Categoría** | UI, Design System, Styling, Visual Enhancement |
| **Keywords** | dark mode, glassmorphism, OKLch colors, glow effects, backdrop-blur, gradients, animations, premium UI, depth layers, cyan magenta accents |
| **Base técnica** | Extensión del glassmorphism existente en Mira |
| **Archivos principales** | `app/globals.css`, `components/team-slot.tsx`, `components/task-card.tsx`, `components/kanban-column.tsx`, `app/(dashboard)/dashboard/page.tsx` |
| **Template key** | N/A (CSS/Component enhancement) |
| **Icono** | Moon (lucide-react) |
| **Color** | `#00b8ff` (Electric Cyan) |
| **Status** | 🟡 En Progreso |

### Sinónimos de búsqueda
- "dark mode"
- "tema oscuro"
- "glassmorphism premium"
- "midnight theme"
- "glow effects"
- "backdrop blur"
- "dark glass"
- "premium UI"
- "floating in space"

### Archivos relacionados
```
specs/midnight-dark-mode.md        # Especificación completa
specs/implementation_plan.md       # Plan de tareas
specs/prompt.md                    # Instrucciones para implementación
specs/discoveries.md               # Memoria de sesiones

app/globals.css                    # Variables, animations, backgrounds
components/team-slot.tsx           # Glow effects, rotating ring
components/task-card.tsx           # Hover effects premium
components/kanban-column.tsx       # Gradient headers
app/(dashboard)/dashboard/page.tsx # Staggered animations
```

---

## Contexto del Proyecto: Mira

**Tipo**: Aplicación de gestión de tareas para equipos de 8 personas
**Stack**: Next.js 15, Tailwind CSS v4, Clerk, Neon Postgres, Drizzle ORM
**Estilo Actual**: Glassmorphism con light mode
**Objetivo**: Transformar a dark mode premium manteniendo estética glassmorphism

### Estructura de la App
- **Dashboard (Team View)**: 8 slots de equipo en grid, muestra tareas activas
- **Kanban Board**: 4 columnas (Backlog, To Do, In Progress, Done)
- **Activity Feed**: Log de cambios y acciones
- **Backlog View**: Lista simple de tareas pendientes

### Tecnologías Clave
- **Tailwind v4**: PostCSS-based, usa `@theme` inline
- **OKLch Colors**: Sistema de color moderno perceptualmente uniforme
- **CSS Variables**: Theming con custom properties
- **Glassmorphism**: backdrop-blur + semi-transparent backgrounds
- **Animations**: CSS puro, no JS (tw-animate-css library)

---

## Patrones Descubiertos

> Esta sección se actualiza durante la implementación.

| Patrón | Descripción | Archivo/Ubicación |
|--------|-------------|-------------------|
| OKLch Dark Colors | Variables con luminosidad baja (0.12-0.26) y subtle chroma | `app/globals.css` |
| Glass Layers | 3 niveles (dark/medium/light) con blur progresivo | `app/globals.css` |
| Glow Effects | box-shadow + custom --glow-* variables para active states | `components/team-slot.tsx` |
| Rotating Ring | conic-gradient + mask-composite + rotate animation | `components/team-slot.tsx` |
| Staggered Reveals | animation-delay incremental en grid items | `app/(dashboard)/dashboard/page.tsx` |

---

## Testing de la Implementación

### Pre-requisitos
- Servidor de desarrollo corriendo (`pnpm dev`)
- Tailwind CSS compilado
- No hay errores de TypeScript

### Checklist Visual
1. Navegar a `/dashboard` - Verificar background con gradientes radiales
2. Ver slots con usuarios activos - Verificar glow cyan pulsante
3. Hover sobre task cards - Verificar transform + glow effect
4. Ver rotating ring indicator - Verificar animación en avatars activos
5. Verificar staggered animation - Grid items aparecen con delay escalonado
6. Navegar a `/dashboard/kanban` - Verificar headers con gradient borders
7. Probar en mobile/tablet - Verificar responsive

### Testing Técnico
```bash
# Lint
pnpm lint

# Build
pnpm build

# Type check (si existe el script)
pnpm type-check
```

---

## Índice de Specs

| Spec | Status | Archivo |
|------|--------|---------|
| Midnight Premium Dark Mode | 🟡 En Progreso | `specs/midnight-dark-mode.md` |
