# Discoveries - Project Mira

> Memoria dinámica entre iteraciones del Ralph Loop.

## Patrones Descubiertos
- **Ralph Loop en Factory:** Migrado de Claude Code a Droid Exec.

## Notas de Sesión
- **2026-01-14:** Configuración inicial del sistema Ralph con integración de skills de React.
- **2026-01-15:** Sesión 1.1: Setup del Proyecto.
  - **Next.js 16.1.2:** Instalado mediante `create-next-app@latest`. Usa Turbopack por defecto.
  - **Tailwind 4:** Configuración minimalista basada en `@tailwindcss/postcss`. No requiere `tailwind.config.ts`.
  - **ESLint Flat Config:** Implementado en `eslint.config.mjs`. Se añadieron ignores para `.factory`, `docs` y `specs`.
  - **React 19:** Incluido como dependencia base.
  - **Librerías Base:** Instaladas `lucide-react`, `clsx`, `tailwind-merge`.
  - **Bug Resuelto:** El instalador fallaba por nombre de proyecto con mayúsculas ("Mira"). Se usó un subdirectorio temporal para la creación y movimiento de archivos.
