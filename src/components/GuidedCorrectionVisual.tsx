import React from 'react';
import type { GuidedCorrection } from '../lib/guidedCorrection';

interface Props {
    guided: GuidedCorrection;
    revealFinal?: boolean;
}

const GuidedCorrectionVisual: React.FC<Props> = ({ guided, revealFinal = false }) => {
    if (!guided.visual) return null;

    const { visual } = guided;
    const isAddition = visual.kind === 'make_ten_addition';
    const values = isAddition
        ? [
            { label: `${visual.start}`, color: '#93c5fd' },
            { label: `+${visual.bridge}`, color: '#facc15' },
            { label: `${visual.targetTen}`, color: '#22c55e' },
            { label: `+${visual.rest}`, color: '#facc15' },
            { label: revealFinal ? `${visual.final}` : '?', color: '#22c55e' },
        ]
        : [
            { label: `${visual.start}`, color: '#93c5fd' },
            { label: `-${visual.bridge}`, color: '#facc15' },
            { label: `${visual.targetTen}`, color: '#22c55e' },
            { label: `-${visual.rest}`, color: '#facc15' },
            { label: revealFinal ? `${visual.final}` : '?', color: '#22c55e' },
        ];

    return (
        <div style={{ marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                {values.map((value, index) => (
                    <React.Fragment key={`${value.label}-${index}`}>
                        <div
                            style={{
                                minWidth: '2.6rem',
                                padding: '0.45rem 0.6rem',
                                borderRadius: '0.55rem',
                                background: `${value.color}22`,
                                border: `1px solid ${value.color}66`,
                                color: value.color,
                                fontWeight: 800,
                                textAlign: 'center',
                            }}
                        >
                            {value.label}
                        </div>
                        {index < values.length - 1 && (
                            <div style={{ color: '#64748b', fontWeight: 800 }}>→</div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default GuidedCorrectionVisual;
