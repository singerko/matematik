import React, { useEffect, useState } from 'react';
import { type Constraints, type ErrorDiagnosisCode, type FractionShape, type Problem, type TrainingResult, type VisualSequenceFrame, type VisualSequenceOption } from '../lib/types';
import { generateProblem } from '../lib/generator';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, CheckCircle, ArrowRight, CornerDownLeft, Delete, Calculator, X, RotateCcw } from 'lucide-react';
import VisualExplanation from './VisualExplanation';
import GuidedCorrectionVisual from './GuidedCorrectionVisual';
import { diagnoseAnswerDetailed, explainProblem, isAnswerCorrect, toNumericAnswer } from '../lib/explanations';
import { createFollowUpProblem } from '../lib/adaptivePractice';
import { speakText } from '../lib/speech';
import { createEarlyGradeGuidance, createGuidedCorrection, type GuidedCorrection } from '../lib/guidedCorrection';
import { formatOperation, getFirstIntermediateStep, getWordProblemOperation, WORD_PROBLEM_OPERATIONS, type WordProblemOperation } from '../lib/wordProblemFlow';
import { getProblemMetadata } from '../lib/problemMetadata';
import MathBuddy from './MathBuddy';

const PRAISE_PHRASES = [
    'Výborne!',
    'Skvelá práca!',
    'Ide ti to úžasne!',
    'Si šikovný!',
    'Paráda!',
    'Len tak ďalej!',
    'Super!',
    'Krásne si to vypočítal!',
];

type SessionStatus = 'IDLE' | 'CORRECT' | 'HINT' | 'WRONG';

interface Props {
    settings: Constraints;
    totalProblems: number;
    initialProblems?: Problem[];
    onComplete: (results: TrainingResult[]) => void;
    onExit: () => void;
}

const isIndianDivisionProblem = (problem: Problem) => problem.kind === 'indian_division' && problem.indianDivision;
const isLongDivisionProblem = (problem: Problem) => problem.kind === 'long_division' && problem.longDivision;
const isStepDivisionProblem = (problem: Problem) => isIndianDivisionProblem(problem) || isLongDivisionProblem(problem);
const getStepDivisionData = (problem: Problem) => problem.indianDivision ?? problem.longDivision;
const isLargeMultiplicationProblem = (problem: Problem) => problem.kind === 'large_multiplication' && problem.largeMultiplication;
const isYesNoProblem = (problem: Problem) => problem.expression.includes('1=áno, 0=nie');
const isFirstSecondProblem = (problem: Problem) => problem.expression.includes('1=prvý, 0=druhý');
const isLogicalSequenceProblem = (problem: Problem) => problem.metadata?.type === 'logical_sequence';
const isRomanTextAnswerProblem = (problem: Problem) => getProblemMetadata(problem)?.type === 'arabic_to_roman';
const isFractionAnswerProblem = (problem: Problem) => getProblemMetadata(problem)?.type === 'fraction_answer';

const FRACTION_FILL = '#facc15';
const FRACTION_EMPTY = '#1e293b';
const FRACTION_STROKE = '#f8fafc';

const polarPoint = (cx: number, cy: number, r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const sectorPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
    const p0 = polarPoint(cx, cy, r, a0);
    const p1 = polarPoint(cx, cy, r, a1);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y} Z`;
};

// Vyfarbený útvar v zadaní (pruh / mriežka / koláč).
const FractionShapeView: React.FC<{ shape: FractionShape }> = ({ shape }) => {
    if (shape.kind === 'bar') {
        return (
            <svg width={Math.min(300, shape.parts * 44)} height={60} viewBox={`0 0 ${shape.parts * 44} 60`} role="img" aria-label="Vyfarbený pruh">
                {Array.from({ length: shape.parts }).map((_, i) => (
                    <rect key={i} x={i * 44} y={2} width={44} height={56} fill={i < shape.shaded ? FRACTION_FILL : FRACTION_EMPTY} stroke={FRACTION_STROKE} strokeWidth={2} />
                ))}
            </svg>
        );
    }

    if (shape.kind === 'grid') {
        const cell = 46;
        return (
            <svg width={shape.cols * cell} height={shape.rows * cell} viewBox={`0 0 ${shape.cols * cell} ${shape.rows * cell}`} role="img" aria-label="Vyfarbená mriežka">
                {Array.from({ length: shape.rows * shape.cols }).map((_, i) => {
                    const row = Math.floor(i / shape.cols);
                    const col = i % shape.cols;
                    return <rect key={i} x={col * cell} y={row * cell} width={cell} height={cell} fill={i < shape.shaded ? FRACTION_FILL : FRACTION_EMPTY} stroke={FRACTION_STROKE} strokeWidth={2} />;
                })}
            </svg>
        );
    }

    const size = 150;
    const r = size / 2 - 3;
    const base = 360 / shape.parts;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Vyfarbený kruh">
            {Array.from({ length: shape.parts }).map((_, i) => (
                <path key={i} d={sectorPath(size / 2, size / 2, r, i * base, (i + 1) * base)} fill={i < shape.shaded ? FRACTION_FILL : FRACTION_EMPTY} stroke={FRACTION_STROKE} strokeWidth={2} />
            ))}
        </svg>
    );
};

// Kruh rozdelený radiálnymi čiarami podľa veľkostí sektorov (na posúdenie rovnosti častí).
const CircleDivisionView: React.FC<{ sizes: number[]; size?: number }> = ({ sizes, size = 104 }) => {
    const r = size / 2 - 4;
    const cx = size / 2;
    const cy = size / 2;
    const boundaries = sizes.map((_, i) => sizes.slice(0, i).reduce((acc, s) => acc + s, 0));
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Rozdelený kruh">
            <circle cx={cx} cy={cy} r={r} fill="#f8fafc" stroke="#0f172a" strokeWidth={2.5} />
            {boundaries.map((deg, i) => {
                const p = polarPoint(cx, cy, r, deg);
                return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#dc2626" strokeWidth={2.5} strokeLinecap="round" />;
            })}
        </svg>
    );
};

const dotPositions: Record<VisualSequenceFrame['dot'], { x: number; y: number }> = {
    topLeft: { x: 25, y: 25 },
    topCenter: { x: 50, y: 25 },
    topRight: { x: 75, y: 25 },
    centerLeft: { x: 25, y: 50 },
    center: { x: 50, y: 50 },
    centerRight: { x: 75, y: 50 },
    bottomLeft: { x: 25, y: 75 },
    bottomCenter: { x: 50, y: 75 },
    bottomRight: { x: 75, y: 75 },
};

const redLines: Record<VisualSequenceFrame['redLine'], { x1: number; y1: number; x2: number; y2: number }> = {
    right: { x1: 50, y1: 50, x2: 100, y2: 50 },
    down: { x1: 50, y1: 50, x2: 50, y2: 100 },
    left: { x1: 0, y1: 50, x2: 50, y2: 50 },
    diagDown: { x1: 50, y1: 50, x2: 100, y2: 100 },
    diagUp: { x1: 0, y1: 100, x2: 50, y2: 50 },
};

const VisualSequencePicture: React.FC<{ frame: VisualSequenceFrame; label?: string; size?: number }> = ({ frame, label, size = 86 }) => {
    const dot = dotPositions[frame.dot];
    const red = redLines[frame.redLine];

    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
            <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label ? `Možnosť ${label}` : 'Obrázok postupnosti'}>
                <rect x="2" y="2" width="96" height="96" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
                {frame.grid === 'x' ? (
                    <>
                        <line x1="2" y1="2" x2="98" y2="98" stroke="#0f172a" strokeWidth="1.8" />
                        <line x1="98" y1="2" x2="2" y2="98" stroke="#0f172a" strokeWidth="1.8" />
                    </>
                ) : (
                    <>
                        <line x1="50" y1="2" x2="50" y2="98" stroke="#0f172a" strokeWidth="1.8" />
                        <line x1="2" y1="50" x2="98" y2="50" stroke="#0f172a" strokeWidth="1.8" />
                    </>
                )}
                <line {...red} stroke="#ef4444" strokeWidth="2.6" strokeLinecap="round" />
                <circle cx={dot.x} cy={dot.y} r="7" fill="#16a34a" />
            </svg>
            {label && <div style={{ color: '#93c5fd', fontWeight: 900, fontSize: '1.1rem' }}>{label})</div>}
        </div>
    );
};

const VisualLogicalSequence: React.FC<{ frames: VisualSequenceFrame[] }> = ({ frames }) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {frames.map((frame, index) => (
            <VisualSequencePicture key={index} frame={frame} />
        ))}
    </div>
);

type ScratchOperation = '+' | '-' | '×' | '÷';
type ScratchLine = 'top' | 'bottom' | 'carry' | 'result';

interface ScratchPadState {
    operation: ScratchOperation;
    top: string;
    bottom: string;
    carry: string;
    result: string;
    activeLine: ScratchLine;
}

const createEmptyScratchPad = (): ScratchPadState => ({
    operation: '+',
    top: '',
    bottom: '',
    carry: '',
    result: '',
    activeLine: 'top',
});

const scratchLineLabels: Record<ScratchLine, string> = {
    top: 'horné číslo',
    bottom: 'dolné číslo',
    carry: 'pomocný riadok',
    result: 'výsledok',
};

const formatScratchDigits = (value: string, width: number) => {
    const chars = value.split('');
    const padding = Math.max(0, width - chars.length);
    return [
        ...Array.from({ length: padding }, (_, index) => <span key={`pad-${index}`} className="scratch-cell scratch-cell-empty" />),
        ...chars.map((char, index) => <span key={`${char}-${index}`} className="scratch-cell">{char}</span>),
    ];
};

const MathScratchPad: React.FC<{
    value: ScratchPadState;
    onChange: React.Dispatch<React.SetStateAction<ScratchPadState>>;
    onClose: () => void;
}> = ({ value, onChange, onClose }) => {
    const isVertical = value.operation !== '÷';
    const width = Math.max(3, value.top.length, value.bottom.length + 1, value.carry.length, value.result.length);
    const appendDigit = (digit: string) => {
        onChange(prev => {
            const current = prev[prev.activeLine];
            const nextValue = prev.activeLine === 'result' && prev.operation !== '÷'
                ? `${digit}${current}`.slice(0, 10)
                : `${current}${digit}`.slice(0, 10);
            return { ...prev, [prev.activeLine]: nextValue };
        });
    };
    const deleteDigit = () => {
        onChange(prev => {
            const current = prev[prev.activeLine];
            const nextValue = prev.activeLine === 'result' && prev.operation !== '÷'
                ? current.slice(1)
                : current.slice(0, -1);
            return { ...prev, [prev.activeLine]: nextValue };
        });
    };

    return (
        <div className="scratch-overlay" role="dialog" aria-modal="true" aria-label="Matematická plocha">
            <div className="scratch-panel">
                <div className="scratch-header">
                    <div>
                        <div className="scratch-title">Matematická plocha</div>
                        <div className="scratch-subtitle">{scratchLineLabels[value.activeLine]}</div>
                    </div>
                    <div className="scratch-actions">
                        <button
                            type="button"
                            className="scratch-icon-btn"
                            aria-label="Vymazať plochu"
                            onClick={() => onChange(createEmptyScratchPad())}
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button type="button" className="scratch-icon-btn" aria-label="Zavrieť plochu" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="scratch-ops" role="group" aria-label="Operácia">
                    {(['+', '-', '×', '÷'] as ScratchOperation[]).map(operation => (
                        <button
                            key={operation}
                            type="button"
                            className={`scratch-op ${value.operation === operation ? 'scratch-op-active' : ''}`}
                            onClick={() => onChange(prev => ({ ...prev, operation }))}
                        >
                            {operation}
                        </button>
                    ))}
                </div>

                <div className="scratch-paper">
                    {isVertical ? (
                        <div className="scratch-vertical" style={{ ['--scratch-cols' as string]: width }}>
                            <button
                                type="button"
                                className={`scratch-row scratch-row-carry ${value.activeLine === 'carry' ? 'scratch-row-active' : ''}`}
                                onClick={() => onChange(prev => ({ ...prev, activeLine: 'carry' }))}
                            >
                                <span className="scratch-op-slot" />
                                <span className="scratch-digits">{formatScratchDigits(value.carry, width)}</span>
                            </button>
                            <button
                                type="button"
                                className={`scratch-row ${value.activeLine === 'top' ? 'scratch-row-active' : ''}`}
                                onClick={() => onChange(prev => ({ ...prev, activeLine: 'top' }))}
                            >
                                <span className="scratch-op-slot" />
                                <span className="scratch-digits">{formatScratchDigits(value.top, width)}</span>
                            </button>
                            <button
                                type="button"
                                className={`scratch-row ${value.activeLine === 'bottom' ? 'scratch-row-active' : ''}`}
                                onClick={() => onChange(prev => ({ ...prev, activeLine: 'bottom' }))}
                            >
                                <span className="scratch-op-slot">{value.operation}</span>
                                <span className="scratch-digits">{formatScratchDigits(value.bottom, width)}</span>
                            </button>
                            <div className="scratch-line" />
                            <button
                                type="button"
                                className={`scratch-row scratch-row-result ${value.activeLine === 'result' ? 'scratch-row-active' : ''}`}
                                onClick={() => onChange(prev => ({ ...prev, activeLine: 'result' }))}
                            >
                                <span className="scratch-op-slot" />
                                <span className="scratch-digits">{formatScratchDigits(value.result, width)}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="scratch-division">
                            <button
                                type="button"
                                className={`scratch-inline-number ${value.activeLine === 'top' ? 'scratch-row-active' : ''}`}
                                onClick={() => onChange(prev => ({ ...prev, activeLine: 'top' }))}
                            >
                                {value.top || '?'}
                            </button>
                            <span>÷</span>
                            <button
                                type="button"
                                className={`scratch-inline-number ${value.activeLine === 'bottom' ? 'scratch-row-active' : ''}`}
                                onClick={() => onChange(prev => ({ ...prev, activeLine: 'bottom' }))}
                            >
                                {value.bottom || '?'}
                            </button>
                            <span>=</span>
                            <button
                                type="button"
                                className={`scratch-inline-number ${value.activeLine === 'result' ? 'scratch-row-active' : ''}`}
                                onClick={() => onChange(prev => ({ ...prev, activeLine: 'result' }))}
                            >
                                {value.result || '?'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="scratch-keypad">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
                        <button key={digit} type="button" className="scratch-key" onClick={() => appendDigit(String(digit))}>
                            {digit}
                        </button>
                    ))}
                    <button type="button" className="scratch-key scratch-key-muted" onClick={deleteDigit}>
                        <Delete size={20} />
                    </button>
                    <button type="button" className="scratch-key" onClick={() => appendDigit('0')}>
                        0
                    </button>
                    <button
                        type="button"
                        className="scratch-key scratch-key-muted"
                        onClick={() => onChange(prev => ({ ...prev, [prev.activeLine]: '' }))}
                    >
                        C
                    </button>
                </div>
            </div>
        </div>
    );
};

const IndianDivisionDisplay: React.FC<{ problem: Problem; stepIndex: number }> = ({ problem, stepIndex }) => {
    const indian = problem.indianDivision!;
    const digits = indian.dividend.toString().split('');
    const solvedQuotient = indian.steps.slice(0, stepIndex).map(step => step.quotientDigit).join('');
    const currentPartial = indian.steps[stepIndex]?.partialDividend ?? indian.steps[indian.steps.length - 1].partialDividend;
    const currentDigitIndex = stepIndex;

    return (
        <div className="text-center">
            <div style={{ fontSize: '2.6rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2, padding: '0 1rem' }}>
                <span style={{ color: currentDigitIndex === 0 ? '#facc15' : 'white' }}>{digits[0]}</span>
                {digits.slice(1).map((digit, offset) => {
                    const index = offset + 1;
                    const previousStepIndex = index - 1;
                    const solvedRemainder = previousStepIndex < stepIndex
                        ? indian.steps[previousStepIndex].remainder.toString()
                        : null;
                    const showCurrentRemainderPlaceholder = previousStepIndex === stepIndex;
                    const isCurrentDigit = index === currentDigitIndex;
                    const superscriptText = showCurrentRemainderPlaceholder ? '#' : solvedRemainder;
                    const superscriptColor = showCurrentRemainderPlaceholder
                        ? '#f97316'
                        : previousStepIndex === stepIndex - 1
                            ? '#facc15'
                            : '#93c5fd';

                    return (
                        <React.Fragment key={`${digit}-${index}`}>
                            {superscriptText !== null && (
                                <sup
                                    style={{
                                        color: superscriptColor,
                                        fontSize: '1.05rem',
                                        margin: '0 0.03rem',
                                        verticalAlign: 'super',
                                    }}
                                >
                                    {superscriptText}
                                </sup>
                            )}
                            <span style={{ color: isCurrentDigit ? '#facc15' : 'white' }}>{digit}</span>
                        </React.Fragment>
                    );
                })}
                {stepIndex === indian.steps.length - 1 && <sup style={{ color: '#f97316', fontSize: '1.05rem', marginLeft: '0.03rem' }}>#</sup>}
                <span style={{ marginLeft: '0.5rem', color: '#facc15' }}>÷ {indian.divisor}</span>
                <span style={{ marginLeft: '0.5rem' }}>= {solvedQuotient}<span style={{ color: '#93c5fd' }}>?</span></span>
            </div>
            <div style={{ color: '#facc15', fontSize: '1.1rem', fontWeight: 700 }}>
                Počítaš {currentPartial}:{indian.divisor}=?, zvyšok=#
            </div>
        </div>
    );
};

const LongDivisionDisplay: React.FC<{ problem: Problem; stepIndex: number }> = ({ problem, stepIndex }) => {
    const data = problem.longDivision!;
    const digits = data.dividend.toString().split('');
    const numDigits = digits.length;
    const totalCols = numDigits + 1; // +1 pre stĺpec mínus znamienka vľavo
    const colWidth = '1.7rem';
    const cellHeight = '1.9rem';
    const completedQuotient = data.steps.slice(0, stepIndex).map(s => s.quotientDigit).join('');
    const showPlaceholder = stepIndex < numDigits;
    const currentPartial = data.steps[stepIndex]?.partialDividend ?? data.steps[data.steps.length - 1].partialDividend;

    type Row =
        | { kind: 'cells'; cells: (string | null)[]; color?: string }
        | { kind: 'border'; startCol: number; endCol: number };

    const rows: Row[] = [];

    // Riadok 1 — cifry delenca, posunuté o 1 stĺpec doprava (kvôli mínus stĺpcu)
    const dividendCells: (string | null)[] = Array.from({ length: totalCols }, () => null);
    digits.forEach((d, i) => { dividendCells[1 + i] = d; });
    rows.push({ kind: 'cells', cells: dividendCells });

    for (let i = 0; i < stepIndex; i++) {
        const step = data.steps[i];
        const product = step.quotientDigit * data.divisor;
        const productStr = product.toString();
        const partialEndCol = 1 + i;
        const productStartCol = partialEndCol - productStr.length + 1;

        // Mínus a product
        const minusCells: (string | null)[] = Array.from({ length: totalCols }, () => null);
        minusCells[productStartCol - 1] = '−';
        for (let j = 0; j < productStr.length; j++) {
            minusCells[productStartCol + j] = productStr[j];
        }
        rows.push({ kind: 'cells', cells: minusCells, color: i === stepIndex - 1 ? '#facc15' : '#cbd5e1' });

        // Vodorovná čiara pod mínus
        rows.push({ kind: 'border', startCol: productStartCol, endCol: partialEndCol + 1 });

        // Zvyšok + znesená ďalšia cifra
        const remainderCells: (string | null)[] = Array.from({ length: totalCols }, () => null);
        const remainderStr = step.remainder.toString();
        const remainderStartCol = partialEndCol - remainderStr.length + 1;
        for (let j = 0; j < remainderStr.length; j++) {
            remainderCells[remainderStartCol + j] = remainderStr[j];
        }
        if (i + 1 < numDigits) {
            remainderCells[1 + i + 1] = digits[i + 1];
        }
        rows.push({ kind: 'cells', cells: remainderCells, color: '#93c5fd' });
    }

    return (
        <div className="text-center">
            <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.2 }}>
                <span>{data.dividend} : {data.divisor} = </span>
                <span>{completedQuotient}</span>
                {showPlaceholder && <span style={{ color: '#93c5fd' }}>?</span>}
            </div>
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', fontFamily: 'monospace' }}>
                {rows.map((row, rowIdx) => (
                    <div key={rowIdx} style={{ display: 'flex' }}>
                        {Array.from({ length: totalCols }).map((_, colIdx) => {
                            if (row.kind === 'border') {
                                const inside = colIdx >= row.startCol && colIdx < row.endCol;
                                return (
                                    <div
                                        key={colIdx}
                                        style={{
                                            width: colWidth,
                                            height: '0.35rem',
                                            borderTop: inside ? '2px solid white' : undefined,
                                        }}
                                    />
                                );
                            }
                            return (
                                <div
                                    key={colIdx}
                                    style={{
                                        width: colWidth,
                                        height: cellHeight,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.4rem',
                                        fontWeight: 800,
                                        color: row.color ?? 'white',
                                    }}
                                >
                                    {row.cells[colIdx] ?? ''}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            {showPlaceholder && (
                <div style={{ color: '#facc15', fontSize: '1.05rem', fontWeight: 700, marginTop: '0.5rem' }}>
                    Počítaš {currentPartial} : {data.divisor} = ?, zvyšok = ?
                </div>
            )}
        </div>
    );
};

const LargeMultiplicationDisplay: React.FC<{ problem: Problem; stepIndex: number; carryInput: string }> = ({ problem, stepIndex, carryInput }) => {
    const data = problem.largeMultiplication!;
    const multiplicandDigits = data.multiplicand.toString().split('');
    const productDigits = data.product.toString().split('');
    const solvedDigits = data.steps.slice(0, stepIndex).map(step => step.resultDigit.toString());
    const currentStep = data.steps[stepIndex] ?? data.steps[data.steps.length - 1];
    const activeDigitIndex = multiplicandDigits.length - 1 - currentStep.position;
    const resultSlots = productDigits.map((_, index): { value: string; kind: 'solved' | 'current' | 'carry' | 'empty' } => {
        const productPosition = productDigits.length - 1 - index;
        const solved = solvedDigits[productPosition];
        if (solved !== undefined) return { value: solved, kind: 'solved' };
        if (productPosition === currentStep.position) return { value: '?', kind: 'current' };
        if (stepIndex === data.steps.length - 1 && productPosition === currentStep.position + 1) {
            return { value: carryInput || '#', kind: 'carry' };
        }
        return { value: '', kind: 'empty' };
    });

    return (
        <div className="text-center">
            <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${productDigits.length + 1}, minmax(1.6rem, 2rem))`, gap: '0.15rem', fontFamily: 'monospace', alignItems: 'center' }}>
                <div />
                {Array.from({ length: productDigits.length }).map((_, index) => {
                    const multiplicandIndex = index - (productDigits.length - multiplicandDigits.length);
                    const digit = multiplicandDigits[multiplicandIndex] ?? '';
                    const isActive = multiplicandIndex === activeDigitIndex;
                    return (
                        <div key={`top-${index}`} style={{ fontSize: '2rem', fontWeight: 800, color: isActive ? '#facc15' : 'white' }}>
                            {digit}
                        </div>
                    );
                })}
                <div style={{ fontSize: '1.8rem', color: '#94a3b8' }}>×</div>
                {Array.from({ length: productDigits.length }).map((_, index) => (
                    <div key={`mul-${index}`} style={{ fontSize: '2rem', fontWeight: 800 }}>
                        {index === productDigits.length - 1 ? data.multiplier : ''}
                    </div>
                ))}
                <div />
                <div style={{ gridColumn: `span ${productDigits.length}`, borderTop: '2px solid white', height: '0.35rem' }} />
                <div />
                {resultSlots.map((slot, index) => (
                    <div key={`res-${index}`} style={{ fontSize: '2rem', fontWeight: 800, color: slot.kind === 'current' || slot.kind === 'carry' ? '#93c5fd' : '#22c55e' }}>
                        {slot.value}
                    </div>
                ))}
            </div>
            <div style={{ color: '#facc15', fontSize: '1.05rem', fontWeight: 700, marginTop: '0.75rem' }}>
                {currentStep.position === 0
                    ? `Počítaš ${currentStep.digit} × ${data.multiplier}.`
                    : `Počítaš ${currentStep.digit} × ${data.multiplier} a prenos ${carryInput || '#'} z minulého stĺpca.`}
            </div>
        </div>
    );
};

// Jeden pruh rovnakej dĺžky rozdelený na `den` dielikov, prvých `num` vyfarbených.
const FractionBar: React.FC<{ num: number; den: number }> = ({ num, den }) => {
    const width = 240;
    const height = 34;
    const cell = width / den;
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${num} z ${den}`}>
            {Array.from({ length: den }).map((_, i) => (
                <rect key={i} x={i * cell} y={1} width={cell} height={height - 2} fill={i < num ? FRACTION_FILL : FRACTION_EMPTY} stroke={FRACTION_STROKE} strokeWidth={1.5} />
            ))}
        </svg>
    );
};

const FractionCompareBars: React.FC<{ leftNum: number; leftDen: number; rightNum: number; rightDen: number }> = ({ leftNum, leftDen, rightNum, rightDen }) => {
    const row = (label: string, num: number, den: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ color: '#f8fafc', fontWeight: 900, fontSize: '1.4rem', minWidth: '2.6rem', textAlign: 'right' }}>{label}</span>
            <FractionBar num={num} den={den} />
        </div>
    );
    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.6rem' }}>
            {row(`${leftNum}⁄${leftDen}`, leftNum, leftDen)}
            {row(`${rightNum}⁄${rightDen}`, rightNum, rightDen)}
        </div>
    );
};

// Desatinná číselná os so značkou (šípkou) — žiak prečíta hodnotu.
const DecimalNumberLineView: React.FC<{ min: number; max: number; step: number; mark: number }> = ({ min, max, step, mark }) => {
    const W = 320;
    const H = 72;
    const pad = 22;
    const axisY = 46;
    const scale = (v: number) => pad + ((v - min) / (max - min)) * (W - 2 * pad);
    const ticks: number[] = [];
    for (let v = min; v <= max + 1e-9; v = Math.round((v + step) * 1000) / 1000) ticks.push(Math.round(v * 1000) / 1000);
    const fmt = (v: number) => String(Math.round(v * 1000) / 1000).replace('.', ',');
    const markX = scale(mark);
    return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Číselná os">
            <line x1={scale(min) - 8} y1={axisY} x2={scale(max) + 8} y2={axisY} stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" />
            {ticks.map((t, i) => {
                const isLabeled = i === 0 || i === ticks.length - 1;
                return (
                    <g key={i}>
                        <line x1={scale(t)} y1={axisY - 5} x2={scale(t)} y2={axisY + 5} stroke="#94a3b8" strokeWidth={1.5} />
                        {isLabeled && <text x={scale(t)} y={axisY + 20} textAnchor="middle" fontSize="12" fill="#cbd5e1" fontWeight="700">{fmt(t)}</text>}
                    </g>
                );
            })}
            <path d={`M ${markX} ${axisY - 6} L ${markX - 6} ${axisY - 20} L ${markX + 6} ${axisY - 20} Z`} fill="#dc2626" />
            <line x1={markX} y1={axisY - 6} x2={markX} y2={axisY - 20} stroke="#dc2626" strokeWidth={2} />
        </svg>
    );
};

const FractionAnswerInput: React.FC<{
    numerator: string;
    denominator: string;
    activeField: 'num' | 'den';
    onSelect: (field: 'num' | 'den') => void;
    status: SessionStatus;
}> = ({ numerator, denominator, activeField, onSelect, status }) => {
    const frameColor = status === 'CORRECT'
        ? 'rgba(34,197,94,0.75)'
        : status === 'WRONG'
            ? 'rgba(239,68,68,0.75)'
            : 'rgba(96,165,250,0.45)';

    const fieldStyle = (active: boolean): React.CSSProperties => ({
        minWidth: '5.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '0.6rem',
        fontSize: '2.4rem',
        fontWeight: 900,
        fontFamily: 'monospace',
        lineHeight: 1,
        color: '#f8fafc',
        background: active ? 'rgba(96,165,250,0.25)' : 'rgba(15,23,42,0.6)',
        border: active ? '2px solid rgba(147,197,253,0.9)' : '2px solid rgba(148,163,184,0.35)',
        cursor: 'pointer',
    });

    return (
        <div
            style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.1rem',
                padding: '0.9rem 1.4rem',
                borderRadius: '0.9rem',
                border: `2px solid ${frameColor}`,
                background: 'rgba(15,23,42,0.78)',
                boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
            }}
        >
            <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Tvoja odpoveď
            </div>
            <button type="button" style={fieldStyle(activeField === 'num')} onClick={() => onSelect('num')}>
                {numerator || '?'}
            </button>
            <div style={{ width: '6.5rem', height: '4px', background: '#f8fafc', borderRadius: '2px', margin: '0.45rem 0' }} />
            <button type="button" style={fieldStyle(activeField === 'den')} onClick={() => onSelect('den')}>
                {denominator || '?'}
            </button>
            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                hore čitateľ · dole menovateľ
            </div>
        </div>
    );
};

const GameSession: React.FC<Props> = ({ settings, totalProblems, initialProblems = [], onComplete, onExit }) => {
    const [problems, setProblems] = useState<Problem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [status, setStatus] = useState<SessionStatus>('IDLE');
    const [results, setResults] = useState<TrainingResult[]>([]);
    const [feedback, setFeedback] = useState<string[]>([]);
    const [feedbackTitle, setFeedbackTitle] = useState('Riešenie:');
    const [guidedCorrection, setGuidedCorrection] = useState<GuidedCorrection | null>(null);
    const [guidedWarmup, setGuidedWarmup] = useState<GuidedCorrection | null>(null);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [loading, setLoading] = useState(true);
    const [indianStepIndex, setIndianStepIndex] = useState(0);
    const [indianQuotientInput, setIndianQuotientInput] = useState('');
    const [indianRemainderInput, setIndianRemainderInput] = useState('');
    const [indianActiveField, setIndianActiveField] = useState<'quotient' | 'remainder'>('quotient');
    const [largeMulStepIndex, setLargeMulStepIndex] = useState(0);
    const [largeMulDigitInput, setLargeMulDigitInput] = useState('');
    const [largeMulCarryInput, setLargeMulCarryInput] = useState('');
    const [largeMulActiveField, setLargeMulActiveField] = useState<'digit' | 'carry'>('digit');
    const [fractionNum, setFractionNum] = useState('');
    const [fractionDen, setFractionDen] = useState('');
    const [fractionActiveField, setFractionActiveField] = useState<'num' | 'den'>('num');
    const [pendingStepCompletion, setPendingStepCompletion] = useState<{
        result: TrainingResult;
        title: string;
        lines: string[];
    } | null>(null);
    const [directAnswer, setDirectAnswer] = useState<{ value: number; label: string } | null>(null);
    const [selectedWordOperation, setSelectedWordOperation] = useState<WordProblemOperation | null>(null);
    const [wordOperationError, setWordOperationError] = useState(false);
    const [wordIntermediateSolved, setWordIntermediateSolved] = useState(false);
    const [wordIntermediateError, setWordIntermediateError] = useState(false);
    const [streak, setStreak] = useState(0);
    const [scratchPadOpen, setScratchPadOpen] = useState(false);
    const [scratchPad, setScratchPad] = useState<ScratchPadState>(() => createEmptyScratchPad());
    const trainingMode = settings.trainingMode ?? 'learn';
    const isLightningMode = trainingMode === 'lightning';
    const isTestMode = trainingMode === 'test' || isLightningMode;
    const LIGHTNING_TIME = 10;
    const [timeLeft, setTimeLeft] = useState(LIGHTNING_TIME);

    const checkStreak = (correct: boolean) => {
        if (correct) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak > 0 && newStreak % 3 === 0) {
                const phrase = PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)];
                speakText(phrase);
            }
        } else {
            setStreak(0);
        }
    };

    const handleTimeOut = () => {
        const resultItem = {
            problem: currentProblem,
            userAnswer: 'Čas vypršal',
            correct: false,
            diagnosis: 'Príliš dlhé rozmýšľanie. Skús nabudúce rýchlejšie!',
            diagnosisCode: 'timeout' as const,
            diagnosisTitle: 'časový limit',
        };
        setResults(prev => [...prev, resultItem]);
        checkStreak(false);
        nextProblem(resultItem);
    };

    useEffect(() => {
        if (!isLightningMode || status !== 'IDLE' || loading) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeOut();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isLightningMode, status, loading, currentIndex]);

    useEffect(() => {
        try {
            const generatedProblems: Problem[] = [...initialProblems];
            for (let i = generatedProblems.length; i < totalProblems; i++) {
                generatedProblems.push(generateProblemForActiveSchoolTopic(settings));
            }
            setProblems(generatedProblems);
            setLoading(false);
        } catch (e) {
            console.error(e);
            alert("Nepodarilo sa vyrobiť príklady. Skús ľahšie nastavenia.");
            onExit();
        }
    }, [settings, totalProblems, initialProblems, onExit]);

    useEffect(() => {
        setInputValue('');
        setStatus('IDLE');
        setFeedback([]);
        setFeedbackTitle('Riešenie:');
        setGuidedCorrection(null);
        setGuidedWarmup(null);
        setWrongAttempts(0);
        setIndianStepIndex(0);
        setIndianQuotientInput('');
        setIndianRemainderInput('');
        setIndianActiveField('quotient');
        setLargeMulStepIndex(0);
        setLargeMulDigitInput('');
        setLargeMulCarryInput('');
        setLargeMulActiveField('digit');
        setFractionNum('');
        setFractionDen('');
        setFractionActiveField('num');
        setPendingStepCompletion(null);
        setDirectAnswer(null);
        setSelectedWordOperation(null);
        setWordOperationError(false);
        setWordIntermediateSolved(false);
        setWordIntermediateError(false);
        setScratchPadOpen(false);
        setScratchPad(createEmptyScratchPad());
        setTimeLeft(LIGHTNING_TIME);
    }, [currentIndex]);

    const currentProblem = problems[currentIndex];

    useEffect(() => {
        if (!currentProblem || trainingMode !== 'learn') {
            setGuidedWarmup(null);
            return;
        }

        const shouldGuideEarlyGrade = settings.schoolGrade === 'grade1' || settings.schoolGrade === 'grade2';
        setGuidedWarmup(shouldGuideEarlyGrade ? createEarlyGradeGuidance(currentProblem) : null);
    }, [currentProblem, settings.schoolGrade, trainingMode]);

    const handleInput = (char: string) => {
        if (status !== 'IDLE' || !currentProblem) return;

        if (guidedWarmup && !guidedWarmup.solved && char !== 'DEL') {
            setFeedbackTitle('Najprv medzikrok:');
            setFeedback(['Vyrieš najprv malý krok nad odpoveďou. Potom budeš môcť zadať výsledok.']);
            return;
        }

        if (isLargeMultiplicationProblem(currentProblem)) {
            if (char === 'DEL') {
                if (largeMulActiveField === 'digit') {
                    setLargeMulDigitInput(prev => prev.slice(0, -1));
                } else {
                    setLargeMulCarryInput(prev => prev.slice(0, -1));
                }
                return;
            }

            if (char === 'ENTER') {
                submitAnswer();
                return;
            }

            if (char === '-' || char === '.') return;

            if (largeMulActiveField === 'digit') {
                setLargeMulDigitInput(prev => prev + char);
            } else {
                setLargeMulCarryInput(prev => prev + char);
            }
            return;
        }

        if (isStepDivisionProblem(currentProblem)) {
            if (char === 'DEL') {
                if (indianActiveField === 'quotient') {
                    setIndianQuotientInput(prev => prev.slice(0, -1));
                } else {
                    setIndianRemainderInput(prev => prev.slice(0, -1));
                }
                return;
            }

            if (char === 'ENTER') {
                submitAnswer();
                return;
            }

            if (char === '-' || char === '.') return;

            if (indianActiveField === 'quotient') {
                setIndianQuotientInput(prev => prev + char);
            } else {
                setIndianRemainderInput(prev => prev + char);
            }
            return;
        }

        if (isFractionAnswerProblem(currentProblem)) {
            if (char === 'DEL') {
                if (fractionActiveField === 'num') {
                    setFractionNum(prev => prev.slice(0, -1));
                } else {
                    setFractionDen(prev => prev.slice(0, -1));
                }
                return;
            }

            if (char === 'ENTER') {
                submitAnswer();
                return;
            }

            if (char === '-' || char === '.') return;

            if (fractionActiveField === 'num') {
                setFractionNum(prev => (prev + char).slice(0, 3));
            } else {
                setFractionDen(prev => (prev + char).slice(0, 3));
            }
            return;
        }

        if (char === 'DEL') {
            setInputValue(prev => prev.slice(0, -1));
        } else if (char === 'ENTER') {
            submitAnswer();
        } else if (char === '-') {
            if (inputValue === '') setInputValue('-');
        } else if (char === '.') {
            if (!inputValue.includes('.')) {
                setInputValue(prev => prev + '.');
            }
        } else {
            setInputValue(prev => prev + char);
        }
    };

    const nextProblem = (latestResult?: TrainingResult) => {
        setStatus('IDLE');
        setInputValue('');
        setFeedback([]);
        setFeedbackTitle('Riešenie:');
        setGuidedCorrection(null);
        setGuidedWarmup(null);
        setWrongAttempts(0);
        setIndianStepIndex(0);
        setIndianQuotientInput('');
        setIndianRemainderInput('');
        setIndianActiveField('quotient');
        setLargeMulStepIndex(0);
        setLargeMulDigitInput('');
        setLargeMulCarryInput('');
        setLargeMulActiveField('digit');
        setFractionNum('');
        setFractionDen('');
        setFractionActiveField('num');
        setPendingStepCompletion(null);
        setDirectAnswer(null);
        setSelectedWordOperation(null);
        setWordOperationError(false);
        setWordIntermediateSolved(false);
        setWordIntermediateError(false);

        if (currentIndex + 1 >= problems.length) {
            if (latestResult) {
                onComplete([...results, latestResult]);
            } else {
                onComplete(results);
            }
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const submitStepDivisionStep = () => {
        const data = getStepDivisionData(currentProblem)!;
        if (!indianQuotientInput || !indianRemainderInput) return;

        const quotientDigit = parseInt(indianQuotientInput, 10);
        const remainder = parseInt(indianRemainderInput, 10);
        const currentStep = data.steps[indianStepIndex];
        const isCorrect = quotientDigit === currentStep.quotientDigit && remainder === currentStep.remainder;

        if (isCorrect) {
            setStatus('CORRECT');

            if (indianStepIndex + 1 >= data.steps.length) {
                checkStreak(true);
                const quotientText = data.steps.map(step => step.quotientDigit).join('');
                const answerText = `výsledok=${quotientText}, zvyšok=${data.remainder}`;
                const resultItem = { problem: currentProblem, userAnswer: answerText, correct: true };
                setResults(prev => [...prev, resultItem]);
                setPendingStepCompletion({
                    result: resultItem,
                    title: 'Hotovo',
                    lines: [
                        `${data.dividend} : ${data.divisor} = ${quotientText}`,
                        `Zvyšok je ${data.remainder}.`,
                    ],
                });
                return;
            }

            setTimeout(() => {
                setIndianStepIndex(prev => prev + 1);
                setIndianQuotientInput('');
                setIndianRemainderInput('');
                setIndianActiveField('quotient');
                setStatus('IDLE');
            }, 700);
            return;
        }

        checkStreak(false);
        if (isTestMode) {
            recordStepDivisionWrongAndContinue(quotientDigit, remainder);
            return;
        }

        if (wrongAttempts === 0) {
            setWrongAttempts(1);
            setStatus('HINT');
            setFeedbackTitle('Nápoveda:');
            const quotientWrong = quotientDigit !== currentStep.quotientDigit;
            const remainderWrong = remainder !== currentStep.remainder;
            setFeedback(quotientWrong && remainderWrong
                ? [
                    `Deliš iba aktuálnu časť: ${currentStep.partialDividend} : ${data.divisor}.`,
                    `Hľadaj najväčšiu cifru, ktorej násobok čísla ${data.divisor} neprekročí ${currentStep.partialDividend}.`,
                ]
                : quotientWrong
                    ? [
                        `Zvyšok skontrolujeme až po cifre. Najprv hľadaj cifru pre ${currentStep.partialDividend} : ${data.divisor}.`,
                        `Skús násobky čísla ${data.divisor}.`,
                    ]
                    : [
                        `Cifra vyzerá dobre. Teraz skontroluj zvyšok.`,
                        `${currentStep.quotientDigit} × ${data.divisor} = ${currentStep.quotientDigit * data.divisor}. Koľko zostane do ${currentStep.partialDividend}?`,
                    ]);
            return;
        }

        setStatus('WRONG');
        setFeedbackTitle('Postup:');
        setFeedback(explainProblem(currentProblem).steps);
    };

    const submitLargeMultiplicationStep = () => {
        const data = currentProblem.largeMultiplication!;
        if (!largeMulDigitInput || !largeMulCarryInput) return;

        const digit = parseInt(largeMulDigitInput, 10);
        const carry = parseInt(largeMulCarryInput, 10);
        const currentStep = data.steps[largeMulStepIndex];
        const isCorrect = digit === currentStep.resultDigit && carry === currentStep.carryOut;

        if (isCorrect) {
            setStatus('CORRECT');

            if (largeMulStepIndex + 1 >= data.steps.length) {
                checkStreak(true);
                const resultItem = { problem: currentProblem, userAnswer: data.product, correct: true };
                setResults(prev => [...prev, resultItem]);
                setPendingStepCompletion({
                    result: resultItem,
                    title: 'Hotovo',
                    lines: [
                        `${data.multiplicand} × ${data.multiplier} = ${data.product}`,
                        'Celý výsledok je poskladaný z cifier pod čiarou.',
                    ],
                });
                return;
            }

            setTimeout(() => {
                setLargeMulStepIndex(prev => prev + 1);
                setLargeMulDigitInput('');
                setLargeMulCarryInput('');
                setLargeMulActiveField('digit');
        setFractionNum('');
        setFractionDen('');
        setFractionActiveField('num');
                setStatus('IDLE');
            }, 700);
            return;
        }

        checkStreak(false);
        if (isTestMode) {
            recordLargeMultiplicationWrongAndContinue(digit, carry);
            return;
        }

        if (wrongAttempts === 0) {
            setWrongAttempts(1);
            setStatus('HINT');
            setFeedbackTitle('Nápoveda:');
            setFeedback([
                `Počítaj iba označenú cifru: ${currentStep.digit} × ${data.multiplier}.`,
                currentStep.position === 0
                    ? 'Jednotky zapíš pod čiaru, desiatky prenes do ďalšieho stĺpca.'
                    : 'Nezabudni pripočítať prenos, ktorý si si sám vytvoril v minulom stĺpci.',
            ]);
            return;
        }

        setStatus('WRONG');
        setFeedbackTitle('Postup:');
        if (currentStep.position === 0) {
            setFeedback([
                `Prvý stĺpec počítaš ako ${currentStep.digit} × ${data.multiplier}.`,
                'Z výsledku zapíš jednotky pod čiaru.',
                'Desiatky prenes do ďalšieho stĺpca.',
            ]);
            return;
        }

        const previousStep = data.steps[currentStep.position - 1];
        setFeedback([
            previousStep.carryIn > 0
                ? `Predchádzajúci stĺpec: ${previousStep.digit} × ${data.multiplier} + prenos ${previousStep.carryIn} = ${previousStep.partialProduct}.`
                : `Predchádzajúci stĺpec: ${previousStep.digit} × ${data.multiplier} = ${previousStep.partialProduct}.`,
            `Zapísali sme ${previousStep.resultDigit} a preniesli ${previousStep.carryOut}.`,
            `Aktuálny stĺpec: ${currentStep.digit} × ${data.multiplier} = ${currentStep.digit * data.multiplier}.`,
            `Teraz k tomu pripočítaj prenos ${previousStep.carryOut} z predchádzajúceho stĺpca.`,
        ]);
    };

    const createWrongResult = (userAnswer: number | string): TrainingResult => {
        const diagnosis = diagnoseAnswerDetailed(currentProblem, userAnswer);
        return {
            problem: currentProblem,
            userAnswer,
            correct: false,
            diagnosis: diagnosis.message,
            diagnosisCode: diagnosis.code,
            diagnosisTitle: diagnosis.title,
        };
    };

    const createStepDivisionWrongResult = (
        quotientDigit: number | null,
        remainder: number | null,
    ): TrainingResult => {
        const data = getStepDivisionData(currentProblem)!;
        const currentStep = data.steps[indianStepIndex];
        const quotientWrong = quotientDigit !== currentStep.quotientDigit;
        const remainderWrong = remainder !== currentStep.remainder;
        const diagnosisCode: ErrorDiagnosisCode = quotientWrong && remainderWrong
            ? 'step_division_both'
            : quotientWrong
                ? 'step_division_quotient'
                : 'step_division_remainder';
        const diagnosisTitle = diagnosisCode === 'step_division_both'
            ? 'cifra aj zvyšok v delení'
            : diagnosisCode === 'step_division_quotient'
                ? 'cifra podielu v delení'
                : 'zvyšok v kroku delenia';
        const expected = `${currentStep.partialDividend} : ${data.divisor} = ${currentStep.quotientDigit}, zvyšok ${currentStep.remainder}`;
        const message = quotientWrong && remainderWrong
            ? `V tomto kroku nesedí cifra výsledku ani zvyšok. Počítaj ${expected}.`
            : quotientWrong
                ? `Zvyšok môže byť správny, ale cifra výsledku nesedí. V tomto kroku platí ${expected}.`
                : `Cifra výsledku môže byť správna, ale zvyšok nesedí. Skontroluj: ${currentStep.quotientDigit} × ${data.divisor} a čo zostane do ${currentStep.partialDividend}.`;

        return {
            problem: currentProblem,
            userAnswer: `?=${quotientDigit ?? '-'}, #=${remainder ?? '-'}`,
            correct: false,
            diagnosis: message,
            diagnosisCode,
            diagnosisTitle,
        };
    };

    const createLargeMultiplicationWrongResult = (
        digit: number | null,
        carry: number | null,
    ): TrainingResult => {
        const data = currentProblem.largeMultiplication!;
        const currentStep = data.steps[largeMulStepIndex];
        return {
            problem: currentProblem,
            userAnswer: `cifra=${digit ?? '-'}, prenos=${carry ?? '-'}`,
            correct: false,
            diagnosis: currentStep.position === 0
                ? `V tomto stĺpci najprv počítaj ${currentStep.digit} × ${data.multiplier}. Potom urč cifru pod čiaru a prenos do ďalšieho stĺpca.`
                : `V tomto stĺpci najprv počítaj ${currentStep.digit} × ${data.multiplier} a pripočítaj prenos, ktorý vznikol v minulom stĺpci.`,
            diagnosisCode: 'multiplication_table',
            diagnosisTitle: 'písomné násobenie',
        };
    };

    const createWordIntermediateWrongResult = (userAnswer: number | string): TrainingResult => ({
        problem: currentProblem,
        userAnswer,
        correct: false,
        diagnosis: 'Prvý krok slovnej úlohy ešte nesedí. Najprv vypočítaj medzivýsledok a až potom dokonči odpoveď.',
        diagnosisCode: 'word_problem_intermediate',
        diagnosisTitle: 'medzivýsledok slovnej úlohy',
    });

    const recordWrongAndContinue = (userAnswer: number | string) => {
        const resultItem = createWrongResult(userAnswer);

        setResults(prev => [...prev, resultItem]);
        nextProblem(resultItem);
    };

    const recordStepDivisionWrongAndContinue = (quotientDigit: number | null, remainder: number | null) => {
        const resultItem = createStepDivisionWrongResult(quotientDigit, remainder);

        setResults(prev => [...prev, resultItem]);
        nextProblem(resultItem);
    };

    const recordLargeMultiplicationWrongAndContinue = (digit: number | null, carry: number | null) => {
        const resultItem = createLargeMultiplicationWrongResult(digit, carry);

        setResults(prev => [...prev, resultItem]);
        nextProblem(resultItem);
    };

    const showProgressiveHint = (explanation: ReturnType<typeof explainProblem>) => {
        const hints = explanation.hints ?? [];

        if (wrongAttempts === 0) {
            const guided = createGuidedCorrection(currentProblem);
            if (guided) {
                setWrongAttempts(1);
                setStatus('HINT');
                setGuidedCorrection(guided);
                setFeedbackTitle('Kontrolný medzikrok:');
                setFeedback([guided.question]);
                return;
            }

            setWrongAttempts(1);
            setStatus('HINT');
            const primary = hints[0];
            setFeedbackTitle(primary?.title ? `Nápoveda — ${primary.title}:` : 'Nápoveda:');
            setFeedback([primary?.text ?? explanation.hint]);
            return;
        }

        if (wrongAttempts === 1 && hints.length > 1) {
            setWrongAttempts(2);
            setStatus('HINT');
            setFeedbackTitle(`Iná stratégia — ${hints[1].title}:`);
            setFeedback([hints[1].text]);
            return;
        }

        setStatus('WRONG');
        setFeedbackTitle('Postup:');
        setFeedback(explanation.steps);
    };

    const submitAnswer = () => {
        if (!currentProblem) return;

        if (isLargeMultiplicationProblem(currentProblem)) {
            submitLargeMultiplicationStep();
            return;
        }

        if (isStepDivisionProblem(currentProblem)) {
            submitStepDivisionStep();
            return;
        }

        if (isFractionAnswerProblem(currentProblem)) {
            submitFractionAnswer();
            return;
        }

        const expectedWordOperation = getWordProblemOperation(currentProblem);
        if (guidedWarmup && !guidedWarmup.solved) {
            setFeedbackTitle('Najprv medzikrok:');
            setFeedback(['Vyrieš najprv malý krok nad odpoveďou. Potom budeš môcť zadať výsledok.']);
            return;
        }

        if (expectedWordOperation && !selectedWordOperation) {
            setWordOperationError(true);
            setFeedbackTitle('Najprv operácia:');
            setFeedback(['Vyber, či sa v úlohe veci spájajú, ubúdajú, opakujú alebo delia na rovnaké časti.']);
            return;
        }

        const firstIntermediateStep = getFirstIntermediateStep(currentProblem);
        if (firstIntermediateStep && !wordIntermediateSolved) {
            if (!inputValue || inputValue === '-') return;

            const intermediateAnswer = toNumericAnswer(inputValue);
            if (intermediateAnswer !== null && Math.abs(intermediateAnswer - firstIntermediateStep.result) < 0.001) {
                setWordIntermediateSolved(true);
                setWordIntermediateError(false);
                setInputValue('');
                setFeedbackTitle('Medzivýsledok hotový:');
                setFeedback([`${firstIntermediateStep.expression} = ${firstIntermediateStep.result}. Teraz dokonči odpoveď.`]);
                return;
            }

            setWordIntermediateError(true);
            checkStreak(false);
            if (isTestMode) {
                const resultItem = createWordIntermediateWrongResult(inputValue);
                setResults(prev => [...prev, resultItem]);
                nextProblem(resultItem);
                return;
            }
            setFeedbackTitle('Skontroluj prvý krok:');
            setFeedback([`Najprv vypočítaj ${firstIntermediateStep.expression}. Tento medzivýsledok použiješ v ďalšom kroku.`]);
            return;
        }

        if (!inputValue || inputValue === '-') return;
        const answerValue = inputValue;
        const isCorrect = isAnswerCorrect(currentProblem, answerValue);

        if (isCorrect) {
            setStatus('CORRECT');
            checkStreak(true);
            const resultItem = { problem: currentProblem, userAnswer: answerValue, correct: true };
            setResults(prev => [...prev, resultItem]);
            setTimeout(() => nextProblem(resultItem), 1000);
        } else {
            checkStreak(false);
            if (isTestMode) {
                recordWrongAndContinue(answerValue);
                return;
            }

            showProgressiveHint(explainProblem(currentProblem));
        }
    };

    const submitFractionAnswer = () => {
        if (!currentProblem || !fractionNum || !fractionDen) return;
        const answer = `${fractionNum}/${fractionDen}`;
        const isCorrect = isAnswerCorrect(currentProblem, answer);

        if (isCorrect) {
            setStatus('CORRECT');
            checkStreak(true);
            const resultItem = { problem: currentProblem, userAnswer: answer, correct: true };
            setResults(prev => [...prev, resultItem]);
            setTimeout(() => nextProblem(resultItem), 1000);
            return;
        }

        checkStreak(false);
        if (isTestMode) {
            recordWrongAndContinue(answer);
            return;
        }

        showProgressiveHint(explainProblem(currentProblem));
    };

    const submitDirectAnswer = (ans: number | string, label: string) => {
        if (!currentProblem || status !== 'IDLE') return;
        setDirectAnswer({ value: ans as any, label });

        const isLogical = currentProblem.metadata?.type === 'logical_sequence';
        let isCorrect = false;

        if (isLogical) {
            const meta = currentProblem.metadata as any;
            isCorrect = ans === meta.fullSequence[meta.fullSequence.length - 1];
        } else {
            isCorrect = isAnswerCorrect(currentProblem, ans as number);
        }

        if (isCorrect) {
            setStatus('CORRECT');
            checkStreak(true);
            const resultItem = { problem: currentProblem, userAnswer: label, correct: true };
            setResults(prev => [...prev, resultItem]);
            setTimeout(() => nextProblem(resultItem), 1000);
            return;
        }

        checkStreak(false);
        if (isTestMode) {
            recordWrongAndContinue(label);
            return;
        }

        showProgressiveHint(explainProblem(currentProblem));
    };

    const handleTryAgain = () => {
        setStatus('IDLE');
        setFeedback([]);
        setFeedbackTitle('Riešenie:');
        setGuidedCorrection(null);
        setGuidedWarmup(null);

        if (isStepDivisionProblem(currentProblem)) {
            setIndianQuotientInput('');
            setIndianRemainderInput('');
            setIndianActiveField('quotient');
            return;
        }

        if (isLargeMultiplicationProblem(currentProblem)) {
            setLargeMulDigitInput('');
            setLargeMulCarryInput('');
            setLargeMulActiveField('digit');
            return;
        }

        if (isFractionAnswerProblem(currentProblem)) {
            setFractionNum('');
            setFractionDen('');
            setFractionActiveField('num');
            return;
        }

        setInputValue('');
        setDirectAnswer(null);
        setSelectedWordOperation(null);
        setWordOperationError(false);
        setWordIntermediateSolved(false);
        setWordIntermediateError(false);
    };

    const handleGuidedWarmupChoice = (answer: number) => {
        if (!guidedWarmup) return;

        const solved = answer === guidedWarmup.correctAnswer;
        setGuidedWarmup({
            ...guidedWarmup,
            selectedAnswer: answer,
            solved,
        });

        if (solved) {
            setFeedback([]);
            setFeedbackTitle('Riešenie:');
            return;
        }

        setFeedbackTitle('Medzikrok:');
        setFeedback(['Ešte nie. Skús nájsť číslo, ktoré ťa dostane presne na celú desiatku.']);
    };

    const handleGuidedCorrectionChoice = (answer: number) => {
        if (!guidedCorrection) return;

        const solved = answer === guidedCorrection.correctAnswer;
        setGuidedCorrection({
            ...guidedCorrection,
            selectedAnswer: answer,
            solved,
        });

        if (solved) {
            setFeedback([
                guidedCorrection.question,
                guidedCorrection.explanation,
                'Teraz skús celý príklad ešte raz.',
            ]);
            return;
        }

        setFeedback([
            guidedCorrection.question,
            `Ešte nie. Hľadáme číslo, ktoré nás dostane presne na desiatku.`,
        ]);
    };

    const handleWordOperationChoice = (operation: WordProblemOperation) => {
        if (!currentProblem || status !== 'IDLE') return;

        const expected = getWordProblemOperation(currentProblem);
        setSelectedWordOperation(operation);

        if (expected && operation !== expected) {
            setWordOperationError(true);
            const diagnosis = diagnoseAnswerDetailed(currentProblem, operation);
            setFeedbackTitle(`Nápoveda — ${diagnosis.title}:`);
            setFeedback([diagnosis.message]);
            return;
        }

        setWordOperationError(false);
        setFeedback([]);
        setFeedbackTitle('Riešenie:');
        setWordIntermediateError(false);
    };

    const handleContinueAfterWrong = () => {
        const resultItem = isLargeMultiplicationProblem(currentProblem)
            ? createLargeMultiplicationWrongResult(
                largeMulDigitInput ? parseInt(largeMulDigitInput, 10) : null,
                largeMulCarryInput ? parseInt(largeMulCarryInput, 10) : null,
            )
            : isStepDivisionProblem(currentProblem)
            ? createStepDivisionWrongResult(
                indianQuotientInput ? parseInt(indianQuotientInput, 10) : null,
                indianRemainderInput ? parseInt(indianRemainderInput, 10) : null,
            )
            : isFractionAnswerProblem(currentProblem)
                ? createWrongResult(`${fractionNum}/${fractionDen}`)
            : wordIntermediateError && firstIntermediateStep
                ? createWordIntermediateWrongResult(inputValue)
            : createWrongResult(wordOperationError && selectedWordOperation
                ? selectedWordOperation
                : directAnswer?.label ?? inputValue);

        const followUp = isTestMode || currentProblem.isAdaptiveFollowUp ? null : createFollowUpProblem(currentProblem);
        if (followUp) {
            setProblems(prev => {
                const next = [...prev];
                const insertIndex = currentIndex + 1;
                next.splice(insertIndex, 0, followUp);
                return next;
            });
            setResults(prev => [...prev, resultItem]);
            setStatus('IDLE');
            setInputValue('');
            setFeedback([]);
            setFeedbackTitle('Riešenie:');
            setGuidedCorrection(null);
            setGuidedWarmup(null);
            setWrongAttempts(0);
            setIndianStepIndex(0);
            setIndianQuotientInput('');
            setIndianRemainderInput('');
            setIndianActiveField('quotient');
            setLargeMulStepIndex(0);
            setLargeMulDigitInput('');
            setLargeMulCarryInput('');
            setLargeMulActiveField('digit');
        setFractionNum('');
        setFractionDen('');
        setFractionActiveField('num');
            setPendingStepCompletion(null);
            setDirectAnswer(null);
            setSelectedWordOperation(null);
            setWordOperationError(false);
            setWordIntermediateSolved(false);
            setWordIntermediateError(false);
            setScratchPadOpen(false);
            setScratchPad(createEmptyScratchPad());
            setCurrentIndex(prev => prev + 1);
            return;
        }

        setResults(prev => [...prev, resultItem]);
        nextProblem(resultItem);
    };

    const handleContinueAfterCorrectStep = () => {
        if (!pendingStepCompletion) return;
        nextProblem(pendingStepCompletion.result);
    };

    if (loading) return <div className="p-8 text-center">Pripravujem príklady...</div>;
    if (!currentProblem) return null;

    const stepDivisionData = isStepDivisionProblem(currentProblem) ? getStepDivisionData(currentProblem)! : null;
    const largeMultiplicationData = isLargeMultiplicationProblem(currentProblem) ? currentProblem.largeMultiplication! : null;
    const fractionAnswer = isFractionAnswerProblem(currentProblem);
    const currentMeta = getProblemMetadata(currentProblem);
    const fractionShape = currentMeta?.type === 'fraction_answer' ? currentMeta.shape : undefined;
    const equalPartsMeta = currentMeta?.type === 'fraction_equal_parts' ? currentMeta : null;
    const compareMeta = currentMeta?.type === 'fraction_compare' ? currentMeta : null;
    const orderMeta = currentMeta?.type === 'decimal_order' ? currentMeta : null;
    const numberLineMeta = currentMeta?.type === 'decimal_number_line' ? currentMeta : null;
    const isLongDivision = isLongDivisionProblem(currentProblem);
    const expectedWordOperation = getWordProblemOperation(currentProblem);
    const firstIntermediateStep = getFirstIntermediateStep(currentProblem);
    const isSolvingWordIntermediate = Boolean(firstIntermediateStep && selectedWordOperation === expectedWordOperation && !wordIntermediateSolved);
    const needsRomanTextAnswer = isRomanTextAnswerProblem(currentProblem);
    const logicalVisual = currentProblem.metadata?.type === 'logical_sequence' ? currentProblem.metadata.visual : undefined;
    const effectiveDirectAnswers = currentProblem.metadata?.type === 'logical_sequence'
        ? currentProblem.metadata.options.map((option) => ({ value: option, label: option }))
        : null;
    const journeyProgress = Math.round((currentIndex / Math.max(problems.length, 1)) * 100);
    const buddyMessage = status === 'CORRECT'
        ? 'To bolo ono! Poklad je bližšie.'
        : status === 'HINT'
            ? 'Nevadí, rozdelíme si to na malý krok.'
            : status === 'WRONG'
                ? 'Chyby nás učia. Ďalší krok zvládneme spolu.'
                : streak >= 3
                    ? `Séria ${streak}! Ideš ako raketa.`
                    : currentIndex === 0
                        ? 'Poď, nájdeme matematický poklad!'
                        : 'Každý príklad je jeden krok vpred.';

    return (
        <div className="game-session flex flex-col items-center justify-between" style={{ flex: 1, minHeight: 0, maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <div className="journey-header w-full">
                <div className="journey-actions">
                    <button onClick={onExit} className="btn-sm text-gray-400">← Odísť</button>
                    <div className="journey-counter">Krok {currentIndex + 1} z {problems.length || totalProblems}</div>
                    <button
                        type="button"
                        className="btn-sm text-gray-400 math-pad-trigger"
                        onClick={() => setScratchPadOpen(true)}
                        aria-label="Otvoriť matematickú plochu"
                    >
                        <Calculator size={18} />
                        <span>Plocha</span>
                    </button>
                </div>
                <div className="adventure-track" aria-label={`Postup výpravou ${journeyProgress} percent`}>
                    <div className="adventure-track-fill" style={{ width: `${journeyProgress}%` }} />
                    <span className="track-start">🏕️</span>
                    <motion.span className="track-hero" animate={{ left: `${journeyProgress}%` }}>🦊</motion.span>
                    <span className="track-goal">🏆</span>
                </div>
                <div className="buddy-game-row">
                    <MathBuddy
                        compact
                        size={58}
                        mood={status === 'CORRECT' ? 'celebrate' : status === 'IDLE' ? 'thinking' : 'encourage'}
                        message={buddyMessage}
                    />
                    {isLightningMode && (
                        <div className="w-24 h-1.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
                            <motion.div
                                initial={{ width: '100%' }}
                                animate={{ width: `${(timeLeft / LIGHTNING_TIME) * 100}%` }}
                                transition={{ duration: 0.2 }}
                                className={`h-full ${timeLeft <= 3 ? 'bg-red-500' : 'bg-yellow-400'}`}
                            />
                        </div>
                    )}
                </div>
            </div>

            {scratchPadOpen && (
                <MathScratchPad
                    value={scratchPad}
                    onChange={setScratchPad}
                    onClose={() => setScratchPadOpen(false)}
                />
            )}

            <div className="game-stage flex-1 flex flex-col justify-center items-center w-full">
                <motion.div
                    key={currentProblem.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center w-full"
                >
                    {currentProblem.isAdaptiveFollowUp && (
                        <div style={{ color: '#facc15', fontWeight: 700, marginBottom: '0.75rem' }}>
                            Krátke zopakovanie po chybe
                        </div>
                    )}
                    {largeMultiplicationData ? (
                        <>
                            <LargeMultiplicationDisplay problem={currentProblem} stepIndex={largeMulStepIndex} carryInput={largeMulCarryInput} />
                            <div className="flex justify-center gap-3 mt-6" style={{ flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className={`btn ${largeMulActiveField === 'digit' ? 'btn-primary' : ''}`}
                                    style={{ minWidth: '120px', background: largeMulActiveField === 'digit' ? '' : 'rgba(255,255,255,0.08)' }}
                                    onClick={() => setLargeMulActiveField('digit')}
                                >
                                    cifra = {largeMulDigitInput || '_'}
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${largeMulActiveField === 'carry' ? 'btn-primary' : ''}`}
                                    style={{ minWidth: '120px', background: largeMulActiveField === 'carry' ? '' : 'rgba(255,255,255,0.08)' }}
                                    onClick={() => setLargeMulActiveField('carry')}
                                >
                                    prenos = {largeMulCarryInput || '_'}
                                </button>
                            </div>
                            <div style={{ marginTop: '1rem', color: '#cbd5e1', fontSize: '0.95rem' }}>
                                <span style={{ color: '#93c5fd', marginRight: '1rem' }}>cifra ide pod čiaru</span>
                                <span style={{ color: '#facc15' }}>prenos ide do ďalšieho stĺpca</span>
                            </div>
                        </>
                    ) : stepDivisionData ? (
                        <>
                            {isLongDivision
                                ? <LongDivisionDisplay problem={currentProblem} stepIndex={indianStepIndex} />
                                : <IndianDivisionDisplay problem={currentProblem} stepIndex={indianStepIndex} />}
                            <div className="flex justify-center gap-3 mt-6" style={{ flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className={`btn ${indianActiveField === 'quotient' ? 'btn-primary' : ''}`}
                                    style={{ minWidth: '120px', background: indianActiveField === 'quotient' ? '' : 'rgba(255,255,255,0.08)' }}
                                    onClick={() => setIndianActiveField('quotient')}
                                >
                                    {isLongDivision ? 'cifra' : '?'} = {indianQuotientInput || '_'}
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${indianActiveField === 'remainder' ? 'btn-primary' : ''}`}
                                    style={{ minWidth: '120px', background: indianActiveField === 'remainder' ? '' : 'rgba(255,255,255,0.08)' }}
                                    onClick={() => setIndianActiveField('remainder')}
                                >
                                    {isLongDivision ? 'zvyšok' : '#'} = {indianRemainderInput || '_'}
                                </button>
                            </div>
                            <div style={{ marginTop: '1rem', color: '#cbd5e1', fontSize: '0.95rem' }}>
                                {isLongDivision ? (
                                    <>
                                        <span style={{ color: '#93c5fd', marginRight: '1rem' }}>cifra je výsledok kroku</span>
                                        <span style={{ color: '#f97316' }}>zvyšok ostane pod čiarou</span>
                                    </>
                                ) : (
                                    <>
                                        <span style={{ color: '#93c5fd', marginRight: '1rem' }}>? je výsledok kroku</span>
                                        <span style={{ color: '#f97316' }}># je zvyšok po delení</span>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {logicalVisual ? (
                                <>
                                    <div style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '0.75rem' }}>
                                        Nasledujúca postupnosť obrázkov je utvorená podľa istého princípu:
                                    </div>
                                    <VisualLogicalSequence frames={logicalVisual.frames} />
                                    <div style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1.25rem', lineHeight: 1.25, padding: '0 1rem' }}>
                                        {currentProblem.expression}
                                    </div>
                                </>
                            ) : orderMeta ? (
                                <>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.25rem', lineHeight: 1.25, padding: '0 1rem' }}>
                                        {currentProblem.expression}
                                    </div>
                                    <div className="flex justify-center gap-3" style={{ flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                                        {orderMeta.options.map((option, idx) => {
                                            const letter = String.fromCharCode(65 + idx);
                                            const selected = directAnswer?.value === idx;
                                            const isCorrectOption = idx === orderMeta.correctIndex;
                                            const showResult = directAnswer != null;
                                            const background = showResult && selected
                                                ? isCorrectOption ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.28)'
                                                : showResult && isCorrectOption
                                                    ? 'rgba(34,197,94,0.3)'
                                                    : 'rgba(255,255,255,0.08)';
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    className="btn"
                                                    style={{ padding: '1rem 1.4rem', borderRadius: '0.9rem', background, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', minWidth: '5rem' }}
                                                    onClick={() => submitDirectAnswer(idx, option.label)}
                                                    disabled={status !== 'IDLE'}
                                                >
                                                    <span style={{ color: '#f8fafc', fontWeight: 900, fontSize: '2rem', lineHeight: 1 }}>{option.label}</span>
                                                    <span style={{ color: '#93c5fd', fontWeight: 800 }}>{letter})</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : equalPartsMeta ? (
                                <>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '1.25rem', lineHeight: 1.25, padding: '0 1rem' }}>
                                        {currentProblem.expression}
                                    </div>
                                    <div className="flex justify-center gap-3" style={{ flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                                        {equalPartsMeta.options.map((sizes, idx) => {
                                            const letter = String.fromCharCode(65 + idx);
                                            const selected = directAnswer?.value === idx;
                                            const isCorrectOption = idx === equalPartsMeta.correctIndex;
                                            const showResult = directAnswer != null;
                                            const background = showResult && selected
                                                ? isCorrectOption ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.28)'
                                                : showResult && isCorrectOption
                                                    ? 'rgba(34,197,94,0.3)'
                                                    : 'rgba(255,255,255,0.08)';
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    className="btn"
                                                    style={{ padding: '0.6rem', borderRadius: '0.9rem', background, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}
                                                    onClick={() => submitDirectAnswer(idx, letter)}
                                                    disabled={status !== 'IDLE'}
                                                >
                                                    <CircleDivisionView sizes={sizes} />
                                                    <span style={{ color: '#93c5fd', fontWeight: 900, fontSize: '1.1rem' }}>{letter})</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {fractionShape && (
                                        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                            <FractionShapeView shape={fractionShape} />
                                        </div>
                                    )}
                                    {compareMeta && (
                                        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                            <FractionCompareBars leftNum={compareMeta.leftNum} leftDen={compareMeta.leftDen} rightNum={compareMeta.rightNum} rightDen={compareMeta.rightDen} />
                                        </div>
                                    )}
                                    {numberLineMeta && (
                                        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                            <DecimalNumberLineView min={numberLineMeta.min} max={numberLineMeta.max} step={numberLineMeta.step} mark={numberLineMeta.mark} />
                                        </div>
                                    )}
                                    <div style={{
                                        fontSize: currentProblem.kind === 'word_problem' ? '1.45rem' : currentProblem.expression.length > 15 ? '2rem' : currentProblem.expression.length > 10 ? '2.5rem' : '3.5rem',
                                        fontWeight: 800,
                                        marginBottom: '2rem',
                                        lineHeight: 1.2,
                                        padding: '0 1rem'
                                    }}>
                                        {currentProblem.expression.replace(/\*/g, '×').replace(/\//g, '÷')}
                                    </div>
                                </>
                            )}

                            {!isYesNoProblem(currentProblem) && !isFirstSecondProblem(currentProblem) && !equalPartsMeta && !orderMeta && (
                                <>
                                    {guidedWarmup && (
                                        <div
                                            style={{
                                                margin: '0 auto 1rem',
                                                maxWidth: '460px',
                                                padding: '1rem',
                                                borderRadius: '0.75rem',
                                                background: 'rgba(59,130,246,0.12)',
                                                border: '1px solid rgba(147,197,253,0.25)',
                                            }}
                                        >
                                            <div style={{ color: '#bfdbfe', fontWeight: 800, marginBottom: '0.35rem' }}>
                                                Najprv malý krok
                                            </div>
                                            <div style={{ color: '#e2e8f0', lineHeight: 1.35 }}>
                                                {guidedWarmup.question}
                                            </div>
                                            <GuidedCorrectionVisual guided={guidedWarmup} />
                                            <div className="flex justify-center gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
                                                {guidedWarmup.options.map(option => {
                                                    const selected = guidedWarmup.selectedAnswer === option;
                                                    const correct = option === guidedWarmup.correctAnswer;
                                                    const showResult = guidedWarmup.selectedAnswer !== undefined;
                                                    const background = showResult && selected
                                                        ? correct ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.28)'
                                                        : guidedWarmup.solved && correct
                                                            ? 'rgba(34,197,94,0.35)'
                                                            : 'rgba(255,255,255,0.1)';
                                                    const optionColor = showResult || guidedWarmup.solved
                                                        ? correct
                                                            ? '#bbf7d0'
                                                            : '#e2e8f0'
                                                        : '#f8fafc';

                                                    return (
                                                        <button
                                                            key={option}
                                                            type="button"
                                                            className="btn"
                                                            style={{
                                                                minWidth: '4rem',
                                                                background,
                                                                color: optionColor,
                                                                opacity: 1,
                                                                border: correct && guidedWarmup.solved ? '1px solid rgba(134,239,172,0.45)' : '1px solid rgba(255,255,255,0.1)',
                                                                cursor: guidedWarmup.solved ? 'default' : 'pointer',
                                                            }}
                                                            onClick={() => handleGuidedWarmupChoice(option)}
                                                            disabled={guidedWarmup.solved}
                                                        >
                                                            {option}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {guidedWarmup.solved && (
                                                <div style={{ color: '#bbf7d0', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                                                    {guidedWarmup.explanation}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {expectedWordOperation && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                                                Najprv vyber operáciu
                                            </div>
                                            <div className="flex justify-center gap-2">
                                                {WORD_PROBLEM_OPERATIONS.map(operation => {
                                                    const selected = selectedWordOperation === operation;
                                                    const wrong = wordOperationError && selected && operation !== expectedWordOperation;
                                                    const correct = selected && operation === expectedWordOperation;
                                                    return (
                                                        <button
                                                            key={operation}
                                                            type="button"
                                                            className={`btn ${correct ? 'btn-primary' : ''}`}
                                                            style={{
                                                                minWidth: '3.5rem',
                                                                background: correct
                                                                    ? undefined
                                                                    : wrong
                                                                        ? 'rgba(239,68,68,0.28)'
                                                                        : selected
                                                                            ? 'rgba(234,179,8,0.24)'
                                                                            : 'rgba(255,255,255,0.1)',
                                                            }}
                                                            onClick={() => handleWordOperationChoice(operation)}
                                                            disabled={status !== 'IDLE'}
                                                        >
                                                            {formatOperation(operation)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {wordOperationError && (
                                                <div style={{ color: '#fca5a5', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                                    Skús ešte raz vybrať, čo sa v príbehu deje.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {firstIntermediateStep && selectedWordOperation === expectedWordOperation && (
                                        <div
                                            style={{
                                                margin: '0 auto 1rem',
                                                maxWidth: '460px',
                                                padding: '0.85rem',
                                                borderRadius: '0.75rem',
                                                background: wordIntermediateSolved ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
                                                border: wordIntermediateError ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(250,204,21,0.25)',
                                            }}
                                        >
                                            <div style={{ color: '#fde68a', fontWeight: 800, marginBottom: '0.25rem' }}>
                                                {wordIntermediateSolved ? 'Prvý krok hotový' : 'Najprv medzivýsledok'}
                                            </div>
                                            <div style={{ color: '#e2e8f0' }}>
                                                {firstIntermediateStep.expression} = {wordIntermediateSolved ? firstIntermediateStep.result : '?'}
                                            </div>
                                            {wordIntermediateError && (
                                                <div style={{ color: '#fca5a5', fontSize: '0.9rem', marginTop: '0.35rem' }}>
                                                    Skontroluj prvý krok, potom pokračuj.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {(!guidedWarmup || guidedWarmup.solved) && (!expectedWordOperation || selectedWordOperation === expectedWordOperation) && (
                                        fractionAnswer ? (
                                            <FractionAnswerInput
                                                numerator={fractionNum}
                                                denominator={fractionDen}
                                                activeField={fractionActiveField}
                                                onSelect={setFractionActiveField}
                                                status={status}
                                            />
                                        ) : (
                                        <div
                                            style={{
                                                minWidth: '160px',
                                                display: 'inline-flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '0.2rem',
                                                padding: '0.75rem 1.1rem',
                                                borderRadius: '0.8rem',
                                                border: status === 'CORRECT'
                                                    ? '2px solid rgba(34,197,94,0.75)'
                                                    : status === 'WRONG'
                                                        ? '2px solid rgba(239,68,68,0.75)'
                                                        : '2px solid rgba(96,165,250,0.45)',
                                                background: status === 'CORRECT'
                                                    ? 'rgba(34,197,94,0.14)'
                                                    : status === 'WRONG'
                                                        ? 'rgba(239,68,68,0.14)'
                                                        : 'rgba(15,23,42,0.78)',
                                                boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
                                            }}
                                        >
                                            <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
                                                Tvoja odpoveď
                                            </div>
                                            <div style={{ color: '#f8fafc', fontSize: '2.2rem', fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
                                                {inputValue || '?'}
                                            </div>
                                        </div>
                                        )
                                    )}
                                    {isSolvingWordIntermediate && (
                                        <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                            Teraz zadávaš medzivýsledok prvého kroku.
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </motion.div>

                <AnimatePresence>
                    {(status === 'HINT' || status === 'WRONG') && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass absolute p-6 rounded-xl flex flex-col items-center gap-4"
                            style={{ maxWidth: '90%', top: '20%' }}
                        >
                            <XCircle size={48} className={status === 'HINT' ? 'text-yellow-400' : 'text-red-500'} />
                            <h3 className="text-xl font-bold">{status === 'HINT' ? 'Skús ešte raz' : 'Chyba'}</h3>
                            <div className="text-left bg-black/30 p-4 rounded w-full">
                                <p className="text-gray-400 text-sm mb-2">{feedbackTitle}</p>
                                {feedback.map((step, i) => (
                                    <div key={i} className="font-mono text-lg">{step}</div>
                                ))}

                                {status === 'HINT' && guidedCorrection && (
                                    <>
                                        <GuidedCorrectionVisual guided={guidedCorrection} />
                                        <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
                                            {guidedCorrection.options.map(option => {
                                                const selected = guidedCorrection.selectedAnswer === option;
                                                const correct = option === guidedCorrection.correctAnswer;
                                                const showResult = guidedCorrection.selectedAnswer !== undefined;
                                                const background = showResult && selected
                                                    ? correct ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.28)'
                                                    : 'rgba(255,255,255,0.1)';

                                                return (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        className="btn"
                                                        style={{ minWidth: '4rem', background }}
                                                        onClick={() => handleGuidedCorrectionChoice(option)}
                                                        disabled={guidedCorrection.solved}
                                                    >
                                                        {option}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}

                                {status === 'WRONG' && !stepDivisionData && !largeMultiplicationData && <VisualExplanation problem={currentProblem} />}
                            </div>
                            {status === 'HINT' ? (
                                guidedCorrection && !guidedCorrection.solved ? (
                                    <div className="text-sm text-gray-300 text-center">
                                        Najprv vyrieš medzikrok.
                                    </div>
                                ) : (
                                    <button className="btn btn-primary w-full" onClick={handleTryAgain}>
                                        Skúsiť znova <ArrowRight size={20} />
                                    </button>
                                )
                            ) : (
                                <button className="btn btn-primary w-full" onClick={handleContinueAfterWrong}>
                                    Ďalej <ArrowRight size={20} />
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
                <AnimatePresence>
                    {pendingStepCompletion && status === 'CORRECT' ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="glass absolute p-6 rounded-xl flex flex-col items-center gap-4"
                            style={{ maxWidth: '90%', top: '18%' }}
                        >
                            <CheckCircle size={56} className="text-green-500 drop-shadow-2xl" />
                            <h3 className="text-xl font-bold">{pendingStepCompletion.title}</h3>
                            <div className="text-center bg-black/30 p-4 rounded w-full">
                                {pendingStepCompletion.lines.map((line, index) => (
                                    <div key={index} className={index === 0 ? 'font-mono text-2xl font-bold' : 'text-lg text-blue-100 mt-2'}>
                                        {line}
                                    </div>
                                ))}
                            </div>
                            <button className="btn btn-primary w-full" onClick={handleContinueAfterCorrectStep}>
                                Ďalej <ArrowRight size={20} />
                            </button>
                        </motion.div>
                    ) : status === 'CORRECT' && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute"
                            style={{ top: '30%' }}
                        >
                            <CheckCircle size={100} className="text-green-500 drop-shadow-2xl" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {equalPartsMeta || orderMeta ? null : isLogicalSequenceProblem(currentProblem) && effectiveDirectAnswers ? (
                <div className="game-keypad flex gap-4 w-full flex-wrap justify-center" style={{ maxWidth: '600px', marginTop: '1rem' }}>
                    {logicalVisual
                        ? logicalVisual.options.map((option: VisualSequenceOption) => (
                            <button
                                key={option.label}
                                className="btn"
                                style={{ padding: '0.45rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.08)' }}
                                onClick={() => submitDirectAnswer(option.label, option.label)}
                            >
                                <VisualSequencePicture frame={option.frame} label={option.label} size={84} />
                            </button>
                        ))
                        : effectiveDirectAnswers.map((opt, i) => (
                            <button
                                key={i}
                                className="btn btn-primary text-4xl"
                                style={{ width: '80px', height: '80px', borderRadius: '1rem' }}
                                onClick={() => submitDirectAnswer(opt.value, opt.label)}
                            >
                                {opt.label}
                            </button>
                        ))}
                </div>
            ) : (isYesNoProblem(currentProblem) || isFirstSecondProblem(currentProblem)) && !stepDivisionData && !largeMultiplicationData ? (
                <div className="game-keypad flex gap-4 w-full" style={{ maxWidth: '400px', marginTop: '1rem' }}>
                    <button
                        className="btn btn-primary w-full text-xl"
                        style={{ height: '4rem' }}
                        onClick={() => submitDirectAnswer(1, isFirstSecondProblem(currentProblem) ? 'prvý' : 'áno')}
                    >
                        {isFirstSecondProblem(currentProblem) ? 'Prvý' : 'Áno'}
                    </button>
                    <button
                        className="btn w-full text-xl"
                        style={{ height: '4rem', background: 'rgba(255,255,255,0.1)' }}
                        onClick={() => submitDirectAnswer(0, isFirstSecondProblem(currentProblem) ? 'druhý' : 'nie')}
                    >
                        {isFirstSecondProblem(currentProblem) ? 'Druhý' : 'Nie'}
                    </button>
                </div>
            ) : needsRomanTextAnswer ? (
                <div className="game-keypad keypad-grid" style={{ maxWidth: '400px' }}>
                    {['I', 'V', 'X', 'L', 'C'].map(letter => (
                        <button
                            key={letter}
                            className="btn keypad-btn"
                            onClick={() => setInputValue(prev => `${prev}${letter}`)}
                            disabled={status !== 'IDLE'}
                        >
                            {letter}
                        </button>
                    ))}
                    <button className="btn keypad-btn text-red-400" onClick={() => setInputValue(prev => prev.slice(0, -1))}>
                        <Delete size={24} />
                    </button>
                    <button className="btn keypad-btn" onClick={() => setInputValue('')}>
                        Zmaž
                    </button>
                    <button
                        className="btn btn-primary keypad-btn keypad-submit col-span-2"
                        onClick={() => handleInput('ENTER')}
                    >
                        Potvrdiť <CornerDownLeft className="ml-2" />
                    </button>
                </div>
            ) : (
                <div className="game-keypad keypad-grid" style={{ maxWidth: '400px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => (
                        <button
                            key={k}
                            className="btn keypad-btn"
                            onClick={() => handleInput(k.toString())}
                        >
                            {k}
                        </button>
                    ))}
                    {stepDivisionData || largeMultiplicationData ? (
                        <>
                            <button className="btn keypad-btn text-red-400" onClick={() => handleInput('DEL')}>
                                <Delete size={24} />
                            </button>
                            <button className="btn keypad-btn" onClick={() => handleInput('0')}>
                                0
                            </button>
                            {largeMultiplicationData ? (
                                <button className="btn keypad-btn" onClick={() => setLargeMulActiveField(prev => prev === 'digit' ? 'carry' : 'digit')}>
                                    {largeMulActiveField === 'digit' ? 'pren' : 'cif'}
                                </button>
                            ) : (
                                <button className="btn keypad-btn" onClick={() => setIndianActiveField(prev => prev === 'quotient' ? 'remainder' : 'quotient')}>
                                    {indianActiveField === 'quotient' ? (isLongDivision ? 'zv' : '#') : (isLongDivision ? 'cif' : '?')}
                                </button>
                            )}
                            <button
                                className="btn btn-primary keypad-btn keypad-submit col-span-3"
                                onClick={() => handleInput('ENTER')}
                            >
                                Potvrdiť <CornerDownLeft className="ml-2" />
                            </button>
                        </>
                    ) : fractionAnswer ? (
                        <>
                            <button className="btn keypad-btn text-red-400" onClick={() => handleInput('DEL')}>
                                <Delete size={24} />
                            </button>
                            <button className="btn keypad-btn" onClick={() => handleInput('0')}>
                                0
                            </button>
                            <button
                                className="btn keypad-btn"
                                onClick={() => setFractionActiveField(prev => prev === 'num' ? 'den' : 'num')}
                            >
                                {fractionActiveField === 'num' ? 'menov' : 'čit'}
                            </button>
                            <button
                                className="btn btn-primary keypad-btn keypad-submit col-span-3"
                                onClick={() => handleInput('ENTER')}
                            >
                                Potvrdiť <CornerDownLeft className="ml-2" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="btn keypad-btn" onClick={() => handleInput('-')}>
                                -
                            </button>
                            <button className="btn keypad-btn" onClick={() => handleInput('0')}>
                                0
                            </button>
                            <button className="btn keypad-btn text-red-400" onClick={() => handleInput('DEL')}>
                                <Delete size={24} />
                            </button>
                            <button className="btn keypad-btn" onClick={() => handleInput('.')}>
                                .
                            </button>
                            <button
                                className="btn btn-primary keypad-btn keypad-submit col-span-2"
                                onClick={() => handleInput('ENTER')}
                            >
                                Potvrdiť <CornerDownLeft className="ml-2" />
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const metadataMatchesTopic = (problem: Problem, topic: string) => {
    const metadataType = problem.metadata?.type;
    if (!metadataType) return false;
    if (topic === 'unit_conversion') return metadataType === 'unit_conversion' || metadataType === 'unit_conversion_sum';
    if (topic === 'rounding') return metadataType === 'rounding';
    if (topic === 'roman_numerals') return metadataType === 'roman_to_arabic' || metadataType === 'arabic_to_roman';
    if (topic === 'geometry_area') return metadataType === 'geometry_area';
    if (topic === 'word_problem') return metadataType === 'word_problem';
    if (topic === 'large_multiplication') return problem.kind === 'large_multiplication';
    if (topic === 'large_division') return problem.kind === 'long_division';
    if (topic === 'indian_division') return metadataType === 'indian_division';
    if (topic === 'long_division') return metadataType === 'long_division';
    return true;
};

const generateProblemForActiveSchoolTopic = (settings: Constraints) => {
    const topics = settings.schoolTopics ?? [];
    if (topics.length !== 1) return generateProblem(settings);

    const topic = topics[0];
    for (let attempt = 0; attempt < 20; attempt++) {
        const problem = generateProblem(settings);
        if (metadataMatchesTopic(problem, topic)) return problem;
    }

    throw new Error(`Could not generate a problem for active school topic: ${topic}`);
};

export default GameSession;
