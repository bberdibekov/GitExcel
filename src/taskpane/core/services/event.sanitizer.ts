// src/taskpane/core/services/event.sanitizer.ts

export interface IRawEvent {
  changeType: string;
  address: string;
  worksheetId: string;
  timestamp: string;
  [key: string]: any;
}

export class EventSanitizer {
  private static readonly BURST_THRESHOLD_MS = 300;

  public static sanitize(rawEvents: IRawEvent[]): IRawEvent[] {
    if (!rawEvents || rawEvents.length === 0) return [];

    const sanitized: IRawEvent[] = [];
    
    const sortedEvents = [...rawEvents].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let lastSeenTime = 0; 
    let currentBurstSignature = "";

    for (const current of sortedEvents) {
      const currentTime = new Date(current.timestamp).getTime();
      
      const signature = `${current.worksheetId}|${current.changeType}|${current.address}`;
      const isSameSignature = signature === currentBurstSignature;
      const timeDelta = currentTime - lastSeenTime;

      const isEcho = isSameSignature && (timeDelta < this.BURST_THRESHOLD_MS);

      if (!isEcho) {
        sanitized.push(current);
        currentBurstSignature = signature;
      }

      lastSeenTime = currentTime;
    }

    return sanitized;
  }
}