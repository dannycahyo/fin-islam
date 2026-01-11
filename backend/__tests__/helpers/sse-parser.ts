export interface SSEEvent {
  event: string;
  data: unknown;
  raw: string;
}

export function parseSSE(responseText: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const lines = responseText.split('\n');

  let currentEvent = '';
  let currentData = '';

  for (const line of lines) {
    if (line.startsWith('event:')) {
      currentEvent = line.substring(6).trim();
    } else if (line.startsWith('data:')) {
      currentData += line.substring(5).trim();
    } else if (line === '') {
      // Empty line marks end of event
      if (currentEvent && currentData) {
        try {
          events.push({
            event: currentEvent,
            data: JSON.parse(currentData),
            raw: currentData,
          });
        } catch (e) {
          // If JSON parsing fails, store as string
          events.push({
            event: currentEvent,
            data: currentData,
            raw: currentData,
          });
        }
        currentEvent = '';
        currentData = '';
      }
    }
  }

  return events;
}

export function getEventsByType(events: SSEEvent[], eventType: string): SSEEvent[] {
  return events.filter((e) => e.event === eventType);
}

export function getEventData<T = unknown>(events: SSEEvent[], eventType: string): T[] {
  return getEventsByType(events, eventType).map((e) => e.data as T);
}

export function hasEvent(events: SSEEvent[], eventType: string): boolean {
  return events.some((e) => e.event === eventType);
}

export function getLastEvent(events: SSEEvent[], eventType?: string): SSEEvent | undefined {
  if (eventType) {
    const filtered = getEventsByType(events, eventType);
    return filtered[filtered.length - 1];
  }
  return events[events.length - 1];
}
