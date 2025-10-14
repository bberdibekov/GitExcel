// src/taskpane/services/debug.service.ts

interface ILogEntry {
  timestamp: string;
  description: string;
  data: any;
}

class DebugService {
  private logEntries: ILogEntry[] = [];

  public startNewLogSession(): void {
    this.logEntries = [];
    console.log("[DebugService] New log session started.");
  }

  public addLogEntry(description: string, data: any): void {
    const now = new Date();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const formattedTimestamp = `${minutes}:${seconds}`;

    const entry: ILogEntry = {
      timestamp: formattedTimestamp,
      description: description,
      data: JSON.parse(JSON.stringify(data)),
    };
    this.logEntries.push(entry);
    console.log(`[DebugService] Log entry added: "${description}"`);
  }

  public saveLogSession(filename: string): void {
    if (this.logEntries.length === 0) {
      console.warn("[DebugService] Save requested, but log session is empty.");
      return;
    }

    try {
      const jsonString = JSON.stringify(this.logEntries, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`[DebugService] Log session saved to "${filename}".`);
    } catch (error) {
      console.error("[DebugService] Failed to save log session:", error);
    }
  }
}

export const debugService = new DebugService();