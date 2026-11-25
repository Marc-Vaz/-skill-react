import {
  ASPECT_RATIOS,
  TEMPLATES,
  type AspectRatioId,
  type CompositionProps,
  type TemplateId,
} from './schemas';

export function buildRemotionCliCommand(
  templateId: TemplateId,
  aspectRatio: AspectRatioId,
  outputFile = 'out/video.mp4'
): string {
  const tpl = TEMPLATES[templateId];
  const dims = ASPECT_RATIOS[aspectRatio];
  return `npx remotion render src/index.ts ${tpl.compositionId} ${outputFile} --props="./payload.json" --width=${dims.width} --height=${dims.height} --fps=${tpl.fps}`;
}

export function generateAgentToolManifest(
  templateId: TemplateId,
  aspectRatio: AspectRatioId
): string {
  const tpl = TEMPLATES[templateId];
  const manifest = {
    plugin: 'framehook-remotion-agent-plugin',
    version: '1.0.0',
    activeTemplate: tpl.id,
    compositionId: tpl.compositionId,
    defaultAspectRatio: aspectRatio,
    tools: [
      {
        name: 'render_dynamic_video',
        description:
          'Valida datos estructurados contra la plantilla de Remotion y encola o previsualiza un video dinámico personalizado.',
        parameters: {
          type: 'OBJECT',
          properties: {
            templateId: {
              type: 'STRING',
              enum: Object.keys(TEMPLATES),
              description: 'Identificador de la composición de Remotion.',
            },
            aspectRatio: {
              type: 'STRING',
              enum: ['16:9', '9:16', '1:1'],
              description: 'Relación de aspecto de salida del video.',
            },
            inputProps: {
              type: 'OBJECT',
              description: `Propiedades estructuradas requeridas para ${tpl.compositionId}.`,
              example: tpl.defaultProps,
            },
          },
          required: ['templateId', 'inputProps'],
        },
      },
      {
        name: 'queue_batch_video_render',
        description:
          'Automatiza la generación masiva de videos personalizados a partir de un arreglo de registros estructurados.',
        parameters: {
          type: 'OBJECT',
          properties: {
            templateId: {
              type: 'STRING',
              enum: Object.keys(TEMPLATES),
            },
            aspectRatio: {
              type: 'STRING',
              enum: ['16:9', '9:16', '1:1'],
            },
            records: {
              type: 'ARRAY',
              items: { type: 'OBJECT' },
              description: 'Lista de objetos con los datos de cada destinatario o producto.',
            },
          },
          required: ['templateId', 'records'],
        },
      },
    ],
  };

  return JSON.stringify(manifest, null, 2);
}

export function generateMcpServerCode(
  templateId: TemplateId,
  aspectRatio: AspectRatioId
): string {
  const tpl = TEMPLATES[templateId];
  return `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const PLUGIN_API = process.env.FRAMEHOOK_API_URL ?? "http://localhost:3000";

const server = new Server(
  { name: "framehook-remotion-plugin", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "render_${tpl.id.replace(/-/g, '_')}",
      description: "${tpl.description}",
      inputSchema: {
        type: "object",
        properties: {
          aspectRatio: { type: "string", enum: ["16:9", "9:16", "1:1"], default: "${aspectRatio}" },
          inputProps: { type: "object", description: "Datos estructurados para ${tpl.compositionId}" }
        },
        required: ["inputProps"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { aspectRatio = "${aspectRatio}", inputProps } = request.params.arguments as Record<string, unknown>;
  const res = await fetch(\`\${PLUGIN_API}/api/plugin/render\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      templateId: "${tpl.id}",
      aspectRatio,
      records: [inputProps]
    })
  });
  const job = await res.json();
  return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
});

await server.connect(new StdioServerTransport());`;
}

export function generateRemotionTsx(
  templateId: TemplateId,
  aspectRatio: AspectRatioId,
  props: CompositionProps
): string {
  const tpl = TEMPLATES[templateId];
  const dims = ASPECT_RATIOS[aspectRatio];
  const serializedProps = JSON.stringify(props, null, 2);
  const voiceover = props.voiceover;
  const hasAudio = Boolean(voiceover?.enabled || voiceover?.audioUrl);

  return `import React from "react";
import {
  AbsoluteFill,${hasAudio ? '\n  Audio,' : ''}
  Composition,
  Sequence,
  interpolate,
  spring,${hasAudio ? '\n  staticFile,' : ''}
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type ${tpl.compositionId}Props = ${JSON.stringify(
    Object.fromEntries(Object.keys(props).map((k) => [k, typeof (props as Record<string, unknown>)[k]])),
    null,
    2
  )};

export const ${tpl.compositionId}: React.FC<Record<string, unknown>> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const introScale = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const outroOpacity = interpolate(frame, [132, 148], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const voiceover = props.voiceover as { enabled?: boolean; audioUrl?: string } | undefined;
  const isDaySkin = props.skin === "day";
  const bgColor = isDaySkin ? "#F8FAFC" : "#0C0F14";
  const textColor = isDaySkin ? "#0F172A" : "#F8FAFC";

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, color: textColor, padding: 64 }}>${
      hasAudio
        ? `
      {voiceover?.enabled && voiceover?.audioUrl ? (
        <Audio
          src={
            voiceover.audioUrl.startsWith("http")
              ? voiceover.audioUrl
              : staticFile(voiceover.audioUrl.replace(/^\\//, ""))
          }
        />
      ) : null}`
        : ''
    }
      <Sequence from={0} durationInFrames={50}>
        <div style={{ transform: \`scale(\${0.94 + introScale * 0.06})\` }}>
          <p style={{ color: String(props.accentColor ?? "#E14D2A"), fontSize: 22 }}>
            {String(props.brandName ?? "")}
          </p>
          <h1 style={{ fontSize: 64, fontWeight: 700 }}>
            {String(props.headline ?? props.productName ?? props.customerName ?? props.quote ?? "")}
          </h1>
        </div>
      </Sequence>

      <Sequence from={132} durationInFrames={48}>
        <div style={{ opacity: outroOpacity, marginTop: "auto" }}>
          <span style={{ fontSize: 28, fontWeight: 600 }}>{String(props.ctaText ?? "")}</span>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="${tpl.compositionId}"
    component={${tpl.compositionId}}
    durationInFrames={${tpl.durationInFrames}}
    fps={${tpl.fps}}
    width={${dims.width}}
    height={${dims.height}}
    defaultProps={${serializedProps}}
  />
);`;
}

export function generateRestSnippet(
  templateId: TemplateId,
  aspectRatio: AspectRatioId,
  props: CompositionProps
): string {
  const cli = buildRemotionCliCommand(templateId, aspectRatio);
  const voice = props.voiceover?.voice || 'es-MX-DaliaNeural';
  const script =
    props.voiceover?.script ||
    `Resumen dinámico generado con FrameHook para ${props.brandName}.`;
  const audioFile = (props.voiceover?.audioUrl || '/audio/voiceover.mp3').replace(/^\//, '');

  const body = JSON.stringify(
    {
      templateId,
      aspectRatio,
      records: [props],
    },
    null,
    2
  );

  return `# 1. Generar locución mexicana local con edge-tts
edge-tts --voice "${voice}" \\
  --text "${script.replace(/"/g, '\\"')}" \\
  --write-media "public/${audioFile}"

# 2. Invocar el plugin desde tu agente IA local o webhook
curl -X POST http://localhost:3000/api/plugin/render \\
  -H "Content-Type: application/json" \\
  -d '${body.replace(/'/g, "\\'")}'

# 3. Comando equivalente en Remotion CLI para renderizado MP4 con audio
${cli}`;
}

export interface SkillMarkdownOptions {
  panoraPath?: string;
  factoryPath?: string;
  framehookPath?: string;
}

export function generateSkillMarkdown(
  templateId: TemplateId,
  aspectRatio: AspectRatioId,
  props: CompositionProps,
  options: SkillMarkdownOptions = {}
): string {
  const tpl = TEMPLATES[templateId];
  const dims = ASPECT_RATIOS[aspectRatio];
  const panoraPath = options.panoraPath ?? '../remotion-panora-mcp';
  const factoryPath = options.factoryPath ?? '../remotion-video-factory';
  const framehookPath = options.framehookPath ?? '../framehook';
  const voice = props.voiceover?.voice || 'es-MX-DaliaNeural';
  const script =
    props.voiceover?.script ||
    `Locución generada por FrameHook para ${props.brandName}.`;
  const audioFile = (props.voiceover?.audioUrl || '/audio/voiceover.mp3').replace(/^\//, '');
  const skin = props.skin ?? 'night';
  const cli = buildRemotionCliCommand(templateId, aspectRatio, `out/${templateId}-${skin}.mp4`);
  const payloadJson = JSON.stringify(props, null, 2);

  return `---
name: framehook
description: >
  Estudio visual de Remotion, cola de renderizado por lotes y Editor/Exportador de Skills con locución mexicana edge-tts y soporte de skin Día/Noche ("day" | "night"). Úsalo cuando el agente IA necesite transformar datos estructurados JSON/CSV en composiciones Remotion validadas o coordinarse con remotion-panora-mcp y remotion-video-factory.
---

# FrameHook — Skill de Remotion para Agentes IA

**FrameHook** actúa como el puente de datos estructurados, previsualización determinista y orquestación por lotes dentro de tu arquitectura de producción Remotion.

## Arquitectura de carpetas hermanas

- \`${framehookPath}/\` ➔ **Estudio visual FrameHook**, cola por lotes, validación Zod (\`skin: "day" | "night"\`) y Editor/Exportador de Skills con \`edge-tts\`.
- \`${panoraPath}/\` ➔ **Librería Panora MCP** con 399 widgets animados deterministas invocables en escenas Remotion.
- \`${factoryPath}/\` ➔ **Motor central Remotion Video Factory** para renderizado final de producciones documentales, cápsulas y videos largos.

## Capacidades principales de la Skill

1. **Validación estricta de Props (Zod)**: Verifica que cada payload cumpla con la plantilla activa (\`${tpl.id}\` ➔ \`${tpl.compositionId}\`) antes de invocar el renderizador.
2. **Parámetro \`skin\` Día / Noche**:
   - \`"day"\`: Paleta editorial luminosa (\`#F8FAFC\`) con tarjetas blancas y tipografía oscura (\`#0F172A\`).
   - \`"night"\`: Paleta de estudio oscuro (\`#0C0F14\`) con alto contraste y acentos cromáticos.
3. **Locución mexicana local (\`edge-tts\`)**: Síntesis neural con voces \`es-MX-DaliaNeural\`, \`es-MX-JorgeNeural\`, \`es-MX-BeatrizNeural\`, \`es-MX-CandelaNeural\` y \`es-MX-CecilioNeural\` sincronizadas mediante \`<Audio src={staticFile(...)} />\`.

## Plantilla activa: \`${tpl.compositionId}\` (\`${tpl.id}\`)

- **Resolución y formato**: \`${dims.width}x${dims.height}\` (\`${aspectRatio}\`) a \`${tpl.fps} fps\` (\`${tpl.durationInFrames}\` fotogramas).
- **Skin configurada**: \`"${skin}"\`
- **Voz \`edge-tts\`**: \`${voice}\`

### 1. Payload JSON validado (\`payload.json\`)

\`\`\`json
${payloadJson}
\`\`\`

### 2. Flujo de ejecución para el Agente IA

\`\`\`bash
# Paso A: Generar audio neural mexicano con edge-tts
edge-tts --voice "${voice}" \\
  --text "${script.replace(/"/g, '\\"')}" \\
  --write-media "public/${audioFile}"

# Paso B: Validar y encolar en FrameHook Studio API
curl -X POST http://localhost:3000/api/plugin/render \\
  -H "Content-Type: application/json" \\
  -d '{"templateId":"${tpl.id}","aspectRatio":"${aspectRatio}","records":[${JSON.stringify(props)}]}'

# Paso C: Renderizar MP4 en ${factoryPath} o entorno local Remotion
${cli}
\`\`\`
`;
}

export function buildFrameHookBundleEntries(
  templateId: TemplateId,
  aspectRatio: AspectRatioId,
  props: CompositionProps,
  customSkillMarkdown?: string
): Array<{ path: string; content: string }> {
  const tpl = TEMPLATES[templateId];
  const skillMd =
    customSkillMarkdown ?? generateSkillMarkdown(templateId, aspectRatio, props);

  const readmeMd = `# FrameHook Plugin Package (${tpl.compositionId})

Instalación recomendada en tu arquitectura local de 3 carpetas hermanas:

\`\`\`text
workspace/
├── framehook/                # Estudio visual, cola por lotes y Editor de SKILL.md + edge-tts
├── remotion-panora-mcp/      # Librería de 399 widgets animados deterministas
└── remotion-video-factory/   # Motor central de renderizado Remotion
\`\`\`

## Archivos incluidos en este paquete

- \`framehook/SKILL.md\`: Definición de la Skill para que tu agente IA invoque FrameHook, \`edge-tts\` y Remotion CLI.
- \`framehook/remotion/${tpl.compositionId}.tsx\`: Composición React + Remotion con soporte de \`skin: "day" | "night"\` y \`<Audio />\`.
- \`framehook/mcp/framehook-mcp-${templateId}.ts\`: Servidor Model Context Protocol (MCP).
- \`framehook/tools/framehook-tools-${templateId}.json\`: Esquema de herramientas para Gemini Function Calling.
- \`framehook/payloads/${templateId}-payload.json\`: Datos estructurados validados con Zod.
- \`framehook/scripts/render-${templateId}.sh\`: Script de síntesis \`edge-tts\` + renderizado Remotion CLI.
`;

  return [
    { path: 'framehook/SKILL.md', content: skillMd },
    { path: 'framehook/README.md', content: readmeMd },
    {
      path: `framehook/remotion/${tpl.compositionId}.tsx`,
      content: generateRemotionTsx(templateId, aspectRatio, props),
    },
    {
      path: `framehook/mcp/framehook-mcp-${templateId}.ts`,
      content: generateMcpServerCode(templateId, aspectRatio),
    },
    {
      path: `framehook/tools/framehook-tools-${templateId}.json`,
      content: generateAgentToolManifest(templateId, aspectRatio),
    },
    {
      path: `framehook/payloads/${templateId}-payload.json`,
      content: JSON.stringify(props, null, 2),
    },
    {
      path: `framehook/scripts/render-${templateId}.sh`,
      content: generateRestSnippet(templateId, aspectRatio, props),
    },
  ];
}

