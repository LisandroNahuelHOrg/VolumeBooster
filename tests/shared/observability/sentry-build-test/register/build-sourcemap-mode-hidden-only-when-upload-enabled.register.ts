import { runBuildSourcemapModeHiddenOnlyWhenUploadEnabledCase } from "../callback/build-sourcemap-mode-hidden-only-when-upload-enabled.callback";

export function registerBuildSourcemapModeHiddenOnlyWhenUploadEnabledCase(): void {
  it(
    "only emits hidden sourcemaps when runtime and upload credentials are both enabled",
    runBuildSourcemapModeHiddenOnlyWhenUploadEnabledCase
  );
}
