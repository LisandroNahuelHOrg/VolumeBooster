export function isMissingReceiverError(error: unknown): boolean {
  return error instanceof Error && /Receiving end does not exist/i.test(error.message);
}
