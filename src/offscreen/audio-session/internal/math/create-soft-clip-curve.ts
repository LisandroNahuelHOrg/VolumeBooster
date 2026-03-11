export function createSoftClipCurve(intensity: number): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(
    new ArrayBuffer(1024 * Float32Array.BYTES_PER_ELEMENT)
  ) as Float32Array<ArrayBuffer>;
  const drive = 1 + intensity / 6;

  for (let index = 0; index < curve.length; index += 1) {
    const x = (index / (curve.length - 1)) * 2 - 1;
    curve[index] = Math.tanh(x * drive);
  }

  return curve;
}
