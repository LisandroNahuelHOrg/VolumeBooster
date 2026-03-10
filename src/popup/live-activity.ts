/**
 * @fileoverview Convierte el nivel normalizado del motor de audio en un
 * porcentaje UI estable para el medidor de actividad en vivo.
 */

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function deriveLiveActivityPercent(level: number | null | undefined): number {
  if (typeof level !== "number" || !Number.isFinite(level)) {
    return 0;
  }

  return Math.round(clampNumber(level, 0, 1) * 100);
}

export function deriveSessionMeterWidthPercent(level: number | null | undefined): number {
  const clampedPercent = deriveLiveActivityPercent(level);

  if (clampedPercent === 0) {
    return 0;
  }

  return Math.max(8, clampedPercent);
}
