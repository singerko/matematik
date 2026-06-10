import React, { useEffect, useState } from 'react';
import { type Constraints, type ErrorDiagnosisCode, type Problem, type TrainingResult } from '../lib/types';
import { generateProblem } from '../lib/generator';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, CheckCircle, ArrowRight, CornerDownLeft, Delete } from 'lucide-react';
import VisualExplanation from './VisualExplanation';
import GuidedCorrectionVisual from './GuidedCorrectionVisual';
import { diagnoseAnswerDetailed, explainProblem, isAnswerCorrect } from '../lib/explanations';
import { createFollowUpProblem } from '../lib/adaptivePractice';
import { speakText } from '../lib/speech';
import { createEarlyGradeGuidance, createGuidedCorrection, type GuidedCorrection } from '../lib/guidedCorrection';
import { formatOperation, getFirstIntermediateStep, getWordProblemOperation, WORD_PROBLEM_OPERATIONS, type WordProblemOperation } from '../lib/wordProblemFlow';
import { getProblemMetadata } from '../lib/problemMetadata';

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

const LargeMultiplicationDisplay: React.FC<{ problem: Problem; stepIndex: number }> = ({ problem, stepIndex }) => {
    const data = problem.largeMultiplication!;
    const multiplicandDigits = data.multiplicand.toString().split('');
    const productDigits = data.product.toString().split('');
    const solvedDigits = data.steps.slice(0, stepIndex).map(step => step.resultDigit.toString());
    const currentStep = data.steps[stepIndex] ?? data.steps[data.steps.length - 1];
    const activeDigitIndex = multiplicandDigits.length - 1 - currentStep.position;
    const resultSlots = productDigits.map((_, index) => {
        const productPosition = productDigits.length - 1 - index;
        const solved = solvedDigits[productPosition];
        if (solved !== undefined) return solved;
        if (productPosition === currentStep.position) return '?';
        if (stepIndex === data.steps.length - 1 && productPosition === currentStep.position + 1) return '#';
        return '';
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
                {resultSlots.map((digit, index) => (
                    <div key={`res-${index}`} style={{ fontSize: '2rem', fontWeight: 800, color: digit === '?' || digit === '#' ? '#93c5fd' : '#22c55e' }}>
                        {digit}
                    </div>
                ))}
            </div>
            <div style={{ color: '#facc15', fontSize: '1.05rem', fontWeight: 700, marginTop: '0.75rem' }}>
                {currentStep.position === 0
                    ? `Počítaš ${currentStep.digit} × ${data.multiplier}.`
                    : `Počítaš ${currentStep.digit} × ${data.multiplier} a prenos z minulého stĺpca.`}
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
    const trainingMode = settings.trainingMode ?? 'learn';
    const isLightningMode = trainingMode === 'lightning';
    const isTestMode = trainingMode === 'test' || isLightningMode;
    const diagnosticsText = settings.schoolTopics?.length
        ? `Témy: ${settings.schoolTopics.join(', ')}`
        : 'Témy: všeobecné';
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
        setPendingStepCompletion(null);
        setDirectAnswer(null);
        setSelectedWordOperation(null);
        setWordOperationError(false);
        setWordIntermediateSolved(false);
        setWordIntermediateError(false);
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

    const createWordIntermediateWrongResult = (userAnswer: number): TrainingResult => ({
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

            const intermediateAnswer = parseFloat(inputValue);
            if (Math.abs(intermediateAnswer - firstIntermediateStep.result) < 0.001) {
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
                const resultItem = createWordIntermediateWrongResult(intermediateAnswer);
                setResults(prev => [...prev, resultItem]);
                nextProblem(resultItem);
                return;
            }
            setFeedbackTitle('Skontroluj prvý krok:');
            setFeedback([`Najprv vypočítaj ${firstIntermediateStep.expression}. Tento medzivýsledok použiješ v ďalšom kroku.`]);
            return;
        }

        if (!inputValue || inputValue === '-') return;
        const answerValue = isRomanTextAnswerProblem(currentProblem) ? inputValue : parseFloat(inputValue);
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
            : wordIntermediateError && firstIntermediateStep
                ? createWordIntermediateWrongResult(parseFloat(inputValue))
            : createWrongResult(wordOperationError && selectedWordOperation
                ? selectedWordOperation
                : directAnswer?.label ?? parseFloat(inputValue));

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
            setPendingStepCompletion(null);
            setDirectAnswer(null);
            setSelectedWordOperation(null);
            setWordOperationError(false);
            setWordIntermediateSolved(false);
            setWordIntermediateError(false);
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
    const isLongDivision = isLongDivisionProblem(currentProblem);
    const expectedWordOperation = getWordProblemOperation(currentProblem);
    const firstIntermediateStep = getFirstIntermediateStep(currentProblem);
    const isSolvingWordIntermediate = Boolean(firstIntermediateStep && selectedWordOperation === expectedWordOperation && !wordIntermediateSolved);
    const needsRomanTextAnswer = isRomanTextAnswerProblem(currentProblem);
    const effectiveDirectAnswers = currentProblem.metadata?.type === 'logical_sequence'
        ? currentProblem.metadata.options.map((option) => ({ value: option, label: option }))
        : null;

    return (
        <div className="game-session flex flex-col items-center justify-between" style={{ flex: 1, minHeight: 0, maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <div className="w-full flex justify-between items-center p-4">
                <button onClick={onExit} className="btn-sm text-gray-400">Ukončiť</button>
                <div className="flex flex-col items-center">
                    <div className="text-xl font-bold">{currentIndex + 1} / {problems.length || totalProblems}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '0.1rem' }}>
                        {diagnosticsText}
                    </div>
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
                <div style={{ width: '40px' }}></div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center w-full">
                <motion.div
                    key={currentProblem.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center w-full"
                >
                    {settings.schoolTopics?.length === 1 && (
                        <div
                            style={{
                                display: 'inline-block',
                                marginBottom: '0.9rem',
                                padding: '0.35rem 0.7rem',
                                borderRadius: '0.5rem',
                                background: 'rgba(59,130,246,0.18)',
                                border: '1px solid rgba(147,197,253,0.35)',
                                color: '#bfdbfe',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                            }}
                        >
                            {diagnosticsText}
                        </div>
                    )}
                    {currentProblem.isAdaptiveFollowUp && (
                        <div style={{ color: '#facc15', fontWeight: 700, marginBottom: '0.75rem' }}>
                            Krátke zopakovanie po chybe
                        </div>
                    )}
                    {largeMultiplicationData ? (
                        <>
                            <LargeMultiplicationDisplay problem={currentProblem} stepIndex={largeMulStepIndex} />
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
                            <div style={{
                                fontSize: currentProblem.kind === 'word_problem' ? '1.45rem' : currentProblem.expression.length > 15 ? '2rem' : currentProblem.expression.length > 10 ? '2.5rem' : '3.5rem',
                                fontWeight: 800,
                                marginBottom: '2rem',
                                lineHeight: 1.2,
                                padding: '0 1rem'
                            }}>
                                {currentProblem.expression.replace(/\*/g, '×').replace(/\//g, '÷')}
                            </div>

                            {!isYesNoProblem(currentProblem) && !isFirstSecondProblem(currentProblem) && (
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

                                                    return (
                                                        <button
                                                            key={option}
                                                            type="button"
                                                            className="btn"
                                                            style={{ minWidth: '4rem', background }}
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
                                    <div className={`text-4xl font-mono p-4 rounded-xl border-2 ${status === 'IDLE' ? 'border-blue-500/30' :
                                        status === 'CORRECT' ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'
                                        }`} style={{ minWidth: '150px', display: 'inline-block', opacity: (guidedWarmup && !guidedWarmup.solved) || (expectedWordOperation && selectedWordOperation !== expectedWordOperation) ? 0.45 : 1 }}>
                                        {inputValue || '?'}
                                    </div>
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

            {isLogicalSequenceProblem(currentProblem) && effectiveDirectAnswers ? (
                <div className="flex gap-4 w-full flex-wrap justify-center" style={{ maxWidth: '600px', marginTop: '1rem' }}>
                    {effectiveDirectAnswers.map((opt, i) => (
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
                <div className="flex gap-4 w-full" style={{ maxWidth: '400px', marginTop: '1rem' }}>
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
                <div className="keypad-grid" style={{ maxWidth: '400px' }}>
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
                        className="btn btn-primary col-span-2 text-xl"
                        style={{ height: '4rem' }}
                        onClick={() => handleInput('ENTER')}
                    >
                        Potvrdiť <CornerDownLeft className="ml-2" />
                    </button>
                </div>
            ) : (
                <div className="keypad-grid" style={{ maxWidth: '400px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, stepDivisionData || largeMultiplicationData ? '' : '-', 0].map(k => (
                    <button
                        key={`${k || 'blank'}`}
                        className="btn keypad-btn"
                        onClick={() => k !== '' && handleInput(k.toString())}
                        disabled={k === ''}
                        style={k === '' ? { opacity: 0.2 } : undefined}
                    >
                        {k}
                    </button>
                ))}
                <button className="btn keypad-btn text-red-400" onClick={() => handleInput('DEL')}>
                    <Delete size={24} />
                </button>
                {largeMultiplicationData ? (
                    <button className="btn keypad-btn" onClick={() => setLargeMulActiveField(prev => prev === 'digit' ? 'carry' : 'digit')}>
                        {largeMulActiveField === 'digit' ? 'pren' : 'cif'}
                    </button>
                ) : stepDivisionData ? (
                    <button className="btn keypad-btn" onClick={() => setIndianActiveField(prev => prev === 'quotient' ? 'remainder' : 'quotient')}>
                        {indianActiveField === 'quotient' ? (isLongDivision ? 'zv' : '#') : (isLongDivision ? 'cif' : '?')}
                    </button>
                ) : (
                    <button className="btn keypad-btn" onClick={() => handleInput('.')}>
                        .
                    </button>
                )}
                <button
                    className="btn btn-primary col-span-2 text-xl"
                    style={{ height: '4rem' }}
                    onClick={() => handleInput('ENTER')}
                >
                    Potvrdiť <CornerDownLeft className="ml-2" />
                </button>
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
