import { useState } from "react";

export function AccessFlow() {
  const [authed, setAuthed] = useState(false);

  return (
    <div className="my-6 space-y-3">
      <div className="rounded border border-neutral-300 bg-neutral-100 p-3 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800">
        <div className="text-neutral-500 dark:text-neutral-400"># your static site</div>
        <div className="mt-1">
          curl https://gate.example/api/file/abc123 \
        </div>
        <div className="pl-4">
          -H "Authorization: Bearer {authed ? "eyJhb..." : "<token>"}"
        </div>
        <div className="mt-2 border-t border-neutral-300 pt-2 dark:border-neutral-700">
          <span className="text-neutral-500 dark:text-neutral-400"># response: </span>
          {authed ? (
            <span className="text-green-600 dark:text-green-400">200 OK + signed URL</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">401 pending approval</span>
          )}
        </div>
      </div>
      <div className="flex justify-center">
        <button
          onClick={() => setAuthed(!authed)}
          className="rounded border border-neutral-300 bg-neutral-100 px-3 py-1 text-xs transition-colors hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          {authed ? "Revoke access" : "Approve request"}
        </button>
      </div>
    </div>
  );
}
