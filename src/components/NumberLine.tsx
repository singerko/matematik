import React from 'react';

interface Jump {
    from: number;
    to: number;
    label?: string;
    color?: string;
}

interface Segment {
    from: number;
    to: number;
    label?: string;
    color: string;
}

interface Props {
    min: number;
    max: number;
    startValue: number;
    jumps: Jump[];
    segments?: Segment[];
    highlightValue?: number;
}

const NumberLine: React.FC<Props> = ({ min, max, startValue, jumps, segments = [], highlightValue }) => {
    const width = 360;
    const height = 120;
    const padding = 30;
    const axisY = height - 40;
    const scale = (val: number) => padding + ((val - min) / (max - min)) * (width - 2 * padding);

    // Filter ticks to be readable
    const tickInterval = max - min > 20 ? 10 : 1;
    const ticks = [];
    for (let i = Math.ceil(min / tickInterval) * tickInterval; i <= max; i += tickInterval) {
        ticks.push(i);
    }

    return (
        <div style={{ width: '100%', maxWidth: width, margin: '1rem auto', overflow: 'visible' }}>
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                {/* Axis */}
                <line
                    x1={scale(min) - 10}
                    y1={axisY}
                    x2={scale(max) + 10}
                    y2={axisY}
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeLinecap="round"
                />

                {/* Ticks */}
                {ticks.map(tick => (
                    <g key={tick}>
                        <line
                            x1={scale(tick)}
                            y1={axisY - 4}
                            x2={scale(tick)}
                            y2={axisY + 4}
                            stroke="#94a3b8"
                            strokeWidth="1.5"
                        />
                        <text
                            x={scale(tick)}
                            y={axisY + 20}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#cbd5e1"
                            fontWeight="600"
                        >
                            {tick}
                        </text>
                    </g>
                ))}

                {/* Segments on the axis, useful for showing a + b as two joined lengths */}
                {segments.map((segment, i) => {
                    const x1 = scale(segment.from);
                    const x2 = scale(segment.to);
                    const mid = (x1 + x2) / 2;
                    const y = axisY - 12 - i * 10;

                    return (
                        <g key={`${segment.from}-${segment.to}-${i}`}>
                            <line
                                x1={x1}
                                y1={y}
                                x2={x2}
                                y2={y}
                                stroke={segment.color}
                                strokeWidth="8"
                                strokeLinecap="round"
                            />
                            <line
                                x1={x1}
                                y1={axisY - 9}
                                x2={x1}
                                y2={axisY + 9}
                                stroke={segment.color}
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                            <line
                                x1={x2}
                                y1={axisY - 9}
                                x2={x2}
                                y2={axisY + 9}
                                stroke={segment.color}
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                            {segment.label && (
                                <text
                                    x={mid}
                                    y={y - 10}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fontWeight="bold"
                                    fill={segment.color}
                                >
                                    {segment.label}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Jumps */}
                {jumps.map((jump, i) => {
                    const x1 = scale(jump.from);
                    const x2 = scale(jump.to);
                    const cpX = (x1 + x2) / 2;
                    const cpY = axisY - Math.abs(x1 - x2) * 0.4 - 20; // Arc height proportional to distance
                    const path = `M ${x1} ${axisY} Q ${cpX} ${cpY} ${x2} ${axisY}`;
                    const color = jump.color || "#facc15";

                    return (
                        <g key={i}>
                            <path
                                d={path}
                                fill="none"
                                stroke={color}
                                strokeWidth="2.5"
                                strokeDasharray="4 2"
                                markerEnd={`url(#arrow-${i})`}
                            />
                            <defs>
                                <marker
                                    id={`arrow-${i}`}
                                    markerWidth="10"
                                    markerHeight="10"
                                    refX="8"
                                    refY="5"
                                    orient="auto"
                                >
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                                </marker>
                            </defs>
                            {jump.label && (
                                <text
                                    x={cpX}
                                    y={cpY - 8}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fontWeight="bold"
                                    fill={color}
                                >
                                    {jump.label}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Start Marker */}
                <circle cx={scale(startValue)} cy={axisY} r="4" fill="#3b82f6" />
                
                {/* Final Value Highlight */}
                {highlightValue !== undefined && (
                    <g>
                        <circle cx={scale(highlightValue)} cy={axisY} r="5" fill="#22c55e" />
                        <text
                            x={scale(highlightValue)}
                            y={axisY - 10}
                            textAnchor="middle"
                            fontSize="12"
                            fontWeight="900"
                            fill="#22c55e"
                        >
                            {highlightValue}
                        </text>
                    </g>
                )}
            </svg>
        </div>
    );
};

export default NumberLine;
