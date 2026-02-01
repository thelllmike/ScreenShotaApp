import React, { useRef } from 'react';
import { TouchableOpacity, StyleSheet, View, Animated } from 'react-native';
import { colors, borderRadius } from '../theme';

interface FloatingActionButtonProps {
    onPress: () => void;
    disabled?: boolean;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onPress, disabled = false }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                style={[styles.button, disabled && styles.buttonDisabled]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                activeOpacity={0.8}
            >
                <View style={styles.cameraBody}>
                    <View style={styles.cameraLens} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: { position: 'absolute', bottom: 24, right: 24, elevation: 8 },
    button: { width: 60, height: 60, borderRadius: borderRadius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    buttonDisabled: { backgroundColor: colors.textSecondary },
    cameraBody: { width: 26, height: 20, borderRadius: 4, borderWidth: 2.5, borderColor: colors.white, justifyContent: 'center', alignItems: 'center' },
    cameraLens: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white },
});

export default FloatingActionButton;
