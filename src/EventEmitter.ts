import EventEmitterError from './EventEmitterError'
import { Action } from 'redux'

export type EventDescriptions = Record<string, unknown>

export type ActionsToEvents<A extends Action> = {
  [EventName in A['type']]: A extends Action<EventName> ? A : never
}

type Listener<State, A> = (state: State, arg: A) => Promise<void>

type Listeners<State, Events extends EventDescriptions> = {
  [EventName in keyof Events]: Listener<State, Events[EventName]>[]
}

export type ListenerAttacher<State, Events extends EventDescriptions> = <
  EventName extends keyof Events
>(
  eventName: EventName,
  listener: Listener<State, Events[EventName]>
) => () => void

export type MultiListenerArg<Events extends EventDescriptions> = {
  [EventName in keyof Events]: Events[EventName]
}

export type MultiListenerAttacher<State, Events extends EventDescriptions> = <
  EventName extends keyof Events
>(
  eventNames: Set<EventName>,
  listener: Listener<State, MultiListenerArg<Events>>
) => () => void

type ErrorHandler<State, Events extends EventDescriptions> = (
  error: EventEmitterError<State, Events, any>
) => void

export type ErrorHandlerAttacher<State, Events extends EventDescriptions> = (
  handler: ErrorHandler<State, Events>
) => void

export default class EventEmitter<
  State,
  Actions extends Action,
  Events extends EventDescriptions = ActionsToEvents<Actions>
> {
  private listeners: Listeners<State, Events>
  private errorHandlers: ErrorHandler<State, Events>[]

  constructor() {
    this.listeners = {} as Listeners<State, Events>
    this.errorHandlers = []
  }

  private async callListener<EventName extends keyof Events>(
    state: State,
    action: Events[EventName],
    listener: Listener<State, Events[EventName]>
  ) {
    try {
      await listener(state, action)
    } catch (error) {
      this.callErrorHandlers(error, state, action)
    }
  }

  private callErrorHandlers<EventName extends keyof Events>(
    error: Error,
    state: State,
    action: Events[EventName]
  ) {
    const eventEmitterError = new EventEmitterError<State, Events, EventName>(
      error,
      state,
      action
    )

    for (const errorHandler of this.errorHandlers) {
      errorHandler(eventEmitterError)
    }
  }

  on: ListenerAttacher<State, Events> = (eventName, listener) => {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = []
    }

    this.listeners[eventName].push(listener)

    return () => this.off(eventName, listener)
  }

  once: ListenerAttacher<State, Events> = <EventName extends keyof Events>(
    eventName: EventName,
    listener: Listener<State, Events[EventName]>
  ) => {
    const wrapper: typeof listener = async (...args) => {
      off()
      return listener(...args)
    }

    const off = this.on(eventName, wrapper)
    return off
  }

  off<EventName extends keyof Events>(
    eventName: EventName,
    listener?: Listener<State, Events[EventName]>
  ) {
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

  onMulti: MultiListenerAttacher<State, Events> = <
    EventName extends keyof Events
  >(
    eventNames: Set<EventName>,
    listener: Listener<State, MultiListenerArg<Events>>
  ) => {
    let actions = {} as MultiListenerArg<Events>
    let state: State

    const finish = (action: Events[EventName]) => {
      if (Object.keys(actions).length === eventNames.size) {
        const $actions = { ...actions }
        actions = {} as MultiListenerArg<Events>

        listener(state, $actions).catch((error) => {
          this.callErrorHandlers(error, state, action)
        })
      }
    }

    const offs = [...eventNames].map((eventName) =>
      this.on(eventName, async (s, action) => {
        // @ts-ignore EventName cannot be used to index type T!!?? da fuck?
        actions[eventName] = action
        state = s
        finish(action)
      })
    )

    return () => offs.forEach((off) => off())
  }

  onceMulti: MultiListenerAttacher<State, Events> = <
    EventName extends keyof Events
  >(
    eventNames: Set<EventName>,
    listener: Listener<State, MultiListenerArg<Events>>
  ) => {
    const wrapper: typeof listener = async (...args) => {
      off()
      listener(...args)
    }

    const off = this.onMulti(eventNames, wrapper)
    return off
  }

  onError: ErrorHandlerAttacher<State, Events> = (handler) => {
    this.errorHandlers.push(handler)
  }

  async emit<EventName extends keyof Events>(
    eventName: EventName,
    state: State,
    action: Events[EventName]
  ) {
    await Promise.all(
      (this.listeners[eventName] || []).map((listener) =>
        this.callListener(state, action, listener)
      )
    )
  }
}
