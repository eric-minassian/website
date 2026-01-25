import { CodeBlock, MutedText } from "./shared";

/** Static diagram showing SDK input to generated output */
export function CodeTransform() {
  return (
    <div className="my-6 flex items-center justify-center gap-4 text-sm">
      <CodeBlock>
        <MutedText>// input</MutedText>
        <div>@aws-sdk/client-s3</div>
      </CodeBlock>
      <span className="text-neutral-400 dark:text-neutral-600">→</span>
      <CodeBlock>
        <MutedText>// output</MutedText>
        <div>getObjectQueryOptions()</div>
        <div>putObjectMutationOptions()</div>
        <div>s3Keys.getObject(...)</div>
      </CodeBlock>
    </div>
  );
}
