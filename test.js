/* global describe, before, after, it */
const PouchDB = require('pouchdb')
PouchDB.plugin(require('.'))

const leveldown = require('leveldown')
const assert = require('assert').strict

describe('pouchdb-adapter-crackup', function () {
  before(async function () {
    this.jwk = await PouchDB.genJWK()
    this.db = new PouchDB('.test', {
      adapter: 'crackup',
      db: leveldown,
      jwk: this.jwk
    })
    await this.db.put({ _id: 'a', hello: 'world' })
    await this.db.put({ _id: 'b', hello: 'sol' })
    await this.db.put({ _id: 'c', hello: 'galaxy' })
  })

  after(async function () {
    await this.db.destroy()
  })

  it('should require a jwk', async function () {
    const NAME = '.needs_jwk'
    let ok = false
    try {
      const db = new PouchDB(NAME, {
        adapter: 'crackup',
        db: leveldown
      })
      throw new Error(`${db.name} setup succeeded?`)
    } catch (error) {
      if (error.message === 'EncryptDown: a JsonWebKey is required!') {
        ok = true
      }
    }
    assert(ok, 'JWK missing did not raise an error!')
  })

  it('should require a leveldown', async function () {
    const NAME = '.need_leveldown'
    let ok = false
    try {
      const db = new PouchDB(NAME, {
        adapter: 'crackup',
        jwk: this.jwk
      })
      throw new Error(`${db.name} setup succeeded?`)
    } catch (error) {
      if (error.message === 'pouchdb-adapter-crackup requires a leveldown constructor.') {
        ok = true
      }
    }
    assert(ok, 'leveldown missing did not raise an error!')
  })

  it('should do the crypto dance', async function () {
    // get all records from the underlying leveldown instance
    const iterator = this.db._down.iterator()
    const paginate = async () => {
      return new Promise((resolve, reject) => {
        iterator.next((err, key, value) => {
          if (err) { reject(err) } else { resolve([key, value]) }
        })
      })
    }
    const all = {}
    let row
    do {
      row = await paginate()
      const [key, value] = row
      if (!key) { break }
      all[key] = value.toString('utf8')
    } while (true)
    // show that known keys are in the database unencrypted
    const keys = await this.db.allDocs().then(({ rows }) => {
      return rows.map(({ key }) => { return key })
    })
    for (const k of keys) {
      const key = ['', 'document-store', k].join('ÿ') // cool sep my guy
      const value = all[key]
      const doc = await this.db.get(k)
      // sublevel-pouch stringifies docs when saving.
      // if the db is not encrypted,
      // the stringified doc would be equal to the stored value.
      assert.notEqual(value, JSON.stringify(doc))
    }
  })

  it('should sort keys correctly', async function () {
    const result = await this.db.allDocs()
    for (let i = 0; i < result.rows.length - 1; i++) {
      const row = result.rows[i]
      const next = result.rows[i + 1]
      assert(row.key < next.key)
    }
  })

  it('should replicate ok', async function () {
    const db = new PouchDB('whatever')
    await this.db.replicate.to(db)
    const result = await db.allDocs({ include_docs: true })
    const keys = result.rows.map(({ key, doc: { hello } }) => { return [key, hello] })
    assert.equal(keys[0][0], 'a')
    assert.equal(keys[1][0], 'b')
    assert.equal(keys[2][0], 'c')
    assert.equal(keys[0][1], 'world')
    assert.equal(keys[1][1], 'sol')
    assert.equal(keys[2][1], 'galaxy')
    await db.destroy()
  })

  const BENCHMARK = 1e2
  it(`should do the crypto dance ${BENCHMARK} times`, async function () {
    this.timeout(0)
    for (let i = 0; i < BENCHMARK; i++) {
      await this.db.post({ _id: `test:${i}`, hello: `world:${BENCHMARK - i}` })
    }
  })
})
