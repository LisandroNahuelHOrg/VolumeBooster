type FaustUiNode = { items?: unknown; shortname?: string; address?: string };

export function collectControlAddressMap(items: FaustUiNode[]): Map<string, string> {
  const addressByShortName = new Map<string, string>();
  const pending = [...items].reverse();

  while (pending.length > 0) {
    const item = pending.pop() as FaustUiNode;

    if (Array.isArray(item.items)) {
      pending.push(...[...(item.items as FaustUiNode[])].reverse());
      continue;
    }

    if (typeof item.shortname === "string" && typeof item.address === "string") {
      addressByShortName.set(item.shortname, item.address);
    }
  }

  return addressByShortName;
}
