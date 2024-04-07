const axios = require("axios");
const qs = require("qs");
const dotenv = require("dotenv");
const { connectToDB, closeConnection } = require("./config/db");
const { ObjectId } = require("mongodb");

// Load .env file
dotenv.config();

// If PORT is not defined, use default port
const PORT = process.env.PORT || 8999;
const { QUEUE_SERVICE_URL } = process.env;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const translationRequest = async (sentence) => {
  return await axios.get(`http://0.0.0.0:${PORT}/api`, {
    params: {
      from: "en",
      to: "mn",
      text: sentence,
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    paramsSerializer: (params) => qs.stringify(params),
  });
};

const queueService = async () => {
  let queueResponse = await axios.get(QUEUE_SERVICE_URL);

  const { status: queueStatus } = queueResponse;

  if (queueStatus !== 200) {
    // retry queue service
    while (true) {
      console.log("retrying get queue service...");
      queueResponse = await axios.get(QUEUE_SERVICE_URL);

      const { status } = queueResponse;

      if (status === 200) {
        break;
      }
      await delay(3000);
    }
  }

  const {
    data: { payload },
  } = queueResponse;

  return payload;
};

const translationService = async (sentence) => {
  let translationResponse = await translationRequest(sentence);
  const { status: translationStatus } = translationResponse;

  // retry translation service
  if (translationStatus !== 200) {
    while (true) {
      console.log("retrying translation service...");
      translationResponse = await translationRequest(sentence);

      const { status } = queueResponse;

      if (status === 200) {
        break;
      }

      await delay(3000);
    }
  }

  const {
    data: { result },
  } = translationResponse;

  return result;
};

const translate = async (queuePayload) => {
  try {
    const { id, sentence, source } = queuePayload;
    const mnTranslation = await translationService(sentence);
    
    console.log({ mn: mnTranslation, en: sentence });
    
    const db = await connectToDB();
    const collection = db.collection("result");

    await collection.insertOne({
      mn: mnTranslation,
      en: sentence,
      source: source,
    });

    const sentenceCollection = db.collection("sentence");
    await sentenceCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isTranslated: true } }
    );
    await delay(1000);
  } catch (error) {
    console.log(error);
    await closeConnection();
    console.log("retrying translate...");
    await delay(3000);
    await translate(queuePayload);
  }
};

const tranlateLoop = async () => {
  try {
    while (true) {
      const queuePayload = await queueService();
      await translate(queuePayload);
    }
  } catch (error) {
    console.log(error);
    console.log("starting loop ...");
    await tranlateLoop();
  }
};

(async () => {
  try {
    console.log("starting ...");
    await delay(5000);
    tranlateLoop();
  } catch (error) {
    console.log(error);
    tranlateLoop();
  }
})();
