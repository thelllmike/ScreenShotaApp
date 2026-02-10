import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { ScreenshotModule } = NativeModules;

const eventEmitter = Platform.OS === 'android' && ScreenshotModule
    ? new NativeEventEmitter(ScreenshotModule)
    : null;

export const NativeScreenshot = {
    /**
     * Check if overlay permission is granted
     */
    checkOverlayPermission: async (): Promise<boolean> => {
        if (Platform.OS !== 'android' || !ScreenshotModule) return false;
        return await ScreenshotModule.checkOverlayPermission();
    },

    /**
     * Open Android settings to grant overlay permission
     */
    requestOverlayPermission: (): void => {
        if (Platform.OS === 'android' && ScreenshotModule) {
            ScreenshotModule.requestOverlayPermission();
        }
    },

    /**
     * Start screen capture — shows MediaProjection dialog, then starts overlay service
     */
    startScreenCapture: async (): Promise<boolean> => {
        if (Platform.OS !== 'android' || !ScreenshotModule) return false;
        try {
            await ScreenshotModule.startScreenCapture();
            return true;
        } catch (error) {
            console.error('Failed to start screen capture:', error);
            return false;
        }
    },

    /**
     * Stop the overlay service and screen capture
     */
    stopScreenCapture: (): void => {
        if (Platform.OS === 'android' && ScreenshotModule) {
            ScreenshotModule.stopScreenCapture();
        }
    },

    /**
     * Listen for capture events
     */
    onCaptureStarted: (callback: () => void) => {
        return eventEmitter?.addListener('onCaptureStarted', callback);
    },

    onCaptureStopped: (callback: () => void) => {
        return eventEmitter?.addListener('onCaptureStopped', callback);
    },

    onCaptureError: (callback: (error: { error: string }) => void) => {
        return eventEmitter?.addListener('onCaptureError', callback);
    },
};

export default NativeScreenshot;
