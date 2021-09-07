import { Middleware, AnyAction, Action } from 'redux'
import EventEmitter, {
  ListenerAttacher,
  ErrorHandlerAttacher,
  ActionsToEvents,
  MultiListenerAttacher,
} from './EventEmitter'

export type Broker<State = any, Actions extends Action = AnyAction> = Readonly<{
  before: ListenerAttacher<State, ActionsToEvents<Actions>>
  onceBefore: ListenerAttacher<State, ActionsToEvents<Actions>>
  multiBefore: MultiListenerAttacher<ActionsToEvents<Actions>>
  onceMultiBefore: MultiListenerAttacher<ActionsToEvents<Actions>>
  after: ListenerAttacher<State, ActionsToEvents<Actions>>
  onceAfter: ListenerAttacher<State, ActionsToEvents<Actions>>
  multiAfter: MultiListenerAttacher<ActionsToEvents<Actions>>
  onceMultiAfter: MultiListenerAttacher<ActionsToEvents<Actions>>
  onError: ErrorHandlerAttacher<State, ActionsToEvents<Actions>>
}>

export { EventEmitter }
export { default as EventEmitterError } from './EventEmitterError'

export default function createMiddleware<
  State = any,
  Actions extends Action = AnyAction
>(): Broker<State, Actions> & Readonly<{ middleware: Middleware<{}, State> }> {
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

  return Object.freeze({
    before: beforeEmitter.on,
    onceBefore: beforeEmitter.once,
    multiBefore: beforeEmitter.onMulti,
    onceMultiBefore: beforeEmitter.onceMulti,
    after: afterEmitter.on,
    onceAfter: afterEmitter.once,
    multiAfter: afterEmitter.onMulti,
    onceMultiAfter: afterEmitter.onceMulti,
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
  })
}
