import React, { useState } from 'react';
import {
  Play,
  Upload,
  CheckCircle2,
  AlertCircle,
  Layers,
  Trash2,
} from 'lucide-react';
import {
  TEMPLATES,
  type AspectRatioId,
  type CompositionProps,
  type TemplateId,
} from '../lib/schemas';
import { parseBatchRecords, type BatchRowItem } from '../lib/batchParser';
import type { ServerRenderJob } from './AgentSandbox';

interface BatchAutomationViewProps {
  templateId: TemplateId;
  aspectRatio: AspectRatioId;
  rows: BatchRowItem[];
  onRowsChange: (next: BatchRowItem[]) => void;
  onPreviewRow: (templateId: TemplateId, props: CompositionProps) => void;
  onJobsCreated: (jobs: ServerRenderJob[]) => void;
}

const SAMPLE_CSV_BY_TEMPLATE: Record<TemplateId, string> = {
  'kpi-digest': `brandName,recipientName,period,headline,accentColor\nNubePay,Carla Méndez,Q4 2026,Crecimiento acelerado en volumen procesado,#0D9488\nSolarGrid,Tomás Silva,Q4 2026,Eficiencia operativa en plantas regionales,#2563EB`,
  'product-launch': `brandName,productName,tagline,price,accentColor\nKlang Audio,Monolith Air Dock,Estación de control táctil para creadores de audio,$279 USD,#E14D2A\nKlang Audio,Monolith Preamp X,Preamplificador compacto con salida balanceada,$410 USD,#D97706`,
  'personalized-onboarding': `customerName,companyName,planName,accountManager,accentColor\nGabriela Rojas,Nexo Salud,Plan Enterprise,Diego Salgado,#2563EB\nMartín Paredes,Vía Logística,Plan Escala,Camila Navarro,#16A34A`,
  'social-quote': `brandName,authorName,authorRole,quote,statHighlight\nFrameHook,Paula Arias,VP Growth en Orbit,Automatizamos toda la campaña de videos personalizados directo desde BigQuery.,3.4x más clics en campañas de correo`,
};

export const BatchAutomationView: React.FC<BatchAutomationViewProps> = ({
  templateId,
  aspectRatio,
  rows,
  onRowsChange,
  onPreviewRow,
  onJobsCreated,
}) => {
  const [showImporter, setShowImporter] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueFeedback, setQueueFeedback] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const template = TEMPLATES[templateId];
  const validRows = rows.filter((r) => r.valid);

  const filteredRows = rows.filter((r) =>
    r.label.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const handleImportSubmit = () => {
    const parsed = parseBatchRecords(templateId, importText);
    if (parsed.parseError) {
      setImportError(parsed.parseError);
      return;
    }
    setImportError(null);
    onRowsChange([...parsed.items, ...rows]);
    setImportText('');
    setShowImporter(false);
    setQueueFeedback(`${parsed.items.length} registro(s) importado(s) y validado(s).`);
  };

  const handleQueueBatch = async () => {
    if (validRows.length === 0) return;
    setIsQueueing(true);
    setQueueFeedback(null);
    try {
      const res = await fetch('/api/plugin/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          aspectRatio,
          records: validRows.map((r) => r.props),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQueueFeedback(data.error || 'Error al encolar el lote.');
        return;
      }

      const createdJobs = (data.jobs ?? []) as ServerRenderJob[];
      onJobsCreated(createdJobs);

      let jobCursor = 0;
      const updated = rows.map((row) => {
        if (!row.valid) return row;
        const assigned = createdJobs[jobCursor++];
        return {
          ...row,
          status: 'encolado' as const,
          jobId: assigned?.id,
        };
      });
      onRowsChange(updated);
      setQueueFeedback(
        `Se encolaron ${createdJobs.length} videos de ${template.compositionId} (${aspectRatio}).`
      );
    } catch (error) {
      setQueueFeedback(
        error instanceof Error ? error.message : 'Error de red al encolar.'
      );
    } finally {
      setIsQueueing(false);
    }
  };

  const handleDeleteRow = (rowId: string) => {
    onRowsChange(rows.filter((r) => r.id !== rowId));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Automatización por Lotes
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Plantilla: {template.name}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{rows.length} registros</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-emerald-700 font-medium">
              {validRows.length} válidos
            </span>
            <span aria-hidden="true">·</span>
            <span>Formato {aspectRatio}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setShowImporter((v) => !v);
              if (!importText) setImportText(SAMPLE_CSV_BY_TEMPLATE[templateId]);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar JSON / CSV</span>
          </button>

          <button
            type="button"
            onClick={handleQueueBatch}
            disabled={isQueueing || validRows.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E14D2A] text-xs font-semibold text-white hover:bg-[#C83E1D] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              {isQueueing
                ? 'Encolando lote...'
                : `Encolar lote (${validRows.length})`}
            </span>
          </button>
        </div>
      </div>

      {queueFeedback && (
        <div
          role="status"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{queueFeedback}</span>
        </div>
      )}

      {/* Bulk Importer Panel */}
      {showImporter && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="batch-import-textarea" className="text-xs font-semibold text-slate-800">
              Pega un arreglo JSON o filas CSV para {template.compositionId}
            </label>
            <button
              type="button"
              onClick={() => setImportText(SAMPLE_CSV_BY_TEMPLATE[templateId])}
              className="text-xs font-medium text-[#E14D2A] hover:underline cursor-pointer"
            >
              Cargar ejemplo CSV
            </button>
          </div>
          <textarea
            id="batch-import-textarea"
            rows={5}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            spellCheck={false}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 font-mono text-xs p-3 text-slate-900 focus:outline-none focus:border-slate-400"
          />
          {importError && (
            <p className="text-xs text-red-700 font-medium">{importError}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowImporter(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleImportSubmit}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 cursor-pointer"
            >
              Validar e importar filas
            </button>
          </div>
        </section>
      )}

      {/* High-density Table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-800">
            Registros estructurados del lote
          </div>
          <div className="w-full sm:w-64">
            <label htmlFor="batch-search-input" className="sr-only">
              Filtrar registros del lote
            </label>
            <input
              id="batch-search-input"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por nombre o marca..."
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="py-12 px-6 text-center flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-slate-800">
              No hay registros que coincidan con tu filtro
            </p>
            <p className="text-xs text-slate-500">
              Importa un archivo CSV o JSON para generar videos dinámicos en paralelo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Registro / Destinatario</th>
                  <th className="py-2.5 px-4">Composición</th>
                  <th className="py-2.5 px-4">Validación Zod</th>
                  <th className="py-2.5 px-4">Estado de cola</th>
                  <th className="py-2.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {row.label}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {TEMPLATES[row.templateId].compositionId}
                    </td>
                    <td className="py-2.5 px-4">
                      {row.valid ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Válido</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-700 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{row.errors[0]?.message || 'Esquema inválido'}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600 tabular-nums">
                      {row.jobId ? `${row.status} · ${row.jobId}` : row.status}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onPreviewRow(row.templateId, row.props)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>Previsualizar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          aria-label={`Eliminar registro ${row.label}`}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
