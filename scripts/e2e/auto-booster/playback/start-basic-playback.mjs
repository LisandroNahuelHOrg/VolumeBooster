export async function startBasicPlayback(page) {
  await page.click("#start-playback");
  return true;
}
