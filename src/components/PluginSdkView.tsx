import React, { useMemo, useState } from 'react';
import { Copy, Check, Download, Play } from 'lucide-react';
import {
  TEMPLATES,
  type AspectRatioId,
  type CompositionProps,
  type TemplateId,
} from '../lib/schemas';
import {
  generateAgentToolManifest,
  generateMcpServerCode,
  generateRemotionTsx,
  generateRestSnippet,
} from '../lib/codeGenerators';

type SdkTab = 'mcp' | 'tools' | 'remotion' | 'rest';

interface PluginSdkViewProps {
  templateId: TemplateId;
  aspectRatio: AspectRatioId;
  props: CompositionProps;
}

export const PluginSdkView: React.FC<PluginSdkViewProps> = ({
  templateId,
  aspectRatio,
  props,
}) => {
  const [activeTab, setActiveTab] = useState<SdkTab>('mcp');
  const [copied, setCopied] = useState(false);
  const [apiTestOutput, setApiTestOutput] = useState<{
    status: number;
    body: string;
  } | null>(null);
  const [testingApi, setTestingApi] = useState(false);

  const template = TEMPLATES[templateId];

  const artifact = useMemo(() => {
    switch (activeTab) {
      case 'mcp':
        return {
          filename: `framehook-mcp-${templateId}.ts`,
          subtitle: 'Servidor Model Context Protocol listo para agentes de escritorio o IDE',
          code: generateMcpServerCode(templateId, aspectRatio),
        };
      case 'tools':
        return {
          filename: `framehook-tools-${templateId}.json`,
          subtitle: 'Declaración JSON para Gemini Function Calling y agentes OpenAI',
          code: generateAgentToolManifest(templateId, aspectRatio),
        };
      case 'remotion':
        return {
          filename: `${template.compositionId}.tsx`,
          subtitle: 'Composición nativa en React + Remotion con tus propiedades actuales',
          code: generateRemotionTsx(templateId, aspectRatio, props),
        };
      case 'rest':
        return {
          filename: `render-${templateId}.sh`,
          subtitle: 'Llamada HTTP directa al endpoint del plugin y comando Remotion CLI',
          code: generateRestSnippet(templateId, aspectRatio, props),
        };
    }
  }, [activeTab, templateId, aspectRatio, props, template.compositionId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = artifact.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleTestLiveValidate = async () => {
    setTestingApi(true);
    try {
      const res = await fetch('/api/plugin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          inputProps: props,
        }),
      });
      const json = await res.json();
      setApiTestOutput({
        status: res.status,
        body: JSON.stringify(json, null, 2),
      });
    } catch (error) {
      setApiTestOutput({
        status: 0,
        body: JSON.stringify(
          { error: error instanceof Error ? error.message : 'Error de conexión' },
          null,
          2
        ),
      });
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Plugin SDK e Integración Remotion
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Exporta el servidor MCP, el esquema de herramientas para agentes IA o el código
            TSX sincronizado con la plantilla{' '}
            <span className="font-mono text-xs text-slate-900">{template.compositionId}</span>.
          </p>
        </div>

        {/* Format tabs */}
        <div
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200"
          role="tablist"
          aria-label="Formato de exportación del plugin"
        >
          {(
            [
              { id: 'mcp', label: 'MCP Server' },
              { id: 'tools', label: 'Gemini Tools' },
              { id: 'remotion', label: 'Remotion TSX' },
              { id: 'rest', label: 'REST / CLI' },
            ] as Array<{ id: SdkTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Code Viewer Card */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-xs font-semibold text-slate-900">
              {artifact.filename}
            </div>
            <div className="text-xs text-slate-500">{artifact.subtitle}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar código'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar archivo</span>
            </button>
          </div>
        </div>

        <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[420px]">
          {artifact.code}
        </pre>
      </section>

      {/* Live Server API Verification Box */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Prueba en vivo del endpoint de validación
            </h2>
            <p className="text-xs text-slate-500">
              Ejecuta <span className="font-mono">POST /api/plugin/validate</span> con tus
              datos actuales para verificar el contrato que consumirá tu agente IA.
            </p>
          </div>
          <button
            type="button"
            onClick={handleTestLiveValidate}
            disabled={testingApi}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E14D2A] text-xs font-semibold text-white hover:bg-[#C83E1D] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {testingApi ? 'Validando...' : 'Probar validación en servidor'}
            </span>
          </button>
        </div>

        {apiTestOutput && (
          <div className="rounded-lg border border-slate-200 overflow-hidden" data-testid="api-test-output">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono">
              <span>POST /api/plugin/validate</span>
              <span
                className={
                  apiTestOutput.status >= 200 && apiTestOutput.status < 300
                    ? 'text-emerald-700 font-semibold'
                    : 'text-red-700 font-semibold'
                }
              >
                HTTP {apiTestOutput.status}
              </span>
            </div>
            <pre className="p-3 bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-56">
              {apiTestOutput.body}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
};
