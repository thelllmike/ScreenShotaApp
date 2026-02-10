import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Alert, AppState, AppStateStatus } from 'react-native';
import BottomSheetLib from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Header, ScreenshotGrid, FloatingActionButton, BottomSheet, ImageViewer } from '../components';
import { ScreenshotService, StorageService, NativeScreenshot } from '../services';
import { Screenshot, CaptureMethod, AppSettings } from '../types';
import { colors } from '../theme';

interface HomeScreenProps { navigation?: any; }

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
    const [viewerVisible, setViewerVisible] = useState(false);
    const bottomSheetRef = useRef<BottomSheetLib>(null);
    const appState = useRef(AppState.currentState);

    useEffect(() => { loadScreenshots(); loadSettings(); checkServiceState(); }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        const startSub = NativeScreenshot.onCaptureStarted?.(() => setIsCapturing(true));
        const stopSub = NativeScreenshot.onCaptureStopped?.(() => {
            setIsCapturing(false);
            loadScreenshots();
        });
        const errorSub = NativeScreenshot.onCaptureError?.((err) => {
            setIsCapturing(false);
            Alert.alert('Error', err.error);
        });
        return () => { startSub?.remove(); stopSub?.remove(); errorSub?.remove(); };
    }, []);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
            loadScreenshots();
            checkServiceState();
        }
        appState.current = nextAppState;
    };

    const checkServiceState = async () => setIsCapturing(await NativeScreenshot.isServiceRunning());

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
            const duration = settings?.timerDuration || 3;
            Alert.alert('Timer Screenshot', `Screenshot will be taken in ${duration} seconds.\n\nMinimize the app before the timer ends.`, [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start Timer', onPress: async () => {
                        const running = await NativeScreenshot.isServiceRunning();
                        if (running) {
                            Alert.alert('Already Active', 'The screenshot button is already on your screen. Tap it to capture.');
                            return;
                        }
                        const hasOverlay = await NativeScreenshot.checkOverlayPermission();
                        if (!hasOverlay) { promptOverlayPermission(); return; }
                        const soundOn = settings?.soundEnabled ?? true;
                        await NativeScreenshot.startScreenCapture(soundOn);
                    }
                },
            ]);
        }
    };

    const startOverlayCapture = async () => {
        const running = await NativeScreenshot.isServiceRunning();
        if (running) {
            Alert.alert('Already Active', 'The floating screenshot button is already on your screen.\n\n• Tap it to capture\n• Drag it to the 🗑️ trash to dismiss');
            return;
        }

        const hasOverlay = await NativeScreenshot.checkOverlayPermission();
        if (!hasOverlay) { promptOverlayPermission(); return; }

        const soundOn = settings?.soundEnabled ?? true;
        const started = await NativeScreenshot.startScreenCapture(soundOn);
        if (!started) {
            Alert.alert('Error', 'Failed to start screen capture. Please try again.');
        }
    };

    const promptOverlayPermission = () => {
        Alert.alert(
            'Overlay Permission Required',
            'To show the floating screenshot button over other apps, you need to grant overlay permission.\n\nFind "ScreenshotApp" and enable "Allow display over other apps".',
            [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => NativeScreenshot.requestOverlayPermission() }]
        );
    };

    const handleStopCapture = () => { NativeScreenshot.stopScreenCapture(); setIsCapturing(false); };

    const handleScreenshotPress = (screenshot: Screenshot) => {
        setSelectedScreenshot(screenshot);
        setViewerVisible(true);
    };

    const handleCloseViewer = () => {
        setViewerVisible(false);
        setSelectedScreenshot(null);
    };

    const handleDeleteScreenshot = (screenshot: Screenshot) => {
        Alert.alert('Delete Screenshot', 'Are you sure you want to delete this screenshot?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    // Reload after delete
                    handleCloseViewer();
                    await loadScreenshots();
                }
            },
        ]);
    };

    const handleSettingsPress = () => navigation?.navigate('Settings');
    const handleMenuPress = () => {
        if (isCapturing) {
            Alert.alert('Capture Running', 'The floating button is active.', [
                { text: 'Keep Running' },
                { text: 'Stop & Remove', style: 'destructive', onPress: handleStopCapture },
            ]);
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
                <ImageViewer
                    visible={viewerVisible}
                    screenshot={selectedScreenshot}
                    onClose={handleCloseViewer}
                    onDelete={handleDeleteScreenshot}
                />
            </View>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1 },
});

export default HomeScreen;
