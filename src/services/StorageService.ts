import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types';

const SETTINGS_KEY = '@screenshot_app_settings';
const DEFAULT_SETTINGS: AppSettings = { saveToGallery: true, timerDuration: 3, captureMethod: 'timer' };

export const StorageService = {
    getSettings: async (): Promise<AppSettings> => {
        try {
            const jsonValue = await AsyncStorage.getItem(SETTINGS_KEY);
            return jsonValue ? { ...DEFAULT_SETTINGS, ...JSON.parse(jsonValue) } : DEFAULT_SETTINGS;
        } catch (e) { return DEFAULT_SETTINGS; }
    },
    saveSettings: async (settings: Partial<AppSettings>): Promise<void> => {
        try {
            const current = await StorageService.getSettings();
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
        } catch (e) { throw e; }
    },
};

export default StorageService;
