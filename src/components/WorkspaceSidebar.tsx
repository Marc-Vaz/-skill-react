import React from 'react';
import { Film, CheckCircle2, Clock, Download } from 'lucide-react';
import {
  TEMPLATE_LIST,
  TEMPLATES,
  type TemplateId,
} from '../lib/schemas';
import type { ServerRenderJob } from './AgentSandbox';

interface WorkspaceSidebarProps {
  activeTemplateId: TemplateId;
  onSelectTemplate: (id: TemplateId) => void;
  jobs: ServerRenderJob[];
  onLoadJob: (job: ServerRenderJob) => void;
  lastExportUrl: { url: string; filename: string } | null;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  activeTemplateId,
  onSelectTemplate,
  jobs,
  onLoadJob,
  lastExportUrl,
}) => {
  return (
    <aside
      className="w-full lg:w-[256px] shrink-0 flex flex-col gap-6"
      aria-label="Catálogo de plantillas y cola de render"
    >
      {/* Template Catalog */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col gap-2">
        <div className="px-1.5 pb-1 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500">
            Plantillas Remotion
          </h2>
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            {TEMPLATE_LIST.length}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {TEMPLATE_LIST.map((tpl) => {
            const isSelected = tpl.id === activeTemplateId;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelectTemplate(tpl.id)}
                aria-current={isSelected ? 'true' : undefined}
                className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-semibold truncate">{tpl.name}</div>
                <div
                  className={`mt-0.5 text-[11px] truncate ${
                    isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {tpl.category} · {(tpl.durationInFrames / tpl.fps).toFixed(0)}s ·{' '}
                  {tpl.sequences.length} escenas
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Download ready banner if user exported a WebM */}
      {lastExportUrl && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex flex-col gap-2">
          <div className="text-xs font-semibold text-emerald-900">
            Video renderizado listo
          </div>
          <a
            href={lastExportUrl.url}
            download={lastExportUrl.filename}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="truncate">Descargar {lastExportUrl.filename}</span>
          </a>
        </div>
      )}

      {/* Render Queue */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col gap-2.5">
        <div className="px-1.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500">
            Cola de renderizado
          </h2>
          <span
            className="font-mono text-[11px] text-slate-500 tabular-nums"
            data-testid="queue-count"
          >
            {jobs.length}
          </span>
        </div>

        {jobs.length === 0 ? (
          <p className="px-1.5 py-4 text-xs text-slate-500">
            Aún no hay renders registrados en la cola.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {jobs.slice(0, 6).map((job) => (
              <li key={job.id} className="py-2 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => onLoadJob(job)}
                  className="w-full text-left px-1.5 py-1 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-900 truncate">
                      {job.label}
                    </span>
                    {job.status === 'completado' ? (
                      <CheckCircle2
                        className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                        aria-label="Completado"
                      />
                    ) : (
                      <Clock
                        className="w-3.5 h-3.5 text-amber-600 shrink-0"
                        aria-label="Encolado"
                      />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
                    <Film className="w-3 h-3 shrink-0" />
                    <span className="truncate">{TEMPLATES[job.templateId].compositionId}</span>
                    <span aria-hidden="true">·</span>
                    <span>{job.aspectRatio}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};
