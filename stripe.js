// stripe初期化、Secret Keyが必要
// https://dashboard.stripe.com/account/apikeys
const fs = require('fs')
const stripe = require('stripe')('sk_test_XXXXXXXXXXXXXXXXXXX')
stripe.setApiVersion('2018-09-24') // APIのバージョンを指定する
// webhookのシークレットキー
const endpointSecret = 'whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXX'

// テスト用クレジットカード
// https://stripe.com/docs/testing#cards
// HTTP429レスポンスが返る場合は過負荷、最初に1秒待ってから再度試みる。
// リクエストが引き続き同じ応答を受信した場合は、2秒待ってから4秒待つ。
const testCards = {
  Visa: {number: '4242424242424242', token: 'tok_visa' },
  Visa_debit: {number: '4000056655665556', token: 'tok_visa_debit' },
  Mastercard: {number: '5555555555554444', token: 'tok_mastercard' },
  Mastercard_2series: {number: '2223003122003222', token: 'tok_mastercard' },
  Mastercard_debit: {number: '5200828282828210', token: 'tok_mastercard_debit' },
  Mastercard_prepaid: {number: '5105105105105100', token: 'tok_mastercard_prepaid' },
  AmericanExpress: {number: '378282246310005', token: 'tok_amex' },
  AmericanExpress_2: {number: '371449635398431', token: 'tok_amex' },
  Discover: {number: '6011111111111117', token: 'tok_discover' },
  Discover_2: {number: '6011000990139424', token: 'tok_discover' },
  DinersClub: {number: '30569309025904', token: 'tok_diners' },
  DinersClub_2: {number: '38520000023237', token: 'tok_diners' },
  JSB: {number: '3566002020360505', token: 'tok_jcb' },
  UnionPay: {number: '6200000000000005', token: 'tok_unionpay' },
}


// 購入者アカウント作成
async function createCustomer(email, token) {
  const customer = await stripe.customers.create({
    email,
  })

  return customer
}

// アカウント情報取得
async function getCustomer(customerId) {
  return await stripe.customers.retrieve(customerId)
}

// カード情報の更新
async function registCard(customerId, token) {
  return await stripe.customers.createSource(
    customerId,
    { source: token },
  )
}

// 販売者アカウント作成(プラットフォームの子アカウント)
async function createProvider(email, type = 'custom') {
  return await stripe.accounts.create({
    country: 'JP',
    type,
    email,
  })
}

// 販売者アカウント取得(プラットフォームの子アカウント)
async function getProvider(providerId) {
  return await stripe.accounts.retrieve(providerId)
}


async function uploadFile(path, ext, purpose) {
  const file = fs.readFileSync(path)
  // アップロード可能なファイルタイプ
  // CSV text/csv
  // DOCX	application/vnd.openxmlformats-officedocument.wordprocessingml.document
  // GIF	image/gif
  // JPEG	image/jpeg
  // PDF	application/pdf
  // PNG	image/png
  // XLS	application/vnd.ms-excel
  // XLSX	application/vnd.openxmlformats-officedocument.spreadsheetml
  return await stripe.files.create({
    purpose,
    file: {
      data: file,
      name: `file.${ext}`,
      type: 'application/octet-stream',
    },
  })
}

// 銀行口座情報作成
async function createBankAccount(providerId, tokenOrBankAccount) {
  return await stripe.accounts.createExternalAccount(
    providerId,
    { external_account: tokenOrBankAccount }
  )
}

// アカウントの更新
async function updateAccount(providerId, update) {
  return await stripe.accounts.update(providerId, update)
}

// 購入者が販売者から購入（その際に手数料をプラットフォーム側が受け取る）
async function destinationCharge(customerId, providerId, amount, amountProvider, cardId) {
  return await stripe.charges.create({
    amount, // 購入者が支払う金額
    currency: 'jpy', // 通貨
    card: cardId, // 購入者のクレジットカードカードID
    customer: customerId, // 購入者
    destination: {
      amount: amountProvider, // 販売者に支払う料金（差分=Stripe手数料+プラットフォーム手数料）
      account: providerId, // 販売者
    },
  })
}

// 返金する
async function refundCharge(chargeId, transferId) {
  // 購買者に返金する
  const refund = stripe.Refund.create({charge: chargeId})
  // 販売者(子アカウント)から返金する
  stripe.transfers.createReversal(transferId)
  return refund
}

// webhook eventの照合
async function webhookEvent(req) {
  // 次のようなヘッダー（現在v1のみ有効）
  // Stripe-Signature: t=1492774577,
  //   v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd,
  //   v0=6ffbb59b2300aae63f272406069a9788598b792a944a07aba816edb039989a39
  const sig = req.headers['stripe-signature']

  return await stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret)
}

module.exports = {
  testCards,
  createCustomer,
  getCustomer,
  registCard,
  createProvider,
  getProvider,
  uploadFile,
  createBankAccount,
  updateAccount,
  destinationCharge,
  refundCharge,
  webhookEvent,
}