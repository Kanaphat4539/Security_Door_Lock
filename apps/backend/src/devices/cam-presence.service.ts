import { Injectable } from '@nestjs/common';

import { EventsGateway } from '../events/events.gateway';
import type { PresenceEventPayload } from '../events/events.types';

@Injectable()
export class CamPresenceService {
  private state: PresenceEventPayload | null = null;

  constructor(private readonly events: EventsGateway) {}

  report(present: boolean): PresenceEventPayload {
    if (this.state?.present === present) return this.state;

    const state: PresenceEventPayload = {
      present,
      reportedAt: new Date().toISOString(),
    };
    this.state = state;
    this.events.emitPresence(state);
    return state;
  }

  status(): { present: boolean | null; reportedAt: string | null } {
    return {
      present: this.state?.present ?? null,
      reportedAt: this.state?.reportedAt ?? null,
    };
  }
}
