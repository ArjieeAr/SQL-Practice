import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Problem descriptions are authored in this repo (content/problems), not by users, so they're
 * trusted; react-markdown still never renders raw HTML. GFM adds tables for "Output" sections.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-surface-raised prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-th:text-left max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
