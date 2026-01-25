import { useState } from "react";

export function SyncDiagram() {
  const [synced, setSynced] = useState(false);

  const sampleData = "amount: $50.00";
  const encrypted = "x8Kj2mN...";

  return (
    <div className="my-6 space-y-3">
      <div className="flex justify-center">
        <button
          onClick={() => setSynced(!synced)}
          className="rounded border border-neutral-300 bg-neutral-100 px-3 py-1 text-xs transition-colors hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          {synced ? "Reset" : "Sync to cloud"}
        </button>
      </div>
      <div className="flex items-start justify-center gap-4 text-xs">
        <div className="space-y-1 text-center">
          <div className="text-neutral-500 dark:text-neutral-400">Your browser</div>
          <div className="rounded border border-neutral-300 bg-neutral-100 px-3 py-2 font-mono dark:border-neutral-700 dark:bg-neutral-800">
            {sampleData}
          </div>
          <div className="text-[10px] text-neutral-400">SQLite in WASM</div>
        </div>
        {synced && (
          <>
            <div className="flex flex-col items-center gap-1 pt-6 text-neutral-400">
              <span>→</span>
            </div>
            <div className="space-y-1 text-center">
              <div className="text-neutral-500 dark:text-neutral-400">Server sees</div>
              <div className="rounded border border-neutral-300 bg-neutral-100 px-3 py-2 font-mono dark:border-neutral-700 dark:bg-neutral-800">
                {encrypted}
              </div>
              <div className="text-[10px] text-neutral-400">encrypted blob</div>
            </div>
            <div className="flex flex-col items-center gap-1 pt-6 text-neutral-400">
              <span>→</span>
            </div>
            <div className="space-y-1 text-center">
              <div className="text-neutral-500 dark:text-neutral-400">Other device</div>
              <div className="rounded border border-neutral-300 bg-neutral-100 px-3 py-2 font-mono dark:border-neutral-700 dark:bg-neutral-800">
                {sampleData}
              </div>
              <div className="text-[10px] text-neutral-400">decrypted locally</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
