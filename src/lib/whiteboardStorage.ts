// Whiteboards live in wiki_pages under these categories; the Wiki list hides them.
export const CANVAS_CATEGORY = "Canvas";
export const CANVAS_FILE_CATEGORY = "CanvasFile";
export const CANVAS_VERSION_CATEGORY = "CanvasVersion";
// earlier Excalidraw boards, kept hidden
const LEGACY_CATEGORIES = ["Whiteboard", "WhiteboardFile"];
export const HIDDEN_WIKI_CATEGORIES = [CANVAS_CATEGORY, CANVAS_FILE_CATEGORY, CANVAS_VERSION_CATEGORY, ...LEGACY_CATEGORIES];
