import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, resolve } from "node:path";

const FIXTURES_ROOT = resolve(process.cwd(), "e2e/fixtures");

export async function startFixtureServer() {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const relativePath = requestUrl.pathname === "/" ? "/audio-basic.html" : requestUrl.pathname;
      const targetPath = normalize(join(FIXTURES_ROOT, relativePath));

      if (!targetPath.startsWith(FIXTURES_ROOT)) {
        response.writeHead(403).end("Forbidden");
        return;
      }

      const file = await readFile(targetPath);
      response.writeHead(200, { "content-type": getContentType(targetPath), "cache-control": "no-store" });
      response.end(file);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolvePromise) => {
    server.listen(0, "127.0.0.1", resolvePromise);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("The fixture server could not determine its bound address.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise((resolvePromise, rejectPromise) => {
        server.close((error) => {
          if (error) {
            rejectPromise(error);
            return;
          }

          resolvePromise(undefined);
        });
      });
    }
  };
}

function getContentType(targetPath) {
  if (targetPath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }

  if (targetPath.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }

  return "application/octet-stream";
}
