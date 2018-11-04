
import React from 'react'
import TextField from '@material-ui/core/TextField'

export const renderTextField = ({
  input,
  label,
  placeholder,
  type,
  meta: { touched, error },
}) => (
  <div>
    <label>{label}</label>
    <div>
      <input {...input} placeholder={placeholder} type={type} />
      {touched && error && <span>{error}</span>}
    </div>
  </div>
)

export const renderDate = ({
  input,
  label,
  meta: { touched, error },
}) => (
  <div>
    <TextField
      id='date'
      label={label}
      type='date'
      defaultValue='2000-01-01'
      InputLabelProps={{
        shrink: true,
      }}
      {...input}
    />
    {touched && error && <span>{error}</span>}
  </div>
)
