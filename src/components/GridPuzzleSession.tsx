import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Delete, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Constraints, type TrainingResult } from '../lib/types';
import { generateGridPuzzle, getGridPuzzleProblem, type GridPuzzle, type GridPuzzleEquation, type GridPuzzleCellId } from '../lib/gridPuzzle';
import { diagnoseAnswerDetailed, explainProblem } from '../lib/explanations';

interface Props {
    settings: Constraints;
    totalProblems: number;
    onComplete: (results: TrainingResult[]) => void;
    onExit: () => void;
}

const formatOperation = (operation: string) => operation === '*' ? '×' : operation === '/' ? '÷' : operation;
const formatExpression = (expression: string) => expression.replace(/\*/g, '×').replace(/\//g, '÷');
const createBlankState = (puzzle: GridPuzzle): Record<GridPuzzleCellId, string> => (
    Object.keys(puzzle.positions).reduce<Record<GridPuzzleCellId, string>>((acc, cell) => {
        acc[cell] = '';
        return acc;
    }, {})
);
const createAttemptState = (puzzle: GridPuzzle): Record<GridPuzzleCellId, number> => (
    Object.keys(puzzle.positions).reduce<Record<GridPuzzleCellId, number>>((acc, cell) => {
        acc[cell] = 0;
        return acc;
    }, {})
);

const midpoint = (puzzle: GridPuzzle, first: GridPuzzleCellId, second: GridPuzzleCellId) => {
    const a = puzzle.positions[first];
    const b = puzzle.positions[second];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
};

const GridPuzzleSession: React.FC<Props> = ({ settings, totalProblems, onComplete, onExit }) => {
    const [puzzleIndex, setPuzzleIndex] = useState(0);
    const [puzzle, setPuzzle] = useState(() => generateGridPuzzle(settings));
    const [answers, setAnswers] = useState<Record<GridPuzzleCellId, string>>(() => createBlankState(puzzle));
    const [activeBlank, setActiveBlank] = useState<GridPuzzleCellId | null>(null);
    const [wrongBlanks, setWrongBlanks] = useState<GridPuzzleCellId[]>([]);
    const [attemptsByBlank, setAttemptsByBlank] = useState<Record<GridPuzzleCellId, number>>(() => createAttemptState(puzzle));
    const [helpBlank, setHelpBlank] = useState<GridPuzzleCellId | null>(null);
    const [results, setResults] = useState<TrainingResult[]>([]);
    const [message, setMessage] = useState('');
    const puzzleTotal = Math.max(1, totalProblems);
    const trainingMode = settings.trainingMode ?? 'learn';
    const helpProblem = helpBlank ? getGridPuzzleProblem(puzzle, helpBlank) : null;
    const helpExplanation = helpProblem ? explainProblem(helpProblem) : null;

    const setAnswer = (cell: GridPuzzleCellId, value: string) => {
        setAnswers(prev => ({ ...prev, [cell]: value }));
        setWrongBlanks(prev => prev.filter(id => id !== cell));
        if (helpBlank === cell) setHelpBlank(null);
        setMessage('');
    };

    const selectBlank = (cell: GridPuzzleCellId) => {
        setActiveBlank(cell);
        if ((attemptsByBlank[cell] ?? 0) >= 2) {
            setHelpBlank(cell);
        }
    };

    const handleKey = (key: string) => {
        if (!activeBlank) {
            setMessage('Najprv ťukni na kruh, ktorý chceš doplniť.');
            return;
        }

        if (key === 'DEL') {
            setAnswer(activeBlank, answers[activeBlank].slice(0, -1));
            return;
        }
        if (key === 'CLEAR') {
            setAnswer(activeBlank, '');
            return;
        }
        setAnswer(activeBlank, `${answers[activeBlank]}${key}`);
    };

    const createResults = (): TrainingResult[] => puzzle.blanks.map(blank => {
        const hasAnswer = answers[blank].trim() !== '';
        const userAnswer = hasAnswer ? Number(answers[blank]) : NaN;
        const problem = getGridPuzzleProblem(puzzle, blank);
        const correct = hasAnswer && Number.isFinite(userAnswer) && userAnswer === puzzle.values[blank];
        const diagnosis = correct ? undefined : diagnoseAnswerDetailed(problem, hasAnswer ? userAnswer : '');
        return {
            problem,
            userAnswer: answers[blank] === '' ? '' : userAnswer,
            correct,
            diagnosis: diagnosis?.message,
            diagnosisCode: diagnosis?.code,
            diagnosisTitle: diagnosis?.title,
        };
    });

    const goNext = (newResults: TrainingResult[]) => {
        const nextResults = [...results, ...newResults];
        if (puzzleIndex + 1 >= puzzleTotal) {
            onComplete(nextResults);
            return;
        }

        const nextPuzzle = generateGridPuzzle(settings);
        setResults(nextResults);
        setPuzzleIndex(prev => prev + 1);
        setPuzzle(nextPuzzle);
        setAnswers(createBlankState(nextPuzzle));
        setActiveBlank(null);
        setWrongBlanks([]);
        setAttemptsByBlank(createAttemptState(nextPuzzle));
        setHelpBlank(null);
        setMessage('');
    };

    const handleCheck = () => {
        const blankResults = createResults();
        const wrong = puzzle.blanks.filter(blank => answers[blank].trim() === '' || Number(answers[blank]) !== puzzle.values[blank]);

        if (wrong.length === 0) {
            setMessage('Správne vyriešená mriežka.');
            goNext(blankResults);
            return;
        }

        setWrongBlanks(wrong);

        if (trainingMode === 'learn') {
            const nextAttempts = { ...attemptsByBlank };
            wrong.forEach(blank => {
                nextAttempts[blank] = (nextAttempts[blank] ?? 0) + 1;
            });
            const explainedBlank = wrong.find(blank => nextAttempts[blank] >= 2) ?? null;
            setAttemptsByBlank(nextAttempts);
            setHelpBlank(null);
            setMessage(explainedBlank
                ? 'Niektoré políčka ešte nesedia. Ťukni na červený kruh a oprav ho.'
                : 'Niektoré políčka ešte nesedia. Oprav červené kruhy.');
            return;
        }

        setActiveBlank(null);
        goNext(blankResults);
    };

    const renderEquationLine = (equation: GridPuzzleEquation) => {
        const first = puzzle.positions[equation.left];
        const second = puzzle.positions[equation.right];
        const third = puzzle.positions[equation.result];
        return (
            <polyline
                key={equation.id}
                points={`${first.x},${first.y} ${second.x},${second.y} ${third.x},${third.y}`}
                fill="none"
                stroke="#9ca3af"
                strokeWidth={0.85}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        );
    };

    const renderEquationLabels = (equation: GridPuzzleEquation) => {
        const opPosition = midpoint(puzzle, equation.left, equation.right);
        const equalsPosition = midpoint(puzzle, equation.right, equation.result);
        const labelStyle: React.CSSProperties = {
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
            width: 'clamp(1.35rem, 6.7vw, 2rem)',
            height: 'clamp(1.35rem, 6.7vw, 2rem)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '999px',
            background: 'rgba(248, 250, 252, 0.94)',
            color: '#111827',
            fontSize: 'clamp(0.95rem, 4.4vw, 1.55rem)',
            fontWeight: 900,
            zIndex: 2,
        };

        return (
            <React.Fragment key={`${equation.id}-labels`}>
                <div style={{ ...labelStyle, left: `${opPosition.x}%`, top: `${opPosition.y}%` }}>
                    {formatOperation(equation.operation)}
                </div>
                <div style={{ ...labelStyle, left: `${equalsPosition.x}%`, top: `${equalsPosition.y}%` }}>
                    =
                </div>
            </React.Fragment>
        );
    };

    const renderNumberCell = (id: GridPuzzleCellId) => {
        const isBlank = puzzle.blanks.includes(id);
        const isActive = activeBlank === id;
        const isWrong = wrongBlanks.includes(id);
        const value = isBlank ? (answers[id] ?? '') : puzzle.values[id].toString();
        const position = puzzle.positions[id];

        return (
            <button
                key={id}
                type="button"
                disabled={!isBlank}
                onClick={() => isBlank && selectBlank(id)}
                className="btn"
                style={{
                    position: 'absolute',
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 'clamp(2.18rem, 11.8vw, 4.05rem)',
                    aspectRatio: '1',
                    borderRadius: '999px',
                    padding: 0,
                    fontSize: 'clamp(0.82rem, 4vw, 1.6rem)',
                    fontWeight: 900,
                    background: isBlank ? '#ffffff' : '#eef2f7',
                    border: isWrong ? '3px solid #dc2626' : isActive ? '3px solid #facc15' : '2px solid #6b7280',
                    color: isBlank && !value ? '#64748b' : '#111827',
                    boxShadow: isActive ? '0 0 0 4px rgba(250,204,21,0.25)' : '0 2px 6px rgba(15,23,42,0.16)',
                    zIndex: 3,
                    minWidth: 0,
                }}
            >
                {value || '?'}
            </button>
        );
    };

    return (
        <div className="grid-puzzle-session flex flex-col items-center" style={{ flex: 1, minHeight: 0, maxWidth: '620px', margin: '0 auto', width: '100%', minWidth: 0, overflowX: 'hidden', overflowY: 'auto', paddingBottom: '1rem' }}>
            <div className="w-full flex justify-between items-center px-2" style={{ marginBottom: '0.5rem' }}>
                <button onClick={onExit} className="btn-sm text-gray-400">Ukončiť</button>
                <div style={{ fontWeight: 800 }}>Mriežka {puzzleIndex + 1} / {puzzleTotal}</div>
                <div style={{ width: '64px' }} />
            </div>

            <div className="w-full text-center" style={{ padding: '0.15rem', minWidth: 0 }}>
                <div
                    style={{
                        position: 'relative',
                        width: 'min(100%, 30rem)',
                        maxWidth: '100%',
                        aspectRatio: '1',
                        margin: '0 auto',
                        borderRadius: '0.85rem',
                        background: '#f8fafc',
                        border: '1px solid rgba(148,163,184,0.5)',
                        boxShadow: '0 12px 24px rgba(15,23,42,0.18)',
                        overflow: 'hidden',
                        touchAction: 'manipulation',
                    }}
                >
                    <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
                    >
                        {puzzle.equations.map(renderEquationLine)}
                    </svg>
                    {puzzle.equations.map(renderEquationLabels)}
                    {(Object.keys(puzzle.positions) as GridPuzzleCellId[]).map(renderNumberCell)}
                </div>

                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            style={{ marginTop: '1rem', color: wrongBlanks.length ? '#fca5a5' : '#bbf7d0', fontWeight: 800 }}
                        >
                            {message}
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {helpProblem && helpExplanation && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            style={{
                                marginTop: '1rem',
                                padding: '0.85rem',
                                borderRadius: '0.85rem',
                                background: 'rgba(250,204,21,0.12)',
                                border: '1px solid rgba(250,204,21,0.35)',
                                textAlign: 'left',
                            }}
                        >
                            <div style={{ color: '#fde68a', fontWeight: 900, marginBottom: '0.35rem' }}>
                                Riešiš: {formatExpression(helpProblem.expression)}
                            </div>
                            <div style={{ color: '#e2e8f0', lineHeight: 1.4 }}>
                                {helpExplanation.hint}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="w-full" style={{ maxWidth: '420px', marginTop: '1rem', flex: '0 0 auto' }}>
                <div className="keypad-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <button key={n} className="btn keypad-btn" onClick={() => handleKey(n.toString())}>{n}</button>
                    ))}
                    <button className="btn keypad-btn text-red-400" onClick={() => handleKey('DEL')}>
                        <Delete size={24} />
                    </button>
                    <button className="btn keypad-btn" onClick={() => handleKey('0')}>0</button>
                    <button className="btn keypad-btn" onClick={() => handleKey('CLEAR')}>
                        <XCircle size={24} />
                    </button>
                </div>
                <button className="btn btn-primary w-full mt-4 text-xl" style={{ height: '4rem' }} onClick={handleCheck}>
                    {wrongBlanks.length ? <CheckCircle size={24} className="mr-2" /> : <ArrowRight size={24} className="mr-2" />}
                    Skontrolovať
                </button>
            </div>
        </div>
    );
};

export default GridPuzzleSession;
