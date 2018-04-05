const mongodb = require('mongodb')

class Mongo {
  constructor (config) {
    this.config = config
    this.dbPromise = null
  }

  async run () {
    return this._instance()
  }

  async _instance (collectionName) {
    if (!this.dbPromise) {
      const url = `mongodb://${this.config.host}:${this.config.port}/${this.config.database}`
      this.dbPromise = mongodb.MongoClient.connect(url, { reconnectTries: 5 })
    }

    if (!collectionName) {
      return this.dbPromise
    }

    const db = await this.dbPromise
    return db.collection(collectionName)
  }

  async find (collection, { filter, sort, limit, fields }) {
    const db = await this._instance(collection)
    let cursor = db.find(filter, fields)
    if (sort) {
      cursor = cursor.sort(sort)
    }
    if (limit) {
      cursor = cursor.limit(limit)
    }
    return cursor.toArray()
  }

  async insertOne (collection, document) {
    const db = await this._instance(collection)
    return db.insertOne(document)
  }
}

module.exports = Mongo
