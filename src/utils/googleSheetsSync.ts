const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzPHyrRSwyThY61PRR37sUlUfvcuIFEyiGdU2ZG7b0pWu5BubMzyXntJNsXyIe5liaU/exec";

export const autoSyncToGoogleSheets = async (
  tableName: string,
  data: any,
  action: "upsert" | "delete" = "upsert",
) => {
  try {
    const normalizedData =
      data && typeof data === "object" && !Array.isArray(data)
        ? data
        : { data };

    const syncId =
      normalizedData && typeof normalizedData === "object" && !Array.isArray(normalizedData)
        ? (normalizedData as { id?: string }).id
        : undefined;

    if (!syncId) {
      console.error("Auto Sync skipped: missing id in payload", { table: tableName, payload: data });
      return;
    }

    fetch(GOOGLE_SHEET_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        table_name: tableName,
        data: normalizedData,
        action,
      }),
    }).catch((err) => console.error(`Background Sync Error (${tableName}):`, err));
  } catch (error) {
    console.error("Auto Sync preparation failed:", error);
  }
};
