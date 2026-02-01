export interface Screenshot {
    id: string;
    uri: string;
    date: Date;
    size: number;
    width?: number;
    height?: number;
}

export type CaptureMethod = 'timer' | 'onscreen';

export interface AppSettings {
    saveToGallery: boolean;
    timerDuration: number;
    captureMethod: CaptureMethod;
}
