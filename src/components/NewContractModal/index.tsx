import React, { useState } from 'react'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogTitle from '@material-ui/core/DialogTitle'
import RadioGroup from '@material-ui/core/RadioGroup'
import Radio from '@material-ui/core/Radio'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import useStyles from './styles'
import { useIntl } from '../../provider/IntlProvider'

type Props = {
  closeFn: () => void
  createFn: (fileName: string) => void
  importFn: (contractId: string) => Promise<void>
}

const NewContractModal: React.FC<Props> = ({ closeFn, createFn, importFn }) => {
  const classes = useStyles()
  const [mode, setMode] = useState('create')
  const [userInput, setUserInput] = useState('')
  const { formatMessage } = useIntl()

  const handleRadioChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    value: string
  ) => {
    setMode(value)
  }

  const handleSubmit = () => {
    mode === 'create' ? createFn(userInput) : importFn(userInput)
  }

  const handleInputChange = (e: any) => {
    setUserInput(e.target.value as string)
  }

  return (
    <Dialog open={true} onClose={closeFn} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title" className={classes.dialogTitle}>
        {formatMessage('new-contract-modal-message')}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="userInput"
          label={formatMessage(
            mode === 'create' ? 'new-contract-filename' : 'existing-contract-id'
          )}
          type="textarea"
          onChange={handleInputChange}
          fullWidth
        />
      </DialogContent>
      <RadioGroup
        value={mode}
        className={classes.radioContainer}
        onChange={handleRadioChange}
      >
        <FormControlLabel
          value="create"
          label={formatMessage('create-contract')}
          control={<Radio color="secondary" />}
        />
        <FormControlLabel
          value="import"
          label={formatMessage('import-contract')}
          control={<Radio color="secondary" />}
        />
      </RadioGroup>
      <DialogActions>
        <Button color="primary" onClick={handleSubmit}>
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default NewContractModal
