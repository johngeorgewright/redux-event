import { AnyAction, Action } from 'redux'
import EventEmitterError from './EventEmitterError'

export type Listener<State, Actions extends Action> = (
  state: Readonly<State>,
  action: Actions
) => Promise<void>

export type ErrorHandler<State, Actions extends Action> = (
  error: EventEmitterError<State, Actions>
) => void

export type ListenerAttacher<State, Actions extends Action> = (
  eventName: Actions['type'],
  listener: Listener<State, Actions>
) => void

export type ListenerRemover<State, Actions extends Action> = (
  eventName: Actions['type'],
  listener?: Listener<State, Actions>
) => void

export type ErrorHandlerAttacher<State, Actions extends Action> = (
  handler: ErrorHandler<State, Actions>
) => void

export type Emitter<State, Actions extends Action> = (
  eventName: Actions['type'],
  state: State,
  action: Actions
) => Promise<void>

export default class EventEmitter<
  State = any,
  Actions extends Action = AnyAction
> {
  private listeners: Record<string, Listener<State, Actions>[]>
  private errorHandlers: ErrorHandler<State, Actions>[]

  constructor() {
    this.listeners = {}
    this.errorHandlers = []
  }

  private async callListener(
    state: State,
    action: Actions,
    listener: Listener<State, Actions>
  ) {
    try {
      await listener(state, action)
    } catch (error) {
      this.callErrorHandlers(error, state, action)
    }
  }

  private callErrorHandlers(error: Error, state: State, action: Actions) {
    const eventEmitterError = new EventEmitterError<State, Actions>(
      error,
      state,
      action
    )

    for (const errorHandler of this.errorHandlers) {
      errorHandler(eventEmitterError)
    }
  }

  on: ListenerAttacher<State, Actions> = (eventName, listener) => {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = []
    }

    this.listeners[eventName].push(listener)
  }

  once: ListenerAttacher<State, Actions> = (eventName, listener) => {
    const wrapper: Listener<State, Actions> = async (...args) => {
      this.off(eventName, wrapper)
      return listener(...args)
    }

    this.on(eventName, wrapper)
  }

  off: ListenerRemover<State, Actions> = (eventName, listener) => {
    if (!listener) {
      this.listeners[eventName] = []
      return
    }

    const index = this.listeners[eventName].indexOf(listener)

    if (index === -1) {
      return
    }

    this.listeners[eventName] = [
      ...this.listeners[eventName].slice(0, index),
      ...this.listeners[eventName].slice(index + 1),
    ]
  }

  onError: ErrorHandlerAttacher<State, Actions> = (handler) => {
    this.errorHandlers.push(handler)
  }

  emit: Emitter<State, Actions> = async (eventName, state, action) => {
    await Promise.all(
      (this.listeners[eventName] || []).map((listener) =>
        this.callListener(state, action, listener)
      )
    )
  }
}
