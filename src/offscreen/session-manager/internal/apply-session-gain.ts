import type { SessionEntry } from "./session-manager-contract";

export const applySessionGain = (
  entry: SessionEntry,
  gainPercent: number
): void => {
  entry.audioSession.setGainPercent(gainPercent);
  entry.state.gainPercent = gainPercent;
  entry.state.protectorActionDb = 0;
  entry.state.clipEvents = 0;
  entry.state.clipPeak = 0;
  entry.state.outputPeak = 0;
};
