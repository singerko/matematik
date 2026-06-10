import type { Problem } from './types';
import { getProblemMetadata } from './problemMetadata';

const uniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const createProblem = (expression: string, result: number): Problem => ({
    id: uniqueId(),
    kind: 'standard',
    expression,
    result,
    steps: [],
    isAdaptiveFollowUp: true,
});

const createLargeMultiplicationProblem = (multiplicand: number, multiplier: number): Problem => {
    const product = multiplicand * multiplier;
    const digits = multiplicand.toString().split('').reverse().map(Number);
    let carry = 0;
    const steps = digits.map((digit, position) => {
        const carryIn = carry;
        const partialProduct = digit * multiplier + carryIn;
        const resultDigit = partialProduct % 10;
        const carryOut = Math.floor(partialProduct / 10);
        carry = carryOut;
        return {
            position,
            digit,
            carryIn,
            partialProduct,
            resultDigit,
            carryOut,
        };
    });

    return {
        id: uniqueId(),
        kind: 'large_multiplication',
        expression: `${multiplicand} * ${multiplier}`,
        result: product,
        steps: [],
        largeMultiplication: {
            multiplicand,
            multiplier,
            product,
            steps,
        },
        isAdaptiveFollowUp: true,
        metadata: { type: 'multiplication', left: multiplicand, right: multiplier },
    };
};

const isThreeByOneMultiplication = (left: number, right: number) =>
    (left >= 100 && left <= 999 && right >= 2 && right <= 9)
    || (right >= 100 && right <= 999 && left >= 2 && left <= 9);

export const createFollowUpProblem = (problem: Problem): Problem | null => {
    const metadata = getProblemMetadata(problem);
    if (!metadata) return null;

    switch (metadata.type) {
        case 'addition': {
            const { left, right } = metadata;
            // Pedagogical Scaffolding: If crossing tens, help to reach ten first
            if ((left % 10) + (right % 10) >= 10) {
                const toTen = 10 - (left % 10);
                if (toTen > 0 && toTen < right) {
                    return createProblem(`${left} + ${toTen}`, left + toTen);
                }
            }
            return createProblem(`${right} + ${left}`, left + right);
        }
        case 'subtraction': {
            const { left, right } = metadata;
            // Pedagogical Scaffolding: If crossing tens, help to reach ten first
            if ((left % 10) < (right % 10)) {
                const toTen = left % 10;
                if (toTen > 0 && toTen < right) {
                    return createProblem(`${left} - ${toTen}`, left - toTen);
                }
            }
            return createProblem(`${left - right} + ${right}`, left);
        }
        case 'multiplication': {
            const { left, right } = metadata;
            if (problem.kind === 'large_multiplication' || isThreeByOneMultiplication(left, right)) {
                const multiplicand = left >= 100 ? left : right;
                const multiplier = left >= 100 ? right : left;
                return createLargeMultiplicationProblem(multiplicand, multiplier);
            }
            return createProblem(`${right} * ${left}`, left * right);
        }
        case 'division': {
            const { dividend, divisor } = metadata;
            if (divisor === 0) return null;
            return createProblem(`${dividend / divisor} * ${divisor}`, dividend);
        }
        case 'missing_addition': {
            const { known, total } = metadata;
            return createProblem(`${total} - ${known}`, total - known);
        }
        case 'missing_subtraction': {
            if (metadata.variant === 'subtrahend') {
                const { known: left, result } = metadata;
                return createProblem(`${left} - ${result}`, left - result);
            }
            const { known: right, result } = metadata;
            return createProblem(`${result} + ${right}`, result + right);
        }
        case 'missing_multiplication': {
            const { known, total } = metadata;
            if (known === 0) return null;
            return createProblem(`${total} / ${known}`, total / known);
        }
        case 'missing_division': {
            if (metadata.variant === 'dividend') {
                const { known: divisor, quotient } = metadata;
                return createProblem(`${quotient} * ${divisor}`, quotient * divisor);
            }
            const { known: dividend, quotient } = metadata;
            if (quotient === 0) return null;
            return createProblem(`${dividend} / ${quotient}`, dividend / quotient);
        }
        default:
            return null;
    }
};
