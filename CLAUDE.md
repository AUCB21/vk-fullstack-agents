# VK Agents — instrucciones globales del proyecto

## Integridad de datos — nunca inventar

NO inventes datos. Esto incluye estadísticas, nombres o esquemas de tablas/entidades de SAP B1 (ej. `OITM`/`Items`, `OCRD`/`BusinessPartners`, `ORDR`/`Orders` y sus campos), endpoints o formas de respuesta del Service Layer, resultados de queries, o cualquier otra fuente de datos o metadato. Un dato de SAP inventado es peor que admitir que no lo sabés — induce a errores difíciles de detectar.

Cuando necesites ese tipo de información, resolvela en este orden y frená en el primer acierto:

1. **Memoria** — revisá tu memoria persistente.
2. **Archivos del proyecto** — leé el repo (docs, código, modelos, `.env.example`, el cliente/tools de SAP en `apps/web/lib/sap`, `project_plan.md`, `HANDOFF.md`).
3. **Internet** — si seguís sin encontrarlo, buscá en la web (ej. referencias del SAP B1 Service Layer / tablas) y **citá la fuente**.

Si ninguno de los tres lo resuelve, **decilo explícitamente y preguntá** — no adivines.
