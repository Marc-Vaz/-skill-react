import type { SequenceLayer } from './schemas';

export type ExtrapolationMode = 'extend' | 'clamp';

export interface InterpolateOptions {
  extrapolateLeft?: ExtrapolationMode;
  extrapolateRight?: ExtrapolationMode;
}

/**
 * Deterministic linear interpolation matching Remotion's interpolate() contract.
 */
export function interpolate(
  input: number,
  inputRange: [number, number],
  outputRange: [number, number],
  options: InterpolateOptions = {}
): number {
  const [inMin, inMax] = inputRange;
  const [outMin, outMax] = outputRange;
  const { extrapolateLeft = 'extend', extrapolateRight = 'extend' } = options;

  if (inMax === inMin) {
    return outMax;
  }

  let value = input;
  if (value < inMin && extrapolateLeft === 'clamp') {
    value = inMin;
  }
  if (value > inMax && extrapolateRight === 'clamp') {
    value = inMax;
  }

  const progress = (value - inMin) / (inMax - inMin);
  return outMin + progress * (outMax - outMin);
}

export interface SpringConfig {
  damping?: number;
  stiffness?: number;
  mass?: number;
}

export interface SpringInput {
  frame: number;
  fps: number;
  config?: SpringConfig;
  delay?: number;
}

/**
 * Critically/under-damped spring physics approximation matching Remotion's spring().
 * Pure, deterministic per frame with zero side effects.
 */
export function spring({ frame, fps, config = {}, delay = 0 }: SpringInput): number {
  const adjustedFrame = frame - delay;
  if (adjustedFrame <= 0) {
    return 0;
  }

  const damping = config.damping ?? 14;
  const stiffness = config.stiffness ?? 120;
  const mass = config.mass ?? 1;

  const t = adjustedFrame / Math.max(fps, 1);
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const envelope = Math.exp(-zeta * omega0 * t);
    const value =
      1 -
      envelope *
        (Math.cos(omegaD * t) + ((zeta * omega0) / omegaD) * Math.sin(omegaD * t));
    return Math.abs(1 - value) < 0.001 ? 1 : value;
  }

  const envelope = Math.exp(-omega0 * t);
  const value = 1 - envelope * (1 + omega0 * t);
  return Math.abs(1 - value) < 0.001 ? 1 : value;
}

export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

export function formatTimecode(frame: number, fps: number): string {
  const safeFrame = Math.max(0, Math.floor(frame));
  const safeFps = Math.max(1, Math.floor(fps));
  const totalSeconds = Math.floor(safeFrame / safeFps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const remainderFrames = safeFrame % safeFps;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const ff = String(remainderFrames).padStart(2, '0');
  return `${mm}:${ss}:${ff}`;
}

export function getActiveSequences(
  sequences: SequenceLayer[],
  frame: number
): SequenceLayer[] {
  return sequences.filter(
    (seq) => frame >= seq.from && frame < seq.from + seq.durationInFrames
  );
}
