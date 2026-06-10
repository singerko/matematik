import {
    type Problem,
    type TutorialAudience,
    type TutorialCue,
    type TutorialLongDivisionState,
    type TutorialScript,
    type TutorialStep,
} from '../types';

const createState = (
    problem: Problem,
    activeStepIndex: number,
    revealedSteps: number,
    options?: Partial<Pick<TutorialLongDivisionState, 'highlightField' | 'finalHighlight'>>,
): TutorialLongDivisionState => ({
    kind: 'long_division',
    problem: problem.longDivision!,
    activeStepIndex,
    revealedSteps,
    highlightField: options?.highlightField,
    finalHighlight: options?.finalHighlight,
});

export const buildLongDivisionTutorial = (problem: Problem, audience: TutorialAudience): TutorialScript => {
    if (!problem.longDivision) {
        throw new Error('Long division tutorial requires long division problem data.');
    }

    const data = problem.longDivision;
    const steps: TutorialStep[] = [];

    steps.push({
        id: 'intro',
        title: 'Ukážka príkladu',
        cues: [
            {
                id: 'intro-overview',
                speechText: `Ukážeme si príklad ${data.dividend} delené ${data.divisor} klasickou metódou. Pod čiaru budeme zapisovať mínus medzikroky a zvyšok znesieme s ďalšou cifrou.`,
                state: createState(problem, 0, 0),
            },
        ],
    });

    data.steps.forEach((step, index) => {
        const product = step.quotientDigit * data.divisor;
        const cues: TutorialCue[] = [
            {
                id: `step-${index}-partial`,
                speechText: `Teraz delíme ${step.partialDividend} : ${data.divisor}.`,
                state: createState(problem, index, index, { highlightField: 'partial' }),
            },
            {
                id: `step-${index}-quotient`,
                speechText: `${step.partialDividend} : ${data.divisor} sa zmestí ${step.quotientDigit}-krát. Cifru ${step.quotientDigit} zapíšeme do výsledku.`,
                delayMs: 500,
                state: createState(problem, index, index, { highlightField: 'partial' }),
            },
            {
                id: `step-${index}-product`,
                speechText: `Vynásobíme ${step.quotientDigit} krát ${data.divisor} a dostaneme ${product}. Toto číslo zapíšeme pod ${step.partialDividend}.`,
                delayMs: 600,
                state: createState(problem, index, index, { highlightField: 'product' }),
            },
            {
                id: `step-${index}-remainder`,
                speechText: index + 1 < data.steps.length
                    ? `Pod čiarou nám zostane ${step.remainder}. Znesieme ďalšiu cifru ${data.dividend.toString()[index + 1]} a vznikne ${data.steps[index + 1].partialDividend}.`
                    : `Pod čiarou ostáva posledný zvyšok ${step.remainder}.`,
                delayMs: 700,
                state: createState(problem, index, index + 1, { highlightField: 'remainder' }),
            },
        ];

        steps.push({
            id: `step-${index}`,
            title: `Krok ${index + 1}`,
            cues,
        });
    });

    steps.push({
        id: 'final',
        title: 'Hotovo',
        cues: [
            {
                id: 'final-overview',
                speechText: data.remainder === 0
                    ? `Hotovo. Výsledok je ${data.quotient}, delenie vyšlo bezo zvyšku.`
                    : `Hotovo. Výsledok je ${data.quotient} a zvyšok je ${data.remainder}.`,
                state: createState(problem, data.steps.length - 1, data.steps.length, { finalHighlight: true }),
            },
        ],
    });

    return {
        method: 'long_division',
        audience,
        title: 'Ako sa počíta klasické písomné delenie',
        problemExpression: `${data.dividend} / ${data.divisor}`,
        steps,
    };
};
