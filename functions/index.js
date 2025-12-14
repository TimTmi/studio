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
// This client is for listening to messages FROM the device
const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: mqttConfig.username,
  password: mqttConfig.password,
});

client.on("connect", () => {
  functions.logger.info("[MQTT Listener] Connected to HiveMQ Broker.");
  client.subscribe(MQTT_TOPICS, (err) => {
    if (!err) {
      functions.logger.info(`[MQTT Listener] Subscribed to topics: ${MQTT_TOPICS.join(", ")}`);
    } else {
      functions.logger.error("[MQTT Listener] Subscription error:", err);
    }
  });
});

client.on("error", (err) => {
  functions.logger.error("[MQTT Listener] Connection error:", err);
});

client.on("message", async (topic, message) => {
  const payload = message.toString();
  functions.logger.info(`[MQTT Listener] Message from topic "${topic}": ${payload}`);

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
    functions.logger.error("Error updating Firestore from MQTT message:", error);
  }
});

// This HTTP-triggered function keeps the MQTT client connection alive.
exports.mqttListener = functions.https.onRequest((request, response) => {
  functions.logger.info("HTTP trigger for mqttListener received, keeping connection alive.");
  response.send("MQTT-to-Firestore listener is active.");
});


/**
 * A Pub/Sub-triggered function to check for scheduled feedings.
 * This function should be triggered by a Cloud Scheduler job running every minute.
 */
exports.checkSchedules = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  functions.logger.info("Running scheduled feeding check...");

  const now = new Date();
  // Format current time to HH:MM to match Firestore data
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  try {
    const schedulesRef = db.collectionGroup('feedingSchedules');
    const query = schedulesRef.where('scheduledTime', '==', currentTime);
    const snapshot = await query.get();

    if (snapshot.empty) {
      functions.logger.info(`No feedings scheduled for ${currentTime}.`);
      return;
    }
    
    // A separate client for publishing to avoid topic subscription conflicts
    const publisher = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
      username: mqttConfig.username,
      password: mqttConfig.password,
    });

    publisher.on('connect', () => {
        functions.logger.info('[MQTT Publisher] Connected to HiveMQ Broker for publishing.');
        snapshot.forEach(doc => {
            const schedule = doc.data();
            const { feederId, portionSize } = schedule;
            
            if (!feederId || !portionSize) {
                functions.logger.warn(`Skipping invalid schedule: ${doc.id}`);
                return;
            }

            const commandTopic = `feeders/${feederId}/commands`;
            const commandPayload = JSON.stringify({
                command: 'dispense',
                portionSize: portionSize
            });

            publisher.publish(commandTopic, commandPayload, (err) => {
                if (err) {
                    functions.logger.error(`Failed to publish to ${commandTopic}:`, err);
                } else {
                    functions.logger.info(`Published command to ${commandTopic}: ${commandPayload}`);
                }
            });
        });
        // Disconnect after publishing all messages
        setTimeout(() => publisher.end(), 2000);
    });
    
    publisher.on('error', (err) => {
        functions.logger.error('[MQTT Publisher] Connection error:', err);
    });

  } catch (error) {
    functions.logger.error("Error checking schedules and publishing commands:", error);
  }

  return null;
});
