import { EventDescriptions } from './EventEmitter'

export default class EventEmitterError<
  State,
  Events extends EventDescriptions,
  EventName extends keyof Events
> extends Error {
  readonly action: Events[EventName]
  readonly originalError: Error
  readonly state?: State

  constructor(originalError: Error, action: Events[EventName], state?: State) {
    super(originalError.message)
    this.originalError = originalError
    this.state = state
    this.action = action
  }
}
