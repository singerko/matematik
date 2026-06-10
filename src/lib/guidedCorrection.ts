import type { Problem } from './types';
import { getProblemMetadata } from './problemMetadata';

export interface GuidedCorrection {
    question: string;
    options: number[];
    correctAnswer: number;
    explanation: string;
    visual?: {
        kind: 'make_ten_addition' | 'make_ten_subtraction';
        start: number;
        bridge: number;
        rest: number;
        targetTen: number;
        final: number;
    };
    selectedAnswer?: number;
    solved?: boolean;
}

const createNumberOptions = (correct: number, candidates: number[]) => {
    const options = [correct, ...candidates]
        .filter(value => Number.isInteger(value) && value >= 0)
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .slice(0, 4);

    return options.sort((a, b) => a - b);
};

export const createGuidedCorrection = (problem: Problem): GuidedCorrection | null => {
    const metadata = getProblemMetadata(problem);

    if (metadata?.type === 'addition') {
        const { left, right } = metadata;
        const toTen = 10 - (left % 10);
        if ((left % 10) + (right % 10) >= 10 && toTen > 0 && toTen < right) {
            const nextTen = left + toTen;
            return {
                question: `Najprv doplň ${left} do najbližšej desiatky. Koľko z čísla ${right} použiješ?`,
                correctAnswer: toTen,
                options: createNumberOptions(toTen, [toTen - 1, toTen + 1, right - toTen, right]),
                explanation: `${left} + ${toTen} = ${nextTen}. Teraz ešte pripočítaj zvyšok z druhého čísla a vypočítaj celý príklad.`,
                visual: {
                    kind: 'make_ten_addition',
                    start: left,
                    bridge: toTen,
                    rest: right - toTen,
                    targetTen: nextTen,
                    final: left + right,
                },
            };
        }
    }

    if (metadata?.type === 'subtraction') {
        const { left, right } = metadata;
        const toTen = left % 10;
        if ((left % 10) < (right % 10) && toTen > 0 && toTen < right) {
            const nextTen = left - toTen;
            return {
                question: `Najprv odober tak, aby si prišiel na celú desiatku. Koľko odoberieme z ${left}?`,
                correctAnswer: toTen,
                options: createNumberOptions(toTen, [toTen - 1, toTen + 1, right - toTen, right]),
                explanation: `${left} - ${toTen} = ${nextTen}. Teraz ešte odober zvyšok z druhého čísla a vypočítaj celý príklad.`,
                visual: {
                    kind: 'make_ten_subtraction',
                    start: left,
                    bridge: toTen,
                    rest: right - toTen,
                    targetTen: nextTen,
                    final: left - right,
                },
            };
        }
    }

    if (metadata?.type === 'multiplication') {
        const { left, right } = metadata;
        const easier = Math.min(left, right);
        const harder = Math.max(left, right);

        if (harder >= 6 && harder <= 10 && easier >= 2) {
            const firstPart = easier * 5;
            const secondFactor = harder - 5;
            return {
                question: `Rozlož ${harder} na 5 + ${secondFactor}. Koľko je ${easier} × 5?`,
                correctAnswer: firstPart,
                options: createNumberOptions(firstPart, [firstPart - easier, firstPart + easier, easier + 5, harder * 5]),
                explanation: `${easier} × ${harder} = ${easier} × 5 + ${easier} × ${secondFactor}. Prvá časť je ${firstPart}.`,
            };
        }

        return null;
    }

    return null;
};

export const createEarlyGradeGuidance = (problem: Problem): GuidedCorrection | null => {
    const metadata = getProblemMetadata(problem);
    if (metadata?.type !== 'addition' && metadata?.type !== 'subtraction') return null;
    return createGuidedCorrection(problem);
};
