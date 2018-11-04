/*globals module: false */
import React from 'react'
import { hot } from 'react-hot-loader'
import { connect } from 'react-redux'
import { createCustomer, createProvider, registCard, loadZenginCode, uploadVerification, registProviderBankAccount, chargeFromCustomerToProvider } from './modules/user'
import { renderTextField, renderDate } from './form'
import Button from '@material-ui/core/Button'
import { reduxForm } from 'redux-form'
import { Field } from 'redux-form'
import Checkout from './Checkout'

// Webpack Hot Module Replacement API
@hot(module)
@connect(
  state => ({
    zenginCode: state.user.zenginCode,
  }),
  { loadZenginCode }
)
export default class App extends React.Component {
  state = {
  }

  componentDidMount() {
    this.props.loadZenginCode()
  }

  render () {
    const { zenginCode } = this.props

    return (
      <div>
        <h3>購買者アカウントの作成</h3>
        <CreateCustomerForm />
        <hr/>
        <h3>購入者アカウントのクレジットカードの登録</h3>
        <RegistCardForm />
        <hr/>
        <h3>販売者アカウントの作成</h3>
        <CreateProviderForm />
        <hr/>
        <h3>販売者銀行口座の登録</h3>
        <RegistProviderBankAccountForm zenginCode={zenginCode}/>
        <hr/>
        <h3>購入</h3>
        <ChargeFromCustomerToProviderForm />
        <hr/>
      </div>
    )
  }
}

@reduxForm({
  form: 'createCustomer',
  validate: values => {
    const errors = {}
    if (!values.email) {
      errors.email = '必須項目です'
    }
    return errors
  },
})
@connect(
  () => ({}),
  { createCustomer }
)
class CreateCustomerForm extends React.Component {

  submit = (values) => {
    this.props.createCustomer(values.email)
  }

  render () {

    return (
      <form onSubmit={this.props.handleSubmit(this.submit)}>
        <Field name='email' label='メールアドレス' component={renderTextField} />
        <Button type='submit' size='medium' variant='contained' color='primary'>購入者アカウント作成</Button>
      </form>
    )
  }
}



@connect(
  () => ({}),
  { registCard }
)
class RegistCardForm extends React.Component {

  submit = (values) => {
    this.props.registCard(values.email, values.token)
  }

  render () {

    return (
      <div>
        <Checkout form='registCard' onSubmit={this.submit}/>
      </div>
    )
  }
}


@reduxForm({
  form: 'createProvider',
  validate: values => {
    const errors = {}
    if (!values.email) {
      errors.email = '必須項目です'
    }
    return errors
  },
})
@connect(
  () => ({}),
  { createProvider }
)
class CreateProviderForm extends React.Component {

  submit = (values) => {
    this.props.createProvider(values.email)
  }

  render () {

    return (
      <form onSubmit={this.props.handleSubmit(this.submit)}>
        <Field name='email' label='メールアドレス' component={renderTextField} />
        <Button type='submit' size='medium' variant='contained' color='primary'>販売者アカウント作成</Button>
      </form>
    )
  }
}

@reduxForm({
  form: 'registProviderBankAccount',
  validate: values => {
    const errors = {}
    if (!values.email) {
      errors.email = '必須項目です'
    }
    return errors
  },
})
@connect(
  state => ({
    verifications: state.user.verifications,
  }),
  { registProviderBankAccount }
)
class RegistProviderBankAccountForm extends React.Component {

  submit = (values) => {
    const { verifications: {front, back} } = this.props
    this.props.registProviderBankAccount({
      email: values.email,
      bankCode: values.bankCode,
      branchOfficeCode: values.branchOfficeCode,
      bankAccountNumber: values.bankAccountNumber,
      bankAccountName: values.bankAccountName,
      verificationFront: front,
      verificationBack: back,
      postal_code: values.postalCode,
      state: values.state,
      city: values.city,
      town: values.town,
      line1: values.line1,
      line2: values.line2,
      dob: values.dob,
      last_name_kana: values.lastNameKana,
      first_name_kana: values.firstNameKana,
      last_name_kanji: values.lastNameKanji,
      first_name_kanji: values.firstNameKanji,
      gender: values.gender,
      phone_number: values.phoneNumber,
    })
  }

  render () {
    const { zenginCode } = this.props

    return (
      <form onSubmit={this.props.handleSubmit(this.submit)}>
        <Field name='email' label='メールアドレス' component={renderTextField} />
        <Field name='bankCode' label='銀行コード' component={renderTextField} />
        <details>
          <summary>銀行コード一覧</summary>
          <dl>
            {Object.values(zenginCode).map(zc =>
              <dt key={zc.code}>
                <div>銀行コード：{zc.code} 銀行名：{zc.name}</div>
              </dt>
            )}
          </dl>
        </details>
        <Field name='branchOfficeCode' label='支店コード' component={renderTextField} />
        <Field name='bankAccountNumber' label='口座番号' component={renderTextField} />
        <Field name='bankAccountName' label='口座名(かな)' component={renderTextField} />
        <UploadVerification label='証明書（表）' type='front' />
        <UploadVerification label='証明書（裏）' type='back' />
        <div>※証明書に使える書類：住民基本台帳カード（写真付）、運転免許証、外国人居住者カード、住民票または国民年金手帳が添付された健康保険証</div>
        <h4>住所</h4>
        <Field name='postalCode' label='郵便番号' placeholder='1500001' component={renderTextField} />
        <Field name='state' label='都道府県' placeholder='東京都' component={renderTextField} />
        <Field name='city' label='市区' placeholder='渋谷区' component={renderTextField} />
        <Field name='town' label='町村' placeholder='神宮前' component={renderTextField} />
        <Field name='line1' label='丁番地' placeholder='１丁目５番地８号' component={renderTextField} />
        <Field name='line2' label='建物詳細（階、部屋番号等）' placeholder='神宮前タワービルディング22F' component={renderTextField} />
        <h4>氏名</h4>
        <Field name='lastNameKana' label='姓（かな）' component={renderTextField} />
        <Field name='firstNameKana' label='名（かな）' component={renderTextField} />
        <Field name='lastNameKanji' label='姓（漢字）' component={renderTextField} />
        <Field name='firstNameKanji' label='名（漢字）' component={renderTextField} />
        <h4>性別</h4>
        <div>
          <label>
            <Field name='gender' component='input' type='radio' value='male' />男性
          </label>
          <label>
            <Field name='gender' component='input' type='radio' value='female'/>女性
          </label>
        </div>
        <h4>生年月日</h4>
        <Field name='dob' component={renderDate} label='生年月日' />
        <h4>電話番号(+81で繋がる番号のみ可)</h4>
        <Field name='phoneNumber' placeholder='+819011112222' component={renderTextField} />
        <details>
          <summary>利用規約</summary>
          <dl>
            <dt>
              <div>
                {`[プラットフォームの名称]における[アカウント所有者を示す文言（例えばドライバー又は売り手）]向けの支払処理サービスは、
Stripeが提供し、Stripe Connectアカウント契約（Stripe利用規約を含み、総称して「Stripeサービス契約」といいます。）に従うものとします。
[本契約、本条件等]への同意又は[プラットフォームの名称]において[アカウント所有者を示す文言]としての取引の継続により、
お客様はStripeサービス契約（随時Stripeにより修正されることがあり、その場合には修正されたものを含みます。）に拘束されることに同意するものとします。
Stripeを通じた支払処理サービスを[プラットフォームの名称]ができるようにするための条件として、
お客様は、[プラットフォームの名称]に対してお客様及びお客様の事業に関する正確かつ完全な情報を提供することに同意し、
[プラットフォームの名称]が当該情報及びStripeが提供する支払処理サービスのお客様による使用に関連する取引情報を共有することを認めるものとします。
`}
              </div>
            </dt>
          </dl>
        </details>
        <Button type='submit' size='medium' variant='contained' color='primary'>利用規約に同意して登録</Button>
      </form>
    )
  }
}

@connect(
  () => ({}),
  { uploadVerification }
)
class UploadVerification extends React.Component {

  handleUploadImage = () => {
    const data = new FormData()
    data.append('file', this.uploadInput.files[0])

    this.props.uploadVerification(data, this.props.type)
  }

  render () {
    const { label } = this.props

    return (
      <div>
        <label>{label}</label>
        <div>
          <input ref={(ref) => this.uploadInput = ref} type='file' accept='image/png,image/jpeg' onChange={this.handleUploadImage} />
        </div>
      </div>
    )
  }
}

@reduxForm({
  form: 'chargeFromCustomerToProvider',
  validate: values => {
    const errors = {}
    if (!values.customerEmail) {
      errors.customerEmail = '必須項目です'
    }
    if (!values.providerEmail) {
      errors.providerEmail = '必須項目です'
    }
    if (!Number(values.amount)) {
      errors.amount = '数字でありません'
    }
    return errors
  },
})
@connect(
  () => ({}),
  { chargeFromCustomerToProvider }
)
class ChargeFromCustomerToProviderForm extends React.Component {

  submit = (values) => {
    this.props.chargeFromCustomerToProvider(values)
  }

  render () {

    return (
      <form onSubmit={this.props.handleSubmit(this.submit)}>
        <Field name='customerEmail' label='購入者メールアドレス' component={renderTextField} />
        <Field name='providerEmail' label='販売者メールアドレス' component={renderTextField} />
        <Button type='submit' size='medium' variant='contained' color='primary' >購入</Button>
      </form>
    )
  }
}