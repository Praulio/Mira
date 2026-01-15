# Discoveries - Project Mira

> Memoria dinámica entre iteraciones del Ralph Loop.

## Patrones Descubiertos
- **Ralph Loop en Factory:** Migrado de Claude Code a Droid Exec.
- **Clerk Auth Condicional:** Implementado patrón de inicialización condicional de Clerk basado en validez de API keys, permitiendo builds exitosos en desarrollo sin claves reales.

## Notas de Sesión
- **2026-01-14:** Configuración inicial del sistema Ralph con integración de skills de React.
- **2026-01-15:** Sesión 1.1: Setup del Proyecto.
  - **Next.js 16.1.2:** Instalado mediante `create-next-app@latest`. Usa Turbopack por defecto.
  - **Tailwind 4:** Configuración minimalista basada en `@tailwindcss/postcss`. No requiere `tailwind.config.ts`.
  - **ESLint Flat Config:** Implementado en `eslint.config.mjs`. Se añadieron ignores para `.factory`, `docs` y `specs`.
  - **React 19:** Incluido como dependencia base.
  - **Librerías Base:** Instaladas `lucide-react`, `clsx`, `tailwind-merge`.
  - **Bug Resuelto:** El instalador fallaba por nombre de proyecto con mayúsculas ("Mira"). Se usó un subdirectorio temporal para la creación y movimiento de archivos.
- **2026-01-15:** Sesión 1.2: Configuración de Clerk Auth.
  - **@clerk/nextjs 6.x:** Instalado y configurado con middleware de protección de rutas.
  - **Archivos creados:**
    - `middleware.ts`: Protección de rutas con bypass condicional si no hay keys válidas.
    - `.env.local` y `.env.example`: Variables de entorno para Clerk.
    - `app/sign-in/[[...sign-in]]/page.tsx`: Página de login con componente Clerk.
    - `app/sign-up/[[...sign-up]]/page.tsx`: Página de registro con componente Clerk.
  - **Patrón de Build Robusto:** Implementada verificación de validez de keys de Clerk (`pk_test_placeholder` vs keys reales) en `layout.tsx` y `middleware.ts`, permitiendo que el proyecto compile exitosamente en desarrollo local sin necesidad de obtener keys reales de Clerk dashboard.
  - **Layout actualizado:** `ClerkProvider` envuelve la app condicionalmente solo cuando hay keys válidas.
  - **Metadata actualizada:** Título y descripción reflejan "Mira Tasker".
