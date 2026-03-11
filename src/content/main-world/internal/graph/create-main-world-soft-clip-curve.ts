export function createMainWorldSoftClipCurve(intensity: number): Float32Array {
  const curve = new Float32Array(1024);
  const drive = 1 + intensity / 6;

  for (let index = 0; index < curve.length; index += 1) {
    const x = (index / (curve.length - 1)) * 2 - 1;
    curve[index] = Math.tanh(x * drive);
  }

  return curve;
}
