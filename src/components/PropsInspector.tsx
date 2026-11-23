import React, { useEffect, useState } from 'react';
import { Check, AlertCircle, RotateCcw, Upload, Volume2 } from 'lucide-react';
import {
  MEXICAN_TTS_VOICES,
  TEMPLATES,
  validateCompositionProps,
  type CompositionProps,
  type KpiDigestProps,
  type PersonalizedOnboardingProps,
  type ProductLaunchProps,
  type SocialQuoteProps,
  type TemplateId,
  type ValidationFieldError,
  type VoiceoverConfig,
} from '../lib/schemas';

interface PropsInspectorProps {
  templateId: TemplateId;
  props: CompositionProps;
  onChange: (next: CompositionProps) => void;
  onReset: () => void;
}

const ACCENT_SWATCHES = ['#E14D2A', '#0D9488', '#2563EB', '#D97706', '#16A34A', '#334155'];

export const PropsInspector: React.FC<PropsInspectorProps> = ({
  templateId,
  props,
  onChange,
  onReset,
}) => {
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [jsonText, setJsonText] = useState(() => JSON.stringify(props, null, 2));
  const [jsonSyntaxError, setJsonSyntaxError] = useState<string | null>(null);
  const [schemaErrors, setSchemaErrors] = useState<ValidationFieldError[]>([]);

  const template = TEMPLATES[templateId];

  useEffect(() => {
    setJsonText(JSON.stringify(props, null, 2));
    setJsonSyntaxError(null);
    const check = validateCompositionProps(templateId, props);
    setSchemaErrors(check.errors);
  }, [templateId, props]);

  const handleFieldPatch = (patch: Record<string, unknown>) => {
    const next = { ...props, ...patch } as CompositionProps;
    const check = validateCompositionProps(templateId, next);
    setSchemaErrors(check.errors);
    onChange(next);
  };

  const handleJsonChange = (value: string) => {
    setJsonText(value);
    try {
      const parsed = JSON.parse(value);
      setJsonSyntaxError(null);
      const check = validateCompositionProps(templateId, parsed);
      setSchemaErrors(check.errors);
      if (check.valid && check.data) {
        onChange(check.data);
      }
    } catch (error) {
      setJsonSyntaxError(
        error instanceof Error ? error.message : 'JSON mal formado'
      );
    }
  };

  const isValid = !jsonSyntaxError && schemaErrors.length === 0;

  return (
    <aside
      className="rounded-xl border border-slate-200 bg-white flex flex-col overflow-hidden"
      aria-label="Inspector de datos estructurados"
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Datos estructurados
          </h2>
          <p className="text-xs text-slate-500">
            Esquema Zod validado en vivo
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setMode('form')}
            aria-pressed={mode === 'form'}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'form'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Formulario
          </button>
          <button
            type="button"
            onClick={() => setMode('json')}
            aria-pressed={mode === 'json'}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'json'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            JSON
          </button>
        </div>
      </div>

      {/* Presets bar */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-xs text-slate-500 whitespace-nowrap">Ejemplos:</span>
          {template.presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(structuredClone(preset.props))}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-slate-300 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onReset}
          aria-label="Restablecer valores por defecto"
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Validation State Line */}
      <div
        className={`px-4 py-2 border-b text-xs flex items-start gap-2 ${
          isValid
            ? 'border-slate-100 bg-emerald-50/50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}
        role="status"
        data-testid="validation-banner"
      >
        {isValid ? (
          <>
            <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
            <span>Payload válido para {template.compositionId}</span>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
              <span>
                {jsonSyntaxError
                  ? `Sintaxis JSON inválida: ${jsonSyntaxError}`
                  : `${schemaErrors.length} error(es) de esquema detectados`}
              </span>
            </div>
            {schemaErrors.slice(0, 3).map((err, i) => (
              <span key={`${err.path}-${i}`} className="font-mono text-[11px] text-red-700">
                {err.path}: {err.message}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Editor Body */}
      <div className="p-4 flex-1 overflow-y-auto max-h-[580px]">
        {mode === 'json' ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="json-props-editor" className="text-xs font-medium text-slate-700">
              JSON de entrada (inputProps para Remotion)
            </label>
            <textarea
              id="json-props-editor"
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              spellCheck={false}
              rows={20}
              className="w-full rounded-lg border border-slate-200 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed p-3.5 focus:outline-none focus:ring-2 focus:ring-[#E14D2A]/40"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {/* Shared Brand & Accent */}
            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="prop-brandName" className="block text-xs font-medium text-slate-700 mb-1">
                  Marca
                </label>
                <input
                  id="prop-brandName"
                  type="text"
                  value={props.brandName}
                  onChange={(e) => handleFieldPatch({ brandName: e.target.value })}
                  className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label htmlFor="prop-accentColor" className="block text-xs font-medium text-slate-700 mb-1">
                  Color de acento
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="prop-accentColor"
                    type="text"
                    value={props.accentColor}
                    onChange={(e) => handleFieldPatch({ accentColor: e.target.value })}
                    className="w-24 min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                  />
                  <div className="flex items-center gap-1.5">
                    {ACCENT_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        aria-label={`Usar color ${swatch}`}
                        onClick={() => handleFieldPatch({ accentColor: swatch })}
                        style={{ backgroundColor: swatch }}
                        className={`w-5 h-5 rounded-full cursor-pointer transition-transform shrink-0 ${
                          props.accentColor.toLowerCase() === swatch.toLowerCase()
                            ? 'ring-2 ring-offset-1 ring-slate-900 scale-110'
                            : 'hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Template-Specific Fields */}
            {templateId === 'kpi-digest' && (
              <KpiFormFields
                props={props as KpiDigestProps}
                onPatch={handleFieldPatch}
              />
            )}

            {templateId === 'product-launch' && (
              <ProductFormFields
                props={props as ProductLaunchProps}
                onPatch={handleFieldPatch}
              />
            )}

            {templateId === 'personalized-onboarding' && (
              <OnboardingFormFields
                props={props as PersonalizedOnboardingProps}
                onPatch={handleFieldPatch}
              />
            )}

            {templateId === 'social-quote' && (
              <QuoteFormFields
                props={props as SocialQuoteProps}
                onPatch={handleFieldPatch}
              />
            )}

            {/* Shared CTA */}
            <div>
              <label htmlFor="prop-ctaText" className="block text-xs font-medium text-slate-700 mb-1">
                Llamado a la acción (cierre)
              </label>
              <input
                id="prop-ctaText"
                type="text"
                value={props.ctaText}
                onChange={(e) => handleFieldPatch({ ctaText: e.target.value })}
                className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>

            {/* Optional Mexican Spanish edge-tts Voiceover */}
            <VoiceoverFields
              voiceover={props.voiceover}
              onChange={(voiceover) => handleFieldPatch({ voiceover })}
            />
          </div>
        )}
      </div>
    </aside>
  );
};

const VoiceoverFields: React.FC<{
  voiceover?: VoiceoverConfig;
  onChange: (next: VoiceoverConfig) => void;
}> = ({ voiceover, onChange }) => {
  const current: VoiceoverConfig = {
    enabled: voiceover?.enabled ?? false,
    voice: voiceover?.voice ?? 'es-MX-DaliaNeural',
    script: voiceover?.script ?? '',
    audioUrl: voiceover?.audioUrl ?? '/audio/voiceover.mp3',
  };

  const handleLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    onChange({
      ...current,
      enabled: true,
      audioUrl: blobUrl,
    });
  };

  return (
    <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor="prop-voiceover-enabled"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer"
        >
          <input
            id="prop-voiceover-enabled"
            type="checkbox"
            checked={current.enabled}
            onChange={(e) => onChange({ ...current, enabled: e.target.checked })}
            className="rounded border-slate-300 accent-[#E14D2A] cursor-pointer"
          />
          <Volume2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Locución local (edge-tts)</span>
        </label>

        <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap">
          <Upload className="w-3 h-3" />
          <span>Cargar MP3</span>
          <input
            type="file"
            accept="audio/*"
            onChange={handleLocalFile}
            className="sr-only"
          />
        </label>
      </div>

      {current.enabled && (
        <div className="flex flex-col gap-2.5">
          <div>
            <label htmlFor="prop-voiceover-voice" className="block text-xs font-medium text-slate-700 mb-1">
              Voz mexicana (edge-tts)
            </label>
            <select
              id="prop-voiceover-voice"
              value={current.voice}
              onChange={(e) => onChange({ ...current, voice: e.target.value })}
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
            >
              {MEXICAN_TTS_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="prop-voiceover-audioUrl" className="block text-xs font-medium text-slate-700 mb-1">
              Ruta o URL de audio (Remotion staticFile / MP3)
            </label>
            <input
              id="prop-voiceover-audioUrl"
              type="text"
              value={current.audioUrl}
              onChange={(e) => onChange({ ...current, audioUrl: e.target.value })}
              placeholder="/audio/voiceover.mp3"
              className="w-full min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="prop-voiceover-script" className="block text-xs font-medium text-slate-700 mb-1">
              Guion para edge-tts
            </label>
            <textarea
              id="prop-voiceover-script"
              rows={2}
              value={current.script}
              onChange={(e) => onChange({ ...current, script: e.target.value })}
              placeholder="Texto que narrará la voz mexicana..."
              className="w-full min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const KpiFormFields: React.FC<{
  props: KpiDigestProps;
  onPatch: (patch: Record<string, unknown>) => void;
}> = ({ props, onPatch }) => {
  const updateMetric = (index: number, field: string, value: string | number) => {
    const next = props.metrics.map((m, i) => (i === index ? { ...m, [field]: value } : m));
    onPatch({ metrics: next });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label htmlFor="prop-recipientName" className="block text-xs font-medium text-slate-700 mb-1">
            Destinatario
          </label>
          <input
            id="prop-recipientName"
            type="text"
            value={props.recipientName}
            onChange={(e) => onPatch({ recipientName: e.target.value })}
            className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400"
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="prop-period" className="block text-xs font-medium text-slate-700 mb-1">
            Periodo
          </label>
          <input
            id="prop-period"
            type="text"
            value={props.period}
            onChange={(e) => onPatch({ period: e.target.value })}
            className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400"
          />
        </div>
      </div>

      <div>
        <label htmlFor="prop-headline" className="block text-xs font-medium text-slate-700 mb-1">
          Titular ejecutivo
        </label>
        <input
          id="prop-headline"
          type="text"
          value={props.headline}
          onChange={(e) => onPatch({ headline: e.target.value })}
          className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400"
        />
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-700">Indicadores KPI (3 tarjetas)</span>
        {props.metrics.map((m, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.8fr)] gap-2 items-center"
          >
            <input
              type="text"
              aria-label={`Nombre métrica ${idx + 1}`}
              value={m.label}
              onChange={(e) => updateMetric(idx, 'label', e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-900"
            />
            <input
              type="text"
              aria-label={`Valor métrica ${idx + 1}`}
              value={m.value}
              onChange={(e) => updateMetric(idx, 'value', e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs text-slate-900"
            />
            <input
              type="text"
              aria-label={`Variación métrica ${idx + 1}`}
              value={m.delta}
              onChange={(e) => updateMetric(idx, 'delta', e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs text-slate-900"
            />
          </div>
        ))}
      </div>
    </>
  );
};

const ProductFormFields: React.FC<{
  props: ProductLaunchProps;
  onPatch: (patch: Record<string, unknown>) => void;
}> = ({ props, onPatch }) => {
  const updateHighlight = (index: number, value: string) => {
    const next = props.highlights.map((h, i) => (i === index ? value : h));
    onPatch({ highlights: next });
  };

  return (
    <>
      <div className="grid grid-cols-[1.4fr_0.8fr] gap-3">
        <div>
          <label htmlFor="prop-productName" className="block text-xs font-medium text-slate-700 mb-1">
            Producto
          </label>
          <input
            id="prop-productName"
            type="text"
            value={props.productName}
            onChange={(e) => onPatch({ productName: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="prop-price" className="block text-xs font-medium text-slate-700 mb-1">
            Precio
          </label>
          <input
            id="prop-price"
            type="text"
            value={props.price}
            onChange={(e) => onPatch({ price: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="prop-tagline" className="block text-xs font-medium text-slate-700 mb-1">
          Subtítulo comercial
        </label>
        <textarea
          id="prop-tagline"
          rows={2}
          value={props.tagline}
          onChange={(e) => onPatch({ tagline: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </div>

      <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-700">Características destacadas</span>
        {props.highlights.map((h, idx) => (
          <input
            key={idx}
            type="text"
            aria-label={`Característica ${idx + 1}`}
            value={h}
            onChange={(e) => updateHighlight(idx, e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900"
          />
        ))}
      </div>
    </>
  );
};

const OnboardingFormFields: React.FC<{
  props: PersonalizedOnboardingProps;
  onPatch: (patch: Record<string, unknown>) => void;
}> = ({ props, onPatch }) => {
  const updateStep = (index: number, value: string) => {
    const next = props.nextSteps.map((s, i) => (i === index ? value : s));
    onPatch({ nextSteps: next });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="prop-customerName" className="block text-xs font-medium text-slate-700 mb-1">
            Cliente
          </label>
          <input
            id="prop-customerName"
            type="text"
            value={props.customerName}
            onChange={(e) => onPatch({ customerName: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="prop-companyName" className="block text-xs font-medium text-slate-700 mb-1">
            Empresa
          </label>
          <input
            id="prop-companyName"
            type="text"
            value={props.companyName}
            onChange={(e) => onPatch({ companyName: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="prop-planName" className="block text-xs font-medium text-slate-700 mb-1">
            Plan activo
          </label>
          <input
            id="prop-planName"
            type="text"
            value={props.planName}
            onChange={(e) => onPatch({ planName: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="prop-accountManager" className="block text-xs font-medium text-slate-700 mb-1">
            Ejecutivo asignado
          </label>
          <input
            id="prop-accountManager"
            type="text"
            value={props.accountManager}
            onChange={(e) => onPatch({ accountManager: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-700">Pasos de activación</span>
        {props.nextSteps.map((s, idx) => (
          <input
            key={idx}
            type="text"
            aria-label={`Paso ${idx + 1}`}
            value={s}
            onChange={(e) => updateStep(idx, e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900"
          />
        ))}
      </div>
    </>
  );
};

const QuoteFormFields: React.FC<{
  props: SocialQuoteProps;
  onPatch: (patch: Record<string, unknown>) => void;
}> = ({ props, onPatch }) => (
  <>
    <div>
      <label htmlFor="prop-quote" className="block text-xs font-medium text-slate-700 mb-1">
        Cita principal
      </label>
      <textarea
        id="prop-quote"
        rows={3}
        value={props.quote}
        onChange={(e) => onPatch({ quote: e.target.value })}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
      />
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor="prop-authorName" className="block text-xs font-medium text-slate-700 mb-1">
          Autor
        </label>
        <input
          id="prop-authorName"
          type="text"
          value={props.authorName}
          onChange={(e) => onPatch({ authorName: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </div>
      <div>
        <label htmlFor="prop-authorRole" className="block text-xs font-medium text-slate-700 mb-1">
          Cargo y empresa
        </label>
        <input
          id="prop-authorRole"
          type="text"
          value={props.authorRole}
          onChange={(e) => onPatch({ authorRole: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
        />
      </div>
    </div>

    <div>
      <label htmlFor="prop-statHighlight" className="block text-xs font-medium text-slate-700 mb-1">
        Dato de evidencia
      </label>
      <input
        id="prop-statHighlight"
        type="text"
        value={props.statHighlight}
        onChange={(e) => onPatch({ statHighlight: e.target.value })}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900"
      />
    </div>
  </>
);
