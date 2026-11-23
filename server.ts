import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import {
  ASPECT_RATIOS,
  GENERATED_PRODUCT_IMAGE,
  TEMPLATES,
  validateCompositionProps,
  type AspectRatioId,
  type CompositionProps,
  type TemplateId,
} from './src/lib/schemas.ts';
import {
  buildRemotionCliCommand,
  generateAgentToolManifest,
} from './src/lib/codeGenerators.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RenderJobRecord {
  id: string;
  templateId: TemplateId;
  compositionId: string;
  aspectRatio: AspectRatioId;
  label: string;
  status: 'completado' | 'encolado';
  createdAt: string;
  durationSeconds: number;
  resolution: string;
  cliCommand: string;
  inputProps: CompositionProps;
}

const renderJobs: RenderJobRecord[] = [
  {
    id: 'job_fh_1041',
    templateId: 'kpi-digest',
    compositionId: 'KpiDigestVideo',
    aspectRatio: '16:9',
    label: 'Finova Cloud — Sofía Morales (Q4 2026)',
    status: 'completado',
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    durationSeconds: 6,
    resolution: '1280×720',
    cliCommand: buildRemotionCliCommand('kpi-digest', '16:9', 'out/finova-q4.mp4'),
    inputProps: TEMPLATES['kpi-digest'].defaultProps,
  },
  {
    id: 'job_fh_1042',
    templateId: 'product-launch',
    compositionId: 'ProductSpotlightVideo',
    aspectRatio: '16:9',
    label: 'Klang Audio — Monolith Dial One',
    status: 'completado',
    createdAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    durationSeconds: 6,
    resolution: '1280×720',
    cliCommand: buildRemotionCliCommand('product-launch', '16:9', 'out/monolith-dial.mp4'),
    inputProps: TEMPLATES['product-launch'].defaultProps,
  },
];

let jobCounter = 1043;

function deriveJobLabel(templateId: TemplateId, props: CompositionProps): string {
  const p = props as Record<string, unknown>;
  if (templateId === 'kpi-digest') {
    return `${p.brandName ?? 'KPI'} — ${p.recipientName ?? 'Cliente'}`;
  }
  if (templateId === 'product-launch') {
    return `${p.brandName ?? 'Producto'} — ${p.productName ?? 'Lanzamiento'}`;
  }
  if (templateId === 'personalized-onboarding') {
    return `${p.customerName ?? 'Bienvenida'} (${p.companyName ?? 'CRM'})`;
  }
  return `${p.authorName ?? 'Editorial'} — ${p.brandName ?? 'Cita'}`;
}

function enqueueValidatedJob(
  templateId: TemplateId,
  aspectRatio: AspectRatioId,
  props: CompositionProps,
  status: 'completado' | 'encolado' = 'encolado'
): RenderJobRecord {
  const tpl = TEMPLATES[templateId];
  const dims = ASPECT_RATIOS[aspectRatio] ?? ASPECT_RATIOS['16:9'];
  const id = `job_fh_${jobCounter++}`;
  const slug = templateId.replace(/[^a-z0-9-]/gi, '');

  const job: RenderJobRecord = {
    id,
    templateId,
    compositionId: tpl.compositionId,
    aspectRatio,
    label: deriveJobLabel(templateId, props),
    status,
    createdAt: new Date().toISOString(),
    durationSeconds: Number((tpl.durationInFrames / tpl.fps).toFixed(1)),
    resolution: `${dims.width}×${dims.height}`,
    cliCommand: buildRemotionCliCommand(templateId, aspectRatio, `out/${slug}-${id}.mp4`),
    inputProps: props,
  };

  renderJobs.unshift(job);
  if (renderJobs.length > 40) {
    renderJobs.pop();
  }
  return job;
}

const agentPluginTools: FunctionDeclaration[] = [
  {
    name: 'render_dynamic_video',
    description:
      'Crea y valida la configuración estructurada de un video dinámico en Remotion para previsualización y renderizado inmediato.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        templateId: {
          type: Type.STRING,
          description:
            'Plantilla de Remotion: "kpi-digest", "product-launch", "personalized-onboarding" o "social-quote".',
        },
        aspectRatio: {
          type: Type.STRING,
          description: 'Formato del video: "16:9", "9:16" o "1:1".',
        },
        brandName: { type: Type.STRING, description: 'Nombre de la empresa o marca.' },
        accentColor: {
          type: Type.STRING,
          description: 'Color hexadecimal de acento de 6 dígitos (ej. #E14D2A, #0D9488, #2563EB).',
        },
        ctaText: { type: Type.STRING, description: 'Texto breve del botón de cierre.' },
        recipientName: { type: Type.STRING, description: 'Destinatario (para kpi-digest).' },
        period: { type: Type.STRING, description: 'Periodo del reporte (para kpi-digest).' },
        headline: { type: Type.STRING, description: 'Titular principal (para kpi-digest).' },
        metrics: {
          type: Type.ARRAY,
          description: 'Hasta 3 métricas KPI (para kpi-digest).',
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING },
              delta: { type: Type.STRING },
              score: { type: Type.NUMBER },
            },
            required: ['label', 'value', 'delta', 'score'],
          },
        },
        productName: { type: Type.STRING, description: 'Nombre del producto (para product-launch).' },
        tagline: { type: Type.STRING, description: 'Descripción breve (para product-launch).' },
        price: { type: Type.STRING, description: 'Precio con moneda (para product-launch).' },
        highlights: {
          type: Type.ARRAY,
          description: 'Lista de 3 características clave (para product-launch).',
          items: { type: Type.STRING },
        },
        customerName: { type: Type.STRING, description: 'Nombre del cliente (para personalized-onboarding).' },
        companyName: { type: Type.STRING, description: 'Empresa del cliente (para personalized-onboarding).' },
        planName: { type: Type.STRING, description: 'Plan contratado (para personalized-onboarding).' },
        accountManager: { type: Type.STRING, description: 'Ejecutivo asignado (para personalized-onboarding).' },
        nextSteps: {
          type: Type.ARRAY,
          description: 'Lista de 3 próximos pasos (para personalized-onboarding).',
          items: { type: Type.STRING },
        },
        quote: { type: Type.STRING, description: 'Cita editorial principal (para social-quote).' },
        authorName: { type: Type.STRING, description: 'Autor de la cita (para social-quote).' },
        authorRole: { type: Type.STRING, description: 'Cargo del autor (para social-quote).' },
        statHighlight: { type: Type.STRING, description: 'Dato de respaldo (para social-quote).' },
      },
      required: ['templateId', 'aspectRatio', 'brandName', 'ctaText'],
    },
  },
  {
    name: 'queue_batch_video_render',
    description:
      'Encola un lote de múltiples videos personalizados de Remotion para automatización masiva.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        templateId: {
          type: Type.STRING,
          description:
            'Plantilla: "kpi-digest", "product-launch", "personalized-onboarding" o "social-quote".',
        },
        aspectRatio: {
          type: Type.STRING,
          description: 'Formato: "16:9", "9:16" o "1:1".',
        },
        items: {
          type: Type.ARRAY,
          description: 'Arreglo de 2 a 5 videos personalizados con campos compatibles con la plantilla.',
          items: {
            type: Type.OBJECT,
            properties: {
              brandName: { type: Type.STRING },
              recipientName: { type: Type.STRING },
              customerName: { type: Type.STRING },
              companyName: { type: Type.STRING },
              productName: { type: Type.STRING },
              headline: { type: Type.STRING },
              tagline: { type: Type.STRING },
              price: { type: Type.STRING },
              planName: { type: Type.STRING },
              accountManager: { type: Type.STRING },
              period: { type: Type.STRING },
              quote: { type: Type.STRING },
              authorName: { type: Type.STRING },
              authorRole: { type: Type.STRING },
              statHighlight: { type: Type.STRING },
              accentColor: { type: Type.STRING },
              ctaText: { type: Type.STRING },
            },
          },
        },
      },
      required: ['templateId', 'aspectRatio', 'items'],
    },
  },
];

function normalizeAgentArgsToProps(
  templateId: TemplateId,
  args: Record<string, unknown>
): Record<string, unknown> {
  const defaults = structuredClone(TEMPLATES[templateId].defaultProps) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...defaults };

  for (const [key, val] of Object.entries(args)) {
    if (key === 'templateId' || key === 'aspectRatio') continue;
    if (val !== undefined && val !== null && val !== '') {
      merged[key] = val;
    }
  }

  if (templateId === 'product-launch' && !merged.imageUrl) {
    merged.imageUrl = GENERATED_PRODUCT_IMAGE;
  }
  if (typeof merged.accentColor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(merged.accentColor)) {
    merged.accentColor = (defaults.accentColor as string) || '#E14D2A';
  }
  return merged;
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/plugin/manifest', (req, res) => {
    const templateId = (String(req.query.templateId || 'kpi-digest')) as TemplateId;
    const aspectRatio = (String(req.query.aspectRatio || '16:9')) as AspectRatioId;
    const safeTemplate = TEMPLATES[templateId] ? templateId : 'kpi-digest';
    const safeRatio = ASPECT_RATIOS[aspectRatio] ? aspectRatio : '16:9';

    res.json({
      manifest: JSON.parse(generateAgentToolManifest(safeTemplate, safeRatio)),
      templates: Object.values(TEMPLATES).map((t) => ({
        id: t.id,
        compositionId: t.compositionId,
        name: t.name,
        fps: t.fps,
        durationInFrames: t.durationInFrames,
        defaultAspectRatio: t.defaultAspectRatio,
      })),
    });
  });

  app.post('/api/plugin/validate', (req, res) => {
    const { templateId, inputProps } = req.body ?? {};
    if (typeof templateId !== 'string' || !inputProps || typeof inputProps !== 'object') {
      res.status(400).json({
        valid: false,
        errors: [{ path: 'body', message: 'Debes enviar templateId e inputProps como objeto JSON.' }],
      });
      return;
    }

    const result = validateCompositionProps(templateId, inputProps);
    res.status(result.valid ? 200 : 422).json(result);
  });

  app.get('/api/plugin/jobs', (_req, res) => {
    res.json({ jobs: renderJobs });
  });

  app.post('/api/plugin/render', (req, res) => {
    const { templateId, aspectRatio = '16:9', records, status = 'encolado' } = req.body ?? {};
    if (typeof templateId !== 'string' || !TEMPLATES[templateId as TemplateId]) {
      res.status(400).json({ error: 'Plantilla de Remotion inválida.' });
      return;
    }
    const safeRatio: AspectRatioId = ASPECT_RATIOS[aspectRatio as AspectRatioId]
      ? (aspectRatio as AspectRatioId)
      : '16:9';

    const list = Array.isArray(records) ? records : [];
    if (list.length === 0) {
      res.status(400).json({ error: 'Debes enviar al menos un registro en records[].' });
      return;
    }

    const created: RenderJobRecord[] = [];
    const rejected: Array<{ index: number; errors: unknown[] }> = [];

    list.forEach((rec, index) => {
      const check = validateCompositionProps(templateId, rec);
      if (check.valid && check.data) {
        created.push(
          enqueueValidatedJob(
            templateId as TemplateId,
            safeRatio,
            check.data,
            status === 'completado' ? 'completado' : 'encolado'
          )
        );
      } else {
        rejected.push({ index, errors: check.errors });
      }
    });

    if (created.length === 0) {
      res.status(422).json({
        error: 'Ningún registro superó la validación del esquema.',
        rejected,
      });
      return;
    }

    res.status(201).json({
      queuedCount: created.length,
      rejectedCount: rejected.length,
      jobs: created,
      rejected,
    });
  });

  app.post('/api/agent/invoke', async (req, res) => {
    const { prompt, activeTemplateId = 'kpi-digest' } = req.body ?? {};
    if (typeof prompt !== 'string' || prompt.trim().length < 4) {
      res.status(400).json({
        error: 'Escribe una instrucción descriptiva para que el agente invoque el plugin.',
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY no está configurada en el entorno del servidor. Configúrala en Settings > Secrets para ejecutar invocaciones en vivo del agente.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt.trim(),
        config: {
          systemInstruction:
            `Eres un agente de automatización multimedia conectado al plugin FrameHook de Remotion. ` +
            `Siempre responde en español y utiliza obligatoriamente las herramientas del plugin (` +
            `render_dynamic_video para un solo video o queue_batch_video_render cuando pidan varios videos o un lote). ` +
            `Plantilla activa sugerida si el usuario no especifica otra: ${activeTemplateId}. ` +
            `Extrae todos los números, nombres, marcas y pasos reales del mensaje del usuario.`,
          tools: [{ functionDeclarations: agentPluginTools }],
        },
      });

      const calls = response.functionCalls ?? [];
      const executedTraces: Array<{
        toolName: string;
        args: Record<string, unknown>;
        validationValid: boolean;
        jobsCreated: RenderJobRecord[];
      }> = [];

      let previewResult: {
        templateId: TemplateId;
        aspectRatio: AspectRatioId;
        props: CompositionProps;
      } | null = null;

      let batchPreviewItems: Array<{
        templateId: TemplateId;
        props: CompositionProps;
      }> = [];

      for (const call of calls) {
        const args = (call.args ?? {}) as Record<string, unknown>;
        const rawTpl = String(args.templateId || activeTemplateId);
        const templateId: TemplateId = TEMPLATES[rawTpl as TemplateId]
          ? (rawTpl as TemplateId)
          : 'kpi-digest';
        const rawRatio = String(args.aspectRatio || TEMPLATES[templateId].defaultAspectRatio);
        const aspectRatio: AspectRatioId = ASPECT_RATIOS[rawRatio as AspectRatioId]
          ? (rawRatio as AspectRatioId)
          : '16:9';

        if (call.name === 'queue_batch_video_render' && Array.isArray(args.items)) {
          const jobsCreated: RenderJobRecord[] = [];
          for (const rawItem of args.items) {
            if (!rawItem || typeof rawItem !== 'object') continue;
            const normalized = normalizeAgentArgsToProps(
              templateId,
              rawItem as Record<string, unknown>
            );
            const validation = validateCompositionProps(templateId, normalized);
            if (validation.valid && validation.data) {
              jobsCreated.push(enqueueValidatedJob(templateId, aspectRatio, validation.data));
              batchPreviewItems.push({ templateId, props: validation.data });
              if (!previewResult) {
                previewResult = { templateId, aspectRatio, props: validation.data };
              }
            }
          }
          executedTraces.push({
            toolName: call.name,
            args,
            validationValid: jobsCreated.length > 0,
            jobsCreated,
          });
        } else {
          const normalized = normalizeAgentArgsToProps(templateId, args);
          const validation = validateCompositionProps(templateId, normalized);
          const jobsCreated: RenderJobRecord[] = [];
          if (validation.valid && validation.data) {
            jobsCreated.push(enqueueValidatedJob(templateId, aspectRatio, validation.data));
            previewResult = { templateId, aspectRatio, props: validation.data };
          }
          executedTraces.push({
            toolName: call.name || 'render_dynamic_video',
            args: normalized,
            validationValid: validation.valid,
            jobsCreated,
          });
        }
      }

      res.json({
        model: 'gemini-4-hydrogen',
        assistantText:
          response.text ||
          (executedTraces.length > 0
            ? `El agente invocó ${executedTraces.length} herramienta(s) del plugin FrameHook y validó los datos para Remotion.`
            : 'El modelo respondió sin invocar herramientas del plugin. Intenta especificar datos concretos para el video.'),
        traces: executedTraces,
        preview: previewResult,
        batchItems: batchPreviewItems,
        allJobs: renderJobs,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al contactar con la API de Gemini.';
      res.status(502).json({
        error: `Error del agente Gemini: ${message}`,
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`FrameHook Remotion Plugin Studio escuchando en http://0.0.0.0:${port}`);
  });
}

createServer();
