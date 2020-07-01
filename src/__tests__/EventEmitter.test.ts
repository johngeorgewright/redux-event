import EventEmitter from '../EventEmitter'
import { Action } from 'redux'

interface State {
  foo?: string
}

interface AddFoo extends Action<'ADD_FOO'> {
  foo: string
}

type RemoveFoo = Action<'REMOVE_FOO'>

type Actions = AddFoo | RemoveFoo

let emitter: EventEmitter<State, Actions>
let mock: jest.Mock

beforeEach(() => {
  emitter = new EventEmitter()
  mock = jest.fn()
})

test('emit', async () => {
  emitter.on('ADD_FOO', async (state, action) => {
    expect(state).toBe({})
    expect(action.type).toBe('ADD_FOO')
    expect(action.foo).toBe('bar')
  })
  emitter.on('REMOVE_FOO', mock)
  await emitter.emit('ADD_FOO', {}, { type: 'ADD_FOO', foo: 'bar' })
  await emitter.emit('REMOVE_FOO', {}, { type: 'REMOVE_FOO' })
  expect(mock).toHaveBeenCalledTimes(1)
  expect(mock).toHaveBeenCalledWith({}, { type: 'REMOVE_FOO' })
})

test('once', async () => {
  emitter.once('ADD_FOO', mock)
  await emitter.emit('ADD_FOO', {}, { type: 'ADD_FOO', foo: 'bar' })
  await emitter.emit('ADD_FOO', {}, { type: 'ADD_FOO', foo: 'bar' })
  expect(mock).toHaveBeenCalledTimes(1)
})

test('onError', async () => {
  const mock = jest.fn()
  emitter.onError(mock)
  emitter.on('ADD_FOO', async () => {
    throw new Error('Im an error')
  })
  await emitter.emit('ADD_FOO', {}, { type: 'ADD_FOO', foo: 'bar' })
  expect(mock).toHaveBeenCalled()
})

test('onMulti', async () => {
  const mock = jest.fn()
  emitter.onMulti(
    new Set<Actions['type']>(['ADD_FOO', 'REMOVE_FOO']),
    mock
  )

  await emitter.emit('ADD_FOO', {}, { type: 'ADD_FOO', foo: 'bar' })
  expect(mock).not.toHaveBeenCalled()
  await emitter.emit('ADD_FOO', {}, { type: 'ADD_FOO', foo: 'bar2' })
  expect(mock).not.toHaveBeenCalled()
  await emitter.emit('REMOVE_FOO', {}, { type: 'REMOVE_FOO' })
  expect(mock).toHaveBeenCalledWith(
    {},
    {
      ADD_FOO: { type: 'ADD_FOO', foo: 'bar2' },
      REMOVE_FOO: { type: 'REMOVE_FOO' },
    }
  )

  // Types
  emitter.onMulti(
    new Set<Actions['type']>(['ADD_FOO']),
    async (_state, actions) => {
      actions.ADD_FOO.foo // should not error
    }
  )
})
