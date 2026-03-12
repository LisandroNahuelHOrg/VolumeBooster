export function parseCompileOptions(json: string): string {
  const parsed = JSON.parse(json) as { compile_options?: unknown };
  return typeof parsed.compile_options === "string" ? parsed.compile_options : "";
}
