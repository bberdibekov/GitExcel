// src/taskpane/core/excel/excel.interaction.service.ts

import { IInteractionChange, IRawEvent } from "../../types/types";
import { debugService } from "../services/debug.service";
import { EventSanitizer } from "../services/event.sanitizer";
import { AppConfig } from "../../../config";

// The key used in custom properties to store the persistent sheet ID.
const SHEET_ID_KEY = "h_sheet_id";

let selectionChangedHandler: any = null;

class ExcelInteractionService {
  private capturedChangeEvents: IRawEvent[] = [];
  private eventHandlers = new Map<string, any>();
  private eventBuffer: Excel.WorksheetChangedEventArgs[] = [];
  private flushBufferTimer: NodeJS.Timeout | null = null;
  private isMockingEvents: boolean = false;

  // Cache to map Excel's internal Session ID -> Our Persistent GUID
  private sessionIdToGuidMap = new Map<string, string>();

  public getRawEvents(): IRawEvent[] {
    return [...this.capturedChangeEvents];
  }

  // === NEW DEBUG/TEST METHODS ===

  /** Clears the event history buffer. Essential for running clean test cases. */
  public clearCapturedEvents(): void {
    this.capturedChangeEvents = [];
    if (this.flushBufferTimer) {
      clearTimeout(this.flushBufferTimer);
      this.flushBufferTimer = null;
      this.eventBuffer = [];
    }
    // We do NOT clear the sessionIdToGuidMap here, as IDs are stable for the session.
    console.log("[InteractionService] Captured event history cleared.");
  }

  /**
   * Temporarily replaces the live event stream with a defined array of mock events.
   * @param mockEvents The array of mock IRawEvent objects to use for the next comparison.
   * @returns A function to call to restore normal operation.
   */
  public injectMockEvents(mockEvents: IRawEvent[]): () => void {
    this.clearCapturedEvents(); // Ensure a clean slate
    this.isMockingEvents = true;

    const originalHandler = this.handleWorksheetChanged;
    this.handleWorksheetChanged = (
      _eventArgs: Excel.WorksheetChangedEventArgs,
    ): Promise<void> => {
      console.warn(
        "[InteractionService] Ignoring live event due to active mock.",
      );
      return Promise.resolve();
    };

    this.capturedChangeEvents = mockEvents.map(e => ({
        ...e,
        sheetId: e.sheetId || e.worksheetId 
    }));

    const restoreFn = () => {
      this.handleWorksheetChanged = originalHandler;
      this.isMockingEvents = false;
      this.clearCapturedEvents();
      console.log("[InteractionService] Mock event injection disabled.");
    };

    return restoreFn;
  }

  public async navigateToCell(sheetName: string, address: string) {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItem(sheetName);
      const range = sheet.getRange(address);
      range.select();
      await context.sync();
    });
  }

  public async showChangesOnSheet(changes: IInteractionChange[]) {
    await Excel.run(async (context) => {
      const changesBySheet = this.groupChangesBySheet(changes);
      for (const sheetName in changesBySheet) {
        const sheet = context.workbook.worksheets.getItem(sheetName);
        for (const change of changesBySheet[sheetName]) {
          const range = sheet.getRange(change.address);
          range.format.fill.color = "#FFC7CE";
          const commentText = this.formatComment(change);
          sheet.comments.add(change.address, commentText);
        }
      }
      await context.sync();
    });
  }

  public async clearChangesFromSheet(changes: IInteractionChange[]) {
    await Excel.run(async (context) => {
      const changesBySheet = this.groupChangesBySheet(changes);
      for (const sheetName in changesBySheet) {
        const sheet = context.workbook.worksheets.getItem(sheetName);
        for (const change of changesBySheet[sheetName]) {
          try {
            const range = sheet.getRange(change.address);
            range.clear(Excel.ClearApplyTo.formats);
            sheet.comments.getItemByCell(change.address).delete();
          } catch (error) {
            console.warn(
              `Could not clear cell ${change.sheet}!${change.address}.`,
              error,
            );
          }
        }
      }
      await context.sync();
    });
  }

  public async setupSelectionListener(
    changes: IInteractionChange[],
    onSelectionCallback: (change: IInteractionChange | null) => void,
  ) {
    await Excel.run(async (context) => {
      if (selectionChangedHandler) {
        context.workbook.onSelectionChanged.remove(selectionChangedHandler);
      }
      const eventHandler = async () => {
        await Excel.run(async (ctx) => {
          const selectedRange = ctx.workbook.getSelectedRange();
          selectedRange.load("address");
          const sheet = ctx.workbook.worksheets.getActiveWorksheet();
          sheet.load("name");
          await ctx.sync();
          const fullAddress = `${sheet.name}!${selectedRange.address}`;
          const foundChange = changes.find((c) =>
            `${c.sheet}!${c.address}` === fullAddress
          );
          onSelectionCallback(foundChange || null);
        });
      };
      context.workbook.onSelectionChanged.add(eventHandler);
      selectionChangedHandler = eventHandler;
      await context.sync();
    });
  }

  public async removeSelectionListener() {}

  public async startChangeTracking(): Promise<void> {
    await Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      // Load basic info plus CustomProperties to build the ID map
      worksheets.load("items/name, items/id");
      await context.sync();

      // Clear map to ensure freshness on restart
      this.sessionIdToGuidMap.clear();

      if (this.eventHandlers.size > 0) {
        console.log("[InteractionService] Already tracking. Skipping attach.");
      }

      // Step 1: Attach handlers & Load Custom Properties
      // We need to load custom properties for each sheet to extract the Persistent GUID
      const sheetPropsToLoad: {
        sheetId: string;
        prop: Excel.WorksheetCustomProperty; // <--- FIXED TYPE
      }[] = [];

      for (const sheet of worksheets.items) {
        // 1. Attach Handler if not present
        if (!this.eventHandlers.has(sheet.name)) {
          const handlerResult = sheet.onChanged.add(
            this.handleWorksheetChanged.bind(this),
          );
          this.eventHandlers.set(sheet.name, handlerResult);
        }

        // 2. Prepare to read Persistent ID
        const prop = sheet.customProperties.getItemOrNullObject(SHEET_ID_KEY);
        prop.load("value, isNullObject");
        sheetPropsToLoad.push({ sheetId: sheet.id, prop });
      }

      await context.sync();

      // Step 2: Populate the Map
      let mappedCount = 0;
      for (const item of sheetPropsToLoad) {
        if (!item.prop.isNullObject && item.prop.value) {
          this.sessionIdToGuidMap.set(item.sheetId, item.prop.value);
          mappedCount++;
        }
      }

      console.log(
        `[InteractionService] Started tracking ${worksheets.items.length} sheets. Mapped ${mappedCount} persistent IDs.`,
      );
    });
  }

  public async stopAndSaveChangeTracking(): Promise<void> {
    await Excel.run(async (context) => {
      const worksheets = context.workbook.worksheets;
      worksheets.load("items/name");
      await context.sync();
      for (const sheet of worksheets.items) {
        const handlerResult = this.eventHandlers.get(sheet.name);
        if (handlerResult) handlerResult.remove();
      }
      await context.sync();
    });

    if (this.flushBufferTimer) {
      clearTimeout(this.flushBufferTimer);
      await this.flushBuffer();
    }

    const rawEvents = [...this.capturedChangeEvents];
    const sanitizedEvents = EventSanitizer.sanitize(rawEvents);

    const exportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalRawEvents: rawEvents.length,
        totalUniqueActions: sanitizedEvents.length,
        reductionRatio: rawEvents.length > 0
          ? ((1 - sanitizedEvents.length / rawEvents.length) * 100).toFixed(1) +
            "%"
          : "0%",
      },
      sanitized: sanitizedEvents,
      raw: rawEvents,
    };

    debugService.saveRawEventLog("event_capture_full.json", exportData);

    this.eventHandlers.clear();
    this.capturedChangeEvents = [];
    // We can optionally clear the ID map here, or keep it for cache hits if restarted immediately.
    // this.sessionIdToGuidMap.clear(); 
    console.log(
      `[InteractionService] Tracking saved. Raw: ${rawEvents.length}, Sanitized: ${sanitizedEvents.length}`,
    );
  }

  private handleWorksheetChanged(
    eventArgs: Excel.WorksheetChangedEventArgs,
  ): Promise<void> {
    this.eventBuffer.push(eventArgs);
    if (this.flushBufferTimer) clearTimeout(this.flushBufferTimer);

    this.flushBufferTimer = setTimeout(() => {
      this.flushBuffer();
    }, AppConfig.eventTracking.flushDelayMs);

    return Promise.resolve();
  }

  private async flushBuffer() {
    if (this.eventBuffer.length === 0) return;
    const eventsToProcess = [...this.eventBuffer];
    this.eventBuffer = [];
    this.flushBufferTimer = null;

    await Excel.run(async (context) => {
      for (const eventArgs of eventsToProcess) {
        try {
          const worksheet = context.workbook.worksheets.getItem(
            eventArgs.worksheetId,
          );
          
          // Load name for display
          worksheet.load("name");
          
          // --- JIT ID Resolution ---
          // Check if we already have the GUID in our cache
          let persistentId = this.sessionIdToGuidMap.get(eventArgs.worksheetId);
          let propItem: Excel.WorksheetCustomProperty | null = null; // <--- FIXED TYPE

          // If not found (e.g. new sheet added during session), try to load it now
          if (!persistentId) {
            propItem = worksheet.customProperties.getItemOrNullObject(SHEET_ID_KEY);
            propItem.load("value, isNullObject");
          }

          await context.sync();

          // If we had to fetch it, update the cache now
          if (!persistentId && propItem && !propItem.isNullObject) {
            persistentId = propItem.value;
            this.sessionIdToGuidMap.set(eventArgs.worksheetId, persistentId);
            console.log(`[InteractionService] JIT mapped ${eventArgs.worksheetId} to ${persistentId}`);
          }
          // -------------------------

          const insertDirection = (
            ("changeDirectionState" in eventArgs &&
                eventArgs.changeDirectionState?.insertShiftDirection)
              ? String(eventArgs.changeDirectionState.insertShiftDirection)
              : "N/A"
          ) as any;

          const deleteDirection = (
            ("changeDirectionState" in eventArgs &&
                eventArgs.changeDirectionState?.deleteShiftDirection)
              ? String(eventArgs.changeDirectionState.deleteShiftDirection)
              : "N/A"
          ) as any;

          const eventData: IRawEvent = {
            timestamp: new Date().toISOString(),
            worksheetId: eventArgs.worksheetId, // Keep Session ID
            sheetId: persistentId,              // <--- Attach Persistent GUID
            worksheetName: worksheet.name,
            address: eventArgs.address,
            type: ("type" in eventArgs && typeof eventArgs.type === "number")
              ? String(eventArgs.type)
              : "N/A",
            changeType: eventArgs.changeType,
            source: eventArgs.source,
            triggerSource: "triggerSource" in eventArgs
              ? eventArgs.triggerSource
              : "N/A",
            changeDirectionState: {
              insertShiftDirection: insertDirection,
              deleteShiftDirection: deleteDirection,
            },
            details: {
              valueBefore: eventArgs.details?.valueBefore ?? "N/A",
              valueAfter: eventArgs.details?.valueAfter ?? "N/A",
              valueTypeBefore: eventArgs.details?.valueTypeBefore ?? "N/A",
              valueTypeAfter: eventArgs.details?.valueTypeAfter ?? "N/A",
            },
          };

          this.capturedChangeEvents.push(eventData);
          console.log(
            `[Event] ${eventData.changeType} @ ${worksheet.name}!${eventData.address} [ID: ${persistentId?.substring(0,6) ?? 'N/A'}]`,
          );
        } catch (error) {
          console.error(
            "[InteractionService] Error processing buffered event:",
            error,
          );
        }
      }
    });
  }

  private formatComment(change: IInteractionChange): string {
    let text = "--- Change Details ---\n\n";
    if (change.changeType === "value" || change.changeType === "both") {
      text += `Old Value:\n${change.oldValue}\n\n`;
      text += `New Value:\n${change.newValue}\n\n`;
    }
    if (change.changeType === "formula" || change.changeType === "both") {
      text += `Old Formula:\n${change.oldFormula}\n\n`;
      text += `New Formula:\n${change.newFormula}`;
    }
    return text.trim();
  }

  private groupChangesBySheet(
    changes: IInteractionChange[],
  ): Record<string, IInteractionChange[]> {
    return changes.reduce((acc, change) => {
      if (!acc[change.sheet]) acc[change.sheet] = [];
      acc[change.sheet].push(change);
      return acc;
    }, {} as Record<string, IInteractionChange[]>);
  }
}

export const excelInteractionService = new ExcelInteractionService();