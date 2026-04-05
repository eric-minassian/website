import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const LIGHTHOUSE_FLAGS = ["--headless=new", "--no-sandbox"];
const REQUIRED_SCORE = 1;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

const runs = [
  { name: "mobile", extraArgs: [] },
  { name: "desktop", extraArgs: ["--preset=desktop"] },
];

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} exited with code ${code ?? "null"} (${signal ?? "no signal"})`,
        ),
      );
    });
  });
}

function roundedScore(score) {
  return Math.round(score * 100);
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream";
}

async function resolveAssetPath(requestPath) {
  const cleanPath = requestPath.split("?")[0];
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const candidatePath = path.resolve(DIST_DIR, relativePath);

  if (!candidatePath.startsWith(DIST_DIR)) {
    return null;
  }

  try {
    const fileStats = await stat(candidatePath);
    if (fileStats.isDirectory()) {
      return path.join(candidatePath, "index.html");
    }

    return candidatePath;
  } catch {
    if (!path.extname(candidatePath)) {
      const htmlPath = `${candidatePath}.html`;

      try {
        await stat(htmlPath);
        return htmlPath;
      } catch {
        return null;
      }
    }

    return null;
  }
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    if (!request.url) {
      response.writeHead(400);
      response.end("Missing request URL");
      return;
    }

    const filePath = await resolveAssetPath(request.url);
    if (!filePath) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "content-type": getContentType(filePath) });
    createReadStream(filePath).pipe(response);
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to determine static server address");
  }

  return {
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    url: `http://127.0.0.1:${address.port}`,
  };
}

async function runSingleLighthouse(baseUrl, { name, extraArgs }) {
  const outputPath = `./tmp-lighthouse-${name}.json`;

  await run("npx", [
    "--yes",
    "lighthouse",
    baseUrl,
    "--quiet",
    `--output-path=${outputPath}`,
    "--output=json",
    `--chrome-flags=${LIGHTHOUSE_FLAGS.join(" ")}`,
    ...extraArgs,
  ]);

  const report = JSON.parse(await readFile(outputPath, "utf8"));
  const categories = report.categories;
  const scores = {
    performance: categories.performance.score,
    accessibility: categories.accessibility.score,
    "best-practices": categories["best-practices"].score,
    seo: categories.seo.score,
  };

  for (const [category, score] of Object.entries(scores)) {
    if (score < REQUIRED_SCORE) {
      throw new Error(
        `${name} ${category} score was ${roundedScore(score)}; required ${roundedScore(REQUIRED_SCORE)}`,
      );
    }
  }

  console.log(
    `${name}:`,
    Object.entries(scores)
      .map(([category, score]) => `${category}=${roundedScore(score)}`)
      .join(" "),
  );
}

const server = await startStaticServer();

try {
  await Promise.all(runs.map((runConfig) => runSingleLighthouse(server.url, runConfig)));
} finally {
  await server.close();
}
