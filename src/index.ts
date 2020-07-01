import { Middleware, AnyAction, Action } from 'redux'
import EventEmitter, {
  ListenerAttacher,
  ErrorHandlerAttacher,
  ActionsToEvents,
} from './EventEmitter'

export type Broker<State = any, Actions extends Action = AnyAction> = {
  before: ListenerAttacher<State, ActionsToEvents<Actions>>
  onceBefore: ListenerAttacher<State, ActionsToEvents<Actions>>
  after: ListenerAttacher<State, ActionsToEvents<Actions>>
  onceAfter: ListenerAttacher<State, ActionsToEvents<Actions>>
  onError: ErrorHandlerAttacher<State, ActionsToEvents<Actions>>
}

export { EventEmitter }
export { default as EventEmitterError } from './EventEmitterError'

export default function createMiddleware<
  State = any,
  Actions extends Action = AnyAction
>(): Broker<State, Actions> & { middleware: Middleware<{}, State> } {
  const beforeEmitter = new EventEmitter<
    State,
    Actions,
    ActionsToEvents<Actions>
  >()

  const afterEmitter = new EventEmitter<
    State,
    Actions,
    ActionsToEvents<Actions>
  >()

  return {
    before: beforeEmitter.on,
    onceBefore: beforeEmitter.once,
    after: afterEmitter.on,
    onceAfter: afterEmitter.once,
    onError: (handleError) => {
      beforeEmitter.onError(handleError)
      afterEmitter.onError(handleError)
    },
    middleware: (store) => (next) => (action) => {
      beforeEmitter.emit(action.type, store.getState(), action)
      const result = next(action)
      afterEmitter.emit(action.type, store.getState(), action)
      return result
    },
  }
}
