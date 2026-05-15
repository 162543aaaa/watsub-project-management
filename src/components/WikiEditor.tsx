import DOMPurify from "dompurify";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// ---------------------------------------------------------------------------
// WikiViewer
// Renders sanitised HTML (DOMPurify) – safe to use with dangerouslySetInnerHTML
// ---------------------------------------------------------------------------
interface WikiViewerProps {
  htmlContent: string;
  className?: string;
}

export function WikiViewer({ htmlContent, className = "" }: WikiViewerProps) {
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

// ---------------------------------------------------------------------------
// Toolbar button helper
// ---------------------------------------------------------------------------
interface ToolbarBtnProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}

function ToolbarBtn({ active, onClick, children, title }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded transition-colors font-medium select-none ${
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// WikiEditor
// ---------------------------------------------------------------------------
interface WikiEditorProps {
  /** Initial HTML content */
  initialContent?: string;
  /** Called with the latest HTML whenever content changes */
  onChange?: (html: string) => void;
  /** Render as a read-only viewer (no toolbar, no cursor) */
  readOnly?: boolean;
  /** Extra class names applied to the outer wrapper */
  className?: string;
}

export function WikiEditor({
  initialContent = "",
  onChange,
  readOnly = false,
  className = "",
}: WikiEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML());
    },
  });

  if (!editor) return null;

  if (readOnly) {
    return (
      <WikiViewer htmlContent={editor.getHTML()} className={className} />
    );
  }

  return (
    <div className={`border border-border rounded-xl overflow-hidden bg-card ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/40">
        <ToolbarBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <s>S</s>
        </ToolbarBtn>
        <span className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          H2
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          H3
        </ToolbarBtn>
        <span className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          • List
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered List"
        >
          1. List
        </ToolbarBtn>
        <span className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          ❝
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code Block"
        >
          {"</>"}
        </ToolbarBtn>
        <span className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn
          active={false}
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          ↩
        </ToolbarBtn>
        <ToolbarBtn
          active={false}
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          ↪
        </ToolbarBtn>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className={[
          "p-3 text-sm text-foreground",
          "min-h-[140px]",
          "[&_.ProseMirror]:outline-none",
          "[&_.ProseMirror]:min-h-[120px]",
          "[&_.ProseMirror_p]:my-1",
          "[&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:my-2",
          "[&_.ProseMirror_h3]:text-sm [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:my-1.5",
          "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:my-1",
          "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:my-1",
          "[&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-primary/40 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:text-muted-foreground [&_.ProseMirror_blockquote]:my-1",
          "[&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-xs",
          "[&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:p-2 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-xs [&_.ProseMirror_pre]:my-2",
          "[&_.ProseMirror_.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.ProseMirror_.is-editor-empty]:before:text-muted-foreground/50 [&_.ProseMirror_.is-editor-empty]:before:pointer-events-none",
        ].join(" ")}
      />
    </div>
  );
}

export default WikiEditor;
