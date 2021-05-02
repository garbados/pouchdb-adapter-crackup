# pouchdb-adapter-crackup

[![CI](https://github.com/garbados/pouchdb-adapter-crackup/actions/workflows/ci.yaml/badge.svg)](https://github.com/garbados/pouchdb-adapter-crackup/actions/workflows/ci.yaml)
[![Coverage Status](https://coveralls.io/repos/github/garbados/pouchdb-adapter-crackup/badge.svg?branch=master)](https://coveralls.io/github/garbados/pouchdb-adapter-crackup?branch=master)
[![Stability](https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square)](https://nodejs.org/api/documentation.html#documentation_stability_index)
[![NPM Version](https://img.shields.io/npm/v/pouchdb-adapter-crackup.svg?style=flat-square)](https://www.npmjs.com/package/pouchdb-adapter-crackup)
[![JS Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)



[comdb]: https://github.com/garbados/comdb

**When they crack down, we crack up!** 🤡

A PouchDB plugin that adds the *crackup* adapter, which transparently encrypts and decrypts data while preserving the sort order of document IDs and view keys. *As a result document IDs and view keys are unencrypted at rest, while the rest of the database is always encrypted.*

This approach is in contrast to that of [ComDB][comdb], an encryption plugin that maintains an encrypted copy of changes to a database. That approach makes it possible to ensure the entire database is encrypted at rest in exchange for potentially significant resource overhead. The *crackup* adapter avoids this duplication cost while sacrificing a certain degree of data protection. If leaving document IDs and view keys unencrypted does not meet your encryption requirements, consider using [ComDB][comdb] instead.

The *crackup* adapter wraps a [leveldown](https://github.com/Level/leveldown) constructor in order to apply encryption with [encrypt-down](https://github.com/adorsys/encrypt-down), which uses [JSON Web Keys](https://tools.ietf.org/html/rfc7517) to encrypt database entries. Unlike with PouchDB's leveldown-based adapters, you must pass your own leveldown constructor to PouchDB when creating new databases. This means you can pass any leveldown implementation, such as [level-js](https://github.com/Level/level-js) or [networked-hyperbeedown](https://github.com/RangerMauve/networked-hyperbeedown).

For example:

```javascript
const leveldown = require('leveldown')
const PouchDB = require('pouchdb')
PouchDB.plugin(require('@garbados/pouchdb-adapter-crackup'))

// first, we generate a key to use for encryption. works like a password.
const jwk = await PouchDB.genJWK()
// then we instantiate a database using this adapter and this jwk.
const db = new PouchDB('example', { adapter: 'crackup', db: leveldown, jwk })
// now we can write data to the database...
await db.put({ _id: 'a', hello: 'world' })
// ...and read it back normally!
const doc = await db.get('a')
console.log(doc.hello)
// > "world"
```

## Install

Use [npm](https://www.npmjs.com/) or whatever.

```bash
$ npm i --save @garbados/pouchdb-adapter-crackup
```

## Usage

After applying *crackup* as a plugin, you can use it as an adapter. Additionally, it adds a static method to PouchDB, `.genJWK()`, which you can use to generate the necessary credentials to begin encrypting.

### new PouchDB(name, { adapter: 'crackup', db, jwk })

- `name`: The name of your database. This is passed to your leveldown constructor.
- `db`: A leveldown constructor.
- `jwk`: A JSON Web Key. Passed to encrypt-down.

### const jwk = await PouchDB.genJWK(alg = 'A256GCM')

- `jwk`: A JSON web key. Looks like `{ k: '...', ... }`. Don't worry about it.
- `alg`: The name of an encryption algorithm to use. See [RFC-7517](https://tools.ietf.org/html/rfc7517) for a full list of available algorithms. Defaults to "A256GCM" aka AES-256-GCM.

## Development

This adapter includes a test suite, thank goodness.
You can run it by building the project from source:

```bash
$ git clone https://github.com/garbados/pouchdb-adapter-crackup
$ cd pouchdb-adapter-crackup
$ npm i
$ npm test
```

To check test coverage, run `npm run cov`.

## License

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)
