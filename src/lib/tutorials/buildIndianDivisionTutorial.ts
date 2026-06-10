import {
    type Problem,
    type TutorialAudience,
    type TutorialCue,
    type TutorialIndianDivisionState,
    type TutorialScript,
    type TutorialStep,
} from '../types';

const createState = (
    problem: Problem,
    activeStepIndex: number,
    quotientDigitsShown: number,
    remainderDigitsShown: number,
    options?: Partial<Pick<TutorialIndianDivisionState, 'highlightDividendPart' | 'highlightDivisor' | 'highlightNextDigitIndex' | 'finalHighlight' | 'remainderInParentheses' | 'suppressActiveDigitHighlight' | 'flashQuotient' | 'flashRemainder'>>
): TutorialIndianDivisionState => ({
    kind: 'indian_division',
    problem: problem.indianDivision!,
    activeStepIndex,
    quotientDigitsShown,
    remainderDigitsShown,
    highlightDividendPart: options?.highlightDividendPart,
    highlightDivisor: options?.highlightDivisor,
    highlightNextDigitIndex: options?.highlightNextDigitIndex,
    finalHighlight: options?.finalHighlight,
    remainderInParentheses: options?.remainderInParentheses,
    suppressActiveDigitHighlight: options?.suppressActiveDigitHighlight,
    flashQuotient: options?.flashQuotient,
    flashRemainder: options?.flashRemainder,
});

const buildIntroText = (problem: Problem, audience: TutorialAudience) => {
    const indian = problem.indianDivision!;
    if (audience === 'grade2') {
        return `Ukážeme si príklad ${indian.dividend} delené ${indian.divisor}. Postupne budeme zapisovať výsledok a hore budeme písať zvyšok po delení.`;
    }

    return `Budeme počítať príklad ${indian.dividend} delené ${indian.divisor} indickou metódou. Výsledok budeme zapisovať za rovná sa a hore budeme písať zvyšok po delení.`;
};

const buildStepIntroSpeech = (partialDividend: number, divisor: number) =>
    `Teraz delíme ${partialDividend} delené ${divisor}.`;

const buildQuotientSpeech = (digit: number, index: number) =>
    `Výsledok je ${digit}. Máme ${index === 0 ? 'prvú' : 'ďalšiu'} číslicu výsledku.`;

const buildRemainderSpeech = (remainder: number, anchorDigit: number, nextPartial?: number) => {
    if (nextPartial !== undefined) {
        return `Zvyšok je ${remainder}. Zapíšeme ho za číslo ${anchorDigit}. S ďalšou číslicou v rade tvorí ${nextPartial}.`;
    }

    return `Zvyšok je ${remainder}. Zapíšeme ho ako posledný zvyšok príkladu.`;
};

export const buildIndianDivisionTutorial = (problem: Problem, audience: TutorialAudience): TutorialScript => {
    if (!problem.indianDivision) {
        throw new Error('Indian division tutorial requires Indian division problem data.');
    }

    const indian = problem.indianDivision;
    const steps: TutorialStep[] = [];

    const introCues: TutorialCue[] = [
        {
            id: 'intro-highlight',
            speechText: buildIntroText(problem, audience),
            state: {
                ...createState(problem, 0, 0, 0),
                suppressActiveDigitHighlight: true,
            },
        }
    ];

    steps.push({
        id: 'intro',
        title: 'Ukážka príkladu',
        cues: introCues,
    });

    indian.steps.forEach((step, index) => {
        const cues: TutorialCue[] = [
            {
                id: `step-${index}-highlight`,
                speechText: buildStepIntroSpeech(step.partialDividend, indian.divisor),
                state: createState(problem, index, index, index, {
                    highlightDividendPart: step.partialDividend,
                    highlightDivisor: true,
                }),
            },
            {
                id: `step-${index}-quotient`,
                speechText: buildQuotientSpeech(step.quotientDigit, index),
                delayMs: 550,
                state: createState(problem, index, index + 1, index, {
                    highlightDividendPart: step.partialDividend,
                    highlightDivisor: true,
                    flashQuotient: true,
                }),
            },
            {
                id: `step-${index}-remainder`,
                speechText: buildRemainderSpeech(
                    step.remainder,
                    Number(indian.dividend.toString()[index]),
                    indian.steps[index + 1]?.partialDividend
                ),
                delayMs: index === indian.steps.length - 1 ? 950 : 650,
                state: createState(problem, index, index + 1, index + 1, {
                    highlightDividendPart: step.partialDividend,
                    highlightDivisor: true,
                    flashRemainder: true,
                }),
            },
        ];

        if (indian.steps[index + 1]) {
            cues.push({
                id: `step-${index}-next-highlight`,
                speechText: `Teraz už vidíme, že budeme deliť ${indian.steps[index + 1].partialDividend} delené ${indian.divisor}.`,
                delayMs: 450,
                state: createState(problem, index + 1, index + 1, index + 1, {
                    highlightDividendPart: indian.steps[index + 1].partialDividend,
                    highlightDivisor: true,
                    highlightNextDigitIndex: indian.steps[index + 1].partialDividend >= 10 ? index + 1 : undefined,
                }),
            });
        }

        steps.push({
            id: `step-${index}`,
            title: `Krok ${index + 1}`,
            cues,
        });
    });

    steps.push({
        id: 'rewrite-remainder',
        title: 'Prepísanie zvyšku',
        cues: [
            {
                id: 'rewrite-remainder-overview',
                speechText: `Toto je zvyšok celého príkladu. Ten sa zapisuje do zátvorky za výsledok.`,
                delayMs: 900,
                state: createState(problem, indian.steps.length - 1, indian.steps.length, indian.steps.length, {
                    remainderInParentheses: true,
                    suppressActiveDigitHighlight: true,
                    flashRemainder: true,
                }),
            }
        ],
    });

    steps.push({
        id: 'final',
        title: 'Hotovo',
        cues: [
            {
                id: 'final-overview',
                speechText: `Hotovo. Výsledok je ${indian.quotient} a zvyšok je ${indian.remainder}.`,
                state: createState(problem, indian.steps.length - 1, indian.steps.length, indian.steps.length, {
                    finalHighlight: true,
                    remainderInParentheses: true,
                }),
            }
        ],
    });

    return {
        method: 'indian_division',
        audience,
        title: 'Ako sa počíta indické delenie',
        problemExpression: `${indian.dividend} / ${indian.divisor}`,
        steps,
    };
};
