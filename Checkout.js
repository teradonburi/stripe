import React from 'react'
import Button from '@material-ui/core/Button'
import { injectStripe, Elements, CardNumberElement, CardExpiryElement, CardCVCElement } from 'react-stripe-elements'
import { reduxForm, Field } from 'redux-form'
import { renderTextField } from './form'

class CheckoutForm extends React.Component {

  submit = (values) => {

    this.props.stripe.createToken({name: values.email}).then(({token}) => {
      if (token) {
        this.props.onSubmit({email: values.email, token: token.id})
      }
    })
  }

  render () {
    const { label } = this.props

    return (
      <form onSubmit={this.props.handleSubmit(this.submit)}>
        <label>
          {label}
          <Field name='email' label='メールアドレス' component={renderTextField} />
          <Field name='number' component={CardNumberElement} />
          <Field name='expire' component={CardExpiryElement} />
          <Field name='cvc' component={CardCVCElement} />
        </label>
        <Button type='submit' size='medium' variant='contained' color='primary'>登録</Button>
      </form>
    )
  }
}

const InjectedCheckoutForm = injectStripe(
  reduxForm({
    validate: values => {
      const errors = {}
      if (!values.email) {
        errors.email = '必須項目です'
      }
      return errors
    },
  })(CheckoutForm)
)

const Checkout = ({form, onSubmit}) => (
  <Elements>
    <InjectedCheckoutForm form={form} onSubmit={onSubmit} />
  </Elements>
)

export default Checkout