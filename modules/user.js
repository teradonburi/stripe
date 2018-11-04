const LOAD = 'user/LOAD'
const ZENGINCODE = 'user/ZENGINCODE'
const VERIFICATION = 'user/VERIFICATION'

const initialState = {
  users: [],
  verifications: {front: null, back: null},
  zenginCode: {},
}

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
    case LOAD:
      return {
        ...state,
        users: action.users || state.users,
      }
    case ZENGINCODE:
      return {
        zenginCode: action.zenginCode,
      }
    case VERIFICATION:
      return {
        ...state,
        verifications: {...state.verifications, ...action.verifications},
      }
    default:
      return state
  }
}

export function createCustomer(email) {
  return (dispatch, getState, client) => {
    return client
      .post('/api/createCustomer', {email})
      .then(res => res.data)
      .then(users => {
        dispatch({type: LOAD, users})
        return users
      })
  }
}

export function registCard(email, token) {
  return (dispatch, getState, client) => {
    return client
      .post('/api/registCard', {email, token})
      .then(res => res.data)
      .then(users => {
        dispatch({type: LOAD, users})
        return users
      })
  }
}

export function createProvider(email) {
  return (dispatch, getState, client) => {
    return client
      .post('/api/createProvider', {email})
      .then(res => res.data)
      .then(users => {
        dispatch({type: LOAD, users})
        return users
      })
  }
}

export function loadZenginCode() {
  return (dispatch, getState, client) => {
    return client
      .get('/api/zenginCode')
      .then(res => res.data)
      .then(zenginCode => {
        dispatch({type: ZENGINCODE, zenginCode})
        return zenginCode
      })
  }
}


export function uploadVerification(data, type = 'front') {
  return (dispatch, getState, client) => {
    return client
      .post('/api/uploadVerification', data)
      .then(res => res.data)
      .then(fileId => {
        dispatch(type === 'front' ?
          {type: VERIFICATION, verifications: {front: fileId}} :
          {type: VERIFICATION, verifications: {back: fileId}}
        )
        return fileId
      })
  }
}

export function registProviderBankAccount(data) {
  return (dispatch, getState, client) => {
    return client
      .post('/api/registProviderBankAccount', data)
      .then(res => res.data)
      .then(users => {
        dispatch({type: LOAD, users})
        return users
      })
  }
}

export function chargeFromCustomerToProvider(data) {
  return (dispatch, getState, client) => {
    return client
      .post('/api/chargeFromCustomerToProvider', data)
      .then(res => res.data)
      .then(users => {
        dispatch({type: LOAD, users})
        return users
      })
  }
}