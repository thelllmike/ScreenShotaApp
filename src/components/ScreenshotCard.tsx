import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
import { Screenshot } from '../types';
import { formatFileSize, formatDate } from '../utils';

interface ScreenshotCardProps {
    screenshot: Screenshot;
    onPress?: (screenshot: Screenshot) => void;
    onLongPress?: (screenshot: Screenshot) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - spacing.lg * 2 - spacing.sm * 2) / 3;

const ScreenshotCard: React.FC<ScreenshotCardProps> = ({ screenshot, onPress, onLongPress }) => (
    <TouchableOpacity
        style={styles.container}
        onPress={() => onPress?.(screenshot)}
        onLongPress={() => onLongPress?.(screenshot)}
        activeOpacity={0.8}
    >
        <View style={styles.imageContainer}>
            <Image source={{ uri: screenshot.uri }} style={styles.image} resizeMode="cover" />
        </View>
        <View style={styles.infoContainer}>
            <Text style={styles.dateText}>{formatDate(screenshot.date)}</Text>
            <Text style={styles.sizeText}>{formatFileSize(screenshot.size)}</Text>
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        width: cardWidth,
        backgroundColor: colors.cardBackground,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginBottom: spacing.md,
        elevation: 2,
    },
    imageContainer: { width: '100%', aspectRatio: 9 / 16, backgroundColor: colors.background },
    image: { width: '100%', height: '100%' },
    infoContainer: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, alignItems: 'center' },
    dateText: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.medium, color: colors.accent, marginBottom: 2 },
    sizeText: { fontSize: typography.fontSizes.xs, color: colors.textSecondary },
});

export default ScreenshotCard;
