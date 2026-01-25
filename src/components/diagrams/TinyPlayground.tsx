import { useEffect, useRef, useState } from "react";
import { instance } from "@viz-js/viz";
import { MutedText } from "./shared";

const DEFAULT_CODE = `main
var i, sum;
{
    let i <- 1;
    let sum <- 0;
    while i <= 10 do
        let sum <- sum + i;
        let i <- i + 1
    od;
    call OutputNum(sum);
    call OutputNewLine
}.`;

const DEBOUNCE_MS = 300;

interface TinyWasm {
  compile: (source: string) => string;
  default: (input?: { module_or_path: string }) => Promise<void>;
}

async function loadTinyWasm(): Promise<TinyWasm> {
  // Use dynamic import with blob URL to bypass Vite/Rollup bundling
  const jsResponse = await fetch("/wasm/tiny/tiny.js");
  const jsText = await jsResponse.text();
  const blob = new Blob([jsText], { type: "application/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  try {
    const module = (await import(/* @vite-ignore */ blobUrl)) as TinyWasm;
    // Initialize with the correct WASM path
    await module.default({ module_or_path: "/wasm/tiny/tiny_bg.wasm" });
    return module;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export function TinyPlayground() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [wasmReady, setWasmReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const compileRef = useRef<TinyWasm["compile"] | null>(null);
  const vizRef = useRef<Awaited<ReturnType<typeof instance>> | null>(null);

  // Load WASM and Viz.js on mount
  useEffect(() => {
    let cancelled = false;

    async function loadDeps() {
      try {
        const [tinyModule, vizInstance] = await Promise.all([
          loadTinyWasm(),
          instance(),
        ]);

        if (cancelled) return;

        compileRef.current = tinyModule.compile;
        vizRef.current = vizInstance;
        setWasmReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(`Failed to load: ${err}`);
        }
      }
    }

    loadDeps();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced compile on code change
  useEffect(() => {
    if (!wasmReady || !compileRef.current || !vizRef.current) return;

    const timer = setTimeout(() => {
      try {
        const dot = compileRef.current!(code);
        const rendered = vizRef.current!.renderSVGElement(dot, {
          engine: "dot",
        });
        setSvg(rendered.outerHTML);
        setError(null);
      } catch (err) {
        setError(String(err));
        setSvg(null);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [code, wasmReady]);

  return (
    <div className="my-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Editor */}
        <div className="flex flex-col">
          <MutedText className="mb-1 text-xs">Source code</MutedText>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const newCode = code.slice(0, start) + "\t" + code.slice(end);
                setCode(newCode);
                // Restore cursor position after React re-renders
                requestAnimationFrame(() => {
                  target.selectionStart = target.selectionEnd = start + 1;
                });
              }
            }}
            spellCheck={false}
            className="min-h-[320px] flex-1 resize-none rounded border border-neutral-300 bg-neutral-100 px-3 py-2 font-mono text-xs leading-relaxed dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>

        {/* Graph */}
        <div className="flex flex-col">
          <div className="mb-1 flex items-center gap-2">
            <MutedText className="text-xs">Control flow graph</MutedText>
            {!wasmReady && (
              <span className="text-xs text-neutral-400">Loading...</span>
            )}
            {svg && (
              <button
                onClick={() => setExpanded(true)}
                className="ml-auto text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                Expand
              </button>
            )}
          </div>
          <div className="min-h-[320px] flex-1 overflow-auto rounded border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            {error ? (
              <span className="text-xs text-red-600 dark:text-red-400">
                {error}
              </span>
            ) : svg ? (
              <div
                className="[&_svg]:h-auto [&_svg]:max-w-full [&_ellipse]:fill-neutral-100 [&_ellipse]:stroke-neutral-900 [&_path]:stroke-neutral-900 [&_polygon]:fill-neutral-100 [&_polygon]:stroke-neutral-900 [&_text]:fill-neutral-900 dark:[&_ellipse]:fill-neutral-800 dark:[&_ellipse]:stroke-neutral-100 dark:[&_path]:stroke-neutral-100 dark:[&_polygon]:fill-neutral-800 dark:[&_polygon]:stroke-neutral-100 dark:[&_text]:fill-neutral-100"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <MutedText className="text-xs">
                {wasmReady ? "Type code to see the graph" : "Loading compiler..."}
              </MutedText>
            )}
          </div>
        </div>
      </div>

      {/* Expanded modal */}
      {expanded && svg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="max-h-[90vh] max-w-[90vw] overflow-auto rounded-lg border border-neutral-300 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <MutedText className="text-xs">Control flow graph</MutedText>
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
              >
                Close
              </button>
            </div>
            <div
              className="[&_svg]:h-auto [&_svg]:max-w-full [&_ellipse]:fill-neutral-100 [&_ellipse]:stroke-neutral-900 [&_path]:stroke-neutral-900 [&_polygon]:fill-neutral-100 [&_polygon]:stroke-neutral-900 [&_text]:fill-neutral-900 dark:[&_ellipse]:fill-neutral-800 dark:[&_ellipse]:stroke-neutral-100 dark:[&_path]:stroke-neutral-100 dark:[&_polygon]:fill-neutral-800 dark:[&_polygon]:stroke-neutral-100 dark:[&_text]:fill-neutral-100"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
