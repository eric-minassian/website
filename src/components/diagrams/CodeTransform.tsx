export function CodeTransform() {
  return (
    <div className="my-6 flex items-center justify-center gap-4 text-sm">
      <div className="rounded border border-neutral-300 bg-neutral-100 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800">
        <div className="text-neutral-500 dark:text-neutral-400">// input</div>
        <div>@aws-sdk/client-s3</div>
      </div>
      <span className="text-neutral-400 dark:text-neutral-600">→</span>
      <div className="rounded border border-neutral-300 bg-neutral-100 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800">
        <div className="text-neutral-500 dark:text-neutral-400">// output</div>
        <div>getObjectQueryOptions()</div>
        <div>putObjectMutationOptions()</div>
        <div>s3Keys.getObject(...)</div>
      </div>
    </div>
  );
}
