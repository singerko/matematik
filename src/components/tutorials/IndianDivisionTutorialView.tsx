import React from 'react';
import { type TutorialIndianDivisionState } from '../../lib/types';

interface Props {
    state: TutorialIndianDivisionState;
}

const IndianDivisionTutorialView: React.FC<Props> = ({ state }) => {
    const digits = state.problem.dividend.toString().split('');
    const shownQuotient = state.problem.steps
        .slice(0, state.quotientDigitsShown)
        .map(step => step.quotientDigit)
        .join('');
    const finalRemainderVisible = state.remainderDigitsShown >= state.problem.steps.length;
    const finalRemainder = state.problem.steps[state.problem.steps.length - 1]?.remainder ?? 0;
    const showRemainderPlaceholders = state.highlightDividendPart !== undefined && !state.finalHighlight;
    const showTrailingRemainder = finalRemainderVisible && !state.remainderInParentheses;
    const blinkAnimation = 'tutorialBlink 0.28s ease-in-out 2';
    const shownQuotientDigits = shownQuotient.split('');
    const quotientPlaceholder = state.highlightDividendPart !== undefined ? '?' : '_';
    const currentCarryIndex = state.highlightDividendPart !== undefined && state.activeStepIndex > 0
        ? state.activeStepIndex - 1
        : undefined;
    const displayPartialDividend = state.highlightDividendPart !== undefined
        ? (currentCarryIndex !== undefined
            ? `${state.problem.steps[currentCarryIndex].remainder}${digits[state.activeStepIndex]}`
            : state.highlightDividendPart.toString())
        : undefined;

    return (
        <div className="text-center">
            <style>
                {`
                    @keyframes tutorialBlink {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.25; }
                    }
                `}
            </style>
            <div style={{ fontSize: '2.6rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.25, padding: '0 1rem' }}>
                <span style={{ color: state.activeStepIndex === 0 && !state.finalHighlight && !state.suppressActiveDigitHighlight ? '#facc15' : 'white' }}>{digits[0]}</span>
                {digits.slice(1).map((digit, offset) => {
                    const index = offset + 1;
                    const previousStepIndex = index - 1;
                    const remainderShown = !state.finalHighlight && !state.remainderInParentheses && previousStepIndex < state.remainderDigitsShown;
                    const showPlaceholder = showRemainderPlaceholders && previousStepIndex === state.activeStepIndex && !remainderShown;
                    const superscriptText = remainderShown
                        ? state.problem.steps[previousStepIndex].remainder.toString()
                        : showPlaceholder
                            ? '#'
                            : null;

                    return (
                        <React.Fragment key={`${digit}-${index}`}>
                            {superscriptText !== null && (
                                <sup
                                    style={{
                                        color: showPlaceholder
                                            ? '#f97316'
                                            : (currentCarryIndex !== undefined && previousStepIndex === currentCarryIndex)
                                                ? '#facc15'
                                                : '#93c5fd',
                                        fontSize: '1.05rem',
                                        margin: '0 0.03rem',
                                        verticalAlign: 'super',
                                        animation: state.flashRemainder && previousStepIndex === state.activeStepIndex ? blinkAnimation : undefined,
                                    }}
                                >
                                    {superscriptText}
                                </sup>
                            )}
                            <span style={{
                                color: state.finalHighlight
                                    ? 'white'
                                    : (!state.suppressActiveDigitHighlight && (index === state.activeStepIndex || state.highlightNextDigitIndex === index))
                                        ? '#facc15'
                                        : 'white'
                            }}>{digit}</span>
                        </React.Fragment>
                    );
                })}
                {showTrailingRemainder
                    ? <sup style={{ color: state.finalHighlight ? '#22c55e' : '#93c5fd', fontSize: '1.05rem', marginLeft: '0.03rem', animation: state.flashRemainder ? blinkAnimation : undefined }}>{finalRemainder}</sup>
                    : showRemainderPlaceholders && state.activeStepIndex >= state.problem.steps.length - 1 && (
                        <sup style={{ color: '#f97316', fontSize: '1.05rem', marginLeft: '0.03rem' }}>#</sup>
                    )}
                <span style={{ marginLeft: '0.5rem', color: state.highlightDivisor ? '#facc15' : 'white' }}>÷ {state.problem.divisor}</span>
                <span style={{ marginLeft: '0.5rem' }}>
                    = <span style={{ color: state.finalHighlight ? '#22c55e' : 'white' }}>
                        {shownQuotientDigits.map((digit, index) => (
                            <span
                                key={`${digit}-${index}`}
                                style={{ animation: state.flashQuotient && index === shownQuotientDigits.length - 1 ? blinkAnimation : undefined }}
                            >
                                {digit}
                            </span>
                        ))}
                    </span>
                    {state.remainderInParentheses && (
                        <span style={{ color: state.finalHighlight ? '#22c55e' : '#93c5fd', animation: state.flashRemainder ? blinkAnimation : undefined }}>
                            ({finalRemainder})
                        </span>
                    )}
                    {state.quotientDigitsShown < state.problem.steps.length && <span style={{ color: '#93c5fd' }}>{quotientPlaceholder}</span>}
                </span>
            </div>
            {displayPartialDividend !== undefined ? (
                <div style={{ color: '#facc15', fontSize: '1.1rem', fontWeight: 700 }}>
                    Počítaš {displayPartialDividend}:{state.problem.divisor}=?, zvyšok=#
                </div>
            ) : (
                <div style={{ color: '#cbd5e1', fontSize: '1rem' }}>
                    Na pozíciu otáznika budeme písať výsledok. Na pozíciu mriežky budeme zapisovať zvyšok po delení.
                </div>
            )}
            {state.finalHighlight && (
                <div style={{ color: '#22c55e', fontSize: '1rem', marginTop: '0.75rem', fontWeight: 700 }}>
                    Hotovo. Zelenou vidíš výsledok a posledný zvyšok.
                </div>
            )}
        </div>
    );
};

export default IndianDivisionTutorialView;
