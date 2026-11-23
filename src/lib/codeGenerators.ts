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

  return (
    <AbsoluteFill style={{ backgroundColor: "#0C0F14", color: "#F8FAFC", padding: 64 }}>${
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
