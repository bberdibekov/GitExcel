// src/taskpane/core/services/event.sanitizer.ts

import { AppConfig } from "../../../config";

export interface IRawEvent {
  changeType: string;
  address: string;
  worksheetId: string;
  worksheetName?: string;
  timestamp: string;
  source?: string;
  [key: string]: any;
}

export class EventSanitizer {
  
  public static sanitize(rawEvents: IRawEvent[]): IRawEvent[] {
    if (!rawEvents || rawEvents.length === 0) return [];

    // 1. Sort by timestamp to restore linear chronology
    const sortedEvents = [...rawEvents].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const sanitized: IRawEvent[] = [];
    let lastEvent: IRawEvent | null = null;

    for (const current of sortedEvents) {
      const keep = this.shouldKeepEvent(current, lastEvent);
      
      if (keep) {
        sanitized.push(current);
        lastEvent = current;
      } else {
        // Optional: Log dropped events if you need deep debugging
        // console.log("Sanitizer dropped echo:", current);
      }
    }

    return sanitized;
  }

  private static shouldKeepEvent(current: IRawEvent, last: IRawEvent | null): boolean {
    // Always keep the first event
    if (!last) return true;

    // 2. Check Time Delta
    const currentTime = new Date(current.timestamp).getTime();
    const lastTime = new Date(last.timestamp).getTime();
    const timeDelta = currentTime - lastTime;

    // If events are far apart, they are definitely distinct user actions
    if (timeDelta > AppConfig.eventTracking.echoThresholdMs) return true;

    // 3. Check Signature (Sheet + Type + Address)
    // If a user double-clicks or Excel stutters, we get identical events.
    const isSameSheet = current.worksheetId === last.worksheetId;
    const isSameType = current.changeType === last.changeType;
    const isSameAddress = current.address === last.address;

    const isExactDuplicate = isSameSheet && isSameType && isSameAddress;

    // If it's an exact duplicate within 100ms, it's an echo. Drop it.
    if (isExactDuplicate) return false;

    // 4. Advanced: Filter Recalc Noise?
    // If we have a 'RowInserted' followed immediately by 'RangeEdited' on the same sheet?
    // For now, we keep both. The Diff Engine is smart enough to handle "Insert then Edit".
    // Aggressively filtering different types runs the risk of losing data.

    return true;
  }
}