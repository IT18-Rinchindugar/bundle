const { MongoClient } = require("mongodb");

let db = null;

const connectToDB = async () => {
  if (!db) {
    const url =
      "mongodb://tomyoTranslation:N9ITwOTg37BPx8P@10.0.4.124:27017?directConnection=true";
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