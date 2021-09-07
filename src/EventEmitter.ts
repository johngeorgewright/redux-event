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

export type StatelessListener<A> = (arg: A) => Promise<void>

export type MultiListenerAttacher<Events extends EventDescriptions> = <
  EventName extends keyof Events
>(
  eventNames: Set<EventName>,
  listener: StatelessListener<MultiListenerArg<Events>>
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

  async #callListener<EventName extends keyof Events>(
    state: State,
    action: Events[EventName],
    listener: Listener<State, Events[EventName]>
  ) {
    try {
      await listener(state, action)
    } catch (error: any) {
      this.#callErrorHandlers(error, action, state)
    }
  }

  #callErrorHandlers<EventName extends keyof Events>(
    error: Error,
    action: Events[EventName],
    state?: State
  ) {
    const eventEmitterError = new EventEmitterError<State, Events, EventName>(
      error,
      action,
      state
    )

    for (const errorHandler of this.errorHandlers) {
      errorHandler(eventEmitterError)
    }
  }

  readonly on: ListenerAttacher<State, Events> = (eventName, listener) => {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = []
    }

    this.listeners[eventName].push(listener)

    return () => this.off(eventName, listener)
  }

  readonly once: ListenerAttacher<State, Events> = <
    EventName extends keyof Events
  >(
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

  readonly onMulti: MultiListenerAttacher<Events> = <
    EventName extends keyof Events
  >(
    eventNames: Set<EventName>,
    listener: StatelessListener<MultiListenerArg<Events>>
  ) => {
    let actions = {} as MultiListenerArg<Events>

    const finish = (action: Events[EventName]) => {
      if (Object.keys(actions).length === eventNames.size) {
        const $actions = { ...actions }
        actions = {} as MultiListenerArg<Events>

        listener($actions).catch((error) => {
          this.#callErrorHandlers(error, action)
        })
      }
    }

    const offs = [...eventNames].map((eventName) =>
      this.on(eventName, async (_, action) => {
        actions[eventName] = action
        finish(action)
      })
    )

    return () => offs.forEach((off) => off())
  }

  readonly onceMulti: MultiListenerAttacher<Events> = <
    EventName extends keyof Events
  >(
    eventNames: Set<EventName>,
    listener: StatelessListener<MultiListenerArg<Events>>
  ) => {
    const wrapper: typeof listener = async (...args) => {
      off()
      listener(...args)
    }

    const off = this.onMulti(eventNames, wrapper)
    return off
  }

  readonly onError: ErrorHandlerAttacher<State, Events> = (handler) => {
    this.errorHandlers.push(handler)
  }

  async emit<EventName extends keyof Events>(
    eventName: EventName,
    state: State,
    action: Events[EventName]
  ) {
    await Promise.all(
      (this.listeners[eventName] || []).map((listener) =>
        this.#callListener(state, action, listener)
      )
    )
  }
}
