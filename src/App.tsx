import React, { useCallback, useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import {
  TEMPLATES,
  type AspectRatioId,
  type CompositionProps,
  type TemplateId,
} from './lib/schemas';
import {
  getSeededBatchItems,
  parseBatchRecords,
  type BatchRowItem,
} from './lib/batchParser';
import { exportCompositionToWebM } from './remotion/exportVideo';
import { RemotionStage } from './components/RemotionStage';
import { PropsInspector } from './components/PropsInspector';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { AgentSandbox, type ServerRenderJob } from './components/AgentSandbox';
import { BatchAutomationView } from './components/BatchAutomationView';
import { PluginSdkView } from './components/PluginSdkView';

type ActiveView = 'studio' | 'agent' | 'batch' | 'sdk';

const NAV_ITEMS: Array<{ id: ActiveView; label: string }> = [
  { id: 'studio', label: 'Estudio' },
  { id: 'agent', label: 'Agente IA' },
  { id: 'batch', label: 'Lotes' },
  { id: 'sdk', label: 'Plugin SDK' },
];

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('studio');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [templateId, setTemplateId] = useState<TemplateId>('kpi-digest');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>('16:9');
  const [propsByTemplate, setPropsByTemplate] = useState<Record<TemplateId, CompositionProps>>(() => ({
    'kpi-digest': structuredClone(TEMPLATES['kpi-digest'].defaultProps),
    'product-launch': structuredClone(TEMPLATES['product-launch'].defaultProps),
    'personalized-onboarding': structuredClone(TEMPLATES['personalized-onboarding'].defaultProps),
    'social-quote': structuredClone(TEMPLATES['social-quote'].defaultProps),
  }));

  const [frame, setFrame] = useState(104);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [lastExportUrl, setLastExportUrl] = useState<{ url: string; filename: string } | null>(null);
  const [renderNotice, setRenderNotice] = useState<string | null>(null);

  const [jobs, setJobs] = useState<ServerRenderJob[]>([]);
  const [batchByTemplate, setBatchByTemplate] = useState<Record<TemplateId, BatchRowItem[]>>(() => ({
    'kpi-digest': getSeededBatchItems('kpi-digest'),
    'product-launch': getSeededBatchItems('product-launch'),
    'personalized-onboarding': getSeededBatchItems('personalized-onboarding'),
    'social-quote': getSeededBatchItems('social-quote'),
  }));

  const currentTemplate = TEMPLATES[templateId];
  const currentProps = propsByTemplate[templateId];

  // Fetch initial render queue from server
  useEffect(() => {
    let active = true;
    fetch('/api/plugin/jobs')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
        }
      })
      .catch(() => {
        // Keep empty queue gracefully on initial offline state
      });
    return () => {
      active = false;
    };
  }, []);

  // Deterministic 30fps playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.round(1000 / currentTemplate.fps);
    const id = window.setInterval(() => {
      setFrame((prev) => {
        if (prev >= currentTemplate.durationInFrames - 1) {
          if (isLooping) return 0;
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [isPlaying, isLooping, currentTemplate.fps, currentTemplate.durationInFrames]);

  const handleSelectTemplate = (id: TemplateId) => {
    setTemplateId(id);
    setAspectRatio(TEMPLATES[id].defaultAspectRatio);
    setFrame(104);
    setIsPlaying(false);
  };

  const handleUpdateCurrentProps = (next: CompositionProps) => {
    setPropsByTemplate((prev) => ({
      ...prev,
      [templateId]: next,
    }));
  };

  const handleResetProps = () => {
    setPropsByTemplate((prev) => ({
      ...prev,
      [templateId]: structuredClone(TEMPLATES[templateId].defaultProps),
    }));
  };

  const handleRenderVideo = useCallback(async () => {
    if (isExporting) return;
    setActiveView('studio');
    setIsPlaying(false);
    setIsExporting(true);
    setExportProgress(5);
    setRenderNotice(null);

    try {
      const exported = await exportCompositionToWebM({
        templateId,
        aspectRatio,
        props: currentProps,
        onProgress: setExportProgress,
      });

      setLastExportUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url: exported.blobUrl, filename: exported.filename };
      });

      const res = await fetch('/api/plugin/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          aspectRatio,
          records: [currentProps],
          status: 'completado',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.jobs)) {
          setJobs((prev) => [...data.jobs, ...prev]);
        }
      }

      setRenderNotice(
        `Video ${exported.filename} renderizado (${Math.max(1, Math.round(exported.sizeBytes / 1024))} KB) y registrado en la cola.`
      );
    } catch (error) {
      setRenderNotice(
        error instanceof Error ? error.message : 'No fue posible renderizar el video.'
      );
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, templateId, aspectRatio, currentProps]);

  const handleLoadJob = (job: ServerRenderJob) => {
    setTemplateId(job.templateId);
    setAspectRatio(job.aspectRatio);
    setPropsByTemplate((prev) => ({
      ...prev,
      [job.templateId]: structuredClone(job.inputProps),
    }));
    setFrame(64);
    setActiveView('studio');
  };

  const handleApplyAgentPreview = (
    nextTemplateId: TemplateId,
    nextRatio: AspectRatioId,
    nextProps: CompositionProps
  ) => {
    setTemplateId(nextTemplateId);
    setAspectRatio(nextRatio);
    setPropsByTemplate((prev) => ({
      ...prev,
      [nextTemplateId]: nextProps,
    }));
    setFrame(104);
    setActiveView('studio');
  };

  const handleImportAgentBatch = (
    batchTemplateId: TemplateId,
    items: CompositionProps[]
  ) => {
    const parsed = parseBatchRecords(batchTemplateId, JSON.stringify(items));
    setTemplateId(batchTemplateId);
    setBatchByTemplate((prev) => ({
      ...prev,
      [batchTemplateId]: [...parsed.items, ...prev[batchTemplateId]],
    }));
    setActiveView('batch');
  };

  const handlePreviewBatchRow = (rowTemplateId: TemplateId, rowProps: CompositionProps) => {
    setTemplateId(rowTemplateId);
    setPropsByTemplate((prev) => ({
      ...prev,
      [rowTemplateId]: structuredClone(rowProps),
    }));
    setFrame(62);
    setActiveView('studio');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element wordmark */}
          <a
            href="#estudio"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('studio');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            FrameHook
          </a>

          {/* Zone 2: 4 clean single-line navigation links */}
          <nav
            className="hidden md:flex items-center gap-7"
            aria-label="Navegación principal"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 cursor-pointer ${
                    isActive
                      ? 'text-slate-900 border-[#E14D2A]'
                      : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA (+ mobile menu trigger on small screens) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRenderVideo}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg bg-[#E14D2A] text-xs font-semibold text-white hover:bg-[#C83E1D] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isExporting ? `Renderizando ${exportProgress}%` : 'Renderizar video'}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Abrir menú de navegación"
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen && (
          <nav
            className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-wrap gap-2"
            aria-label="Navegación móvil"
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                  activeView === item.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Main 1440px Studio Workspace */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6 items-start">
        <div className="order-2 lg:order-1 w-full lg:w-[256px] shrink-0">
          <WorkspaceSidebar
            activeTemplateId={templateId}
            onSelectTemplate={handleSelectTemplate}
            jobs={jobs}
            onLoadJob={handleLoadJob}
            lastExportUrl={lastExportUrl}
          />
        </div>

        <div className="order-1 lg:order-2 flex-1 min-w-0 w-full flex flex-col gap-5">
          {renderNotice && (
            <div
              role="status"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 flex items-center justify-between gap-4"
            >
              <span>{renderNotice}</span>
              <button
                type="button"
                onClick={() => setRenderNotice(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Cerrar notificación"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeView === 'studio' && (
            <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.95fr] gap-6 items-start">
              <RemotionStage
                templateId={templateId}
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                props={currentProps}
                frame={frame}
                onFrameChange={setFrame}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                isLooping={isLooping}
                onToggleLoop={() => setIsLooping((l) => !l)}
                isExporting={isExporting}
                exportProgress={exportProgress}
                onExportVideo={handleRenderVideo}
              />

              <PropsInspector
                templateId={templateId}
                props={currentProps}
                onChange={handleUpdateCurrentProps}
                onReset={handleResetProps}
              />
            </div>
          )}

          {activeView === 'agent' && (
            <AgentSandbox
              activeTemplateId={templateId}
              onApplyPreview={handleApplyAgentPreview}
              onJobsUpdated={setJobs}
              onImportAgentBatch={handleImportAgentBatch}
            />
          )}

          {activeView === 'batch' && (
            <BatchAutomationView
              templateId={templateId}
              aspectRatio={aspectRatio}
              rows={batchByTemplate[templateId]}
              onRowsChange={(next) =>
                setBatchByTemplate((prev) => ({
                  ...prev,
                  [templateId]: next,
                }))
              }
              onPreviewRow={handlePreviewBatchRow}
              onJobsCreated={(created) => setJobs((prev) => [...created, ...prev])}
            />
          )}

          {activeView === 'sdk' && (
            <PluginSdkView
              templateId={templateId}
              aspectRatio={aspectRatio}
              props={currentProps}
            />
          )}
        </div>
      </main>
    </div>
  );
}
