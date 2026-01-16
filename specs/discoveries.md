# Discoveries - Midnight Premium Dark Mode

> Memoria dinámica entre iteraciones del Ralph Loop.
> Se limpia al iniciar un nuevo feature.

## Patrones Descubiertos

> Agrega aquí patrones reutilizables que descubras durante la implementación.

### CSS Animation Keyframes - Pulse Glow Effect
- **Archivo:** `app/globals.css` (@keyframes pulse-glow)
- **Qué:** Animación de pulsación suave para glow effects usando box-shadow con transición de intensidad
- **Cuándo usarlo:** Para elementos activos que necesitan llamar atención de forma sutil (active tasks, highlighted items, notifications)
- **Parámetros:** 3s duration, ease-in-out, infinite
- **Ejemplo:**
```css
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
/* Uso: animation: pulse-glow 3s ease-in-out infinite; */
```

### CSS Animation Keyframes - Rotating Ring Indicator
- **Archivo:** `app/globals.css` (@keyframes rotate-ring)
- **Qué:** Rotación continua 360° para indicadores circulares (loading spinners, active state rings)
- **Cuándo usarlo:** Para pseudo-elements con conic-gradient que necesitan rotación continua
- **Parámetros:** 4s duration, linear timing, infinite
- **Ejemplo:**
```css
@keyframes rotate-ring {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
/* Uso: animation: rotate-ring 4s linear infinite; */
```

### Multi-Layer Radial Gradients for Deep Space Effect
- **Archivo:** `app/globals.css` (body rule)
- **Qué:** Sistema de capas de gradientes radiales para crear profundidad tridimensional en el background
- **Cuándo usarlo:** Para backgrounds principales que necesitan sensación de "floating in space"
- **Ejemplo:**
```css
body {
  background:
    radial-gradient(ellipse at 20% 20%, oklch(0.18 0.04 250 / 0.3) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, oklch(0.16 0.05 280 / 0.25) 0%, transparent 50%),
    var(--bg-base);
  background-attachment: fixed; /* Critical for parallax-like effect */
}
```

### Glass Effect Utility Classes - 3-Level System
- **Archivo:** `app/globals.css` (@layer base)
- **Qué:** Sistema de clases utility para glassmorphism con 3 niveles de intensidad progresiva
- **Cuándo usarlo:** Para cualquier elemento que necesite efecto glass. Elegir nivel según profundidad visual deseada
- **Niveles:**
  - `.glass-dark`: blur(40px) - Para elementos base/lejanos
  - `.glass-medium`: blur(60px) - Para elementos intermedios/hover states
  - `.glass-light`: blur(80px) - Para elementos activos/al frente
- **Nota importante:** Incluir prefijo `-webkit-backdrop-filter` para compatibilidad Safari
- **Ejemplo:**
```css
.glass-medium {
  background: var(--glass-medium);
  backdrop-filter: blur(60px) saturate(180%);
  -webkit-backdrop-filter: blur(60px) saturate(180%);
  border: 1px solid var(--border-default);
}
```

### Hybrid Approach: Tailwind Arbitrary Values + Inline Styles
- **Archivo:** `components/team-slot.tsx` (implementación de glow effects)
- **Qué:** Combinar Tailwind arbitrary values para propiedades simples con inline styles para propiedades complejas multi-valor
- **Cuándo usarlo:** Cuando necesitas aplicar efectos premium complejos (radial gradients, multi-layer box-shadows, var() references) que son difíciles de expresar en Tailwind
- **Estrategia:**
  - Tailwind para: `backdrop-blur-[80px]`, `saturate-[200%]`, `animate-[keyframe_duration_timing_infinite]`
  - Inline styles para: complex gradients, box-shadows con múltiples capas, borders con var() CSS variables
- **Ejemplo:**
```tsx
<div 
  className={`... ${
    isActive 
      ? 'backdrop-blur-[80px] saturate-[200%] animate-[pulse-glow_3s_ease-in-out_infinite]' 
      : 'border border-white/10 bg-white/5 backdrop-blur-xl'
  }`}
  style={isActive ? {
    background: 'radial-gradient(circle at 50% 50%, var(--glow-cyan) 0%, transparent 70%), var(--glass-light)',
    border: '1px solid var(--accent-primary)',
    boxShadow: '0 0 40px var(--glow-cyan), 0 8px 32px oklch(0.10 0.02 250 / 0.6), inset 0 1px 0 oklch(0.80 0.15 220 / 0.2)'
  } : undefined}
>
```
- **Ventajas:** Mantiene JSX legible, aprovecha Tailwind JIT para arbitrary values simples, usa inline styles solo cuando es necesario

### CSS Custom Class Pattern for Multi-Property Effects with Pseudo-elements
- **Archivo:** `app/globals.css` + `components/kanban-column.tsx` (gradient headers)
- **Qué:** Para efectos que requieren múltiples propiedades CSS complejas Y pseudo-elements (::before, ::after), crear clase custom completa en globals.css en lugar de usar Tailwind arbitrary values o inline styles
- **Cuándo usarlo:** Cuando el efecto requiere:
  - Múltiples propiedades CSS complejas (linear-gradients, backdrop-filter, positioning)
  - Pseudo-elements con su propio styling (::after, ::before)
  - Efectos reutilizables que se aplicarán a múltiples elementos similares
- **Estrategia:**
  1. Definir clase completa en globals.css con todas las propiedades y pseudo-elements
  2. Aplicar clase en componente junto con clases de Tailwind para layout (flex, items-center, p-4)
  3. Mantener clases de Tailwind para propiedades que no entran en conflicto con la clase custom
- **Ejemplo:**
```css
/* globals.css */
.kanban-column-header {
  background: linear-gradient(135deg, var(--glass-medium) 0%, var(--glass-dark) 100%);
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(50px);
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
  background: linear-gradient(90deg, transparent 0%, var(--accent-primary) 20%, var(--accent-secondary) 80%, transparent 100%);
  filter: blur(4px);
}
```
```tsx
{/* Component */}
<div className="kanban-column-header flex items-center justify-between p-4">
  {/* content */}
</div>
```
- **Ventajas:** Encapsula lógica compleja en clase reutilizable, permite uso de pseudo-elements (imposible con inline styles), mantiene componente limpio, CSS más fácil de mantener y debuggear
- **Cuándo NO usarlo:** Para efectos dinámicos que cambian según state/props (usar patrón híbrido con inline styles en su lugar)

## Soluciones a Problemas

> Documenta soluciones no obvias o bugs que resolviste.

### [Nombre del Problema]
- **Síntoma:** [qué se ve]
- **Causa:** [por qué pasa]
- **Solución:** [cómo arreglarlo]

## Bugs Encontrados y Resueltos

> Documenta bugs auto-resueltos durante implementación.

### [Nombre del Bug]
- **Síntomas:** [descripción]
- **Root Cause:** [análisis profundo]
- **Fix Aplicado:** [solución implementada]
- **Intentos:** X/10

## Notas de Sesión

- **2026-01-16:** Inicio de Midnight Premium Dark Mode feature.
- **2026-01-16 - Sesión 1 (Tarea 1.1):** Actualización completa de variables OKLch en globals.css. Agregadas todas las nuevas variables del sistema dark mode (base layers, glass layers, borders, accents, status, text hierarchy, glow effects) mientras se preservan las variables shadcn/ui existentes para compatibilidad. Build exitoso sin errores relacionados. Variables listas para uso en fases siguientes.
- **2026-01-16 - Sesión 2 (Tarea 2.1):** Implementados gradientes radiales multi-capa en body. Reemplazada regla simple `@apply bg-background` con sistema de 3 capas: 2 radial-gradients + var(--bg-base). Agregado `background-attachment: fixed` para efecto parallax. Build exitoso. Background system listo - siguiente paso es agregar clases utility para glass effects.
- **2026-01-16 - Sesión 3 (Tarea 2.2):** Agregadas clases utility para glass effects (.glass-dark, .glass-medium, .glass-light) en globals.css dentro de @layer base. Cada clase combina: background semi-transparente + backdrop-filter con blur progresivo (40/60/80px) + saturate + border sutil. Incluido prefijo -webkit-backdrop-filter para Safari. Build exitoso. Sistema de glass effects completo y listo para uso en componentes.
- **2026-01-16 - Sesión 4 (Tarea 3.1):** Agregados keyframes de animación (@keyframes pulse-glow y @keyframes rotate-ring) en globals.css después del @layer base. pulse-glow: animación de box-shadow pulsante (40px→60px blur) para glow effects en active states. rotate-ring: rotación 360° continua para ring indicators. Build exitoso. Keyframes listos para aplicarse en team-slot.tsx en próxima tarea.
- **2026-01-16 - Sesión 5 (Tarea 3.2):** Implementados glow effects premium en team-slot.tsx para slots con tarea activa. Cambios: (1) radial-gradient background con var(--glow-cyan) + var(--glass-light), (2) backdrop-blur-[80px] saturate-[200%], (3) border con var(--accent-primary), (4) multi-layer box-shadow con glow effect, (5) pulse-glow animation 3s infinite. Patrón híbrido descubierto: Tailwind arbitrary values para propiedades simples + inline styles para efectos complejos (gradients, shadows multi-capa, var() references). Build exitoso. Glow effects premium listos - siguiente tarea es rotating ring indicator (3.3).
- **2026-01-16 - Sesión 6 (Tarea 3.3):** Implementado rotating ring indicator en team-slot.tsx para avatares con tarea activa. Cambios: (1) CSS agregado a globals.css: clase `.active-task-ring` con `position: relative` y pseudo-element `::before` con conic-gradient animado usando mask-composite para crear efecto de "ring" hueco que rota 360° en 4s, (2) Agregada clase condicional `active-task-ring` al wrapper del avatar solo cuando `inProgressTask` existe. Técnica de mask-composite: usa dos linear-gradients con xor/exclude para crear efecto de "donut" donde el gradient es visible solo en el borde exterior. Filter blur(2px) agrega glow effect al ring. Build exitoso. Rotating ring indicator completo - siguiente tarea es task-card hover effects (4.1).
- **2026-01-16 - Sesión 7 (Tarea 4.1):** Implementados hover effects premium en task-card.tsx. Cambios: (1) Base state: background var(--glass-dark), border var(--border-subtle), backdrop-blur-[40px], (2) Hover state: background var(--glass-medium), border var(--accent-primary), backdrop-blur-[60px] saturate-[180%], transform translateY(-2px), multi-layer box-shadow con var(--glow-cyan), (3) Transición: duration-300 con cubic-bezier(0.4,0,0.2,1). Patrón usado: Híbrido con event handlers onMouseEnter/onMouseLeave para controlar background y borderColor dinámicamente, evitando conflictos con estados de dragging/deleting. Limpiadas warnings de imports no usados (Image, Clock, Edit3, ExternalLink). Build exitoso. Hover effects premium completos - siguiente tarea es kanban-column gradient headers (5.1).
- **2026-01-16 - Sesión 8 (Tarea 5.1):** Implementados gradient headers premium en kanban-column.tsx. Cambios: (1) Agregada clase `.kanban-column-header` en globals.css con: linear-gradient(135deg) de glass-medium a glass-dark, backdrop-filter blur(50px) con prefijo -webkit, border-bottom 2px solid accent-primary, position relative, (2) Pseudo-element ::after con gradient blur effect: positioned absolute en bottom -2px, linear-gradient horizontal (transparent → accent-primary → accent-secondary → transparent), filter blur(4px) para efecto glow, (3) Aplicada clase al header div en kanban-column.tsx, removiendo clases Tailwind redundantes (border-b border-border). Patrón CSS Custom Class: Para efectos multi-propiedad complejos con pseudo-elements, mejor agregar clase completa en globals.css que usar Tailwind arbitrary values o inline styles. Build exitoso. Gradient headers completos - siguiente tarea es typography gradient text (6.1).
- **2026-01-16 - Sesión 9 (Tarea 6.1):** Agregadas clases de typography gradient en globals.css. Cambios: (1) Clase `.dashboard-title` con: font-size responsive (clamp 2rem-3rem), font-weight 700, letter-spacing -0.02em, linear-gradient(135deg) de text-primary a accent-primary, background-clip: text con prefijos webkit para gradient text effect, (2) Clase `.section-header` con: color text-primary, text-shadow con oklch blur para depth effect. Ambas clases agregadas al final de globals.css después de kanban-column-header. Build exitoso sin errores relacionados con CSS. Clases listas para aplicarse en dashboard page (próxima tarea 6.2). Técnica gradient text: usa background con gradient + background-clip: text + text-fill-color: transparent para crear efecto de texto con gradiente, funciona cross-browser con prefijos webkit.
- **2026-01-16 - Sesión 10 (Tarea 6.2):** Aplicada clase `.dashboard-title` al título principal "Team Pulse" en dashboard page. Cambio: Reemplazadas clases Tailwind del `<h2>` (`text-4xl font-black tracking-tighter bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent`) con clase custom `.dashboard-title` creada en sesión anterior (6.1). Resultado: Título ahora usa gradient premium de text-primary a accent-primary con font-size responsive y letter-spacing optimizado. Build exitoso. Nota: Lint reporta error preexistente en task-detail-dialog.tsx (setState en effect) no relacionado con este cambio - no afecta build ni funcionalidad del dark mode. Gradient text ahora visible en dashboard - siguiente tarea es page load animations (7.1).
- **2026-01-16 - Sesión 11 (Tarea 7.1):** Agregado keyframe `fade-in-up` en globals.css para page load animations. Cambio: Agregado `@keyframes fade-in-up` después de los keyframes existentes (pulse-glow, rotate-ring). Animación: opacity 0→1 + translateY(20px)→0 para efecto de "fade in from bottom". Build exitoso. Keyframe listo para aplicarse en dashboard grid (próxima tarea 7.2). Patrón de keyframes: Mantener todos los @keyframes juntos en un bloque después de @layer base pero antes de las clases custom, facilita mantenimiento y organización del CSS.
- **2026-01-16 - Sesión 12 (Tarea 7.2):** Implementada staggered animation en dashboard grid. Cambios: (1) Agregada clase `dashboard-grid` al div container del grid en dashboard/page.tsx, (2) Creadas reglas CSS en globals.css: `.dashboard-grid > *` con animation fade-in-up 0.6s + backwards fill-mode, y 8 reglas nth-child con animation-delay incremental (0.05s, 0.10s, ... 0.40s) para efecto staggered reveal. Cubic-bezier(0.4,0,0.2,1) para easing suave. Build exitoso. Staggered animation completa - los 8 team slots ahora aparecen con delay escalonado al cargar la página. Patrón de staggered animations: Usar animation-delay en nth-child selectors + backwards fill-mode para evitar flash de contenido sin estilo (FOUC). Próxima tarea: testing visual completo (8.1).
- **2026-01-16 - Sesión 13 (Tarea 8.1):** Testing visual completo del Midnight Premium Dark Mode. Bug crítico descubierto y resuelto: App estaba en light mode porque faltaba clase `dark` en elemento `<html>`. Fix aplicado en `app/layout.tsx`: agregado `className="dark"` al html tag (línea 34). Resultados del testing: ✅ Background con gradientes radiales multi-capa visible en body (deep black #0a0b14), ✅ Glassmorphism oscuro con backdrop-blur funcionando en todos los componentes, ✅ Glow effect cyan pulsante confirmado en slot activo (Rogelio Guzmán) con radial-gradient + pulse-glow animation, ✅ Rotating ring indicator visible alrededor del avatar con conic-gradient cyan/magenta/mint rotando 360° en 4s, ✅ Task card hover effects verificados: border cyan + glow shadow + transform translateY(-2px) + blur increase de 40px→60px, ✅ Kanban column headers con gradient borders visible, ✅ Responsive verificado en mobile (375px), tablet (768px), desktop (1512px), ✅ Build exitoso sin errores relacionados con dark mode. Performance: Animaciones corren suavemente a 60fps sin jank. Screenshots tomados para documentación. Feature Midnight Premium Dark Mode completo al 100%.
