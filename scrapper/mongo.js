const mongodb = require('mongodb')

class Mongo {
  constructor (config, app) {
    this.config = config
    this.app = app
    this.dbPromise = null
  }

  async run () {
    return this._instance()
  }

  formatID (id) {
    try {
      return mongodb.ObjectID(id)
    } catch (err) {
      throw new Error(`Identifier not found ${id}`)
    }
  }

  async _instance (collectionName) {
    if (!this.dbPromise) {
      const url = `mongodb://${this.config.host}:${this.config.port}/${this.config.database}`
      console.log(url)
      this.dbPromise = mongodb.MongoClient.connect(url, { reconnectTries: 5 })
    }

    if (!collectionName) {
      return this.dbPromise
    }

    const db = await this.dbPromise
    return db.collection(collectionName)
  }

  async createIndex (collection, index) {
    const db = await this._instance(collection)
    const result = await db.ensureIndex(index)
    return result
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

  async getOne (collection, filter) {
    const results = await this.find(collection, { filter, limit: 1 })
    if (results.length !== 1) {
      throw new Error('Not found')
    }
    return results[0]
  }

  async insertOne (collection, document) {
    const db = await this._instance(collection)
    return db.insertOne(document)
  }

  async insertMany (collection, documents) {
    const db = await this._instance(collection)
    return db.insertMany(documents)
  }

  async updateOne (collection, query, update) {
    const db = await this._instance(collection)
    return db.updateOne(query, update)
  }

  async updateMany (collection, query, update) {
    const db = await this._instance(collection)
    return db.updateMany(query, update)
  }

  async deleteOne (collection, query) {
    const db = await this._instance(collection)
    return db.deleteOne(query)
  }

  async deleteMany (collection, query) {
    const db = await this._instance(collection)
    return db.deleteMany(query)
  }

  async drop (collection) {
    const db = await this._instance(collection)
    return db.drop()
  }
}

module.exports = Mongo
