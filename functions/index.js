const functions = require("firebase-functions");
const admin = require("firebase-admin");
const mqtt = require("mqtt");
const cors = require('cors')({origin: true});

admin.initializeApp();
const db = admin.firestore();

// --- Configuration ---
const mqttConfig = functions.config().mqtt;

if (!mqttConfig || !mqttConfig.username || !mqttConfig.password) {
  console.error("MQTT username or password not set in Firebase Functions config. Run 'firebase functions:config:set mqtt.username=...' and 'firebase functions:config:set mqtt.password=...'");
}

const MQTT_HOST = "a63c6d5a32cf4a67b9d6a209a8e13525.s1.eu.hivemq.cloud";
const MQTT_PORT = "8883"; // Secure TLS port
const MQTT_TOPIC_PREFIX = "feeders";
const MQTT_WILDCARD_TOPIC = `${MQTT_TOPIC_PREFIX}/+/+`; // Subscribes to all feeders and all their sub-topics

// --- MQTT Client Setup (for listening) ---
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

  const topicParts = topic.split("/");
  if (topicParts.length < 3 || topicParts[0] !== MQTT_TOPIC_PREFIX) {
    functions.logger.warn(`Ignoring message from invalid topic: ${topic}`);
    return;
  }

  const feederId = topicParts[1];
  const metric = topicParts.slice(2).join('/'); 

  if (!feederId) {
      functions.logger.warn(`Could not extract feederId from topic: ${topic}`);
      return;
  }

  try {
    const feederRef = db.collection("feeders").doc(feederId);
    let updateData = {};

    switch (metric) {
      case "bowl/percent":
        updateData = { bowlLevel: parseFloat(payload) };
        break;
      case "storage/percent":
        updateData = { storageLevel: parseFloat(payload) };
        break;
      case "status":
        updateData = { status: payload };
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

exports.mqttListener = functions.https.onRequest((request, response) => {
  functions.logger.info("HTTP trigger for mqttListener received, keeping connection alive.");
  response.send("MQTT-to-Firestore listener is active.");
});


/**
 * A Pub/Sub-triggered function to check for scheduled feedings.
 */
exports.checkSchedules = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  functions.logger.info("Running scheduled feeding check...");

  const now = admin.firestore.Timestamp.now();
  const oneMinuteFromNow = admin.firestore.Timestamp.fromMillis(now.toMillis() + 60000);

  try {
    const schedulesRef = db.collectionGroup('feedingSchedules');
    const query = schedulesRef
      .where('scheduledTime', '>=', now)
      .where('scheduledTime', '<', oneMinuteFromNow)
      .where('sent', '==', false);
    const snapshot = await query.get();

    if (snapshot.empty) {
      functions.logger.info(`No feedings scheduled for the next minute.`);
      return;
    }
    
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
                        const logRef = db.collection(`feeders/${feederId}/feedingLogs`).doc();
                        logRef.set({
                            feederId: feederId,
                            portionSize: portionSize,
                            timestamp: admin.firestore.FieldValue.serverTimestamp()
                        }).catch(logErr => {
                            functions.logger.error(`Failed to create feeding log for ${feederId}:`, logErr);
                        });
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
 * An callable function to trigger a manual feeding event.
 */
exports.manualFeed = functions.https.onCall(async (data, context) => {
    // Check if the user is authenticated.
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { feederId } = data;
    const portionSize = 50; // Default portion size for manual feed

    if (!feederId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "feederId".');
    }
    
    // Optional: Verify the user owns this feeder
    const userId = context.auth.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data().feederId !== feederId) {
         throw new functions.https.HttpsError('permission-denied', 'You do not have permission to control this feeder.');
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
                publisher.end(); // Close connection after publishing
                if (err) {
                    functions.logger.error(`Failed to publish command to ${commandTopic}:`, err);
                    reject(new functions.https.HttpsError('internal', 'Failed to publish MQTT command.'));
                } else {
                    functions.logger.info(`Successfully published command to ${commandTopic}: ${commandPayload}`);
                    resolve();
                }
            });
        });
        publisher.on('error', (err) => {
            functions.logger.error(`[MQTT Publisher] Connection error for ${feederId}:`, err);
            publisher.end();
            reject(new functions.https.HttpsError('internal', 'MQTT connection failed.'));
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
            source: 'manual'
        });
        
        return { message: "Feed command sent successfully." };

    } catch (error) {
        // Errors from publishPromise are already HttpsError, so we can re-throw them.
        // If another error occurs (e.g., Firestore logging), wrap it.
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        functions.logger.error(`Error processing manual feed for feeder ${feederId}:`, error);
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while processing the feed command.');
    }
});
