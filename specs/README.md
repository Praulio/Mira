# Specs Lookup Table - Mira Tasker

Tabla de búsqueda para funcionalidades en desarrollo.

---

## [Mira Tasker]

| Campo | Valores |
|-------|---------|
| **Slug** | `mira-tasker` |
| **Nombres alternativos** | Mira, Tasker, Team Hub |
| **Descripción corta** | Herramienta de gestión de tareas minimalista para equipos de 8 personas. |
| **Stack** | Next.js 15, Clerk, Neon, Drizzle |
| **Status** | 🟡 Fase 1: Setup |

### Archivos relacionados
```
docs/plans/SPEC.md              # Master Spec
specs/implementation_plan.md    # Plan de tareas Ralph
specs/prompt.md                 # Instrucciones Ralph
specs/discoveries.md            # Memoria dinámica
```

---

## Patrones Descubiertos
- **Auth:** Usar Clerk para Google Auth.
- **DB:** Neon Postgres con Drizzle ORM.
- **UI:** Minimalismo estilo Linear, Dark Mode por defecto.

---

## Índice de Specs

| Spec | Status | Archivo |
|------|--------|---------|
| Mira Tasker MVP | 🟡 En Progreso | `docs/plans/SPEC.md` |
