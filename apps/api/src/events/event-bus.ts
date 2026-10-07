import { EventEmitter } from 'events';
import { DomainEventsMap } from './events.interface.js';
import { logger } from '../lib/logger.js';

type EventKey = keyof DomainEventsMap;
type EventHandler<K extends EventKey> = (event: DomainEventsMap[K]) => Promise<void> | void;

class TypedEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  on<K extends EventKey>(event: K, handler: EventHandler<K>): void {
    this.emitter.on(event as string, async (payload: DomainEventsMap[K]) => {
      try {
        await handler(payload);
      } catch (err: any) {
        logger.error(
          {
            event,
            error: err.message,
            stack: err.stack,
          },
          `Error executing subscriber handler for event "${String(event)}"`
        );
      }
    });
  }

  async emit<K extends EventKey>(event: K, payload: DomainEventsMap[K]): Promise<void> {
    logger.info(
      {
        event,
        occurredAt: payload.occurredAt,
      },
      `Emitting domain event: ${String(event)}`
    );

    // Emit event asynchronously so main execution / database commit is not blocked
    setImmediate(() => {
      this.emitter.emit(event as string, payload);
    });
  }

  /**
   * Synchronous / awaited dispatch when waiting for subscribers is required (e.g., in unit tests)
   */
  async emitSync<K extends EventKey>(event: K, payload: DomainEventsMap[K]): Promise<void> {
    logger.info(
      {
        event,
        occurredAt: payload.occurredAt,
      },
      `Emitting domain event (sync): ${String(event)}`
    );

    const listeners = this.emitter.listeners(event as string);
    for (const listener of listeners) {
      try {
        await listener(payload);
      } catch (err: any) {
        logger.error(
          {
            event,
            error: err.message,
          },
          `Error in sync event handler for "${String(event)}"`
        );
      }
    }
  }

  removeAllListeners(event?: EventKey): void {
    if (event) {
      this.emitter.removeAllListeners(event as string);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}

export const eventBus = new TypedEventBus();
