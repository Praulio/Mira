# Spec: Midnight Premium Dark Mode

> Sistema de dark mode completo y moderno para Mira - Demo para desarrolladores

---

## Objetivo

Transformar la aplicación Mira de un light mode con glassmorphism a un **"Midnight Premium" dark mode** completo, manteniendo la estética glassmorphism pero elevándola a un nivel cinematográfico con capas de profundidad, gradientes sutiles y glow effects.

**Meta de la demo**: Mostrar a los desarrolladores cómo Ralph Loop puede implementar un diseño visual completo en múltiples iteraciones atómicas, cada una con su propio commit.

---

## Aesthetic Direction: "Midnight Premium Glassmorphism"

**Concepto**: Interfaz flotante en un espacio oscuro profundo con múltiples capas de profundidad, gradientes radiales oscuros y glow effects que crean una sensación de "floating in space". Premium, moderno, cinematográfico.

**Diferenciador memorable**: Múltiples capas de profundidad con gradientes radiales oscuros que crean un efecto de "portal" alrededor de elementos activos. No es solo "poner negro el fondo" - es un sistema completo de capas con blur, glow y profundidad tridimensional.

**Tone**: Premium/Refined con toques de Retro-Futuristic (cyan/magenta glow effects)

---

## Estado Actual vs Nuevo Estado

| Aspecto | Estado Actual (Light Mode) | Midnight Premium (Dark Mode) |
|---------|---------------------------|------------------------------|
| **Background** | Blanco/light con subtle gradients | Deep black (#0a0b14) con gradientes radiales azul/magenta |
| **Glassmorphism** | Transparencia clara con blur moderado | Transparencia oscura con blur intenso (40-80px) |
| **Borders** | Sutiles white/5 - white/10 | Borders con glow + gradientes animados |
| **Active States** | Border primary con subtle shadow | Multi-layer glow effects con pulse animation |
| **Typography** | Dark text en fondos claros | White/near-white con gradient text en headers |
| **Hover Effects** | Subtle bg-white/10 | Transform + glow + backdrop-blur increase |
| **Animations** | Fade-in básico | Staggered reveals + rotating rings + pulse glows |
| **Color Palette** | OKLch light (alta luminosidad) | OKLch dark (baja luminosidad, high chroma accents) |

---

## Arquitectura Técnica

### 1. Sistema de Variables (OKLch)

Todas las variables de color se redefinen en `app/globals.css` usando OKLch para dark mode:

```css
:root {
  /* Base Layers - Deep blacks with subtle blue undertones */
  --bg-base: oklch(0.12 0.015 250);           /* #0a0b14 */
  --bg-elevated: oklch(0.16 0.02 250);         /* #13141f */
  --bg-surface: oklch(0.20 0.025 250);         /* #1c1e2e */

  /* Glass Layers - Semi-transparent with blur */
  --glass-dark: oklch(0.18 0.02 250 / 0.4);
  --glass-medium: oklch(0.22 0.025 250 / 0.5);
  --glass-light: oklch(0.26 0.03 250 / 0.6);

  /* Borders & Dividers */
  --border-subtle: oklch(0.30 0.03 250 / 0.1);
  --border-default: oklch(0.35 0.04 250 / 0.2);
  --border-strong: oklch(0.45 0.05 250 / 0.3);

  /* Accent Colors - Cyan/Magenta for premium feel */
  --accent-primary: oklch(0.65 0.25 220);      /* Electric cyan */
  --accent-secondary: oklch(0.60 0.28 320);    /* Vivid magenta */
  --accent-tertiary: oklch(0.70 0.20 180);     /* Mint cyan */

  /* Status Colors */
  --status-success: oklch(0.70 0.20 150);
  --status-warning: oklch(0.75 0.22 80);
  --status-error: oklch(0.65 0.28 25);
  --status-info: oklch(0.68 0.22 220);

  /* Text Hierarchy */
  --text-primary: oklch(0.95 0.01 250);        /* Near white */
  --text-secondary: oklch(0.70 0.02 250);      /* Muted */
  --text-tertiary: oklch(0.50 0.03 250);       /* Very muted */
  --text-on-accent: oklch(0.98 0.005 250);

  /* Glow Effects */
  --glow-cyan: oklch(0.65 0.25 220 / 0.5);
  --glow-magenta: oklch(0.60 0.28 320 / 0.5);
  --glow-success: oklch(0.70 0.20 150 / 0.4);
}
```

### 2. Background System - Depth Layers

**Body** (app background base):
```css
body {
  background:
    radial-gradient(ellipse at 20% 20%, oklch(0.18 0.04 250 / 0.3) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, oklch(0.16 0.05 280 / 0.25) 0%, transparent 50%),
    var(--bg-base);
  background-attachment: fixed;
}
```

**Dashboard Container** (elevated surfaces):
```css
.dashboard-container {
  background:
    radial-gradient(circle at 50% 0%, oklch(0.20 0.03 220 / 0.15) 0%, transparent 40%),
    var(--glass-dark);
  backdrop-filter: blur(40px) saturate(150%);
  border: 1px solid var(--border-subtle);
}
```

**Floating Panels** (highest depth):
```css
.floating-panel {
  background: var(--glass-medium);
  backdrop-filter: blur(60px) saturate(180%);
  border: 1px solid var(--border-default);
  box-shadow:
    0 8px 32px oklch(0.10 0.02 250 / 0.4),
    0 2px 8px oklch(0.12 0.02 250 / 0.3),
    inset 0 1px 0 oklch(0.35 0.03 250 / 0.15);
}
```

### 3. Component Enhancement Patterns

#### Team Slot (Active State)

**Archivo**: `components/team-slot.tsx`

```css
.team-slot-active {
  background:
    radial-gradient(circle at 50% 50%, var(--glow-cyan) 0%, transparent 70%),
    var(--glass-light);
  backdrop-filter: blur(80px) saturate(200%);
  border: 1px solid var(--accent-primary);
  box-shadow:
    0 0 40px var(--glow-cyan),
    0 8px 32px oklch(0.10 0.02 250 / 0.6),
    inset 0 1px 0 oklch(0.80 0.15 220 / 0.2);
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow:
      0 0 40px var(--glow-cyan),
      0 8px 32px oklch(0.10 0.02 250 / 0.6);
  }
  50% {
    box-shadow:
      0 0 60px var(--glow-cyan),
      0 12px 48px oklch(0.10 0.02 250 / 0.8);
  }
}
```

**Rotating Ring Indicator** (para active tasks):
```css
.active-task-ring {
  position: relative;
}

.active-task-ring::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  padding: 2px;
  background: conic-gradient(
    from 0deg,
    var(--accent-primary),
    var(--accent-secondary),
    var(--accent-tertiary),
    var(--accent-primary)
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: rotate-ring 4s linear infinite;
  filter: blur(2px);
}

@keyframes rotate-ring {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

#### Task Card (Hover State)

**Archivo**: `components/task-card.tsx`

```css
.task-card {
  background: var(--glass-dark);
  backdrop-filter: blur(40px);
  border: 1px solid var(--border-subtle);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-card:hover {
  background: var(--glass-medium);
  backdrop-filter: blur(60px) saturate(180%);
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow:
    0 0 30px var(--glow-cyan),
    0 12px 40px oklch(0.10 0.02 250 / 0.5);
}
```

#### Kanban Column Headers

**Archivo**: `components/kanban-column.tsx`

```css
.kanban-column-header {
  background:
    linear-gradient(135deg,
      var(--glass-medium) 0%,
      var(--glass-dark) 100%);
  backdrop-filter: blur(50px);
  border-bottom: 2px solid var(--accent-primary);
  position: relative;
}

.kanban-column-header::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--accent-primary) 20%,
    var(--accent-secondary) 80%,
    transparent 100%);
  filter: blur(4px);
}
```

### 4. Typography Enhancement

**Archivo**: `app/globals.css`

```css
/* Display/Headers - Gradient text */
.dashboard-title {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg,
    var(--text-primary) 0%,
    var(--accent-primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Section headers - Text shadow para depth */
.section-header {
  color: var(--text-primary);
  text-shadow: 0 2px 8px oklch(0.10 0.02 250 / 0.5);
}
```

### 5. Page Load Animations - Staggered Reveals

**Archivo**: `app/(dashboard)/dashboard/page.tsx` + `app/globals.css`

```css
/* Keyframe en globals.css */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Aplicar en componente de página */
.dashboard-grid > * {
  animation: fade-in-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) backwards;
}

.dashboard-grid > *:nth-child(1) { animation-delay: 0.05s; }
.dashboard-grid > *:nth-child(2) { animation-delay: 0.10s; }
.dashboard-grid > *:nth-child(3) { animation-delay: 0.15s; }
.dashboard-grid > *:nth-child(4) { animation-delay: 0.20s; }
.dashboard-grid > *:nth-child(5) { animation-delay: 0.25s; }
.dashboard-grid > *:nth-child(6) { animation-delay: 0.30s; }
.dashboard-grid > *:nth-child(7) { animation-delay: 0.35s; }
.dashboard-grid > *:nth-child(8) { animation-delay: 0.40s; }
```

---

## Archivos a Modificar

### Archivos Core (CSS)
- `app/globals.css` - Variables, background system, animations, typography

### Componentes
- `components/team-slot.tsx` - Glow effects, pulse animation, rotating ring
- `components/task-card.tsx` - Hover effects premium, depth shadows
- `components/kanban-column.tsx` - Gradient headers, animated borders

### Páginas
- `app/(dashboard)/dashboard/page.tsx` - Staggered animations en grid

---

## Criterios de Aceptación

### Visual
- ✅ Paleta de colores OKLch dark mode aplicada en todas las variables
- ✅ Background con gradientes radiales multi-capa visible en body
- ✅ Glassmorphism oscuro con backdrop-blur de 40-80px según contexto
- ✅ Team slots con active state muestran glow cyan pulsante
- ✅ Active tasks tienen rotating ring indicator visible
- ✅ Task cards tienen hover effect con transform + glow
- ✅ Kanban column headers tienen gradient border animado
- ✅ Dashboard grid tiene staggered fade-in animation al cargar
- ✅ Headers principales tienen gradient text effect

### Técnico
- ✅ Sin errores en `pnpm lint`
- ✅ Build exitoso con `pnpm build`
- ✅ Todos los colores usan variables CSS (no hardcoded)
- ✅ Animaciones usan CSS puro (no JS)
- ✅ Responsive en mobile, tablet, desktop
- ✅ Performance: animaciones no causan jank (60fps)

---

*Spec v1.0 - Creado para Ralph Loop Demo*
