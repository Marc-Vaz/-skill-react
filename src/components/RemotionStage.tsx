import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Repeat,
  Camera,
} from 'lucide-react';
import {
  ASPECT_RATIOS,
  GENERATED_BACKDROP_IMAGE,
  GENERATED_PRODUCT_IMAGE,
  TEMPLATES,
  type AspectRatioId,
  type CompositionProps,
  type TemplateId,
} from '../lib/schemas';
import { formatTimecode, getActiveSequences } from '../lib/motionMath';
import { renderCompositionFrame } from '../remotion/renderFrame';

interface RemotionStageProps {
  templateId: TemplateId;
  aspectRatio: AspectRatioId;
  onAspectRatioChange: (ratio: AspectRatioId) => void;
  props: CompositionProps;
  frame: number;
  onFrameChange: (frame: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  isExporting: boolean;
  exportProgress: number;
  onExportVideo: () => void;
}

export const RemotionStage: React.FC<RemotionStageProps> = ({
  templateId,
  aspectRatio,
  onAspectRatioChange,
  props,
  frame,
  onFrameChange,
  isPlaying,
  onTogglePlay,
  isLooping,
  onToggleLoop,
  isExporting,
  exportProgress,
  onExportVideo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const productImgRef = useRef<HTMLImageElement | null>(null);
  const backdropImgRef = useRef<HTMLImageElement | null>(null);
  const [assetsTick, setAssetsTick] = useState(0);
  const [snapshotNotice, setSnapshotNotice] = useState<string | null>(null);

  const template = TEMPLATES[templateId];
  const dims = ASPECT_RATIOS[aspectRatio];
  const activeSequences = getActiveSequences(template.sequences, frame);
  const voiceover = props.voiceover;
  const playableAudioSrc =
    voiceover?.enabled &&
    voiceover.audioUrl &&
    (voiceover.audioUrl.startsWith('blob:') ||
      voiceover.audioUrl.startsWith('data:audio/') ||
      voiceover.audioUrl.startsWith('http://') ||
      voiceover.audioUrl.startsWith('https://'))
      ? voiceover.audioUrl
      : null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playableAudioSrc) return;
    if (isPlaying) {
      const targetSec = frame / template.fps;
      if (Math.abs(audio.currentTime - targetSec) > 0.35) {
        audio.currentTime = targetSec;
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, playableAudioSrc, frame, template.fps]);

  const productSrc =
    templateId === 'product-launch' && 'imageUrl' in props && props.imageUrl
      ? props.imageUrl
      : GENERATED_PRODUCT_IMAGE;

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      productImgRef.current = img;
      setAssetsTick((t) => t + 1);
    };
    img.onerror = () => {
      productImgRef.current = null;
      setAssetsTick((t) => t + 1);
    };
    img.src = productSrc;
  }, [productSrc]);

  useEffect(() => {
    const bg = new Image();
    bg.crossOrigin = 'anonymous';
    bg.onload = () => {
      backdropImgRef.current = bg;
      setAssetsTick((t) => t + 1);
    };
    bg.src = GENERATED_BACKDROP_IMAGE;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderCompositionFrame({
      ctx,
      width: dims.width,
      height: dims.height,
      frame,
      fps: template.fps,
      durationInFrames: template.durationInFrames,
      templateId,
      props,
      productImage: productImgRef.current,
      backdropImage: backdropImgRef.current,
    });
  }, [dims.width, dims.height, frame, template.fps, template.durationInFrames, templateId, props, assetsTick]);

  const handleDownloadFramePng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${template.compositionId.toLowerCase()}-f${frame}.png`;
    link.click();
    setSnapshotNotice(`Fotograma ${frame} guardado`);
    window.setTimeout(() => setSnapshotNotice(null), 2200);
  };

  const progressPercent = (frame / Math.max(1, template.durationInFrames - 1)) * 100;

  return (
    <section className="flex flex-col gap-4" aria-label="Escenario de previsualización Remotion">
      {/* Stage Top Utility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {template.name}
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono text-slate-700">{template.compositionId}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {dims.width}×{dims.height}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{template.fps} fps</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {(template.durationInFrames / template.fps).toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Aspect ratio segmented control */}
        <div
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200"
          role="group"
          aria-label="Relación de aspecto del video"
        >
          {(['16:9', '9:16', '1:1'] as AspectRatioId[]).map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => onAspectRatioChange(ratio)}
              aria-pressed={aspectRatio === ratio}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                aspectRatio === ratio
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* Cinema Matte Viewport */}
      <div className="rounded-xl border border-slate-200 bg-[#0C0F14] p-4 sm:p-6 flex items-center justify-center min-h-[340px] lg:min-h-[430px] relative overflow-hidden">
        <div
          className="relative flex items-center justify-center w-full"
          style={{
            maxWidth: aspectRatio === '9:16' ? '260px' : aspectRatio === '1:1' ? '400px' : '740px',
          }}
        >
          <canvas
            ref={canvasRef}
            width={dims.width}
            height={dims.height}
            data-testid="remotion-stage-canvas"
            data-frame={frame}
            data-template={templateId}
            data-ratio={aspectRatio}
            className="w-full h-auto rounded-lg border border-white/10 block shadow-sm"
          />
        </div>

        {isExporting && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-semibold text-white">
              Renderizando video dinámico en WebM
            </p>
            <div className="w-64 h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-[#E14D2A] transition-[width] duration-100"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-xs font-mono text-slate-300 tabular-nums">
              {exportProgress}% completado
            </p>
          </div>
        )}
      </div>

      {/* Optional synchronized browser audio element for uploaded edge-tts MP3 */}
      {playableAudioSrc && <audio ref={audioRef} src={playableAudioSrc} preload="auto" />}

      {/* Transport & Timeline Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pausar reproducción' : 'Reproducir composición'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#E14D2A] hover:bg-[#C83E1D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
            </button>

            <button
              type="button"
              onClick={() => onFrameChange(Math.max(0, frame - 10))}
              aria-label="Retroceder 10 fotogramas"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onFrameChange(Math.min(template.durationInFrames - 1, frame + 10))}
              aria-label="Avanzar 10 fotogramas"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onFrameChange(0)}
              aria-label="Volver al fotograma cero"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleLoop}
              aria-pressed={isLooping}
              aria-label="Activar o desactivar bucle"
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isLooping
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            <div className="pl-2 text-xs font-mono text-slate-700 tabular-nums whitespace-nowrap" data-testid="timecode-readout">
              <span className="font-semibold text-slate-900">
                {formatTimecode(frame, template.fps)}
              </span>
              <span className="text-slate-400"> / {formatTimecode(template.durationInFrames, template.fps)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadFramePng}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>PNG</span>
            </button>
            <button
              type="button"
              onClick={onExportVideo}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-900 bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Exportar WebM</span>
            </button>
          </div>
        </div>

        {snapshotNotice && (
          <p className="text-xs font-medium text-emerald-700">{snapshotNotice}</p>
        )}

        {/* Frame Scrubber */}
        <div className="flex flex-col gap-2">
          <label htmlFor="timeline-scrubber" className="sr-only">
            Línea de tiempo de fotogramas
          </label>
          <input
            id="timeline-scrubber"
            type="range"
            min={0}
            max={template.durationInFrames - 1}
            value={frame}
            onChange={(e) => onFrameChange(Number(e.target.value))}
            className="w-full accent-[#E14D2A] cursor-pointer h-2"
          />

          {/* Remotion Sequence Tracks */}
          <div className="flex flex-col gap-1.5 pt-1">
            {template.sequences.map((seq) => {
              const leftPct = (seq.from / template.durationInFrames) * 100;
              const widthPct = (seq.durationInFrames / template.durationInFrames) * 100;
              const isActive = activeSequences.some((s) => s.id === seq.id);

              return (
                <div
                  key={seq.id}
                  className="grid grid-cols-[150px_1fr] sm:grid-cols-[190px_1fr] items-center gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onFrameChange(seq.from + 12)}
                    className={`text-left text-xs truncate transition-colors cursor-pointer ${
                      isActive ? 'font-semibold text-slate-900' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {seq.name}
                  </button>
                  <div className="relative h-6 rounded bg-slate-100 border border-slate-200/80 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => onFrameChange(seq.from + 12)}
                      aria-label={`Saltar a ${seq.name}`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                      className={`absolute top-0.5 bottom-0.5 rounded-xs text-[11px] font-mono px-2 flex items-center justify-between overflow-hidden transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      <span className="truncate tabular-nums">
                        {seq.from}–{seq.from + seq.durationInFrames}
                      </span>
                    </button>
                    {/* Playhead indicator */}
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-[#E14D2A]"
                      style={{ left: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {voiceover?.enabled && (
              <div className="grid grid-cols-[150px_1fr] sm:grid-cols-[190px_1fr] items-center gap-3 pt-1 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-700 truncate">
                  Audio · {voiceover.voice}
                </span>
                <div className="relative h-6 rounded bg-amber-50 border border-amber-200/80 overflow-hidden">
                  <div className="absolute inset-y-0.5 inset-x-0.5 rounded-xs bg-amber-100 text-amber-900 text-[11px] font-mono px-2 flex items-center justify-between overflow-hidden">
                    <span className="truncate">
                      {voiceover.audioUrl.startsWith('blob:')
                        ? 'Archivo MP3 cargado en sesión'
                        : voiceover.audioUrl || '/audio/voiceover.mp3'}
                    </span>
                    <span className="tabular-nums shrink-0 ml-2">0–{template.durationInFrames}</span>
                  </div>
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-[#E14D2A]"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
