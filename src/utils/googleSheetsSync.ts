const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzPHyrRSwyThY61PRR37sUlUfvcuIFEyiGdU2ZG7b0pWu5BubMzyXntJNsXyIe5liaU/exec";

export const autoSyncToGoogleSheets = async (
  tableName: string,
  data: any,
  action: "upsert" | "delete" = "upsert",
) => {
  try {
    fetch(GOOGLE_SHEET_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        table_name: tableName,
        data,
        action,
      }),
    }).catch((err) => console.error("Sync Error:", err));
  } catch (error) {
    console.error("Auto Sync failed:", error);
  }
};
