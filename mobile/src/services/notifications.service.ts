// mobile/src/services/notifications.service.ts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { client } from '../api/client';
import { router } from 'expo-router';

// Configure notification behavior for when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Service to register and configure push notification listeners.
 */
export const notificationsService = {
  /**
   * Request push notification permissions and resolve token.
   * Registers the token on the backend for the current user.
   */
  async registerForPushNotifications(userId: string): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#534AB7',
        });
      }

      // Check current permission state
      const { status: existingStatus } = await Notifications.getPermissionsAsync() as any;
      let finalStatus = existingStatus;

      // Ask for permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync() as any;
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token: permission not granted.');
        return null;
      }

      // Retrieve Expo push notification token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID, // resolved from env config
      });
      const token = tokenData.data;

      // Register the retrieved token on the backend.
      // The backend expects to save the token in Redis under fcm:token:userId
      // We will perform a PUT to /users/:id to register the token or call a dedicated route
      await client.put(`/users/${userId}`, {
        photo: undefined, // ensure we don't clear avatar
        // Send push token to register on profile (which backend updates and stores in Redis)
        fcmToken: token,
      });

      console.log('✅ Push notification token registered successfully:', token);
      return token;
    } catch (error) {
      console.error('Failed to register device for push notifications:', error);
      return null;
    }
  },

  /**
   * Sets up notification event listeners for foreground reception and background clicks.
   */
  setupNotificationHandlers(): () => void {
    // 1. Listen for clicks when user interacts with a received notification (app launched or in background)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        const data = response.notification.request.content.data;
        
        if (!data) return;

        // Redirect user depending on payload fields
        const { type, id, userId } = data as { type?: string; id?: string; userId?: string };

        switch (type) {
          case 'RESERVATION':
            if (id) {
              router.push({ pathname: '/reservations', params: { id } });
            } else {
              router.push('/reservations');
            }
            break;
          case 'MESSAGE':
            if (userId) {
              router.push({ pathname: '/messages', params: { userId } });
            } else {
              router.push('/messages');
            }
            break;
          case 'MODERATION':
            router.push('/annonces');
            break;
          default:
            router.push('/');
        }
      }
    );

    // 2. Listen for messages arriving while app is running in foreground
    const notificationSubscription = Notifications.addNotificationReceivedListener(
      (notification: Notifications.Notification) => {
        // We can dispatch custom callbacks or in-app snackbars if desired
        console.log('In-app notification received in foreground:', notification.request.content.title);
      }
    );

    // Return cleanup function to unsubscribe on component unmount
    return () => {
      responseSubscription.remove();
      notificationSubscription.remove();
    };
  },
};
