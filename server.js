const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const stripe = require('./stripe')
const zenginCode = require('zengin-code')
const { User, Charge, Address } = require('./model')
const nedb = require('./nedb')
const fileUpload = require('express-fileupload')
const https = require('https')
const unzip = require('unzip')
const iconv = require('iconv-lite')
const fs = require('fs')
const readline = require('linebyline')
const ZIP_FILE  = 'KEN_ALL.zip'
const CSV_FILE = 'KEN_ALL.csv'

process.on('uncaughtException', (err) => console.error(err))
process.on('unhandledRejection', (err) => console.error(err))

function rawBodySaver (req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8')
  }
}

app.use(express.static('.'))
app.use(bodyParser.urlencoded({extended: true, verify: rawBodySaver}))
app.use(bodyParser.json({verify: rawBodySaver}))
app.use(fileUpload())


const getIP = (req) => {
  if (req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for']
  }
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress
  }
  if (req.connection.socket && req.connection.socket.remoteAddress) {
    return req.connection.socket.remoteAddress
  }
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress
  }
  return '0.0.0.0'
}

async function getUsers(res) {
  const users= await nedb.find({}, User)
  res.json(users.map(user => ({email: user.email, provider: user.provider})))
}

app.post('/api/createCustomer', async (req, res) => {
  // 購入者アカウント作成
  const email = req.body.email
  if (!email) return res.status(400).json({message: 'bad request'})
  const exist = await nedb.find({email}, User)
  if (exist.length > 0) return res.status(400).json({message: 'already exist'})
  const customer = await stripe.createCustomer(email)

  if (customer) {
    await nedb.insert({customerId: customer.id, email}, User)
  }

  getUsers(res)
})

app.post('/api/registCard', async (req, res) => {
  // 実際のクレジットカードtokenはクライアントサイドのStripe.jsより取得する
  const token = req.body.token || stripe.testCards.Visa.token
  const email = req.body.email
  if (!email) return res.status(400).json({message: 'bad request'})
  const users = await nedb.find({email}, User)
  if (users.length === 0) return res.status(404).json({message: 'not found'})
  let customer = await stripe.getCustomer(users[0].customerId)
  if (customer.deleted) {
    // Stripe側で削除済みのアカウント
    await nedb.update(
      {email},
      {$unset: {customerId: true}},
      {upsert: false}, User)
    return res.status(404).json({message: 'not found'})
  }
  // クレジットカードの登録
  const card = await stripe.registCard(customer.id, token).catch(error => ({error}))
  if (!card.id) return res.status(500).json({message: 'failed create card'})
  customer = await stripe.getCustomer(customer.id)
  // カード情報はdefault_source, sourcesに紐付けられる
  await nedb.update(
    {email},
    {$set: {defaultCard: customer.default_source, cards: customer.sources.data.map(d => d.id)}},
    {upsert: false}, User)

  getUsers(res)
})

app.post('/api/createProvider', async (req, res) => {
  const email = req.body.email
  if (!email) return res.status(400).json({message: 'bad request'})
  const exist = await nedb.find({email}, User)
  if (exist.length > 0) {
    // 販売者アカウントのemailがstripe側で登録済みかチェック
    const provider = await stripe.getProvider(exist[0].providerId)
    if (provider) {
      return res.status(400).json({message: 'already exist'})
    }
  }

  // 販売者アカウント作成
  const provider = await stripe.createProvider(email)

  if (provider) {
    if (exist.length > 0) {
      // 販売者アカウント作成
      const provider = await stripe.createProvider(email)
      // すでに購入者のアカウントが存在する
      await nedb.update(
        {email},
        {$set: {providerId: provider.id}},
        {upsert: false}, User)
    } else {
      // 販売者アカウント作成
      const provider = await stripe.createProvider(email)
      // 新規販売者として登録
      await nedb.insert({providerId: provider.id, email}, User)
    }
  }

  getUsers(res)
})

app.get('/api/zenginCode', async (req, res) => {
  // 日本の銀行コード一覧
  res.json(zenginCode)
})

function moveFile(path, imageFile) {
  return new Promise((resolve, reject) => {
    imageFile.mv(path, function(err) {
      if (err) return reject(err)
      return resolve()
    })
  })
}

app.post('/api/uploadVerification', async (req, res) => {
  // 証明書のアップロード
  const imageFile = req.files.file
  const mimetype = imageFile.mimetype
  if (mimetype !== 'image/png' && mimetype !== 'image/jpeg') return res.status(400).json({message: 'bad request'})
  const ext = mimetype !== 'image/png' ? 'png' : 'jpg'
  const path = `/tmp/verification_${Date.now()}.${ext}`

  await moveFile(path, imageFile)

  // 証明書のアップロード
  // パスポートのみ表のみ可
  // 以下の受付可能な書類は裏も必要
  // 住民基本台帳カード（写真付）、運転免許証、外国人居住者カード、住民票または国民年金手帳が添付された健康保険証
  // 8000px×8000px、5MBがサイズ上限
  const file = await stripe.uploadFile(path, ext, 'identity_document').catch(error => ({error}))
  if (file.error) {
    return res.status(500).json({message: 'upload failed'})
  }
  res.json(file.id)
})

app.post('/api/registProviderBankAccount', async (req, res) => {
  const email = req.body.email
  const bankCode = req.body.bankCode
  const branchOfficeCode = req.body.branchOfficeCode
  const bankAccountNumber = req.body.bankAccountNumber
  const bankAccountName = req.body.bankAccountName
  const document = req.body.verificationFront
  const document_back = req.body.verificationBack
  const postal_code = req.body.postal_code
  const state = req.body.state
  const city = req.body.city
  const town = req.body.town
  const line1 = req.body.line1
  const line2 = req.body.line2
  const dob = req.body.dob
  const last_name_kana = req.body.last_name_kana
  const first_name_kana = req.body.first_name_kana
  const last_name_kanji = req.body.last_name_kanji
  const first_name_kanji = req.body.first_name_kanji
  const gender = req.body.gender
  const phone_number = req.body.phone_number

  if (!email || !document || !document_back ||
  !postal_code || !state || !city || !town || !line1 || !line2 || !dob || !last_name_kana || !first_name_kana || !last_name_kanji || !first_name_kanji || !gender || !phone_number ||
  !(bankCode && branchOfficeCode && bankAccountNumber && bankAccountName)) return res.status(400).json({message: 'bad request'})
  const address = await nedb.find({zipcode: postal_code}, Address)
  if (address.length === 0) return res.status(400).json({message: 'bad request'})
  const users = await nedb.find({email, providerId: {$exists: true}}, User)
  if (users.length === 0) return res.status(404).json({message: 'not found'})
  const user = users[0]


  // 銀行口座
  const tokenOrBankAccount = {
    object: 'bank_account',
    account_number: bankAccountNumber, // 口座番号(test時: 00012345)
    routing_number: bankCode + branchOfficeCode, // 銀行コード+支店コード(銀行コードはzengin-codeより取得)
    account_holder_name: bankAccountName, // 口座名(かな)
    currency: 'jpy',
    country: 'jp',
    account_holder_type: 'individual', // individual or company
  }
  // デビッドカードの登録(TODO: デビッドカードtokenはクライアントサイドのStripe.jsより取得する)
  // const tokenOrBankAccount = stripe.testCards.Visa_debit.token

  // 販売者の銀行講座アカウント作成
  const external_account = await stripe.createBankAccount(user.providerId, tokenOrBankAccount).catch(error => ({error}))
  if (external_account.error) {
    return res.status(400).json({message: 'bad request'})
  }
  // 銀行口座指定の場合はexternal_accountに口座の指定が必要
  if (!external_account.account_number) external_account.account_number = bankAccountNumber

  // 利用規約に同意
  const agreement = {
    tos_acceptance: {
      date: Math.floor(Date.now() / 1000),
      ip: getIP(req), // グローバルIP
    },
  }


  // 販売者情報(個人事業主 or 法人)
  // 〒150-0001 東京都渋谷区神宮前3-27-15 FLAG 3A
  const individual = {
    external_account, // 送金アカウント、本番のみ有効
    legal_entity: {
      // かなはユーザに入力させるのは難しいと思うので、サーバ側で変換する
      address_kana: {
        country: 'JP',
        postal_code, // Zip/Postal Code
        state: address.prefectureKana, // 県
        city: address.cityKana, // 市区
        town: address.townKana, // 街名
        line1: line1.match(/[0-9０-９]/g).join('-'), // 丁目、番地、ビル番号
        line2: '', // ビル詳細（optional）
      },
      address_kanji: {
        country: 'JP',
        postal_code, // Zip/Postal Code
        state, // Prefecture
        city, // City/Ward
        town, // Town
        line1, // cho-me/Block/Building number
        line2, // Building details (optional)
      },
      // 生年月日
      dob: {
        day: dob.split('-')[2],
        month: dob.split('-')[1],
        year: dob.split('-')[0],
      },
      last_name_kana,
      first_name_kana,
      last_name_kanji,
      first_name_kanji,
      gender, // male or female
      phone_number, // +81必須
      type: 'individual', // individual or company
      // 証明書
      verification: {
        document,
        document_back,
      },
    },
    ...agreement,
  }

  // 販売者の登録情報更新
  const account = await stripe.updateAccount(user.providerId, individual).catch(error => ({error}))
  if (account.error) {
    console.error(account.error)
    return res.status(500).json({message: 'update failed'})
  }

  getUsers(res)
})


// エスクロー決済
app.post('/api/chargeFromCustomerToProvider', async (req, res) => {
  const customerEmail = req.body.customerEmail
  const providerEmail = req.body.providerEmail
  if (!customerEmail || !providerEmail) return res.status(400).json({message: 'bad request'})
  const customers = await nedb.find({email: customerEmail}, User)
  const providers = await nedb.find({email: providerEmail, providerId: {$exists: true}}, User)
  if (customers.length === 0) return res.status(400).json({message: 'bad request'})
  if (customers.length === 0 || providers.length === 0) return res.status(400).json({message: 'bad request'})
  const customer = customers[0]
  const provider = providers[0]
  if (!provider.confirm) return res.status(500).json({message: 'not verified'})

  const amount = 1000 // 商品の値段（商品IDなどで検索）
  // 購入者から販売者へ支払いを行う
  const charge = await stripe.destinationCharge(customer.customerId, provider.providerId, amount, amount * 0.9, customer.defaultCard).catch(error => ({error}))
  if (charge.error) {
    console.error(charge.error)
    return res.status(500).json({message: 'charge failed'})
  }

  // 支払履歴を保存する
  await nedb.insert({chargeId: charge.id, transferId: charge.transfer}, Charge)

  getUsers(res)
})

// 返金処理を行う
app.post('/api/refund', async (req, res) => {
  const chargeId = req.body.chargeId
  const charge = await nedb.insert({chargeId, refund: {$ne: true}}, Charge)
  if (charge.length === 0) return res.status(400).json({message: 'bad request'})

  const refund = await stripe.refundCharge(charge.chargeId, charge.transferId)
  console.log(refund)

  res.json()
})


app.post('/api/webhook/stripe', async (req, res) => {

  try {
    // SHA256ハッシュ関数を使用してHMACを計算します
    // エンドポイントの署名秘密をキーとして使用し、signed_payload文字列をメッセージとして使用します(v1と一致するか確認する)
    const event = await stripe.webhookEvent(req)

    const type = event.type
    if (type === 'account.updated') {
      const verification = event.data.object.verification
      const email = event.data.email
      if (verification.disabled_reason === 'fields_needed') {
        // 販売者情報が不足
        await nedb.update(
          {email},
          {$set: {confirm: false}},
          {upsert: false}, User)
      } else if (verification.disabled_reason === null) {
        // 確認完了
        await nedb.update(
          {email},
          {$set: {confirm: true}},
          {upsert: false}, User)
      }
    }

  } catch (err) {
    // 不正なリクエスト
    return res.status(400).end()
  }

  res.json({received: true})
})

app.get('/api/download/address', async (req, res) => {
  // 日本郵便の住所情報データURL
  const downloadUrl = 'https://www.post.japanpost.jp/zipcode/dl/kogaki/zip/ken_all.zip'

  // ダウンロードしZIPを解凍
  const outFile = fs.createWriteStream(ZIP_FILE)
  https.get(downloadUrl, function (res) {

    res.pipe(outFile)
    res.on('end', function () {
      outFile.close()

      fs.createReadStream(ZIP_FILE).pipe(unzip.Extract({ path: './' }))
    })
  })

  res.json()
})


app.get('/api/import/address', async (req, res) => {
  // CSVファイルを１行ずつ読込
  const kenALLCSVRL = readline(CSV_FILE, {
    retainBuffer: true, //tell readline to retain buffer
  })
  kenALLCSVRL
    .on('line', async (line) => {
      // 読み込んだ行情報を配列化しDBに登録
      const csvdata = iconv.decode(line, 'shift-jis').replace(/\"/g,"").split(',') // eslint-disable-line 
      const zipcode = csvdata[2]
      const prefectureKana = csvdata[3]
      const cityKana = csvdata[4]
      const townKana = csvdata[5]
      const prefectureName = csvdata[6]
      const cityName = csvdata[7]
      const townName = csvdata[8] === '以下に掲載がない場合' ? '' : csvdata[8]
      await nedb.update(
        {zipcode},
        {$set: {
          zipcode, prefectureKana, cityKana, townKana, prefectureName, cityName, townName,
        }},
        {upsert: true}, Address)

    })
  res.json()
})

app.listen(9090, () => {
  console.log('Access to http://localhost:9090')
})