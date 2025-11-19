// src/taskpane/core/excel/excel.interaction.service.ts

import { IInteractionChange } from "../../types/types";
import { debugService } from "../services/debug.service";
import { EventSanitizer } from "../services/event.sanitizer"; 

let selectionChangedHandler: any = null;

class ExcelInteractionService {
  private capturedChangeEvents: any[] = [];
  private eventHandlers = new Map<string, any>();
  private eventBuffer: Excel.WorksheetChangedEventArgs[] = [];
  private flushBufferTimer: NodeJS.Timeout | null = null;

  // ... [navigateToCell, showChangesOnSheet, clearChangesFromSheet, setupSelectionListener remain unchanged] ...

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
            console.warn(`Could not clear cell ${change.sheet}!${change.address}.`, error);
          }
        }
      }
      await context.sync();
    });
  }

  public async setupSelectionListener(
    changes: IInteractionChange[],
    onSelectionCallback: (change: IInteractionChange | null) => void
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
          const foundChange = changes.find(c => `${c.sheet}!${c.address}` === fullAddress);
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
        worksheets.load("items/name");
        await context.sync();

        this.capturedChangeEvents = []; 
        this.eventBuffer = []; 
        
        for (const sheet of worksheets.items) {
            const handlerResult = sheet.onChanged.add(this.handleWorksheetChanged.bind(this));
            this.eventHandlers.set(sheet.name, handlerResult);
        }
        await context.sync();
        console.log(`[InteractionService] Started tracking onChanged event for ${worksheets.items.length} sheets.`);
    });
  }

  /**
   * Stops tracking, sanitizes the data, and saves a combined JSON file.
   */
  public async stopAndSaveChangeTracking(): Promise<void> {
    // 1. Remove listeners
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
    
    // 2. Flush buffer
    if (this.flushBufferTimer) {
        clearTimeout(this.flushBufferTimer);
        await this.flushBuffer(); 
    }

    // 3. Sanitize
    const rawEvents = [...this.capturedChangeEvents];
    const sanitizedEvents = EventSanitizer.sanitize(rawEvents);

    // 4. Build Payload
    const exportData = {
        metadata: {
            timestamp: new Date().toISOString(),
            totalRawEvents: rawEvents.length,
            totalUniqueActions: sanitizedEvents.length,
            reductionRatio: rawEvents.length > 0 ? ((1 - sanitizedEvents.length / rawEvents.length) * 100).toFixed(1) + "%" : "0%"
        },
        sanitized: sanitizedEvents,
        raw: rawEvents
    };

    // 5. Save
    debugService.saveRawEventLog('event_capture_full.json', exportData);

    this.eventHandlers.clear();
    this.capturedChangeEvents = [];
    console.log(`[InteractionService] Tracking saved. Raw: ${rawEvents.length}, Sanitized: ${sanitizedEvents.length}`);
  }

  private handleWorksheetChanged(eventArgs: Excel.WorksheetChangedEventArgs): Promise<void> {
    this.eventBuffer.push(eventArgs);
    if (this.flushBufferTimer) clearTimeout(this.flushBufferTimer);
    this.flushBufferTimer = setTimeout(() => { this.flushBuffer(); }, 250);
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
                const worksheet = context.workbook.worksheets.getItem(eventArgs.worksheetId);
                worksheet.load("name");
                await context.sync();

                const eventData = {
                    timestamp: new Date().toISOString(),
                    worksheetId: eventArgs.worksheetId,
                    worksheetName: worksheet.name,
                    address: eventArgs.address,
                    type: eventArgs.type, 
                    changeType: eventArgs.changeType, 
                    source: eventArgs.source,
                    triggerSource: 'triggerSource' in eventArgs ? eventArgs.triggerSource : 'N/A',
                    changeDirectionState: {
                        insertShiftDirection: ('changeDirectionState' in eventArgs && eventArgs.changeDirectionState?.insertShiftDirection) ? eventArgs.changeDirectionState.insertShiftDirection : 'N/A',
                        deleteShiftDirection: ('changeDirectionState' in eventArgs && eventArgs.changeDirectionState?.deleteShiftDirection) ? eventArgs.changeDirectionState.deleteShiftDirection : 'N/A'
                    },
                    details: {
                        valueBefore: eventArgs.details?.valueBefore ?? "N/A",
                        valueAfter: eventArgs.details?.valueAfter ?? "N/A",
                        valueTypeBefore: eventArgs.details?.valueTypeBefore ?? "N/A",
                        valueTypeAfter: eventArgs.details?.valueTypeAfter ?? "N/A",
                    },
                };
                
                this.capturedChangeEvents.push(eventData);
                console.log(`[Event Log] ${eventData.changeType} at ${eventData.address}`, eventData);
            } catch (error) {
                console.error("[InteractionService] Error processing buffered event:", error);
            }
        }
    });
  }

  private formatComment(change: IInteractionChange): string {
    let text = "--- Change Details ---\n\n";
    if (change.changeType === 'value' || change.changeType === 'both') {
      text += `Old Value:\n${change.oldValue}\n\n`;
      text += `New Value:\n${change.newValue}\n\n`;
    }
    if (change.changeType === 'formula' || change.changeType === 'both') {
      text += `Old Formula:\n${change.oldFormula}\n\n`;
      text += `New Formula:\n${change.newFormula}`;
    }
    return text.trim();
  }

  private groupChangesBySheet(changes: IInteractionChange[]): Record<string, IInteractionChange[]> {
    return changes.reduce((acc, change) => {
      if (!acc[change.sheet]) { acc[change.sheet] = []; }
      acc[change.sheet].push(change);
      return acc;
    }, {} as Record<string, IInteractionChange[]>);
  }
}

export const excelInteractionService = new ExcelInteractionService();