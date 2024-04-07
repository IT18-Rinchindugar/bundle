const { MongoClient } = require("mongodb");

let db = null;

const connectToDB = async () => {
  if (!db) {
    const url =
      "mongodb+srv://translation_db_user:JHi94D51LX23pm60@translation-db-6e5f3c1b.mongo.ondigitalocean.com/";
    const client = new MongoClient(url);

    await client.connect();

    db = client.db("translation");
    console.log(db);
  }

  return db;
};

const closeConnection = async () => {
  if (db) {
    await db.client.close();
    console.log("Disconnected from MongoDB");
    db = null;
  }
};

module.exports = { connectToDB, closeConnection };