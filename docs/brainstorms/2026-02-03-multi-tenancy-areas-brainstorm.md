# Brainstorm: Multi-tenancy para Desarrollo y Agencia

**Fecha:** 2026-02-03
**Participantes:** Roger (Product Owner)

---

## Lo que vamos a construir

Separación completa de la aplicación en dos áreas aisladas: **Desarrollo** y **Agencia**, donde:

- Cada área tiene sus propios datos (tareas, actividad, adjuntos)
- Los usuarios solo ven datos de su área asignada
- La UI y funcionalidad es idéntica para ambas áreas
- Un usuario **superadmin** (Roger) puede:
  - Ver y cambiar entre ambas áreas con un switch en el header
  - Gestionar usuarios y asignarlos a áreas desde un panel de admin

---

## Por qué este enfoque

**Enfoque seleccionado:** Columna `area` + filtros automáticos (single database)

**Alternativas descartadas:**
- Clerk Organizations: Overkill para 2 áreas fijas, requiere plan pago
- Dos bases de datos: Doble costo, complejidad innecesaria

**Razones de la decisión:**
1. Solo 2 áreas fijas (no dinámicas) = enum simple
2. Una sola base de datos = una factura, migraciones unificadas
3. Código 100% compartido = cambios afectan ambas áreas
4. Implementación directa sin dependencias externas

---

## Decisiones clave

| Decisión | Elección |
|----------|----------|
| Número de áreas | 2 fijas: `desarrollo`, `agencia` |
| Aislamiento | Lógico (columna `area`) no físico |
| Rol superadmin | Roger/Rovaecia único superadmin |
| Switch de área | En header, solo visible para superadmin |
| Asignación usuarios | Panel admin, pre-asignación antes de invitar |
| Usuarios nuevos sin área | No pueden entrar hasta ser asignados |

---

## Flujo de usuarios

### Usuario normal (member)
1. Se loguea con Clerk
2. Sistema detecta su `area` asignada
3. Ve solo datos de esa área
4. No puede cambiar de área ni ver el switch

### Superadmin (Roger)
1. Se loguea con Clerk
2. Ve switch de área en header (Desarrollo ↔ Agencia)
3. Puede cambiar entre áreas en cualquier momento
4. Acceso a `/admin` para gestionar usuarios

### Nuevo usuario
1. Superadmin lo crea primero en `/admin`
2. Le asigna área (desarrollo o agencia)
3. Le envía invitación por email (Clerk)
4. Usuario se registra y entra a su área asignada

---

## Preguntas abiertas

- [ ] ¿Qué pasa con los usuarios existentes? → Asignarlos a "desarrollo" por default
- [ ] ¿Los datos actuales a qué área pertenecen? → A "desarrollo" (migración)
- [ ] ¿La actividad cross-área se muestra al superadmin? → Solo ve la del área actual

---

## Próximos pasos

Ejecutar `/workflows:plan` para generar el plan de implementación detallado.
