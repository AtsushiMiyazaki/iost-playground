import React, { useState } from 'react'
import Button from '@material-ui/core/Button'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogTitle from '@material-ui/core/DialogTitle'
import useStyles from './styles'
import { useIntl } from '../../provider/IntlProvider'

type Props = {
  closeFn: () => void
  handleDeleteFile: () => void
  fileName: string
}

const DeleteFileModal: React.FC<Props> = ({
  closeFn,
  handleDeleteFile,
  fileName
}) => {
  const classes = useStyles()
  const { formatMessage } = useIntl()

  return (
    <div>
      <Dialog open={true} onClose={closeFn} aria-labelledby="form-dialog-title">
        <DialogTitle id="form-dialog-title" className={classes.dialogTitle}>
          {formatMessage('delete-confirmation', fileName)}{' '}
        </DialogTitle>
        <DialogActions>
          <Button color="secondary" onClick={handleDeleteFile}>
            {formatMessage('delete-code')}
          </Button>
          <Button color="primary" onClick={closeFn}>
            {formatMessage('cancel-action')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default DeleteFileModal
