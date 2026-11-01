import React from 'react';

interface Props { jumping: boolean; onPlatform: boolean; direction: 1 | -1; }

const RunnerFox: React.FC<Props> = ({ jumping, onPlatform, direction }) => (
    <div className={`runner-fox ${jumping ? 'fox-jumping' : 'fox-running'} ${onPlatform ? 'fox-platform' : ''} ${direction < 0 ? 'fox-left' : ''}`} aria-label="Bežiaca líška">
        <svg viewBox="0 0 150 120" role="img">
            <g className="fox-tail"><path d="M42 70C10 58 6 91 37 91c-15-7-9-16 8-11z" fill="#f97316" stroke="#7c2d12" strokeWidth="4"/><path d="M16 78c4 10 12 13 21 13-8-4-10-9-7-14z" fill="#fff7ed"/></g>
            <g className="fox-body"><ellipse cx="79" cy="73" rx="39" ry="27" fill="#f97316" stroke="#7c2d12" strokeWidth="4"/><path d="M63 76c8 15 26 17 38 2-3 21-32 25-45 7z" fill="#fff7ed"/></g>
            <g className="fox-leg fox-leg-back"><path d="M60 86l-5 24h17l1-23" fill="#ea580c" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round"/><path d="M54 108h20" stroke="#431407" strokeWidth="6" strokeLinecap="round"/></g>
            <g className="fox-leg fox-leg-front"><path d="M94 87l3 23h18l-8-27" fill="#f97316" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round"/><path d="M97 109h19" stroke="#431407" strokeWidth="6" strokeLinecap="round"/></g>
            <g className="fox-head"><path d="M87 51c-1-27 10-42 30-38 20 3 27 22 17 40-9 17-36 18-47-2z" fill="#f97316" stroke="#7c2d12" strokeWidth="4"/><path d="M92 27l-2-22 19 13M125 20l15-14-2 25" fill="#f97316" stroke="#7c2d12" strokeWidth="4" strokeLinejoin="round"/><path d="M101 49c8 12 25 10 33-1-1 16-27 23-40 6z" fill="#fff7ed"/><circle cx="106" cy="37" r="3.5" fill="#1c1917"/><circle cx="127" cy="37" r="3.5" fill="#1c1917"/><path d="M116 48l5 1-3 4z" fill="#1c1917"/></g>
        </svg>
        <span className="fox-shadow" />
    </div>
);

export default RunnerFox;
