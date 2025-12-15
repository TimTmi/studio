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

// --- Helper to create notifications ---
const createNotification = async (feederId, status, message) => {
    if (!feederId) return;
    const notification = {
        feederId,
        status,
        message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };
    try {
        await db.collection(`feeders/${feederId}/notifications`).add(notification);
        functions.logger.info(`Created '${status}' notification for feeder ${feederId}`);
    } catch (error) {
        functions.logger.error(`Failed to create notification for feeder ${feederId}:`, error);
    }
};


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
 * A Pub/Sub-triggered function to execute scheduled feedings based on weekly routines.
 */
exports.checkSchedules = functions.runWith({
    timeZone: "UTC"
}).pubsub.schedule('every 1 minutes').onRun(async (context) => {
    const now = new Date();
    const currentDayIndex = now.getUTCDay(); // 0 (Sun) to 6 (Sat)
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = days[currentDayIndex];
    
    // Format current time to HH:mm in UTC
    const currentHour = now.getUTCHours().toString().padStart(2, '0');
    const currentMinute = now.getUTCMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    
    functions.logger.info(`Running checkSchedules for ${currentDayName} at ${currentTime} UTC.`);

    const feedersSnapshot = await db.collection('feeders').get();
    if (feedersSnapshot.empty) {
        functions.logger.info("No feeders found.");
        return null;
    }

    const publisher = mqtt.connect(`mqtts://${MQTT_HOST}:${MQTT_PORT}`, {
        username: mqttConfig.username,
        password: mqttConfig.password,
    });

    const feedingPromises = [];

    feedersSnapshot.forEach(doc => {
        const feeder = doc.data();
        const feederId = doc.id;
        const schedule = feeder.weeklySchedule?.[currentDayName];

        if (schedule && schedule.includes(currentTime)) {
             functions.logger.info(`Feeding time match for feeder ${feederId}!`);
             const promise = new Promise((resolve, reject) => {
                 const commandTopic = `${MQTT_TOPIC_PREFIX}/${feederId}/commands`;
                 const commandPayload = JSON.stringify({ command: 'dispense' });

                 publisher.publish(commandTopic, commandPayload, async (err) => {
                     if (err) {
                         functions.logger.error(`Failed to publish to ${commandTopic} for feeder ${feederId}:`, err);
                         await createNotification(feederId, 'failed', 'Scheduled feeding command failed to send.');
                         reject(err);
                     } else {
                         functions.logger.info(`Published command to ${commandTopic} for feeder ${feederId}`);
                         // Log the feeding event and create a notification
                         await Promise.all([
                            createNotification(feederId, 'success', 'A scheduled feeding has been dispensed.'),
                            db.collection(`feeders/${feederId}/feedingLogs`).add({
                                feederId: feederId,
                                portionSize: 50, // Default portion size
                                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                                source: 'scheduled'
                            })
                         ]);
                         resolve();
                     }
                 });
             });
             feedingPromises.push(promise);
        }
    });

    if (feedingPromises.length > 0) {
        publisher.on('connect', () => {
             functions.logger.info('[MQTT Publisher] Connected to HiveMQ Broker for publishing.');
             Promise.allSettled(feedingPromises).finally(() => {
                // Add a small delay to ensure messages are sent before closing
                setTimeout(() => publisher.end(), 2000); 
            });
        });

        publisher.on('error', (err) => {
            functions.logger.error('[MQTT Publisher] Connection error:', err);
            publisher.end(); // End connection on error
        });
    } else {
        publisher.end(); // No feedings, just end the connection
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
        command: 'dispense'
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
                    createNotification(feederId, 'failed', 'Manual feed command failed to send.');
                    reject(new functions.https.HttpsError('internal', 'Failed to publish MQTT command.'));
                } else {
                    functions.logger.info(`Successfully published command to ${commandTopic}: ${commandPayload}`);
                    createNotification(feederId, 'success', 'Manual feed command sent successfully.');
                    resolve();
                }
            });
        });
        publisher.on('error', (err) => {
            functions.logger.error(`[MQTT Publisher] Connection error for ${feederId}:`, err);
            createNotification(feederId, 'failed', 'Could not connect to feeder for manual feed.');
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
