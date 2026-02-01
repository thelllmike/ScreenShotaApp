import React, { useMemo, forwardRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheetLib, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { colors, spacing, borderRadius, typography } from '../theme';
import { CaptureMethod } from '../types';

interface BottomSheetProps {
    onSelectMethod: (method: CaptureMethod) => void;
}

const BottomSheet = forwardRef<BottomSheetLib, BottomSheetProps>(({ onSelectMethod }, ref) => {
    const snapPoints = useMemo(() => ['25%'], []);

    const renderBackdrop = useCallback(
        (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />,
        [],
    );

    return (
        <BottomSheetLib ref={ref} index={-1} snapPoints={snapPoints} enablePanDownToClose backdropComponent={renderBackdrop} backgroundStyle={styles.background} handleIndicatorStyle={styles.handleIndicator}>
            <BottomSheetView style={styles.contentContainer}>
                <Text style={styles.title}>Choose method</Text>
                <TouchableOpacity style={styles.optionButton} onPress={() => onSelectMethod('timer')}>
                    <Text style={styles.optionIcon}>⏱</Text>
                    <Text style={styles.optionText}>Timer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionButton} onPress={() => onSelectMethod('onscreen')}>
                    <Text style={styles.optionIcon}>📱</Text>
                    <Text style={styles.optionText}>On-screen button</Text>
                </TouchableOpacity>
            </BottomSheetView>
        </BottomSheetLib>
    );
});

const styles = StyleSheet.create({
    background: { backgroundColor: colors.cardBackground, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl },
    handleIndicator: { backgroundColor: colors.textSecondary, width: 40 },
    contentContainer: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
    title: { fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.semibold, color: colors.primary, marginBottom: spacing.lg },
    optionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: borderRadius.md },
    optionIcon: { fontSize: 22, marginRight: spacing.md },
    optionText: { fontSize: typography.fontSizes.lg, color: colors.textPrimary },
});

export default BottomSheet;
