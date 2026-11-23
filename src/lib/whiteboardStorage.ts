// Whiteboards live in wiki_pages under these categories; the Wiki list hides them.
export const CANVAS_CATEGORY = "Canvas";
export const CANVAS_FILE_CATEGORY = "CanvasFile";
// earlier Excalidraw boards, kept hidden
const LEGACY_CATEGORIES = ["Whiteboard", "WhiteboardFile"];
export const HIDDEN_WIKI_CATEGORIES = [CANVAS_CATEGORY, CANVAS_FILE_CATEGORY, ...LEGACY_CATEGORIES];
