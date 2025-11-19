// src/taskpane/core/services/debug.service.ts

interface ILogEntry {
  timestamp: string;
  description: string;
  data: any;
}

class DebugService {
  private logEntries: ILogEntry[] = [];
  // A separate store for capturing the state of specific variables.
  private capturedState: Record<string, any> = {};

  public startNewLogSession(): void {
    this.logEntries = [];
    this.capturedState = {};
    console.log("[DebugService] New log session started (events and state cleared).");
  }

  /**
   * Records a chronological event in the session log.
   */
  public addLogEntry(description: string, data: any): void {
    const now = new Date();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    const formattedTimestamp = `${minutes}:${seconds}.${milliseconds}`;

    const entry: ILogEntry = {
      timestamp: formattedTimestamp,
      description: description,
      // Deep clone data to prevent subsequent mutations from affecting the log.
      data: JSON.parse(JSON.stringify(data)),
    };
    this.logEntries.push(entry);
    console.log(`[DebugService] Log entry added: "${description}"`);
  }

  /**
   * Captures a snapshot of a variable's state at a specific moment.
   * If the key already exists, its value is overwritten with the new data.
   * @param key A unique identifier for the data being captured (e.g., 'Pre-Sanitized-Values').
   * @param data The variable or object to capture.
   */
  public capture(key: string, data: any): void {
    // Deep clone data to ensure we're storing a snapshot in time.
    this.capturedState[key] = JSON.parse(JSON.stringify(data));
    console.log(`[DebugService] State captured for key: "${key}"`);
  }

  public saveLogSession(filename: string): void {
    if (this.logEntries.length === 0 && Object.keys(this.capturedState).length === 0) {
      console.warn("[DebugService] Save requested, but log session is empty.");
      return;
    }

    try {
      const logData = {
        sessionEvents: this.logEntries,
        capturedState: this.capturedState,
      };

      this.triggerDownload(filename, logData);
      console.log(`[DebugService] Log session saved to "${filename}".`);
    } catch (error) {
      console.error("[DebugService] Failed to save log session:", error);
    }
  }

  /**
   * Saves raw data (array of events or structured object) to a JSON file.
   * Updated to accept any data structure, not just an array.
   */
  public saveRawEventLog(filename: string, data: any): void {
    const isEmptyArray = Array.isArray(data) && data.length === 0;
    const isEmptyObject = typeof data === 'object' && data !== null && !Array.isArray(data) && Object.keys(data).length === 0;

    if (!data || isEmptyArray || isEmptyObject) {
      console.warn("[DebugService] Save requested, but the data is empty.");
      return;
    }

    try {
      this.triggerDownload(filename, data);
      console.log(`[DebugService] Raw event log saved to "${filename}".`);
    } catch (error) {
      console.error("[DebugService] Failed to save raw event log:", error);
    }
  }

  private triggerDownload(filename: string, data: any) {
    const jsonString = JSON.stringify(data, null, 2);
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
export const debugService = new DebugService();