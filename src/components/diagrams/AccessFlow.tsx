import { useState } from "react";
import { CodeBlock, DiagramButton, MutedText } from "./shared";

/** Interactive API demo showing approval-gated access */
export function AccessFlow() {
  const [authed, setAuthed] = useState(false);

  return (
    <div className="my-6 space-y-3">
      <CodeBlock className="p-3">
        <MutedText># your static site</MutedText>
        <div className="mt-1">
          curl https://gate.example/api/file/abc123 \
        </div>
        <div className="pl-4">
          -H "Authorization: Bearer {authed ? "eyJhb..." : "<token>"}"
        </div>
        <div className="mt-2 border-t border-neutral-300 pt-2 dark:border-neutral-700">
          <MutedText># response: </MutedText>
          {authed ? (
            <span className="text-green-600 dark:text-green-400">200 OK + signed URL</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">401 pending approval</span>
          )}
        </div>
      </CodeBlock>
      <div className="flex justify-center">
        <DiagramButton onClick={() => setAuthed(!authed)}>
          {authed ? "Revoke access" : "Approve request"}
        </DiagramButton>
      </div>
    </div>
  );
}
