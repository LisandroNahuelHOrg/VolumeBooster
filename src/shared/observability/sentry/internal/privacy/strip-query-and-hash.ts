export function stripQueryAndHash(value: string): string {
  try {
    const parsed = new URL(value);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    let cutIndex = -1;
    const hashIndex = value.indexOf("#");
    const searchIndex = value.indexOf("?");

    if (hashIndex >= 0) {
      cutIndex = hashIndex;
    }

    if (searchIndex >= 0 && (cutIndex === -1 || searchIndex < cutIndex)) {
      cutIndex = searchIndex;
    }

    return cutIndex === -1 ? value : value.slice(0, cutIndex);
  }
}
