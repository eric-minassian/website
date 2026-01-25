import { useState } from "react";
import { CodeBlock, DiagramButton, MutedText } from "./shared";

/** Interactive demo showing encrypted sync between devices */
export function SyncDiagram() {
  const [synced, setSynced] = useState(false);

  const sampleData = "amount: $50.00";
  const encrypted = "x8Kj2mN...";

  return (
    <div className="my-6 space-y-3">
      <div className="flex justify-center">
        <DiagramButton onClick={() => setSynced(!synced)}>
          {synced ? "Reset" : "Sync to cloud"}
        </DiagramButton>
      </div>
      <div className="flex items-start justify-center gap-4 text-xs">
        <div className="space-y-1 text-center">
          <MutedText>Your browser</MutedText>
          <CodeBlock>{sampleData}</CodeBlock>
          <div className="text-[10px] text-neutral-400">SQLite in WASM</div>
        </div>
        {synced && (
          <>
            <div className="flex flex-col items-center gap-1 pt-6 text-neutral-400">
              <span>→</span>
            </div>
            <div className="space-y-1 text-center">
              <MutedText>Server sees</MutedText>
              <CodeBlock>{encrypted}</CodeBlock>
              <div className="text-[10px] text-neutral-400">encrypted blob</div>
            </div>
            <div className="flex flex-col items-center gap-1 pt-6 text-neutral-400">
              <span>→</span>
            </div>
            <div className="space-y-1 text-center">
              <MutedText>Other device</MutedText>
              <CodeBlock>{sampleData}</CodeBlock>
              <div className="text-[10px] text-neutral-400">decrypted locally</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
