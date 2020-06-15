import React from 'react'
import Snackbar from '@material-ui/core/Snackbar'
import { Typography } from '@material-ui/core'
import { selectNotifications } from 'store/features/view/selectors'
import { useSelector, useDispatch } from 'react-redux'
import { deleteNotification } from 'store/features/view/slices'
import useStyles from './styles'
import Alert from '../Alert'

const Notifications = () => {
  const classes = useStyles()
  const notifications = useSelector(selectNotifications)
  const dispatch = useDispatch()

  const handleClose = (id: string) => {
    dispatch(deleteNotification(id))
  }

  return (
    <div>
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={true}
      >
        <div className={classes.root}>
          {notifications.map(({ message, type, id }) => (
            <Alert
              severity={type}
              onClose={() => handleClose(id)}
              className={classes.alert}
            >
              <div>
                <Typography component="h2" style={{ fontWeight: 'bold' }}>
                  {message}
                </Typography>
              </div>
            </Alert>
          ))}
        </div>
      </Snackbar>
    </div>
  )
}

export default Notifications
