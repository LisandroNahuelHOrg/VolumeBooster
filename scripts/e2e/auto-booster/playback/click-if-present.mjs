export async function clickIfPresent(page, selector) {
  const locator = page.locator(selector).first();

  if ((await locator.count()) === 0) {
    return false;
  }

  try {
    await locator.click({ timeout: 3000 });
  } catch {
    // Ignore click failures and let the scenario retry or classify the outcome.
  }

  return true;
}
