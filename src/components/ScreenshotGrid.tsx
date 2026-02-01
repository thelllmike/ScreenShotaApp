import React from 'react';
import { FlatList, StyleSheet, View, Text, RefreshControl } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Screenshot } from '../types';
import ScreenshotCard from './ScreenshotCard';

interface ScreenshotGridProps {
    screenshots: Screenshot[];
    onScreenshotPress?: (screenshot: Screenshot) => void;
    onScreenshotLongPress?: (screenshot: Screenshot) => void;
    onRefresh?: () => void;
    refreshing?: boolean;
}

const ScreenshotGrid: React.FC<ScreenshotGridProps> = ({
    screenshots, onScreenshotPress, onScreenshotLongPress, onRefresh, refreshing = false,
}) => {
    const EmptyComponent = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyTitle}>No Screenshots Yet</Text>
            <Text style={styles.emptySubtitle}>Tap the camera button to capture your first screenshot</Text>
        </View>
    );

    return (
        <FlatList
            data={screenshots}
            renderItem={({ item }) => (
                <ScreenshotCard screenshot={item} onPress={onScreenshotPress} onLongPress={onScreenshotLongPress} />
            )}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.container}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} /> : undefined}
            ListEmptyComponent={<EmptyComponent />}
        />
    );
};

const styles = StyleSheet.create({
    container: { padding: spacing.lg, paddingBottom: 100, flexGrow: 1 },
    row: { justifyContent: 'space-between' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl, paddingTop: 100 },
    emptyIcon: { fontSize: 64, marginBottom: spacing.lg },
    emptyTitle: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.semibold, color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
    emptySubtitle: { fontSize: typography.fontSizes.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});

export default ScreenshotGrid;
