
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const CustomError = require('./error');
const username = process.env.DB_USER_NAME
const password = process.env.DB_PASSWORD
const dbname = process.env.DB_NAME
const dbURI = process.env.DB_SERVER

const uri = `mongodb+srv://${username}:${password}@${dbURI}/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  serverSelectionTimeoutMS: 5000
});

async function findOne (collection, params) {
  return execute(collection, 'findOne', params)
}

async function insertOne (collection, params) {
  return execute(collection, 'insertOne', params)
}

async function updateOne (collection, filter, update) {
  return execute(collection, 'updateOne', filter, update)
}

async function execute (collection, action, ...params) {
  try {
    await client.connect();
    return await client.db(dbname).collection(collection)[action](...params)
  } catch (e) {
    throw new CustomError(e.message)
  }
  finally {
    await client.close();
  }
}
module.exports = { findOne, insertOne, updateOne, ObjectId }
