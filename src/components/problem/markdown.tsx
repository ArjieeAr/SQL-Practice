import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Descriptions can come from user proposals, so they aren't trusted. react-markdown never renders
 * raw HTML and strips unsafe link protocols. GFM adds tables for "Output" sections.
 *
 * Pass `allowImages={false}` when reviewing unpublished text: a remote image would load as soon as
 * an admin opens the proposal, revealing their IP address to whoever wrote it.
 */
export function Markdown({
  children,
  allowImages = true,
}: {
  children: string;
  allowImages?: boolean;
}) {
  return (
    <div className="prose prose-sm dark:prose-invert prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-surface-raised prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-th:text-left max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={allowImages ? undefined : ["img"]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
