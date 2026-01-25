import type { ReactNode } from "react";

interface CodeBlockProps {
  children: ReactNode;
  className?: string;
}

/** Styled code block container for diagrams */
export function CodeBlock({ children, className = "" }: CodeBlockProps) {
  return (
    <div
      className={`rounded border border-neutral-300 bg-neutral-100 px-3 py-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800 ${className}`}
    >
      {children}
    </div>
  );
}

interface DiagramButtonProps {
  onClick: () => void;
  children: ReactNode;
}

/** Interactive button for diagram controls */
export function DiagramButton({ onClick, children }: DiagramButtonProps) {
  return (
    <button
      onClick={onClick}
      className="rounded border border-neutral-300 bg-neutral-100 px-3 py-1 text-xs transition-colors hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
    >
      {children}
    </button>
  );
}

interface MutedTextProps {
  children: ReactNode;
  className?: string;
}

/** Muted text for labels and comments */
export function MutedText({ children, className = "" }: MutedTextProps) {
  return (
    <span className={`text-neutral-500 dark:text-neutral-400 ${className}`}>
      {children}
    </span>
  );
}
