import {
  ASPECT_RATIOS,
  GENERATED_BACKDROP_IMAGE,
  GENERATED_PRODUCT_IMAGE,
  TEMPLATES,
  type AspectRatioId,
  type CompositionProps,
  type TemplateId,
} from '../lib/schemas';
import { renderCompositionFrame } from './renderFrame';

export interface ExportVideoOptions {
  templateId: TemplateId;
  aspectRatio: AspectRatioId;
  props: CompositionProps;
  onProgress?: (percent: number) => void;
}

export interface ExportVideoResult {
  blobUrl: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function exportCompositionToWebM({
  templateId,
  aspectRatio,
  props,
  onProgress,
}: ExportVideoOptions): Promise<ExportVideoResult> {
  const template = TEMPLATES[templateId];
  const dims = ASPECT_RATIOS[aspectRatio];

  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No fue posible inicializar el contexto Canvas 2D para renderizar.');
  }

  const productSrc =
    templateId === 'product-launch' && 'imageUrl' in props && props.imageUrl
      ? props.imageUrl
      : GENERATED_PRODUCT_IMAGE;

  const [productImage, backdropImage] = await Promise.all([
    loadImage(productSrc),
    loadImage(GENERATED_BACKDROP_IMAGE),
  ]);

  if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
    renderCompositionFrame({
      ctx,
      width: dims.width,
      height: dims.height,
      frame: Math.floor(template.durationInFrames * 0.5),
      fps: template.fps,
      durationInFrames: template.durationInFrames,
      templateId,
      props,
      productImage,
      backdropImage,
    });
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo exportar la captura PNG.'));
      }, 'image/png');
    });
    onProgress?.(100);
    return {
      blobUrl: URL.createObjectURL(pngBlob),
      filename: `${template.compositionId.toLowerCase()}-${aspectRatio.replace(':', 'x')}.png`,
      mimeType: 'image/png',
      sizeBytes: pngBlob.size,
    };
  }

  const preferredMimes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mimeType =
    preferredMimes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const stream = canvas.captureStream(template.fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_500_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  const stopPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error('Error durante la codificación WebM.'));
  });

  recorder.start();

  // Render deterministic frame sequence (stepped cleanly at ~60fps capture speed for fast UX)
  const totalFrames = template.durationInFrames;
  for (let frame = 0; frame < totalFrames; frame += 2) {
    renderCompositionFrame({
      ctx,
      width: dims.width,
      height: dims.height,
      frame,
      fps: template.fps,
      durationInFrames: totalFrames,
      templateId,
      props,
      productImage,
      backdropImage,
    });
    onProgress?.(Math.min(99, Math.round((frame / totalFrames) * 100)));
    await new Promise((r) => setTimeout(r, 18));
  }

  recorder.stop();
  const blob = await stopPromise;
  onProgress?.(100);

  return {
    blobUrl: URL.createObjectURL(blob),
    filename: `${template.compositionId.toLowerCase()}-${aspectRatio.replace(':', 'x')}.webm`,
    mimeType,
    sizeBytes: blob.size,
  };
}
