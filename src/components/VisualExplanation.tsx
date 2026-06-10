import React from 'react';
import type { Problem } from '../lib/types';
import NumberLine from './NumberLine';

interface Props {
    problem: Problem;
}

const VisualExplanation: React.FC<Props> = ({ problem }) => {
    const expr = problem.expression.replace(/\s+/g, '');
    let content: React.ReactNode = null;

    if (problem.metadata?.type === 'geometry_area') {
        const { leftRows, leftCols, rightRows, rightCols } = problem.metadata;
        content = <ExplanationGeometryArea leftRows={leftRows} leftCols={leftCols} rightRows={rightRows} rightCols={rightCols} />;
    }

    if (problem.metadata?.type === 'money_coins') {
        content = <ExplanationMoneyCoins coins={problem.metadata.coins} />;
    }

    if (problem.metadata?.type === 'logical_sequence') {
        content = <ExplanationLogicalSequence pattern={problem.metadata.pattern} fullSequence={problem.metadata.fullSequence} />;
    }

    if (!content) {
        const matchMissingFirst = expr.match(/^\?\+(\d+)=(\d+)$/);
        if (matchMissingFirst) {
            content = <ExplanationMissingTotal total={parseInt(matchMissingFirst[2])} known={parseInt(matchMissingFirst[1])} />;
        }
        const matchMissingSecond = expr.match(/^(\d+)\+\?=(\d+)$/);
        if (!content && matchMissingSecond) {
            content = <ExplanationMissingTotal total={parseInt(matchMissingSecond[2])} known={parseInt(matchMissingSecond[1])} />;
        }
    }

    if (!content) {
        const matchMissingMinuend = expr.match(/^\?-(\d+)=(\d+)$/);
        if (matchMissingMinuend) {
            content = <ExplanationAddition a={parseInt(matchMissingMinuend[1])} b={parseInt(matchMissingMinuend[2])} label="Vizuálna skúška (sčítaním):" />;
        }
        const matchMissingSubtrahend = expr.match(/^(\d+)-\?=(\d+)$/);
        if (!content && matchMissingSubtrahend) {
            content = <ExplanationMissingTotal total={parseInt(matchMissingSubtrahend[1])} known={parseInt(matchMissingSubtrahend[2])} />;
        }
    }

    if (!content) {
        const matchStandard = expr.match(/^(\d+)([+-])(\d+)$/);
        if (matchStandard) {
            const a = parseInt(matchStandard[1]);
            const op = matchStandard[2];
            const b = parseInt(matchStandard[3]);
            if (op === '+') {
                const toTen = 10 - (a % 10);
                if ((a % 10) + (b % 10) >= 10 && toTen > 0 && toTen < b) {
                    content = <ExplanationAdditionToTen a={a} b={b} />;
                } else if (a + b > 20) {
                    content = <ExplanationAdditionNumberLine a={a} b={b} />;
                } else {
                    content = <ExplanationAddition a={a} b={b} />;
                }
            } else {
                const toTen = a % 10;
                if ((a % 10) < (b % 10) && toTen > 0 && b > toTen) {
                    content = <ExplanationSubtractionThroughTen a={a} b={b} />;
                } else if (a > 20) {
                    content = <ExplanationSubtractionNumberLine a={a} b={b} />;
                } else {
                    content = <ExplanationSubtraction a={a} b={b} />;
                }
            }
        }
    }

    if (!content) {
        const matchMul = expr.match(/^(\d+)\*(\d+)$/);
        if (matchMul) content = <ExplanationMultiplicationArray rows={parseInt(matchMul[1])} cols={parseInt(matchMul[2])} />;
        const matchDiv = expr.match(/^(\d+)\/(\d+)$/);
        if (matchDiv) content = <ExplanationDivisionGroups dividend={parseInt(matchDiv[1])} divisor={parseInt(matchDiv[2])} />;
    }

    if (!content) {
        const fNum = problem.expression.match(/^Zlomok: z (\d+) rovnakých častí sú vyfarbené (\d+)\. Aký je čitateľ\?$/);
        if (fNum) content = <ExplanationFractionPie numerator={parseInt(fNum[2])} denominator={parseInt(fNum[1])} caption="Vyfarbené časti sú čitateľ." />;
        const fDen = problem.expression.match(/^Zlomok: celok je rozdelený na (\d+) rovnakých častí\. Aký je menovateľ\?$/);
        if (fDen) content = <ExplanationFractionPie numerator={0} denominator={parseInt(fDen[1])} caption="Všetky časti sú menovateľ." />;
        const fName = problem.expression.match(/^Zlomok: akú hodnotu má menovateľ pri slove (polovica|tretina|štvrtina)\?$/);
        if (fName) {
            const d = fName[1] === 'polovica' ? 2 : fName[1] === 'tretina' ? 3 : 4;
            content = <ExplanationFractionPie numerator={1} denominator={d} caption={`${fName[1]} = 1 z ${d}`} />;
        }
        const fComp = problem.expression.match(/^Zlomok: čo je väčšie (\d+)\/(\d+) alebo (\d+)\/(\d+)\? 1=prvý, 0=druhý$/);
        if (fComp) content = <ExplanationFractionCompare leftNum={parseInt(fComp[1])} leftDen={parseInt(fComp[2])} rightNum={parseInt(fComp[3])} rightDen={parseInt(fComp[4])} />;
    }

    if (!content) return null;
    return <div style={{ width: '100%', marginTop: '1rem', animation: 'fadeIn 0.5s' }}>{content}</div>;
};

const BallGrid: React.FC<{ total: number; countA: number; colorA: string; colorB: string }> = ({ total, countA, colorA, colorB }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-start', maxWidth: '340px', margin: '0 auto' }}>
        {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ width: '24px', height: '24px', margin: '4px', borderRadius: '50%', background: i < countA ? colorA : colorB, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }} />
        ))}
    </div>
);

const Base10Blocks: React.FC<{ value: number; color: string; label?: string; faded?: boolean }> = ({ value, color, label, faded }) => {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: faded ? 0.3 : 1 }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {Array.from({ length: tens }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '1px', border: `1px solid ${color}44`, padding: '1px', background: `${color}11` }}>
                        {Array.from({ length: 10 }).map((_, j) => <div key={j} style={{ width: '10px', height: '10px', background: color }} />)}
                    </div>
                ))}
                {ones > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 10px)', gap: '2px' }}>
                        {Array.from({ length: ones }).map((_, i) => <div key={i} style={{ width: '10px', height: '10px', background: color }} />)}
                    </div>
                )}
            </div>
            {label && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{label} ({value})</div>}
        </div>
    );
};

const ExplanationAddition: React.FC<{ a: number; b: number; label?: string }> = ({ a, b, label }) => {
    const total = a + b;
    if (total > 50) return <ExplanationAdditionNumberLine a={a} b={b} label={label} />;
    if (a > 10 || b > 10) {
        return (
            <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>{label || 'Vizuálne sčítanie:'}</div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                    <Base10Blocks value={a} color="#3b82f6" />
                    <div style={{ fontSize: '1.5rem' }}>+</div>
                    <Base10Blocks value={b} color="#22c55e" />
                    <div style={{ fontSize: '1.5rem' }}>=</div>
                    <Base10Blocks value={total} color="#facc15" />
                </div>
            </div>
        );
    }
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>{label || 'Vizuálne sčítanie:'}</div>
            <BallGrid total={total} countA={a} colorA="#3b82f6" colorB="#22c55e" />
        </div>
    );
};

const ExplanationSubtraction: React.FC<{ a: number; b: number }> = ({ a, b }) => {
    if (a > 50) return <ExplanationSubtractionNumberLine a={a} b={b} />;
    const res = a - b;
    if (a > 10) {
        return (
            <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Vizuálne odčítanie:</div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                    <Base10Blocks value={a} color="#3b82f6" />
                    <div style={{ fontSize: '1.5rem' }}>-</div>
                    <Base10Blocks value={b} color="#ef4444" faded />
                    <div style={{ fontSize: '1.5rem' }}>=</div>
                    <Base10Blocks value={res} color="#22c55e" />
                </div>
            </div>
        );
    }
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Vizuálne odčítanie:</div>
            <BallGrid total={a} countA={res} colorA="#3b82f6" colorB="rgba(239, 68, 68, 0.3)" />
        </div>
    );
};

const ExplanationAdditionToTen: React.FC<{ a: number; b: number }> = ({ a, b }) => {
    const toTen = 10 - (a % 10);
    const rest = b - toTen;
    const res = a + b;
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Rozklad cez desiatku:</div>
            <NumberLine
                min={0}
                max={Math.ceil(res/10)*10}
                startValue={a}
                highlightValue={res}
                jumps={[]}
                segments={[
                    { from: 0, to: a, label: `${a}`, color: '#3b82f6' },
                    { from: a, to: a+toTen, label: `+${toTen}`, color: '#eab308' },
                    { from: a+toTen, to: res, label: `+${rest}`, color: '#22c55e' },
                ]}
            />
        </div>
    );
};

const ExplanationSubtractionThroughTen: React.FC<{ a: number; b: number }> = ({ a, b }) => {
    const toTen = a % 10;
    const rest = b - toTen;
    const res = a - b;
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Odčítanie cez desiatku:</div>
            <NumberLine min={Math.floor(res/10)*10} max={Math.ceil(a/10)*10} startValue={a} highlightValue={res} jumps={[{ from: a, to: a-toTen, label: `-${toTen}`, color: '#dc2626' }, { from: a-toTen, to: res, label: `-${rest}`, color: '#ea580c' }]} />
        </div>
    );
};

const ExplanationAdditionNumberLine: React.FC<{ a: number; b: number; label?: string }> = ({ a, b, label }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>{label || 'Sčítanie ako dva úseky:'}</div>
        <NumberLine
            min={0}
            max={Math.ceil((a+b)/10)*10}
            startValue={a}
            highlightValue={a+b}
            jumps={[]}
            segments={[
                { from: 0, to: a, label: `${a}`, color: '#3b82f6' },
                { from: a, to: a+b, label: `+${b}`, color: '#22c55e' },
            ]}
        />
    </div>
);

const ExplanationSubtractionNumberLine: React.FC<{ a: number; b: number }> = ({ a, b }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Odčítanie na osi:</div>
        <NumberLine min={Math.floor((a-b)/10)*10} max={Math.ceil(a/10)*10} startValue={a} highlightValue={a-b} jumps={[{ from: a, to: a-b, label: `-${b}`, color: '#dc2626' }]} />
    </div>
);

const ExplanationMissingTotal: React.FC<{ total: number; known: number }> = ({ total, known }) => {
    if (total > 50) return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Doplň do {total}:</div>
            <NumberLine min={0} max={Math.ceil(total/10)*10} startValue={known} highlightValue={total} jumps={[{ from: known, to: total, label: `+? (${total-known})`, color: '#eab308' }]} />
        </div>
    );
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Doplň do {total}:</div>
            <BallGrid total={total} countA={known} colorA="#4b5563" colorB="#eab308" />
        </div>
    );
};

const ExplanationMultiplicationArray: React.FC<{ rows: number; cols: number }> = ({ rows, cols }) => (
    rows * cols > 120 ? (
        <ExplanationLargeMultiplication a={rows} b={cols} />
    ) : (
        <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Pole {rows}x{cols}:</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 14px)`, gap: '2px', justifyContent: 'center' }}>
                {Array.from({ length: rows * cols }).map((_, i) => <div key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#3b82f6' }} />)}
            </div>
        </div>
    )
);

const ExplanationDivisionGroups: React.FC<{ dividend: number; divisor: number }> = ({ dividend, divisor }) => {
    const per = dividend / divisor;
    if (dividend > 120 || !Number.isInteger(per)) {
        return <ExplanationLargeDivision dividend={dividend} divisor={divisor} />;
    }

    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>{dividend} rozdelených na {divisor} skupín:</div>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '4px' }}>
                {Array.from({ length: divisor }).map((_, i) => (
                    <div key={i} style={{ padding: '2px', border: '1px solid #444' }}>
                        {Array.from({ length: per }).map((_, j) => <div key={j} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', margin: '1px' }} />)}
                    </div>
                ))}
            </div>
        </div>
    );
};

const placeParts = (value: number) => {
    const hundreds = Math.floor(value / 100);
    const tens = Math.floor((value % 100) / 10);
    const ones = value % 10;
    return [
        hundreds ? { label: 'stovky', value: hundreds, unit: 100 } : null,
        tens ? { label: 'desiatky', value: tens, unit: 10 } : null,
        ones ? { label: 'jednotky', value: ones, unit: 1 } : null,
    ].filter(Boolean) as { label: string; value: number; unit: number }[];
};

const PlaceValueStrip: React.FC<{ value: number; color: string }> = ({ value, color }) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {placeParts(value).map(part => (
            <div
                key={part.label}
                style={{
                    minWidth: '4.5rem',
                    padding: '0.45rem 0.6rem',
                    border: `1px solid ${color}66`,
                    background: `${color}18`,
                    borderRadius: '0.5rem',
                }}
            >
                <div style={{ color, fontWeight: 800, fontSize: '1.15rem' }}>{part.value}</div>
                <div style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>{part.label}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{part.value} × {part.unit}</div>
            </div>
        ))}
    </div>
);

const ExplanationLargeMultiplication: React.FC<{ a: number; b: number }> = ({ a, b }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Rozklad namiesto veľkého poľa:</div>
        <PlaceValueStrip value={a} color="#3b82f6" />
        <div style={{ color: '#e2e8f0', marginTop: '0.5rem', lineHeight: 1.45 }}>
            {placeParts(a).map(part => `${part.value * part.unit} × ${b} = ${part.value * part.unit * b}`).join('  +  ')}
        </div>
        <div style={{ color: '#facc15', fontWeight: 800, marginTop: '0.35rem' }}>
            Spolu {a * b}
        </div>
    </div>
);

const ExplanationLargeDivision: React.FC<{ dividend: number; divisor: number }> = ({ dividend, divisor }) => {
    const quotient = Math.floor(dividend / divisor);
    const remainder = dividend % divisor;
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Delenie po častiach, nie kreslením všetkých bodiek:</div>
            <PlaceValueStrip value={dividend} color="#22c55e" />
            <div style={{ color: '#e2e8f0', marginTop: '0.5rem', lineHeight: 1.45 }}>
                Hľadáme, koľkokrát sa {divisor} zmestí do čísla {dividend}.
            </div>
            <div style={{ color: '#facc15', fontWeight: 800, marginTop: '0.35rem' }}>
                {dividend} : {divisor} = {quotient}{remainder ? `, zvyšok ${remainder}` : ''}
            </div>
        </div>
    );
};

const FractionPie: React.FC<{ numerator: number; denominator: number; color?: string }> = ({ numerator, denominator, color = '#3b82f6' }) => {
    const r = 40, cx = 50, cy = 50;
    const slices = Array.from({ length: denominator }).map((_, i) => {
        const start = (i / denominator) * 2 * Math.PI - Math.PI / 2;
        const end = ((i + 1) / denominator) * 2 * Math.PI - Math.PI / 2;
        const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
        return <path key={i} d={path} fill={i < numerator ? color : 'rgba(255,255,255,0.1)'} stroke="#fff" strokeWidth="1" />;
    });
    return <svg width="100" height="100">{slices}</svg>;
};

const ExplanationFractionPie: React.FC<{ numerator: number; denominator: number; caption: string }> = ({ numerator, denominator, caption }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
            <FractionPie numerator={numerator} denominator={denominator} />
            <div style={{ fontSize: '1.5rem', borderBottom: '2px solid #fff' }}>{numerator}</div>
            <div style={{ fontSize: '1.5rem' }}>{denominator}</div>
        </div>
        <div style={{ color: '#cbd5e1', marginTop: '0.5rem' }}>{caption}</div>
    </div>
);

const ExplanationFractionCompare: React.FC<{ leftNum: number; leftDen: number; rightNum: number; rightDen: number }> = ({ leftNum, leftDen, rightNum, rightDen }) => {
    const lV = leftNum / leftDen, rV = rightNum / rightDen;
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                <FractionPie numerator={leftNum} denominator={leftDen} color={lV > rV ? '#22c55e' : '#3b82f6'} />
                <div style={{ fontSize: '1.5rem' }}>{lV > rV ? '>' : lV < rV ? '<' : '='}</div>
                <FractionPie numerator={rightNum} denominator={rightDen} color={rV > lV ? '#22c55e' : '#3b82f6'} />
            </div>
        </div>
    );
};

const EuroCoin: React.FC<{ value: number }> = ({ value }) => {
    const isTwo = value === 2;
    const outerColor = isTwo ? '#eab308' : '#cbd5e1';
    const innerColor = isTwo ? '#cbd5e1' : '#eab308';
    
    return (
        <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: outerColor,
            border: '2px solid rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), inset 0 2px 4px 0 rgba(255, 255, 255, 0.2)',
            position: 'relative',
        }}>
            <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: innerColor,
                border: '1px solid rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
            }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'rgba(0,0,0,0.6)', fontFamily: 'serif' }}>{value}</span>
            </div>
            <div style={{ position: 'absolute', bottom: '8px', fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,0,0,0.4)' }}>EURO</div>
        </div>
    );
};

const ExplanationMoneyCoins: React.FC<{ coins: number[] }> = ({ coins }) => (
    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.5rem' }}>Spočítaj hodnotu mincí:</div>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {coins.map((c, i) => <EuroCoin key={i} value={c} />)}
        </div>
        <div style={{ marginTop: '1.5rem', color: '#cbd5e1', fontSize: '1.1rem' }}>
            {coins.join('€ + ')}€ = <span style={{ fontWeight: 800, color: '#facc15' }}>{coins.reduce((a, b) => a + b, 0)}€</span>
        </div>
    </div>
);

const ExplanationLogicalSequence: React.FC<{ pattern: string[]; fullSequence: string[] }> = ({ pattern, fullSequence }) => (
    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1rem' }}>Pravidlo (vzor):</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {pattern.map((s, i) => (
                <div key={i} style={{ fontSize: '2rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', border: '2px solid #3b82f6' }}>{s}</div>
            ))}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Celý rad:</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {fullSequence.map((s, i) => {
                const isLast = i === fullSequence.length - 1;
                return (
                    <div key={i} style={{
                        fontSize: '1.5rem',
                        opacity: isLast ? 1 : 0.6,
                        transform: isLast ? 'scale(1.2)' : 'none',
                        color: isLast ? '#facc15' : 'inherit',
                        fontWeight: isLast ? 900 : 'normal'
                    }}>
                        {s}
                    </div>
                );
            })}
        </div>
        <div style={{ marginTop: '1rem', color: '#cbd5e1' }}>
            Vzor sa stále opakuje. Posledný tvar je <span style={{ fontWeight: 800, color: '#facc15' }}>{fullSequence[fullSequence.length - 1]}</span>.
        </div>
    </div>
);

const ExplanationGeometryArea: React.FC<{ leftRows: number; leftCols: number; rightRows: number; rightCols: number }> = ({ leftRows, leftCols, rightRows, rightCols }) => {
    const lA = leftRows * leftCols, rA = rightRows * rightCols;
    const Grid = ({ r, c, col }: { r: number, c: number, col: string }) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${c}, 15px)`, gap: '1px', background: '#222', padding: '2px' }}>
                {Array.from({ length: r * c }).map((_, i) => <div key={i} style={{ width: '15px', height: '15px', background: col }} />)}
            </div>
            <div style={{ fontWeight: 800 }}>{r}x{c}={r*c}</div>
        </div>
    );
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Porovnanie plôch:</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                <Grid r={leftRows} c={leftCols} col={lA > rA ? '#22c55e' : '#3b82f6'} />
                <div style={{ fontSize: '1.5rem' }}>{lA > rA ? '>' : lA < rA ? '<' : '='}</div>
                <Grid r={rightRows} c={rightCols} col={rA > lA ? '#22c55e' : '#3b82f6'} />
            </div>
        </div>
    );
};

export default VisualExplanation;
