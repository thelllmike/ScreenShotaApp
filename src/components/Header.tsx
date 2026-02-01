import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface HeaderProps {
    onSettingsPress?: () => void;
    onMenuPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettingsPress, onMenuPress }) => (
    <>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
        <View style={styles.container}>
            <View style={styles.leftSection}>
                <View style={styles.cameraIconContainer}>
                    <View style={styles.cameraIcon}>
                        <View style={styles.cameraLens} />
                    </View>
                </View>
                <Text style={styles.title}>Your Screenshots</Text>
            </View>
            <View style={styles.rightSection}>
                <TouchableOpacity style={styles.iconButton} onPress={onSettingsPress}>
                    <Text style={styles.iconText}>⚙</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
                    <Text style={styles.iconText}>⋮</Text>
                </TouchableOpacity>
            </View>
        </View>
    </>
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        elevation: 4,
    },
    leftSection: { flexDirection: 'row', alignItems: 'center' },
    rightSection: { flexDirection: 'row', alignItems: 'center' },
    cameraIconContainer: {
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: colors.accent,
        justifyContent: 'center', alignItems: 'center',
        marginRight: spacing.sm,
    },
    cameraIcon: {
        width: 18, height: 14, borderRadius: 3,
        borderWidth: 2, borderColor: colors.white,
        justifyContent: 'center', alignItems: 'center',
    },
    cameraLens: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
    title: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.semibold, color: colors.textOnPrimary },
    iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    iconText: { fontSize: 22, color: colors.textOnPrimary },
});

export default Header;
