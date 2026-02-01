import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import BottomSheetLib from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Header, ScreenshotGrid, FloatingActionButton, BottomSheet } from '../components';
import { ScreenshotService, StorageService } from '../services';
import { Screenshot, CaptureMethod, AppSettings } from '../types';
import { colors } from '../theme';

interface HomeScreenProps { navigation?: any; }

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const bottomSheetRef = useRef<BottomSheetLib>(null);

    useEffect(() => { loadScreenshots(); loadSettings(); }, []);

    const loadSettings = async () => setSettings(await StorageService.getSettings());
    const loadScreenshots = async () => {
        try { setScreenshots(await ScreenshotService.getAllScreenshots()); } catch { }
    };

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadScreenshots();
        setRefreshing(false);
    }, []);

    const handleFABPress = () => bottomSheetRef.current?.expand();

    const handleSelectMethod = (method: CaptureMethod) => {
        bottomSheetRef.current?.close();
        if (method === 'timer') {
            const duration = settings?.timerDuration || 3;
            Alert.alert('Timer Screenshot', `Screenshot will be taken in ${duration} seconds.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Start', onPress: () => Alert.alert('Demo', `${duration}-second countdown would start.`) },
            ]);
        } else {
            Alert.alert('On-Screen Button', 'A floating button will appear on your screen.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Enable', onPress: () => Alert.alert('Coming Soon', 'Requires overlay permissions.') },
            ]);
        }
    };

    const handleScreenshotPress = (screenshot: Screenshot) => Alert.alert('Screenshot', `Size: ${screenshot.size} bytes`);
    const handleSettingsPress = () => navigation?.navigate('Settings');
    const handleMenuPress = () => Alert.alert('Menu', 'Menu options will be available here.');

    return (
        <GestureHandlerRootView style={styles.container}>
            <View style={styles.container}>
                <Header onSettingsPress={handleSettingsPress} onMenuPress={handleMenuPress} />
                <View style={styles.content}>
                    <ScreenshotGrid screenshots={screenshots} onScreenshotPress={handleScreenshotPress} onRefresh={handleRefresh} refreshing={refreshing} />
                    <FloatingActionButton onPress={handleFABPress} />
                </View>
                <BottomSheet ref={bottomSheetRef} onSelectMethod={handleSelectMethod} />
            </View>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1 },
});

export default HomeScreen;
