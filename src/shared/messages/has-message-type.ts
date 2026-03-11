export function hasMessageType(value: unknown): value is { type: string } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      typeof (value as { type: unknown }).type === "string"
  );
}
