import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Download, Play, RotateCcw, FolderGit2, Archive } from 'lucide-react';
import {
  TEMPLATES,
  type AspectRatioId,
  type CompositionProps,
  type TemplateId,
} from '../lib/schemas';
import {
  buildFrameHookBundleEntries,
  generateAgentToolManifest,
  generateMcpServerCode,
  generateRemotionTsx,
  generateRestSnippet,
  generateSkillMarkdown,
} from '../lib/codeGenerators';
import { buildZipArchive } from '../lib/zipBuilder';

type SdkTab = 'skill' | 'mcp' | 'tools' | 'remotion' | 'rest';

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
  const [activeTab, setActiveTab] = useState<SdkTab>('skill');
  const [copied, setCopied] = useState(false);
  const [panoraPath, setPanoraPath] = useState('../remotion-panora-mcp');
  const [factoryPath, setFactoryPath] = useState('../remotion-video-factory');
  const [isCustomSkillEdited, setIsCustomSkillEdited] = useState(false);
  const [skillDraft, setSkillDraft] = useState('');
  const [apiTestOutput, setApiTestOutput] = useState<{
    status: number;
    body: string;
  } | null>(null);
  const [testingApi, setTestingApi] = useState(false);

  const template = TEMPLATES[templateId];

  const generatedSkillMd = useMemo(
    () =>
      generateSkillMarkdown(templateId, aspectRatio, props, {
        panoraPath,
        factoryPath,
        framehookPath: '../framehook',
      }),
    [templateId, aspectRatio, props, panoraPath, factoryPath]
  );

  useEffect(() => {
    if (!isCustomSkillEdited) {
      setSkillDraft(generatedSkillMd);
    }
  }, [generatedSkillMd, isCustomSkillEdited]);

  const handleResetSkillDraft = () => {
    setIsCustomSkillEdited(false);
    setSkillDraft(generatedSkillMd);
  };

  const artifact = useMemo(() => {
    switch (activeTab) {
      case 'skill':
        return {
          filename: 'SKILL.md',
          subtitle:
            'Editor y exportador interactivo de SKILL.md para agentes IA con edge-tts y carpetas hermanas',
          code: skillDraft || generatedSkillMd,
        };
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
  }, [
    activeTab,
    templateId,
    aspectRatio,
    props,
    template.compositionId,
    skillDraft,
    generatedSkillMd,
  ]);

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

  const handleDownloadZipBundle = () => {
    const entries = buildFrameHookBundleEntries(
      templateId,
      aspectRatio,
      props,
      skillDraft || generatedSkillMd
    );
    const zipBytes = buildZipArchive(entries);
    const blob = new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `framehook-${templateId}-bundle.zip`;
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
            Plugin SDK y Editor de SKILL.md
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Edita el <span className="font-mono text-xs text-slate-900">SKILL.md</span> o descarga
            el paquete ZIP de <span className="font-semibold text-slate-900">FrameHook</span>{' '}
            sincronizado con{' '}
            <span className="font-mono text-xs text-slate-900">{template.compositionId}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Format tabs */}
          <div
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200"
            role="tablist"
            aria-label="Formato de exportación del plugin"
          >
            {(
              [
                { id: 'skill', label: 'SKILL.md' },
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
                data-testid={`sdk-tab-${tab.id}`}
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

          <button
            type="button"
            data-testid="download-bundle-zip"
            onClick={handleDownloadZipBundle}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E14D2A] text-xs font-semibold text-white hover:bg-[#C83E1D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Descargar ZIP FrameHook</span>
          </button>
        </div>
      </div>

      {/* Sister Folders Architecture Card when SKILL.md is active */}
      {activeTab === 'skill' && (
        <section
          className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3"
          aria-label="Arquitectura de carpetas hermanas"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-[#E14D2A]" />
              <h2 className="text-sm font-semibold text-slate-900">
                Arquitectura local de carpetas hermanas
              </h2>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              Skin activa: &quot;{props.skin ?? 'night'}&quot; · Voz:{' '}
              {props.voiceover?.voice ?? 'es-MX-DaliaNeural'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="font-mono font-semibold text-slate-900">../framehook/</div>
              <p className="mt-1 text-slate-600">
                Estudio visual, cola por lotes, validación Zod y Editor/Exportador de SKILL.md con
                edge-tts.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="block">
                <span className="font-semibold text-slate-700">Ruta librería de widgets</span>
                <input
                  type="text"
                  value={panoraPath}
                  onChange={(e) => setPanoraPath(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1 rounded border border-slate-200 bg-white font-mono text-xs text-slate-900"
                />
              </label>
              <p className="mt-1 text-slate-500">399 widgets animados deterministas.</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="block">
                <span className="font-semibold text-slate-700">Ruta motor de renderizado</span>
                <input
                  type="text"
                  value={factoryPath}
                  onChange={(e) => setFactoryPath(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1 rounded border border-slate-200 bg-white font-mono text-xs text-slate-900"
                />
              </label>
              <p className="mt-1 text-slate-500">
                Motor central Remotion para documentales y videos largos.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Code Viewer / Interactive SKILL.md Editor Card */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-900">
                {artifact.filename}
              </span>
              {activeTab === 'skill' && isCustomSkillEdited && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Editado manualmente
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">{artifact.subtitle}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'skill' && isCustomSkillEdited && (
              <button
                type="button"
                onClick={handleResetSkillDraft}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sincronizar con plantilla</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Copiado' : 'Copiar código'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar {artifact.filename}</span>
            </button>
          </div>
        </div>

        {activeTab === 'skill' ? (
          <div className="bg-slate-950 p-4">
            <label htmlFor="skill-md-textarea" className="sr-only">
              Editor interactivo de SKILL.md
            </label>
            <textarea
              id="skill-md-textarea"
              data-testid="skill-md-editor"
              value={skillDraft}
              onChange={(e) => {
                setIsCustomSkillEdited(true);
                setSkillDraft(e.target.value);
              }}
              rows={20}
              spellCheck={false}
              className="w-full bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none resize-y"
            />
          </div>
        ) : (
          <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto max-h-[420px]">
            {artifact.code}
          </pre>
        )}
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
