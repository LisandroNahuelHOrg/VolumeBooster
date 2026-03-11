export function getFaustSampleSize(meta: { compile_options?: string | null }): 4 | 8 {
  return meta.compile_options?.includes("-double") ? 8 : 4;
}
