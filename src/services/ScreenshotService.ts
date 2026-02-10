import { Platform, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';
import { Screenshot } from '../types';
import { generateId } from '../utils';

// App's own screenshot directory — only shows screenshots taken by this app
const APP_SCREENSHOTS_DIR = `${RNFS.ExternalStorageDirectoryPath}/Pictures/Screenshots`;

export const ScreenshotService = {
    init: async (): Promise<void> => {
        const exists = await RNFS.exists(APP_SCREENSHOTS_DIR);
        if (!exists) await RNFS.mkdir(APP_SCREENSHOTS_DIR);
    },

    requestPermissions: async (): Promise<boolean> => {
        if (Platform.OS !== 'android') return true;
        try {
            if (Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } else {
                const read = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
                const write = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
                return read === PermissionsAndroid.RESULTS.GRANTED && write === PermissionsAndroid.RESULTS.GRANTED;
            }
        } catch { return false; }
    },

    /**
     * Load only screenshots captured by this app from Pictures/Screenshots.
     * Filters by our naming convention: Screenshot_<timestamp>.png
     */
    getAllScreenshots: async (): Promise<Screenshot[]> => {
        try {
            const hasPermission = await ScreenshotService.requestPermissions();
            if (!hasPermission) return [];

            const exists = await RNFS.exists(APP_SCREENSHOTS_DIR);
            if (!exists) return [];

            const files = await RNFS.readDir(APP_SCREENSHOTS_DIR);

            // Filter to only our app's screenshots (Screenshot_<timestamp>.png)
            const appScreenshots = files
                .filter(f => f.isFile() && f.name.startsWith('Screenshot_') && f.name.endsWith('.png'))
                .sort((a, b) => {
                    // Sort newest first by modification time
                    const timeA = a.mtime ? new Date(a.mtime).getTime() : 0;
                    const timeB = b.mtime ? new Date(b.mtime).getTime() : 0;
                    return timeB - timeA;
                })
                .map(f => ({
                    id: generateId(),
                    uri: `file://${f.path}`,
                    date: f.mtime ? new Date(f.mtime) : new Date(),
                    size: parseInt(String(f.size), 10) || 0,
                }));

            return appScreenshots;
        } catch (e) {
            console.error('Failed to load screenshots:', e);
            return [];
        }
    },

    saveScreenshot: async (sourceUri: string): Promise<string | null> => {
        try {
            await ScreenshotService.init();
            const filename = `Screenshot_${Date.now()}.png`;
            const destPath = `${APP_SCREENSHOTS_DIR}/${filename}`;
            await RNFS.copyFile(sourceUri, destPath);
            return `file://${destPath}`;
        } catch { return null; }
    },

    deleteScreenshot: async (uri: string): Promise<boolean> => {
        try {
            const path = uri.replace('file://', '');
            const exists = await RNFS.exists(path);
            if (exists) {
                await RNFS.unlink(path);
                return true;
            }
            return false;
        } catch { return false; }
    },
};

export default ScreenshotService;
