import { Middleware, AnyAction, Action } from 'redux'
import EventEmitter, {
  ListenerAttacher,
  ErrorHandlerAttacher,
} from './EventEmitter'

export default function createMiddleware<
  State = any,
  Actions extends Action = AnyAction
>(): {
  before: ListenerAttacher<State, Actions>
  onceBefore: ListenerAttacher<State, Actions>
  after: ListenerAttacher<State, Actions>
  onceAfter: ListenerAttacher<State, Actions>
  onError: ErrorHandlerAttacher<State, Actions>
  middleware: Middleware<{}, State>
} {
  const beforeEmitter = new EventEmitter<State, Actions>()
  const afterEmitter = new EventEmitter<State, Actions>()

  return {
    before: beforeEmitter.on,
    onceBefore: beforeEmitter.once,
    after: afterEmitter.on,
    onceAfter: afterEmitter.once,
    onError: (error) => {
      beforeEmitter.onError(error)
      afterEmitter.onError(error)
    },
    middleware: (store) => (next) => (action) => {
      beforeEmitter.emit(action.type, store.getState(), action)
      const result = next(action)
      afterEmitter.emit(action.type, store.getState(), action)
      return result
    },
  }
}
