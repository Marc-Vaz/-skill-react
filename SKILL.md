---
name: framehook
description: >
  Estudio visual de Remotion, cola de renderizado por lotes y Editor/Exportador de Skills con locución mexicana edge-tts y soporte de skin Día/Noche ("day" | "night"). Úsalo cuando el agente IA necesite transformar datos estructurados JSON/CSV en composiciones Remotion validadas o coordinarse con remotion-panora-mcp y remotion-video-factory.
---

# FrameHook — Skill de Remotion para Agentes IA

**FrameHook** actúa como el estudio visual, validador de esquemas Zod, procesador de lotes y orquestador de locución mexicana (`edge-tts`) dentro de tu arquitectura de producción Remotion.

## Arquitectura de carpetas hermanas

- `../framehook/` ➔ **Estudio visual FrameHook**, cola por lotes, validación Zod (`skin: "day" | "night"`) y Editor/Exportador de `SKILL.md` con `edge-tts`.
- `../remotion-panora-mcp/` ➔ **Librería Panora MCP** con 399 widgets animados deterministas invocables en escenas Remotion.
- `../remotion-video-factory/` ➔ **Motor central Remotion Video Factory** para renderizado final de producciones documentales, cápsulas y videos largos.

## Capacidades principales

1. **Validación estricta de Props (Zod)**: Verifica que cada payload cumpla con cualquiera de las 4 composiciones base (`KpiDigestVideo`, `ProductSpotlightVideo`, `OnboardingWelcomeVideo`, `EditorialQuoteVideo`).
2. **Parámetro `skin` Día / Noche**:
   - `"day"`: Paleta editorial luminosa (`#F8FAFC`) con tarjetas blancas y tipografía oscura (`#0F172A`).
   - `"night"`: Paleta de estudio oscuro (`#0C0F14`) con alto contraste y acentos cromáticos.
3. **Locución mexicana local (`edge-tts`)**: Síntesis neural con voces `es-MX-DaliaNeural`, `es-MX-JorgeNeural`, `es-MX-BeatrizNeural`, `es-MX-CandelaNeural` y `es-MX-CecilioNeural` sincronizadas mediante `<Audio src={staticFile(...)} />`.

## Endpoints del servidor local (`http://localhost:3000`)

- `GET /api/plugin/schema` ➔ Catálogo de plantillas, resoluciones y esquemas de validación.
- `POST /api/plugin/validate` ➔ Valida `{ templateId, inputProps }` contra el esquema Zod activo.
- `POST /api/plugin/render` ➔ Registra uno o múltiples trabajos en la cola por lotes `{ templateId, aspectRatio, records }`.
- `POST /api/agent/run` ➔ Invoca el agente Gemini con Function Calling (`render_dynamic_video`, `queue_batch_video_render`).
