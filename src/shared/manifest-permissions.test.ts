import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("extension manifest host permissions", () => {
  it("declares all-sites access as a required host permission instead of an optional one", async () => {
    const manifestPath = resolve(import.meta.dirname, "../../public/manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      host_permissions?: string[];
      optional_host_permissions?: string[];
    };

    expect(manifest.host_permissions).toContain("<all_urls>");
    expect(manifest.optional_host_permissions ?? []).not.toContain("<all_urls>");
  });
});
