import React from 'react';
import {
    Modal, View, Image, StyleSheet, TouchableOpacity, Text,
    StatusBar, Share, Platform, Dimensions, SafeAreaView,
} from 'react-native';
import { Screenshot } from '../types';
import { colors } from '../theme';

interface ImageViewerProps {
    visible: boolean;
    screenshot: Screenshot | null;
    onClose: () => void;
    onDelete?: (screenshot: Screenshot) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ImageViewer: React.FC<ImageViewerProps> = ({ visible, screenshot, onClose, onDelete }) => {
    if (!screenshot) return null;

    const handleShare = async () => {
        try {
            await Share.share({
                url: screenshot.uri,
                message: Platform.OS === 'android' ? screenshot.uri : undefined,
            });
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    const handleDelete = () => {
        if (onDelete && screenshot) {
            onDelete(screenshot);
            onClose();
        }
    };

    const formattedDate = screenshot.date
        ? new Date(screenshot.date).toLocaleString()
        : '';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <StatusBar backgroundColor="#000" barStyle="light-content" />
            <View style={styles.container}>
                {/* Header */}
                <SafeAreaView style={styles.header}>
                    <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
                        <Text style={styles.headerBtnText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerDate} numberOfLines={1}>{formattedDate}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
                            <Text style={styles.headerBtnText}>📤</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                {/* Image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: screenshot.uri }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                </View>

                {/* Bottom bar */}
                <SafeAreaView style={styles.bottomBar}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                        <Text style={styles.actionIcon}>📤</Text>
                        <Text style={styles.actionLabel}>Share</Text>
                    </TouchableOpacity>
                    {onDelete && (
                        <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
                            <Text style={styles.actionIcon}>🗑️</Text>
                            <Text style={[styles.actionLabel, { color: '#FF4444' }]}>Delete</Text>
                        </TouchableOpacity>
                    )}
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 10,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBtnText: {
        fontSize: 20,
        color: '#FFF',
    },
    headerInfo: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    headerDate: {
        color: '#CCC',
        fontSize: 13,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.75,
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    actionBtn: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 24,
    },
    actionIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    actionLabel: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default ImageViewer;
