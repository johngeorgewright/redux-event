import eventMiddleware from '..'
import { Action, applyMiddleware, createStore, Reducer } from 'redux'

interface State {
  foo?: string
}

interface AddFoo extends Action<'ADD_FOO'> {
  foo: string
}

type RemoveFoo = Action<'REMOVE_FOO'>

type Actions = AddFoo | RemoveFoo

const reducer: Reducer<State, Actions> = (state = {}, action) => {
  switch (action.type) {
    case 'ADD_FOO':
      return { foo: action.foo }
    case 'REMOVE_FOO':
      return {}
    default:
      return state
  }
}

test('before', async () => {
  const { before, middleware } = eventMiddleware()
  const store = createStore(reducer, applyMiddleware(middleware))
  const mock = jest.fn()

  before('ADD_FOO', mock)
  store.dispatch({ type: 'ADD_FOO', foo: 'bar' })
  expect(mock).toHaveBeenCalledWith({}, { type: 'ADD_FOO', foo: 'bar' })
})

test('after', (done) => {
  const { after, middleware } = eventMiddleware<State, Actions>()
  const store = createStore(reducer, applyMiddleware(middleware))

  after('ADD_FOO', async (state, action) => {
    expect(state).toEqual({
      foo: 'bar',
    })

    expect(action.type).toBe('ADD_FOO')
    expect(action.foo).toBe('bar')
    done()
  })

  store.dispatch({ type: 'ADD_FOO', foo: 'bar' })
})

test('onError', (done) => {
  const { before, onError, middleware } = eventMiddleware()
  const store = createStore(reducer, applyMiddleware(middleware))
  const mock = jest.fn()

  before('ADD_FOO', async () => {
    throw new Error('Im an error')
  })
  onError(mock)
  onError(() => {
    expect(mock).toHaveBeenCalled()
    done()
  })

  store.dispatch({ type: 'ADD_FOO', foo: 'bar' })
})
