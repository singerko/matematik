import React from 'react';
import type { TutorialArithmeticState } from '../../lib/types';

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#eab308', '#a855f7'];

const Dot: React.FC<{ color: string; muted?: boolean }> = ({ color, muted }) => (
    <span
        style={{
            width: '1.35rem',
            height: '1.35rem',
            borderRadius: '999px',
            background: color,
            opacity: muted ? 0.28 : 1,
            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.28)',
            display: 'inline-block',
        }}
    />
);

const FractionBar: React.FC<{
    groups: number[][];
    activeGroupIndex?: number;
    label?: string;
    colorOffset?: number;
}> = ({ groups, activeGroupIndex, label, colorOffset = 0 }) => (
    <div style={{ marginBottom: '0.75rem' }}>
        {label && (
            <div style={{ marginBottom: '0.35rem', color: '#e2e8f0', fontWeight: 800 }}>
                {label}
            </div>
        )}
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${groups.length}, 1fr)`,
            width: '100%',
            maxWidth: '420px',
            margin: '0 auto',
            border: '2px solid rgba(255,255,255,0.35)',
            borderRadius: '0.75rem',
            overflow: 'hidden',
        }}>
            {groups.map((group, groupIndex) => {
                const active = activeGroupIndex === undefined || groupIndex <= activeGroupIndex;
                return (
                    <div
                        key={groupIndex}
                        style={{
                            minHeight: '4.4rem',
                            background: active ? COLORS[(groupIndex + colorOffset) % COLORS.length] : 'rgba(255,255,255,0.08)',
                            borderRight: groupIndex + 1 < groups.length ? '1px solid rgba(255,255,255,0.35)' : undefined,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: active ? 'white' : '#94a3b8',
                        }}
                    >
                        {group.length}
                    </div>
                );
            })}
        </div>
    </div>
);

const ArithmeticTutorialView: React.FC<{ state: TutorialArithmeticState }> = ({ state }) => (
    <div className="text-center" style={{ width: '100%' }}>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.15 }}>
            {state.expression}
        </div>

        {state.visualKind === 'fraction_parts' || state.visualKind === 'fraction_compare' ? (
            <div style={{ marginBottom: '1rem' }}>
                <FractionBar
                    groups={state.groups}
                    activeGroupIndex={state.activeGroupIndex}
                    label={state.primaryLabel}
                />
                {state.visualKind === 'fraction_compare' && state.comparisonGroups && (
                    <FractionBar
                        groups={state.comparisonGroups}
                        activeGroupIndex={state.comparisonActiveGroupIndex}
                        label={state.comparisonLabel}
                        colorOffset={2}
                    />
                )}
            </div>
        ) : (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'stretch',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '1rem',
            }}>
                {state.groups.map((group, groupIndex) => {
                    const active = state.activeGroupIndex === undefined || state.activeGroupIndex === groupIndex;
                    return (
                        <div
                            key={groupIndex}
                            style={{
                                minWidth: '5.5rem',
                                padding: '0.75rem',
                                borderRadius: '0.75rem',
                                border: active ? '2px solid #facc15' : '1px solid rgba(148,163,184,0.28)',
                                background: active ? 'rgba(250,204,21,0.12)' : 'rgba(255,255,255,0.06)',
                            }}
                        >
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1.35rem)',
                                justifyContent: 'center',
                                gap: '0.35rem',
                                minHeight: '1.7rem',
                            }}>
                                {group.map((_, dotIndex) => (
                                    <Dot
                                        key={dotIndex}
                                        color={COLORS[groupIndex % COLORS.length]}
                                        muted={!active}
                                    />
                                ))}
                            </div>
                            {state.groupLabels?.[groupIndex] && (
                                <div style={{ marginTop: '0.5rem', color: '#cbd5e1', fontWeight: 700 }}>
                                    {state.groupLabels[groupIndex]}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}

        {state.resultText && (
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#86efac', marginBottom: '0.5rem' }}>
                {state.resultText}
            </div>
        )}
        {state.note && (
            <div style={{ color: '#cbd5e1', lineHeight: 1.45 }}>
                {state.note}
            </div>
        )}
    </div>
);

export default ArithmeticTutorialView;
