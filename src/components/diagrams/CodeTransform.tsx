import { CodeBlock, MutedText } from "./shared";

/** Static diagram showing Smithy client input to generated output */
export function CodeTransform() {
  return (
    <div className="my-6 flex items-center justify-center gap-4 text-sm">
      <CodeBlock>
        <MutedText>// smithy client</MutedText>
        <div>@aws-sdk/client-s3</div>
        <div className="text-neutral-400 dark:text-neutral-500">@myorg/api-client</div>
      </CodeBlock>
      <span className="text-neutral-400 dark:text-neutral-600">→</span>
      <CodeBlock>
        <MutedText>// generated</MutedText>
        <div>getObjectQueryOptions()</div>
        <div>putObjectMutationOptions()</div>
        <div>clientKeys.getObject(...)</div>
      </CodeBlock>
    </div>
  );
}
