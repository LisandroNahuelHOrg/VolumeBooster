export function serializeFetchBody(body: RequestInit["body"]): string | undefined {
  if (typeof body === "string") {
    return body;
  }

  if (body instanceof Uint8Array) {
    return new TextDecoder().decode(body);
  }

  if (body instanceof URLSearchParams) {
    return body.toString();
  }

  return undefined;
}
