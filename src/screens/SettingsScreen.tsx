import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
import { StorageService } from '../services';
import { AppSettings } from '../types';

interface SettingsScreenProps { navigation?: any; }

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
    const [settings, setSettings] = useState<AppSettings>({ saveToGallery: true, timerDuration: 3, captureMethod: 'timer' });

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => setSettings(await StorageService.getSettings());

    const updateSetting = async (key: keyof AppSettings, value: any) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
        await StorageService.saveSettings({ [key]: value });
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.headerSpacer} />
            </View>
            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SAVE LOCATION</Text>
                    <View style={styles.card}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingTextContainer}>
                                <Text style={styles.settingTitle}>Save to Gallery</Text>
                                <Text style={styles.settingSubtitle}>{settings.saveToGallery ? 'Screenshots visible in your gallery' : 'Screenshots saved privately in app'}</Text>
                            </View>
                            <Switch value={settings.saveToGallery} onValueChange={(value) => updateSetting('saveToGallery', value)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.white} />
                        </View>
                    </View>
                </View>
                <View style={styles.infoCard}>
                    <Text style={styles.infoIcon}>💡</Text>
                    <View style={styles.infoTextContainer}>
                        <Text style={styles.infoTitle}>Privacy Tip</Text>
                        <Text style={styles.infoText}>When "Save to Gallery" is off, screenshots are stored privately and only visible within this app.</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    backIcon: { fontSize: 24, color: colors.textOnPrimary },
    headerTitle: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.semibold, color: colors.textOnPrimary },
    headerSpacer: { width: 40 },
    content: { flex: 1, padding: spacing.lg },
    section: { marginBottom: spacing.xl },
    sectionTitle: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.semibold, color: colors.textSecondary, marginBottom: spacing.sm, marginLeft: spacing.xs },
    card: { backgroundColor: colors.cardBackground, borderRadius: borderRadius.lg, elevation: 1 },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
    settingTextContainer: { flex: 1, marginRight: spacing.md },
    settingTitle: { fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.medium, color: colors.textPrimary, marginBottom: 2 },
    settingSubtitle: { fontSize: typography.fontSizes.sm, color: colors.textSecondary },
    infoCard: { backgroundColor: colors.primary + '10', borderRadius: borderRadius.lg, padding: spacing.lg, flexDirection: 'row', marginBottom: spacing.xl },
    infoIcon: { fontSize: 24, marginRight: spacing.md },
    infoTextContainer: { flex: 1 },
    infoTitle: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.semibold, color: colors.primary, marginBottom: spacing.xs },
    infoText: { fontSize: typography.fontSizes.sm, color: colors.textSecondary, lineHeight: 18 },
});

export default SettingsScreen;
