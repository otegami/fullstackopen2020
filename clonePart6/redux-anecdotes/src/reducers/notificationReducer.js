const notificationReducer = (state = '', action) => {
  console.log(action.notification)
  switch(action.type) {
    case 'SET_NOTIFICATION':
      return action.notification
    case 'REMOVE_NOTIFICATION':
      return ''
    default:
      return state
  }
}

export const setNotification = (notification) => {
  return({
    type: 'SET_NOTIFICATION',
    notification
  })
}

export const removeNotification = () => {
  return({ 
    type: 'REMOVE_NOTIFICATION',
    notification: ''
  })
}

export default notificationReducer