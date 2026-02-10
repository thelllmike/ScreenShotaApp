import React, { useState } from 'react';
import {
    Modal, View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { colors } from '../theme';

interface TimerPickerProps {
    visible: boolean;
    onSelect: (seconds: number) => void;
    onClose: () => void;
}

const MIN_SEC = 2;
const MAX_SEC = 20;

const TimerPicker: React.FC<TimerPickerProps> = ({ visible, onSelect, onClose }) => {
    const [seconds, setSeconds] = useState(5);

    const increment = () => setSeconds((s) => Math.min(s + 1, MAX_SEC));
    const decrement = () => setSeconds((s) => Math.max(s - 1, MIN_SEC));

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Timer icon */}
                    <Text style={styles.timerEmoji}>⏱️</Text>
                    <Text style={styles.title}>Set Timer</Text>

                    {/* Big timer display */}
                    <View style={styles.timerDisplay}>
                        <TouchableOpacity
                            style={styles.arrowBtn}
                            onPress={decrement}
                            disabled={seconds <= MIN_SEC}
                        >
                            <Text style={[styles.arrowText, seconds <= MIN_SEC && styles.arrowDisabled]}>−</Text>
                        </TouchableOpacity>

                        <View style={styles.timeBox}>
                            <Text style={styles.timeNumber}>{seconds}</Text>
                            <Text style={styles.timeUnit}>seconds</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.arrowBtn}
                            onPress={increment}
                            disabled={seconds >= MAX_SEC}
                        >
                            <Text style={[styles.arrowText, seconds >= MAX_SEC && styles.arrowDisabled]}>+</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Quick presets */}
                    <View style={styles.presets}>
                        {[3, 5, 10, 15, 20].map((s) => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.presetBtn, seconds === s && styles.presetBtnActive]}
                                onPress={() => setSeconds(s)}
                            >
                                <Text style={[styles.presetText, seconds === s && styles.presetTextActive]}>{s}s</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Info */}
                    <Text style={styles.hint}>Minimize the app after starting the timer</Text>

                    {/* Buttons */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.startBtn} onPress={() => onSelect(seconds)}>
                            <Text style={styles.startText}>▶  Start {seconds}s</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    container: {
        backgroundColor: '#FFF',
        borderRadius: 28,
        width: '100%',
        paddingVertical: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
        elevation: 20,
    },
    timerEmoji: {
        fontSize: 48,
        marginBottom: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#222',
        marginBottom: 24,
    },
    timerDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    arrowBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowText: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.primary,
        lineHeight: 36,
    },
    arrowDisabled: {
        color: '#CCC',
    },
    timeBox: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.primary + '12',
        borderWidth: 3,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 16,
    },
    timeNumber: {
        fontSize: 48,
        fontWeight: '800',
        color: colors.primary,
        lineHeight: 52,
    },
    timeUnit: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
        opacity: 0.7,
        marginTop: -2,
    },
    presets: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    presetBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
    },
    presetBtnActive: {
        backgroundColor: colors.primary,
    },
    presetText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    presetTextActive: {
        color: '#FFF',
    },
    hint: {
        fontSize: 12,
        color: '#999',
        marginBottom: 20,
        textAlign: 'center',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#888',
    },
    startBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
    },
    startText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
});

export default TimerPicker;
