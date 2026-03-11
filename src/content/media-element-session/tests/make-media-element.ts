export function makeMediaElement(overrides: Partial<HTMLMediaElement> = {}): HTMLMediaElement {
  return {
    currentSrc: "https://cdn.example.com/audio.mp4",
    srcObject: null,
    paused: false,
    ended: false,
    readyState: 2,
    currentTime: 1,
    played: { length: 1 } as TimeRanges,
    muted: false,
    defaultMuted: false,
    volume: 1,
    ...overrides
  } as HTMLMediaElement;
}
