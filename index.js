const { fromKeyLike } = require('jose/jwk/from_key_like')
const { generateSecret } = require('jose/util/generate_secret')
const CoreLevelPouch = require('pouchdb-adapter-leveldb-core')
const encryptdown = require('@adorsys/encrypt-down')

function CrackUpPouch (opts, callback) {
  const { jwk, db: leveldown } = opts
  if (!leveldown) {
    throw new Error('pouchdb-adapter-crackup requires a leveldown constructor.')
  }
  const CrackUp = (name) => {
    const down = leveldown(name)
    this._down = down // preserve raw leveldown for crypto proofing
    return encryptdown(down, { jwk })
  }
  // map over any leveldown methods like destroy, repair, etc
  for (const [key, value] of Object.entries(leveldown)) {
    CrackUp[key] = value
  }
  // call the core leveldown adapter
  CoreLevelPouch.call(this, { ...opts, db: CrackUp }, callback)
}

CrackUpPouch.valid = () => true
CrackUpPouch.use_prefix = false

module.exports = function (PouchDB) {
  PouchDB.adapter('crackup', CrackUpPouch, true)
  PouchDB.genJWK = async function (alg = 'A256GCM') {
    const secret = await generateSecret(alg)
    const jwk = await fromKeyLike(secret)
    return jwk
  }
}
