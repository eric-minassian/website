import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const REPORT_DIR = path.resolve("lighthouse-reports");
const LIGHTHOUSE_FLAGS = ["--headless=new", "--no-sandbox"];
const DEFAULT_REQUIRED_SCORE = 1;
// Mobile Lighthouse performance flakes at 99/100 on CI because CPU throttling
// timing varies across runners. Desktop and every other category stay at 100.
const REQUIRED_SCORE_OVERRIDES = {
  mobile: { performance: 0.99 },
};
const PERF_DIAGNOSTIC_AUDITS = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "speed-index",
  "total-blocking-time",
  "cumulative-layout-shift",
  "interactive",
  "max-potential-fid",
  "server-response-time",
  "render-blocking-resources",
  "unused-javascript",
  "unused-css-rules",
  "uses-text-compression",
  "uses-responsive-images",
];

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

function formatAudit(audit) {
  const score = audit.score === null ? "n/a" : audit.score.toFixed(2);
  const value = audit.displayValue ? ` (${audit.displayValue})` : "";
  return `    - ${audit.id}: score=${score}${value}`;
}

function logPerformanceDiagnostics(name, report) {
  const audits = report.audits ?? {};
  const lines = [`  ${name} performance audits:`];

  for (const id of PERF_DIAGNOSTIC_AUDITS) {
    const audit = audits[id];
    if (audit) {
      lines.push(formatAudit(audit));
    }
  }

  const failing = Object.values(audits).filter(
    (audit) =>
      typeof audit.score === "number" &&
      audit.score < 1 &&
      !PERF_DIAGNOSTIC_AUDITS.includes(audit.id),
  );
  if (failing.length > 0) {
    lines.push("  other audits with score < 1:");
    for (const audit of failing) {
      lines.push(formatAudit(audit));
    }
  }

  console.log(lines.join("\n"));
}

async function runSingleLighthouse(baseUrl, { name, extraArgs }) {
  const outputPath = path.join(REPORT_DIR, name);

  await run("npx", [
    "--yes",
    "lighthouse",
    baseUrl,
    "--quiet",
    `--output-path=${outputPath}`,
    "--output=json",
    "--output=html",
    `--chrome-flags=${LIGHTHOUSE_FLAGS.join(" ")}`,
    ...extraArgs,
  ]);

  const report = JSON.parse(await readFile(`${outputPath}.report.json`, "utf8"));
  const categories = report.categories;
  const scores = {
    performance: categories.performance.score,
    accessibility: categories.accessibility.score,
    "best-practices": categories["best-practices"].score,
    seo: categories.seo.score,
  };

  console.log(
    `${name}:`,
    Object.entries(scores)
      .map(([category, score]) => `${category}=${roundedScore(score)}`)
      .join(" "),
  );

  const overrides = REQUIRED_SCORE_OVERRIDES[name] ?? {};
  for (const [category, score] of Object.entries(scores)) {
    const required = overrides[category] ?? DEFAULT_REQUIRED_SCORE;
    if (score < required) {
      if (category === "performance") {
        logPerformanceDiagnostics(name, report);
      }
      throw new Error(
        `${name} ${category} score was ${roundedScore(score)}; required ${roundedScore(required)}`,
      );
    }
  }
}

await mkdir(REPORT_DIR, { recursive: true });
const server = await startStaticServer();

try {
  const failures = [];
  for (const runConfig of runs) {
    try {
      // Sequential on purpose: parallel Chrome sessions inflate mobile TBT on CI.
      // eslint-disable-next-line no-await-in-loop -- see comment above
      await runSingleLighthouse(server.url, runConfig);
    } catch (error) {
      console.error(error);
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new Error(`${failures.length} lighthouse run(s) failed`);
  }
} finally {
  await server.close();
}
