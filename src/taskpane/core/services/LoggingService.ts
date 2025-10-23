// src/taskpane/services/LoggingService.ts

/**
 * A singleton service for logging that provides context-aware prefixes.
 * This helps distinguish between logs originating from the main task pane
 * and those from a sandboxed dialog window when viewing the console.
 */
class LoggingService {
  private readonly contextPrefix: "[TaskPane]" | "[Dialog]";

  constructor() {
    // Determine the execution context once upon instantiation.
    const isDialog = !!(window.Office && Office.context && Office.context.ui.messageParent);
    this.contextPrefix = isDialog ? "[Dialog]" : "[TaskPane]";
  }

  /**
   * Logs a standard informational message to the console.
   * @param message The primary message to log.
   * @param optionalParams Any additional objects or variables to include in the log.
   */
  public log(message: string, ...optionalParams: any[]): void {
    console.log(`${this.contextPrefix} ${message}`, ...optionalParams);
  }

  /**
   * Logs a warning message to the console.
   * @param message The warning message to log.
   * @param optionalParams Any additional objects or variables to include.
   */
  public warn(message: string, ...optionalParams: any[]): void {
    console.warn(`${this.contextPrefix} ${message}`, ...optionalParams);
  }

  /**
   * Logs an error to the console, including the full error object for stack tracing.
   * @param error The Error object that was caught.
   * @param message An optional friendly message to provide context for the error.
   */
  public logError(error: Error, message?: string): void {
    const errorMessage = message || "An error occurred";
    console.error(`${this.contextPrefix} ${errorMessage}`, error);
  }
}

// Export a singleton instance for use throughout the application.
export const loggingService = new LoggingService();