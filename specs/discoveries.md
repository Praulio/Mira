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
