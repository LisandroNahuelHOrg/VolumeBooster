export const offscreenSessions = [{ tabId: 7, gainPercent: 220 }];

export const startSessionPayload = {
  tabId: 7,
  streamId: "stream-id",
  title: "Test tab",
  url: "https://youtube.com/watch?v=1",
  domain: "youtube.com",
  gainPercent: 220,
  advancedAudioSettings: {} as never
};

export const updateMetadataPayload = {
  tabId: 7,
  title: "YouTube",
  url: "https://youtube.com",
  domain: "youtube.com"
};
