import DOMPurify from "dompurify";

interface WikiViewerProps {
  htmlContent: string;
  className?: string;
}

export default function WikiViewer({ htmlContent, className = "" }: WikiViewerProps) {
  const clean = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s",
      "h1", "h2", "h3", "h4",
      "ul", "ol", "li",
      "blockquote", "code", "pre",
      "a", "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
