// src/taskpane/core/excel/excel.interaction.service.ts

import { IInteractionChange, IRawEvent } from "../../types/types";
import { debugService } from "../services/debug.service";
import { EventSanitizer } from "../services/event.sanitizer";
import { AppConfig } from "../../../config";

// The key used in custom properties to store the persistent sheet ID.
const SHEET_ID_KEY = "VersionControl.PersistentSheetId";

let selectionChangedHandler: any = null;

class ExcelInteractionService {
  private capturedChangeEvents: IRawEvent[] = [];
  private eventHandlers = new Map<string, any>();
  
  // Store the global listener for new sheets
  private worksheetAddedHandler: any = null; 

  private eventBuffer: Excel.WorksheetChangedEventArgs[] = [];
  private flushBufferTimer: NodeJS.Timeout | null = null;
  private isMockingEvents: boolean = false;

  // Cache to map Excel's internal Session ID -> Our Persistent GUID
  private sessionIdToGuidMap = new Map<string, string>();

  public getRawEvents(): IRawEvent[] {
    return [...this.capturedChangeEvents];
  }

  // === NEW DEBUG/TEST METHODS ===

  public clearCapturedEvents(): void {
    this.capturedChangeEvents = [];
    if (this.flushBufferTimer) {
      clearTimeout(this.flushBufferTimer);
      this.flushBufferTimer = null;
      this.eventBuffer = [];
    }
    console.log("[InteractionService] Captured event history cleared.");
  }

  public injectMockEvents(mockEvents: IRawEvent[]): () => void {
    this.clearCapturedEvents();
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

  /**
   * ATOMIC OPERATION:
   * 1. Forces any buffered (pending) events to be processed immediately.
   * 2. RECONCILIATION: Checks for missing IDs and fetches them from Excel.
   * 3. Returns all captured events.
   * 4. Clears the internal storage.
   */
  public async popCapturedEvents(): Promise<IRawEvent[]> {
    // 1. Force flush of any pending events in the buffer
    if (this.flushBufferTimer) {
      clearTimeout(this.flushBufferTimer);
      this.flushBufferTimer = null;
    }
    
    if (this.eventBuffer.length > 0) {
      console.log("[InteractionService] Popping events: Flushing pending buffer first...");
      await this.flushBuffer(); 
    }

    // 2. RECONCILIATION: Fix "N/A" IDs
    // If we captured events before the sheet properties loaded, we must fix them now.
    const eventsMissingId = this.capturedChangeEvents.filter(e => !e.sheetId || e.sheetId === "N/A");
    
    if (eventsMissingId.length > 0) {
      console.log(`[InteractionService] Found ${eventsMissingId.length} events with 'N/A' Sheet IDs. Attempting reconciliation...`);
      await this.reconcileMissingIds(eventsMissingId);
    }

    // 3. Retrieve
    const events = [...this.capturedChangeEvents];

    // 4. Clear
    this.capturedChangeEvents = [];
    console.log(`[InteractionService] Popped ${events.length} events for version storage.`);

    return events;
  }

  /**
   * Helper to batch-fetch Persistent GUIDs for any events that missed the cache hit.
   * SELF-HEALING: If a sheet lacks an ID, we generate and assign one immediately.
   */
  private async reconcileMissingIds(events: IRawEvent[]) {
    const sessionIds = Array.from(new Set(events.map(e => e.worksheetId)));
    console.log(`[InteractionService] Reconciling IDs for ${sessionIds.length} sheets.`);

    await Excel.run(async (context) => {
      const sheetsToProcess: { 
        sessionId: string; 
        sheetObj: Excel.Worksheet; 
        prop: Excel.WorksheetCustomProperty 
      }[] = [];

      // 1. Load properties
      for (const sessionId of sessionIds) {
        try {
          const sheet = context.workbook.worksheets.getItem(sessionId);
          // We need to load the custom property object to check if it exists
          const prop = sheet.customProperties.getItemOrNullObject(SHEET_ID_KEY);
          prop.load("value, isNullObject");
          sheetsToProcess.push({ sessionId, sheetObj: sheet, prop });
        } catch (error) {
          console.warn(`[InteractionService] Failed to load sheet ${sessionId} for reconciliation.`);
        }
      }
      
      await context.sync();

      // 2. Check & Fix
      let updatesMade = false;

      for (const item of sheetsToProcess) {
        if (item.prop.isNullObject) {
          // CASE A: Property doesn't exist -> Create it (Self-Healing)
          const newGuid = this.generateSimpleId();
          console.log(`[InteractionService] Self-Healing: Assigning new ID ${newGuid} to sheet ${item.sessionId}`);
          
          item.sheetObj.customProperties.add(SHEET_ID_KEY, newGuid);
          this.sessionIdToGuidMap.set(item.sessionId, newGuid);
          updatesMade = true;
        } 
        else if (!item.prop.value) {
           // CASE B: Property exists but value is empty -> Update it
           const newGuid = this.generateSimpleId();
           console.log(`[InteractionService] Self-Healing: Fixing empty ID for sheet ${item.sessionId} -> ${newGuid}`);
           
           item.prop.set({ value: newGuid });
           this.sessionIdToGuidMap.set(item.sessionId, newGuid);
           updatesMade = true;
        }
        else {
          // CASE C: All good -> Just cache it
          this.sessionIdToGuidMap.set(item.sessionId, item.prop.value);
        }
      }

      // 3. Save changes if we performed any self-healing
      if (updatesMade) {
        await context.sync();
        console.log("[InteractionService] Self-Healing complete. IDs persisted to Excel.");
      }
    });

    // 4. Backfill the events in memory
    let fixedEvents = 0;
    for (const event of this.capturedChangeEvents) {
      if (!event.sheetId || event.sheetId === "N/A") {
        const foundGuid = this.sessionIdToGuidMap.get(event.worksheetId);
        if (foundGuid) {
          event.sheetId = foundGuid;
          fixedEvents++;
        }
      }
    }
    console.log(`[InteractionService] Reconciliation complete. Fixed ${fixedEvents} events.`);
  }

  /**
   * Simple UUID v4-like generator for fallback ID creation.
   */
  private generateSimpleId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
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
      
      // === ATTACH GLOBAL LISTENER FOR NEW SHEETS ===
      if (!this.worksheetAddedHandler) {
          this.worksheetAddedHandler = worksheets.onAdded.add(this.handleWorksheetAdded.bind(this));
      }

      await context.sync();

      // Clear map to ensure freshness on restart
      this.sessionIdToGuidMap.clear();

      if (this.eventHandlers.size > 0) {
        console.log("[InteractionService] Already tracking. Skipping attach.");
      }

      // Step 1: Attach handlers & Load Custom Properties
      const sheetPropsToLoad: {
        sheetId: string;
        prop: Excel.WorksheetCustomProperty;
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
        `[InteractionService] Started tracking ${worksheets.items.length} sheets. Mapped ${mappedCount} persistent IDs. Global 'onAdded' listener active.`,
      );
    });
  }

  public async stopAndSaveChangeTracking(): Promise<void> {
    await Excel.run(async (context) => {
        
      // 1. Remove the Global 'onAdded' listener
      if (this.worksheetAddedHandler) {
          this.worksheetAddedHandler.remove();
          this.worksheetAddedHandler = null;
      }

      // 2. Remove all Sheet-level 'onChanged' listeners
      // We iterate the map values directly to ensure we catch everything, 
      // even if a sheet was deleted during the session.
      this.eventHandlers.forEach((handler) => {
          handler.remove();
      });
      this.eventHandlers.clear();
      
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

    this.capturedChangeEvents = [];
    console.log(
      `[InteractionService] Tracking saved. Raw: ${rawEvents.length}, Sanitized: ${sanitizedEvents.length}`,
    );
  }

  // === NEW HANDLER FOR DYNAMIC SHEETS ===
  private handleWorksheetAdded(eventArgs: Excel.WorksheetAddedEventArgs): Promise<void> {
      return Excel.run(async (context) => {
          const sheet = context.workbook.worksheets.getItem(eventArgs.worksheetId);
          sheet.load("name, id");
          
          // 1. Attach Change Listener
          const handlerResult = sheet.onChanged.add(this.handleWorksheetChanged.bind(this));
          
          // 2. Generate & Attach Persistent ID immediately
          // We do this here so the sheet is "ready" for tracking before user edits it
          const newGuid = this.generateSimpleId();
          sheet.customProperties.add(SHEET_ID_KEY, newGuid);
          
          await context.sync();

          console.log(`[InteractionService] New sheet detected via listener: "${sheet.name}". Attached tracker & ID.`);
          
          this.eventHandlers.set(sheet.name, handlerResult);
          this.sessionIdToGuidMap.set(sheet.id, newGuid);
      });
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

    await Excel.run(async (_context) => {
      for (const eventArgs of eventsToProcess) {
        try {
          // --- JIT ID Resolution ---
          // Check if we already have the GUID in our cache
          let persistentId = this.sessionIdToGuidMap.get(eventArgs.worksheetId);
          
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
            sheetId: persistentId ?? "N/A",     // Mark as N/A if not found yet
            worksheetName: "Loading...",        // Optimization: Don't fetch name on every keystroke
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
            `[Event] ${eventData.changeType} @ ${eventData.address} [ID: ${persistentId?.substring(0,6) ?? 'N/A'}]`,
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