import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Alert, AppState, AppStateStatus } from 'react-native';
import BottomSheetLib from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Header, ScreenshotGrid, FloatingActionButton, BottomSheet } from '../components';
import { ScreenshotService, StorageService, NativeScreenshot } from '../services';
import { Screenshot, CaptureMethod, AppSettings } from '../types';
import { colors } from '../theme';

interface HomeScreenProps { navigation?: any; }

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const bottomSheetRef = useRef<BottomSheetLib>(null);
    const appState = useRef(AppState.currentState);

    useEffect(() => { loadScreenshots(); loadSettings(); }, []);

    // Listen for app coming back to foreground (after granting overlay permission)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, []);

    // Listen for capture events
    useEffect(() => {
        const startSub = NativeScreenshot.onCaptureStarted?.(() => {
            setIsCapturing(true);
        });
        const stopSub = NativeScreenshot.onCaptureStopped?.(() => {
            setIsCapturing(false);
            loadScreenshots();
        });
        const errorSub = NativeScreenshot.onCaptureError?.((err) => {
            setIsCapturing(false);
            Alert.alert('Error', err.error);
        });

        return () => {
            startSub?.remove();
            stopSub?.remove();
            errorSub?.remove();
        };
    }, []);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            // App came back — refresh screenshots and check permissions
            loadScreenshots();
        }
        appState.current = nextAppState;
    };

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

    const handleSelectMethod = async (method: CaptureMethod) => {
        bottomSheetRef.current?.close();

        if (method === 'onscreen') {
            await startOverlayCapture();
        } else {
            // Timer method
            const duration = settings?.timerDuration || 3;
            Alert.alert('Timer Screenshot', `Screenshot will be taken in ${duration} seconds.`, [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start', onPress: async () => {
                        // Start capture, then after delay stop it
                        const hasOverlay = await NativeScreenshot.checkOverlayPermission();
                        if (!hasOverlay) {
                            promptOverlayPermission();
                            return;
                        }
                        await NativeScreenshot.startScreenCapture();
                    }
                },
            ]);
        }
    };

    const startOverlayCapture = async () => {
        // Check overlay permission
        const hasOverlay = await NativeScreenshot.checkOverlayPermission();

        if (!hasOverlay) {
            promptOverlayPermission();
            return;
        }

        // Start screen capture (shows MediaProjection dialog, then starts overlay)
        const started = await NativeScreenshot.startScreenCapture();
        if (!started) {
            Alert.alert('Error', 'Failed to start screen capture. Please try again.');
        }
    };

    const promptOverlayPermission = () => {
        Alert.alert(
            'Overlay Permission Required',
            'To show the floating screenshot button over other apps, you need to grant overlay permission.\n\nYou will be taken to Android settings. Find "ScreenshotApp" and enable "Allow display over other apps".',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Open Settings',
                    onPress: () => NativeScreenshot.requestOverlayPermission(),
                },
            ]
        );
    };

    const handleStopCapture = () => {
        NativeScreenshot.stopScreenCapture();
        setIsCapturing(false);
    };

    const handleScreenshotPress = (screenshot: Screenshot) => Alert.alert('Screenshot', `Size: ${screenshot.size} bytes`);
    const handleSettingsPress = () => navigation?.navigate('Settings');
    const handleMenuPress = () => {
        if (isCapturing) {
            Alert.alert('Capture Running', 'The floating button is active.', [
                { text: 'Keep Running' },
                { text: 'Stop Capture', style: 'destructive', onPress: handleStopCapture },
            ]);
        } else {
            Alert.alert('Menu', 'Menu options will be available here.');
        }
    };

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
