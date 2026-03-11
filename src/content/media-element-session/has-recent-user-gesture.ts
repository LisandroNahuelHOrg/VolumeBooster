export function hasRecentUserGesture(): boolean {
  const userActivation = (
    navigator as Navigator & {
      userActivation?: { isActive?: boolean; hasBeenActive?: boolean };
    }
  ).userActivation;

  if (!userActivation) {
    return true;
  }

  return Boolean(userActivation.isActive);
}
