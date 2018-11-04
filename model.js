const Datastore = require('nedb')
const User = new Datastore({ filename: 'user.db', autoload: true })
const Charge = new Datastore({ filename: 'charge.db', autoload: true })
const Address = new Datastore({ filename: 'address.db', autoload: true })

module.exports = {
  User,
  Charge,
  Address,
}