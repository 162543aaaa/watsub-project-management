const GOOGLE_SHEETS_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbwubEYbHVadOuZ4Ju3747SwsRDIyS_yTa_-Bf5PYzkNNrR7BT2s9gtZNnnl5-IjWpmy/exec";

export async function syncToGoogleSheets(tableName: string, data: any, fallbackId?: string) {
  try {
    const normalizedData =
      data && typeof data === "object" && !Array.isArray(data)
        ? { ...(data as Record<string, unknown>), id: (data as { id?: string }).id ?? fallbackId }
        : data;

    const syncId =
      normalizedData && typeof normalizedData === "object" && !Array.isArray(normalizedData)
        ? (normalizedData as { id?: string }).id
        : undefined;

    if (!syncId) {
      console.error("Google Sheets sync skipped: missing id in payload", { table: tableName, payload: data });
      return;
    }

    console.log("🚀 Triggering Google Sheets Sync...", { table: tableName, id: syncId, payload: normalizedData });
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        table_name: tableName,
        data: normalizedData,
      }),
    });
    if (!response.ok) {
      console.error("Google Sheets sync failed", { table: tableName, status: response.status });
    }
  } catch (error) {
    console.error("Google Sheets sync error", { table: tableName, error });
  }
}
