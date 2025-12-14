const functions = require("firebase-functions");
const admin = require("firebase-admin");
const mqtt = require("mqtt");

admin.initializeApp();
const db = admin.firestore();

// --- Configuration ---
// It's highly recommended to store these in environment variables
// Use the Firebase CLI to set them before deploying:
// firebase functions:config:set mqtt.username="YOUR_USERNAME"
// firebase functions:config:set mqtt.password="YOUR_PASSWORD"
const mqttConfig = functions.config().mqtt;

if (!mqttConfig || !mqttConfig.username || !mqttConfig.password) {
  console.error("MQTT username or password not set in Firebase Functions config. Run 'firebase functions:config:set mqtt.username=...' and 'firebase functions:config:set mqtt.password=...'");
}

const MQTT_HOST = "a63c6d5a32cf4a67b9d6a209a8e13525.s1.eu.hivemq.cloud";
const MQTT_PORT = "8883"; // Secure TLS port
const MQTT_TOPICS = [
  "bowl",
  "portion",
  "weight",
  "storage/percent",
  "storage/weight",
  "storage/state",
];

// --- MQTT Client Setup ---
const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: mqttConfig.username,
  password: mqttConfig.password,
});

client.on("connect", () => {
  functions.logger.info("[MQTT] Connected to HiveMQ Broker.");
  client.subscribe(MQTT_TOPICS, (err) => {
    if (!err) {
      functions.logger.info(`[MQTT] Subscribed to topics: ${MQTT_TOPICS.join(", ")}`);
    } else {
      functions.logger.error("[MQTT] Subscription error:", err);
    }
  });
});

client.on("error", (err) => {
  functions.logger.error("[MQTT] Connection error:", err);
});

client.on("message", async (topic, message) => {
  const payload = message.toString();
  functions.logger.info(`[MQTT] Message from topic "${topic}": ${payload}`);

  // In a real-world multi-feeder app, the feeder ID would be part of the topic
  // For this project, we assume a single feeder with a known ID.
  const feederId = "YOUR_FEEDER_ID"; // IMPORTANT: Replace with your actual Feeder ID

  try {
    const usersQuery = db.collection("users").where("feederId", "==", feederId).limit(1);
    const snapshot = await usersQuery.get();

    if (snapshot.empty) {
      functions.logger.warn(`No user found for feederId: ${feederId}`);
      return;
    }

    const userDoc = snapshot.docs[0];
    let updateData = {};

    // Map MQTT topics to Firestore fields
    switch (topic) {
      case "storage/percent":
        updateData = { bowlLevel: parseFloat(payload) };
        break;
      case "storage/state":
        const status = (payload === "EMPTY" || payload === "LOW" || payload === "OK") ? "online" : "offline";
        updateData = { status: status };
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await userDoc.ref.update(updateData);
      functions.logger.info(`Updated Firestore for user ${userDoc.id} with:`, updateData);
    }
  } catch (error) {
    functions.logger.error("Error updating Firestore:", error);
  }
});

exports.mqttFirestoreBridge = functions.https.onRequest((request, response) => {
  functions.logger.info("HTTP trigger for mqttFirestoreBridge received, keeping connection alive.");
  response.send("MQTT-to-Firestore bridge is active. Listening for messages.");
});
