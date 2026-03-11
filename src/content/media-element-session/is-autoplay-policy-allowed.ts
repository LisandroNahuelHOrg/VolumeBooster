export function isAutoplayPolicyAllowed(autoplayPolicy?: string): boolean {
  if (!autoplayPolicy) {
    return true;
  }

  return !autoplayPolicy.toLowerCase().includes("disallowed");
}
