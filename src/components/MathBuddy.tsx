import React from 'react';

type Mood = 'happy' | 'thinking' | 'celebrate' | 'encourage';

interface Props {
    mood?: Mood;
    size?: number;
    message?: string;
    compact?: boolean;
}

const MathBuddy: React.FC<Props> = ({ mood = 'happy', size = 86, message, compact = false }) => {
    const face = mood === 'thinking' ? '•ᴗ•' : mood === 'encourage' ? '•‿•' : '◕‿◕';

    return (
        <div className={`math-buddy-wrap ${compact ? 'math-buddy-compact' : ''}`} aria-label="Múdra líška Max">
            <div className={`math-buddy math-buddy-${mood}`} style={{ width: size, height: size }}>
                <span className="buddy-ear buddy-ear-left" />
                <span className="buddy-ear buddy-ear-right" />
                <span className="buddy-face">{face}</span>
                <span className="buddy-tail">✦</span>
                {mood === 'celebrate' && <span className="buddy-sparkles">✦</span>}
            </div>
            {message && <div className="buddy-bubble">{message}</div>}
        </div>
    );
};

export default MathBuddy;
