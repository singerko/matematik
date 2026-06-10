import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

let isSpeaking = false;
const queue: { text: string; lang: string; resolve: () => void }[] = [];

export const isSpeechSupported = () =>
    Capacitor.isNativePlatform() || (typeof window !== 'undefined' && 'speechSynthesis' in window);

const speakWithWebSpeech = (text: string, lang: string) => new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
});

const processQueue = async () => {
    if (isSpeaking || queue.length === 0) return;

    const current = queue[0];
    if (!current) return;

    isSpeaking = true;
    try {
        if (!Capacitor.isNativePlatform()) {
            await speakWithWebSpeech(current.text, current.lang);
            current.resolve();
            return;
        }

        await TextToSpeech.speak({
            text: current.text,
            lang: current.lang,
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
            category: 'ambient',
        });
        current.resolve();
    } catch (e) {
        console.warn('Speech output failed', e);
        current.resolve();
    } finally {
        isSpeaking = false;
        queue.shift();
        processQueue();
    }
};

export const speakText = (text: string, lang: string = 'sk-SK'): Promise<void> => {
    if (!text.trim()) return Promise.resolve();
    if (!isSpeechSupported()) return Promise.resolve();

    return new Promise((resolve) => {
        queue.push({ text, lang, resolve });
        processQueue();
    });
};

export const stopSpeech = async () => {
    queue.length = 0;
    try {
        await TextToSpeech.stop();
    } catch {
        // Ignore native stop errors; fallback cancellation is enough on web.
    }

    if (!Capacitor.isNativePlatform() && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    isSpeaking = false;
};
