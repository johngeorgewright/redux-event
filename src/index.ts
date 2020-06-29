import { Middleware, AnyAction, Action } from 'redux'
import EventEmitter, {
  ListenerAttacher,
  ErrorHandlerAttacher,
  EventDescriptions,
  ActionsToEvents,
} from './EventEmitter'

export default function createMiddleware<
  State = any,
  Actions extends Action = AnyAction,
  Events extends EventDescriptions = ActionsToEvents<Actions>
>(): {
  before: ListenerAttacher<State, Events>
  onceBefore: ListenerAttacher<State, Events>
  after: ListenerAttacher<State, Events>
  onceAfter: ListenerAttacher<State, Events>
  onError: ErrorHandlerAttacher<State, Events>
  middleware: Middleware<{}, State>
} {
  const beforeEmitter = new EventEmitter<State, Actions, Events>()
  const afterEmitter = new EventEmitter<State, Actions, Events>()

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
