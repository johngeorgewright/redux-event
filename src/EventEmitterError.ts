import { Action } from 'redux'

export default class EventEmitterError<
  State,
  Actions extends Action
> extends Error {
  readonly action: Actions
  readonly originalError: Error
  readonly state: State

  constructor(originalError: Error, state: State, action: Actions) {
    super(originalError.message)
    this.originalError = originalError
    this.state = state
    this.action = action
  }
}
