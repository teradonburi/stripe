function find (param, model) {
  return new Promise((resolve, reject) => {
    model.find(param, (err, docs) => {
      if (err) return reject(err)
      return resolve(docs)
    })
  })
}

function insert (param, model) {
  return new Promise((resolve, reject) => {
    model.insert(param, (err, newDoc) => {
      if (err) return reject(err)
      return resolve(newDoc)
    })
  })
}

function update (query, update, options, model) {
  return new Promise((resolve, reject) => {
    model.update(query, update, options, (err, numReplaced) => {
      if (err) return reject(err)
      return resolve(numReplaced)
    })
  })
}

function remove (param, model) {
  return new Promise((resolve, reject) => {
    model.remove(param, { multi: true }, (err, numRemoved) => {
      if (err) return reject(err)
      return resolve(numRemoved)
    })
  })
}

module.exports = {
  find,
  insert,
  update,
  remove,
}