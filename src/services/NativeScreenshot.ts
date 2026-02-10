import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { ScreenshotModule } = NativeModules;

const eventEmitter = Platform.OS === 'android' && ScreenshotModule
    ? new NativeEventEmitter(ScreenshotModule)
    : null;

export const NativeScreenshot = {
    checkOverlayPermission: async (): Promise<boolean> => {
        if (Platform.OS !== 'android' || !ScreenshotModule) return false;
        return await ScreenshotModule.checkOverlayPermission();
    },

    isServiceRunning: async (): Promise<boolean> => {
        if (Platform.OS !== 'android' || !ScreenshotModule) return false;
        return await ScreenshotModule.isServiceRunning();
    },

    requestOverlayPermission: (): void => {
        if (Platform.OS === 'android' && ScreenshotModule) {
            ScreenshotModule.requestOverlayPermission();
        }
    },

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

    stopScreenCapture: (): void => {
        if (Platform.OS === 'android' && ScreenshotModule) {
            ScreenshotModule.stopScreenCapture();
        }
    },

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
