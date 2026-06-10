import React from 'react';
import { ArrowLeft, Play, RotateCcw, Star, Flame } from 'lucide-react';
import type { Profile } from '../lib/types';
import { getAllProgressTopics, getMostCommonErrorDiagnoses } from '../lib/progress';
import { getTopicLabel } from '../lib/explanations';

interface Props {
    profile: Profile;
    onBack: () => void;
    onPracticeTopic: (topic: string) => void;
    onResetProgress: () => void;
    onPracticeDiary: () => void;
}

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('sk-SK');
};

const ProgressDashboard: React.FC<Props> = ({ profile, onBack, onPracticeTopic, onResetProgress, onPracticeDiary }) => {
    const topics = getAllProgressTopics(profile.progress);
    const hardProblems = profile.progress?.hardProblems ?? [];
    const commonErrors = getMostCommonErrorDiagnoses(profile.progress);

    return (
        <div className="flex flex-col gap-4" style={{ maxWidth: '760px', margin: '0 auto', paddingBottom: '2rem' }}>
            <div className="glass card flex justify-between items-center">
                <button type="button" className="btn" onClick={onBack}>
                    <ArrowLeft size={18} />
                    <span style={{ marginLeft: '0.5rem' }}>Späť</span>
                </button>
                <div className="text-center">
                    <div style={{ fontWeight: 800 }}>Štatistiky</div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>{profile.name}</div>
                </div>
                <div style={{ width: '72px' }} />
            </div>

            {hardProblems.length > 0 && (
                <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div className="flex justify-between items-center mb-2">
                        <div style={{ fontWeight: 800, color: '#fca5a5' }}>Môj matematický denník</div>
                        <span className="text-xs bg-red-500/20 px-2 py-1 rounded-full text-red-300">
                            {hardProblems.length} {hardProblems.length === 1 ? 'príklad' : hardProblems.length < 5 ? 'príklady' : 'príkladov'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-4">
                        Tu sú príklady, ktoré ti dali zabrať. Skús si ich opraviť a získať hviezdu!
                    </p>
                    <button type="button" className="btn btn-primary w-full" onClick={onPracticeDiary}>
                        <Play size={18} className="mr-2" />
                        Opraviť chyby z denníka
                    </button>
                </div>
            )}

            <div className="glass card">
                <div className="flex justify-between" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ color: '#94a3b8' }}>Dokončené tréningy</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{profile.progress?.sessionsCompleted ?? 0}</div>
                    </div>
                    <div>
                        <div style={{ color: '#94a3b8' }}>Posledný tréning</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                            {profile.progress?.lastSessionAt ? formatDate(profile.progress.lastSessionAt) : '-'}
                        </div>
                    </div>
                    <div>
                        <div style={{ color: '#94a3b8' }}>Hviezdy spolu</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Star size={26} fill="#facc15" color="#facc15" />
                            {profile.progress?.totalStars ?? 0}
                        </div>
                    </div>
                    <div>
                        <div style={{ color: '#94a3b8' }}>Najdlhšia séria</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Flame size={26} color="#fb923c" />
                            {profile.progress?.bestStreak ?? 0}
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    className="btn w-full"
                    style={{ marginTop: '1rem', background: 'rgba(239,68,68,0.16)', color: '#fca5a5' }}
                    onClick={onResetProgress}
                >
                    <RotateCcw size={18} />
                    <span style={{ marginLeft: '0.5rem' }}>Resetovať štatistiky</span>
                </button>
            </div>

            {commonErrors.length > 0 && (
                <div className="glass card">
                    <div style={{ fontWeight: 800, marginBottom: '0.75rem' }}>Najčastejšie typy chýb</div>
                    <div className="flex flex-col gap-2">
                        {commonErrors.map(error => (
                            <div
                                key={error.code}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto',
                                    gap: '1rem',
                                    alignItems: 'center',
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(255,255,255,0.06)',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 800 }}>{error.label}</div>
                                    <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                                        Naposledy {formatDate(error.lastSeenAt)}
                                    </div>
                                </div>
                                <div style={{ fontWeight: 800, color: '#facc15' }}>{error.attempts}x</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {topics.length === 0 ? (
                <div className="glass card text-center" style={{ color: '#cbd5e1' }}>
                    Štatistiky sa zobrazia po prvom dokončenom tréningu.
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {topics.map(topic => (
                        <div
                            key={topic.topic}
                            className="glass"
                            style={{
                                borderRadius: '0.75rem',
                                padding: '1rem',
                                display: 'grid',
                                gridTemplateColumns: '1fr auto',
                                gap: '1rem',
                                alignItems: 'center',
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{getTopicLabel(topic.topic)}</div>
                                <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                                    Správne {topic.correct} z {topic.attempts} ({topic.accuracy}%) · {formatDate(topic.lastPracticedAt)}
                                </div>
                                <div style={{ marginTop: '0.5rem', height: '0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${topic.accuracy}%`,
                                            background: topic.accuracy < 70 ? '#ef4444' : topic.accuracy < 90 ? '#eab308' : '#22c55e',
                                        }}
                                    />
                                </div>
                            </div>
                            <button type="button" className="btn btn-primary" onClick={() => onPracticeTopic(topic.topic)}>
                                <Play size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProgressDashboard;
