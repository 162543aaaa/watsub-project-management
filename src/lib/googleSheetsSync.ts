const GOOGLE_SHEETS_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbwubEYbHVadOuZ4Ju3747SwsRDIyS_yTa_-Bf5PYzkNNrR7BT2s9gtZNnnl5-IjWpmy/exec";

export async function syncToGoogleSheets(tableName: string, data: any) {
  try {
    await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        table_name: tableName,
        data,
      }),
    });
  } catch {
    // Silent fail by design: Google Sheets sync should never block UI flows
  }
}
