import React, { useState } from 'react';
import { Send, ArrowUpRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  TEMPLATES,
  type AspectRatioId,
  type CompositionProps,
  type TemplateId,
} from '../lib/schemas';

export interface ServerRenderJob {
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

interface AgentTraceItem {
  toolName: string;
  args: Record<string, unknown>;
  validationValid: boolean;
  jobsCreated: ServerRenderJob[];
}

interface AgentResponsePayload {
  model: string;
  assistantText: string;
  traces: AgentTraceItem[];
  preview: {
    templateId: TemplateId;
    aspectRatio: AspectRatioId;
    props: CompositionProps;
  } | null;
  batchItems: Array<{
    templateId: TemplateId;
    props: CompositionProps;
  }>;
  allJobs: ServerRenderJob[];
}

interface AgentSandboxProps {
  activeTemplateId: TemplateId;
  onApplyPreview: (
    templateId: TemplateId,
    aspectRatio: AspectRatioId,
    props: CompositionProps
  ) => void;
  onJobsUpdated: (jobs: ServerRenderJob[]) => void;
  onImportAgentBatch: (
    templateId: TemplateId,
    items: CompositionProps[]
  ) => void;
}

const EXAMPLE_PROMPTS = [
  {
    title: 'Reporte KPI Q4 para cliente SaaS',
    prompt:
      'Crea un video 16:9 de reporte KPI Q4 2026 para Elena Ríos en NubePay. Titular: Expansión récord en pagos recurrentes. Métricas: Volumen $14.8M (+42%), Retención 121% (+7 pts), Activación 84% (+15%). Acento #0D9488.',
  },
  {
    title: 'Lanzamiento de producto e-commerce',
    prompt:
      'Genera un video 16:9 de lanzamiento para el producto "Sintetizador Pulse M2" de la marca Forma Lab a $420 USD. Subtítulo: Síntesis analógica compacta con secuenciador MIDI por USB-C. Incluye 3 características técnicas.',
  },
  {
    title: 'Lote de 3 videos de bienvenida CRM',
    prompt:
      'Encola un lote de 3 videos de bienvenida personalizada (16:9) de la marca Norte CRM para: 1) Clara Soto de AgroSur (Plan Enterprise), 2) Marcos Peña de FinTech Uno (Plan Escala) y 3) Lucía Vidal de Clínica Sol (Plan Pro).',
  },
  {
    title: 'Cápsula vertical 9:16 con testimonio',
    prompt:
      'Prepara una cápsula vertical 9:16 de cita editorial para FrameHook. Cita: Automatizamos 900 resúmenes en video cada lunes a las 7 AM sin editar una sola línea a mano. Autor: Gabriel Morales, CTO en Métrica Viva. Dato: 900 videos en 6 minutos.',
  },
];

export const AgentSandbox: React.FC<AgentSandboxProps> = ({
  activeTemplateId,
  onApplyPreview,
  onJobsUpdated,
  onImportAgentBatch,
}) => {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0].prompt);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResponsePayload | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setErrorMsg('Escribe una instrucción con datos concretos para invocar el plugin.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/agent/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          activeTemplateId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || `Error HTTP ${res.status} al invocar el agente.`);
        return;
      }
      setResult(data as AgentResponsePayload);
      if (Array.isArray(data.allJobs)) {
        onJobsUpdated(data.allJobs);
      }
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : 'No fue posible conectar con el servidor.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1fr] gap-6 items-start">
      {/* Left: Prompt composer & declared plugin tools */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Sandbox de Agente IA
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Envía instrucciones en lenguaje natural o datos sin estructurar. El agente
            selecciona la plantilla de Remotion, invoca el plugin mediante{' '}
            <span className="font-mono text-xs text-slate-800">Function Calling</span> y
            valida cada propiedad antes de encolar el render.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="agent-prompt-input" className="text-xs font-semibold text-slate-700">
            Instrucción o registro entrante para el agente
          </label>
          <textarea
            id="agent-prompt-input"
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe el video o pega los datos del cliente/producto..."
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 leading-relaxed focus:outline-none focus:border-slate-400"
          />

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-1">
            <div className="text-xs text-slate-500">
              Herramientas declaradas:{' '}
              <span className="font-mono text-slate-700">render_dynamic_video</span>
              {' · '}
              <span className="font-mono text-slate-700">queue_batch_video_render</span>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#E14D2A] hover:bg-[#C83E1D] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{isLoading ? 'Ejecutando agente...' : 'Invocar plugin con IA'}</span>
              </button>
            </div>
          </div>
        </form>

        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
          <h2 className="text-xs font-semibold text-slate-700">
            Escenarios rápidos de automatización
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {EXAMPLE_PROMPTS.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setPrompt(item.prompt)}
                className="text-left rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="text-xs font-semibold text-slate-900">{item.title}</div>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.prompt}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Right: Tool Call Trace Inspector */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Traza de invocación del plugin
            </h2>
            <p className="text-xs text-slate-500">
              Llamadas estructuradas ejecutadas por el agente contra Remotion
            </p>
          </div>
          {result && (
            <span className="font-mono text-xs text-slate-500">{result.model}</span>
          )}
        </div>

        {!result ? (
          <div className="py-14 text-center flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-slate-800">
              Aún no se ha ejecutado ninguna invocación
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              Selecciona uno de los escenarios de ejemplo o redacta una instrucción para ver
              el JSON exacto que el agente envía al plugin de Remotion.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-700 leading-relaxed">{result.assistantText}</p>

            {result.preview && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs">
                  <div className="font-semibold text-slate-900">
                    Composición lista:{' '}
                    {TEMPLATES[result.preview.templateId].compositionId}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Formato {result.preview.aspectRatio} · Validado con Zod
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {result.batchItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onImportAgentBatch(
                          result.batchItems[0].templateId,
                          result.batchItems.map((b) => b.props)
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Ver lote ({result.batchItems.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      result.preview &&
                      onApplyPreview(
                        result.preview.templateId,
                        result.preview.aspectRatio,
                        result.preview.props
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Abrir en Estudio</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {result.traces.map((trace, idx) => (
              <div
                key={`${trace.toolName}-${idx}`}
                className="rounded-lg border border-slate-200 overflow-hidden"
              >
                <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold text-slate-900">
                    {trace.toolName}()
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      trace.validationValid ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {trace.validationValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {trace.validationValid
                        ? `${trace.jobsCreated.length} render(s) encolado(s)`
                        : 'Validación fallida'}
                    </span>
                  </span>
                </div>
                <pre className="p-3.5 bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72">
                  {JSON.stringify(trace.args, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
