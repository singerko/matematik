import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { type TutorialScript } from '../lib/types';
import { isSpeechSupported, speakText, stopSpeech } from '../lib/speech';
import IndianDivisionTutorialView from './tutorials/IndianDivisionTutorialView';
import LongDivisionTutorialView from './tutorials/LongDivisionTutorialView';
import ArithmeticTutorialView from './tutorials/ArithmeticTutorialView';

interface Props {
    script: TutorialScript;
    onBack: () => void;
}

const flattenCues = (script: TutorialScript) =>
    script.steps.flatMap((step, stepIndex) =>
        step.cues.map((cue, cueIndex) => ({
            stepIndex,
            cueIndex,
            stepTitle: step.title,
            cue,
        }))
    );

const MethodHelp: React.FC<Props> = ({ script, onBack }) => {
    const flattened = useMemo(() => flattenCues(script), [script]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const cancelledRef = useRef(false);

    const currentEntry = flattened[currentIndex];
    const currentCue = currentEntry?.cue;

    useEffect(() => {
        cancelledRef.current = false;
        return () => {
            cancelledRef.current = true;
            stopSpeech();
        };
    }, []);

    const playFromIndex = async (startIndex: number) => {
        if (!flattened[startIndex]) return;
        cancelledRef.current = false;
        setIsPlaying(true);

        for (let index = startIndex; index < flattened.length; index++) {
            if (cancelledRef.current) break;

            setCurrentIndex(index);
            const cue = flattened[index].cue;

            if (cue.speechText) {
                await speakText(cue.speechText);
            }

            if (cue.delayMs && !cancelledRef.current) {
                await new Promise(resolve => window.setTimeout(resolve, cue.delayMs));
            }
        }

        setIsPlaying(false);
    };

    const handlePlay = async () => {
        if (isPlaying) {
            cancelledRef.current = true;
            stopSpeech();
            setIsPlaying(false);
            return;
        }

        const startIndex = currentIndex >= flattened.length - 1 ? 0 : currentIndex;
        setCurrentIndex(startIndex);
        await playFromIndex(startIndex);
    };

    const goToIndex = (nextIndex: number) => {
        cancelledRef.current = true;
        stopSpeech();
        setIsPlaying(false);
        setCurrentIndex(Math.max(0, Math.min(nextIndex, flattened.length - 1)));
    };

    if (!currentCue) return null;

    return (
        <div className="flex flex-col gap-4" style={{ maxWidth: '700px', margin: '0 auto', paddingBottom: '2rem' }}>
            <div className="glass card flex justify-between items-center">
                <button type="button" className="btn" onClick={onBack}>
                    <ArrowLeft size={18} />
                    <span style={{ marginLeft: '0.5rem' }}>Späť</span>
                </button>
                <div className="text-center">
                    <div style={{ fontWeight: 800 }}>{script.title}</div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>{currentEntry.stepTitle}</div>
                </div>
                <div style={{ width: '72px' }} />
            </div>

            <div className="glass card">
                {currentCue.state.kind === 'indian_division' ? (
                    <IndianDivisionTutorialView state={currentCue.state} />
                ) : currentCue.state.kind === 'long_division' ? (
                    <LongDivisionTutorialView state={currentCue.state} />
                ) : (
                    <ArithmeticTutorialView state={currentCue.state} />
                )}
            </div>

            <div className="glass card">
                <div style={{ color: '#cbd5e1', marginBottom: '0.75rem' }}>Vysvetlenie kroku</div>
                <div style={{ fontSize: '1.05rem', lineHeight: 1.5 }}>{currentCue.speechText}</div>
                {!isSpeechSupported() && (
                    <div style={{ marginTop: '0.75rem', color: '#fca5a5' }}>
                        Hlasový výstup na tomto zariadení alebo v tomto prostredí nie je dostupný. Textový výklad zostáva funkčný.
                    </div>
                )}
            </div>

            <div className="glass card flex items-center justify-between" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn" onClick={() => goToIndex(currentIndex - 1)} disabled={currentIndex === 0}>
                    <SkipBack size={18} />
                    <span style={{ marginLeft: '0.5rem' }}>Predchádzajúci</span>
                </button>
                <button type="button" className={`btn ${isPlaying ? '' : 'btn-primary'}`} onClick={handlePlay}>
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    <span style={{ marginLeft: '0.5rem' }}>{isPlaying ? 'Pauza' : 'Prehrať'}</span>
                </button>
                <button type="button" className="btn" onClick={() => goToIndex(currentIndex + 1)} disabled={currentIndex >= flattened.length - 1}>
                    <SkipForward size={18} />
                    <span style={{ marginLeft: '0.5rem' }}>Ďalší</span>
                </button>
                <button type="button" className="btn" onClick={() => playFromIndex(currentIndex)}>
                    <Volume2 size={18} />
                    <span style={{ marginLeft: '0.5rem' }}>Prehrať odtiaľto</span>
                </button>
            </div>

            <div className="text-center" style={{ color: '#cbd5e1' }}>
                Krok {currentIndex + 1} z {flattened.length}
            </div>
        </div>
    );
};

export default MethodHelp;
