import Constants, { AppOwnership } from 'expo-constants';

let isInitialized = false;
let notificationsModulePromise: Promise<typeof import('expo-notifications') | null> | null = null;

type NotificationRequest = import('expo-notifications').NotificationRequest;

const isExpoGo = (): boolean =>
  Constants.appOwnership === AppOwnership.Expo || Constants.expoGoConfig != null;

const getNotificationsModule = async (): Promise<typeof import('expo-notifications') | null> => {
  if (isExpoGo()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications').catch((error) => {
      console.warn('[Notifications] Failed to load expo-notifications', error);
      return null;
    });
  }

  return notificationsModulePromise;
};

export const taskNotificationService = {
  initialize: async (): Promise<void> => {
    if (isInitialized) {
      return;
    }

    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return;
    }

    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      await Notifications.setNotificationChannelAsync('tasks', {
        name: 'Tasks',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#c8f27a',
      });
    } catch (error) {
      console.warn('[Notifications] Initialization skipped', error);
      return;
    }

    isInitialized = true;
  },

  ensurePermission: async (requestIfNeeded = true): Promise<{
    granted: boolean;
    canAskAgain: boolean;
    status: string;
  }> => {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return {
        granted: false,
        canAskAgain: false,
        status: isExpoGo() ? 'unsupported_in_expo_go' : 'unavailable',
      };
    }

    try {
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted && requestIfNeeded) {
        permission = await Notifications.requestPermissionsAsync();
      }

      return {
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        status: permission.status,
      };
    } catch (error) {
      console.warn('[Notifications] Permission check failed', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'unavailable',
      };
    }
  },

  scheduleTaskReminder: async (params: {
    title: string;
    body: string;
    dueAt: string;
  }): Promise<string> => {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      throw new Error(
        isExpoGo()
          ? 'Task reminders require an Android development build. Expo Go is not supported for notifications.'
          : 'Notifications are unavailable on this build.'
      );
    }

    await taskNotificationService.initialize();
    const dueAt = new Date(params.dueAt);
    return Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dueAt,
      },
    });
  },

  cancelTaskReminder: async (scheduledNotificationId: string | null | undefined): Promise<void> => {
    if (!scheduledNotificationId) {
      return;
    }

    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId);
  },

  listScheduledNotifications: async (): Promise<NotificationRequest[]> => {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return [];
    }

    return Notifications.getAllScheduledNotificationsAsync();
  },
};
