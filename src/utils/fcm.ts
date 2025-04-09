import admin from 'firebase-admin';

const serviceAccount = require('./path/to/serviceAccountKey.json'); // From Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export const sendPushNotification = async (token: string, title: string, body: string, data?: any) => {
  const message = {
    token,
    notification: { title, body },
    data,
  };
  try {
    await admin.messaging().send(message);
    console.log('Push notification sent to:', token);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};