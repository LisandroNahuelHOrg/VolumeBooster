export async function flushPopupMainMicrotasks(turns = 6): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
  }
}
