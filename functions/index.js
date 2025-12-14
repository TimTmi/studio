const functions = require("firebase-functions");
const admin = require("firebase-admin");
const mqtt = require("mqtt");
const cors = require('cors')({origin: true});

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
const MQTT_TOPIC_PREFIX = "feeders";
const MQTT_WILDCARD_TOPIC = `${MQTT_TOPIC_PREFIX}/+/+`; // Subscribes to all feeders and all their sub-topics

// --- MQTT Client Setup ---
// This client is for listening to messages FROM the device
const client = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
  username: mqttConfig.username,
  password: mqttConfig.password,
});

client.on("connect", () => {
  functions.logger.info("[MQTT Listener] Connected to HiveMQ Broker.");
  client.subscribe(MQTT_WILDCARD_TOPIC, (err) => {
    if (!err) {
      functions.logger.info(`[MQTT Listener] Subscribed to wildcard topic: ${MQTT_WILDCARD_TOPIC}`);
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

  // Topic structure is expected to be "feeders/{feederId}/{metric}"
  // e.g., "feeders/my-esp32-123/storage/percent"
  const topicParts = topic.split("/");
  if (topicParts.length < 3 || topicParts[0] !== MQTT_TOPIC_PREFIX) {
    functions.logger.warn(`Ignoring message from invalid topic: ${topic}`);
    return;
  }

  const feederId = topicParts[1];
  const metric = topicParts.slice(2).join('/'); // Handles metrics like "storage/percent"

  if (!feederId) {
      functions.logger.warn(`Could not extract feederId from topic: ${topic}`);
      return;
  }

  try {
    const feederRef = db.collection("feeders").doc(feederId);
    let updateData = {};

    // Map MQTT metrics to Firestore fields
    switch (metric) {
      case "bowl/percent":
        updateData = { bowlLevel: parseFloat(payload) };
        break;
      case "storage/percent":
        updateData = { storageLevel: parseFloat(payload) };
        break;
      case "status":
        updateData = { status: payload }; // e.g. "online" or "offline"
        break;
      case "weight":
        updateData = { currentWeight: parseFloat(payload) };
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await feederRef.update(updateData);
      functions.logger.info(`Updated Firestore for feeder ${feederId} with:`, updateData);
    }
  } catch (error) {
    functions.logger.error(`Error updating Firestore for feeder ${feederId}:`, error);
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

  const now = admin.firestore.Timestamp.now();
  const oneMinuteFromNow = admin.firestore.Timestamp.fromMillis(now.toMillis() + 60000);

  try {
    const schedulesRef = db.collectionGroup('feedingSchedules');
    // Find schedules due in the next minute that haven't been sent
    const query = schedulesRef
      .where('scheduledTime', '>=', now)
      .where('scheduledTime', '<', oneMinuteFromNow)
      .where('sent', '==', false);
    const snapshot = await query.get();

    if (snapshot.empty) {
      functions.logger.info(`No feedings scheduled for the next minute.`);
      return;
    }
    
    // A separate client for publishing to avoid topic subscription conflicts
    const publisher = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
      username: mqttConfig.username,
      password: mqttConfig.password,
    });

    publisher.on('connect', () => {
        functions.logger.info('[MQTT Publisher] Connected to HiveMQ Broker for publishing.');
        const promises = snapshot.docs.map(doc => {
            const schedule = doc.data();
            const { feederId, portionSize } = schedule;
            
            if (!feederId || !portionSize) {
                functions.logger.warn(`Skipping invalid schedule: ${doc.id}`);
                return Promise.resolve();
            }

            const commandTopic = `feeders/${feederId}/commands`;
            const commandPayload = JSON.stringify({
                command: 'dispense',
                portionSize: portionSize
            });

            const publishPromise = new Promise((resolve, reject) => {
                 publisher.publish(commandTopic, commandPayload, (err) => {
                    if (err) {
                        functions.logger.error(`Failed to publish to ${commandTopic}:`, err);
                        reject(err);
                    } else {
                        functions.logger.info(`Published command to ${commandTopic}: ${commandPayload}`);
                        // Log the feeding event to Firestore
                        const logRef = db.collection(`feeders/${feederId}/feedingLogs`).doc();
                        logRef.set({
                            feederId: feederId,
                            portionSize: portionSize,
                            timestamp: admin.firestore.FieldValue.serverTimestamp()
                        }).catch(logErr => {
                            functions.logger.error(`Failed to create feeding log for ${feederId}:`, logErr);
                        });

                        // After dispensing, update the schedule to mark it as sent
                        doc.ref.update({ sent: true }).catch(updateErr => {
                            functions.logger.error(`Failed to update schedule ${doc.id}:`, updateErr);
                        });
                        resolve();
                    }
                });
            });
            return publishPromise;
        });

        Promise.all(promises).finally(() => {
            // Give a moment for messages to publish before closing
            setTimeout(() => publisher.end(), 2000);
        });
    });
    
    publisher.on('error', (err) => {
        functions.logger.error('[MQTT Publisher] Connection error:', err);
    });

  } catch (error) {
    functions.logger.error("Error checking schedules and publishing commands:", error);
  }

  return null;
});


/**
 * An HTTP-callable function to trigger a manual feeding event.
 */
exports.manualFeed = functions.https.onRequest((req, res) => {
    // Use CORS middleware to handle preflight and regular requests.
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { feederId } = req.body;
        const portionSize = 50; // Default portion size for manual feed

        if (!feederId) {
            functions.logger.warn("Invalid manual feed request. Missing feederId.", req.body);
            return res.status(400).send('Missing feederId.');
        }

        const commandTopic = `${MQTT_TOPIC_PREFIX}/${feederId}/commands`;
        const commandPayload = JSON.stringify({
            command: 'dispense',
            portionSize: portionSize
        });

        const publisher = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
            username: mqttConfig.username,
            password: mqttConfig.password,
        });

        const publishPromise = new Promise((resolve, reject) => {
            publisher.on('connect', () => {
                functions.logger.info(`[MQTT Publisher] Connected to send manual feed command for feeder: ${feederId}`);
                publisher.publish(commandTopic, commandPayload, (err) => {
                    if (err) {
                        functions.logger.error(`Failed to publish command to ${commandTopic}:`, err);
                        publisher.end();
                        reject(err);
                    } else {
                        functions.logger.info(`Successfully published command to ${commandTopic}: ${commandPayload}`);
                        publisher.end();
                        resolve();
                    }
                });
            });
            publisher.on('error', (err) => {
                functions.logger.error(`[MQTT Publisher] Connection error for ${feederId}:`, err);
                publisher.end();
                reject(err);
            });
        });

        try {
            await publishPromise;
            
            // Log the successful feeding event
            const logRef = db.collection(`feeders/${feederId}/feedingLogs`).doc();
            await logRef.set({
                feederId: feederId,
                portionSize: portionSize,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                source: 'manual' // Indicates it came from "Feed Now"
            });
            
            return res.status(200).send({ message: "Feed command sent successfully." });

        } catch (error) {
            functions.logger.error(`Error processing manual feed for feeder ${feederId}:`, error);
            return res.status(500).send({ error: "Failed to send feed command." });
        }
    });
});
