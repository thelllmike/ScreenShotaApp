import { Platform, PermissionsAndroid } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import { Screenshot } from '../types';
import { generateId } from '../utils';
import StorageService from './StorageService';

const APP_SCREENSHOTS_DIR = `${RNFS.DocumentDirectoryPath}/screenshots`;

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

    loadFromGallery: async (first: number = 100): Promise<Screenshot[]> => {
        try {
            const hasPermission = await ScreenshotService.requestPermissions();
            if (!hasPermission) return [];
            const photos = await CameraRoll.getPhotos({ first, assetType: 'Photos', include: ['fileSize', 'filename'] });
            return photos.edges.map((edge) => ({
                id: generateId(),
                uri: edge.node.image.uri,
                date: new Date(edge.node.timestamp * 1000),
                size: edge.node.image.fileSize || 0,
            }));
        } catch { return []; }
    },

    saveScreenshot: async (sourceUri: string, saveToGallery?: boolean): Promise<string | null> => {
        try {
            let shouldSaveToGallery = saveToGallery;
            if (shouldSaveToGallery === undefined) {
                const settings = await StorageService.getSettings();
                shouldSaveToGallery = settings.saveToGallery;
            }
            if (shouldSaveToGallery) {
                return await CameraRoll.save(sourceUri, { type: 'photo' });
            } else {
                await ScreenshotService.init();
                const filename = `screenshot_${Date.now()}.png`;
                const destPath = `${APP_SCREENSHOTS_DIR}/${filename}`;
                await RNFS.copyFile(sourceUri, destPath);
                return `file://${destPath}`;
            }
        } catch { return null; }
    },

    getAllScreenshots: async (): Promise<Screenshot[]> => {
        return await ScreenshotService.loadFromGallery();
    },
};

export default ScreenshotService;
