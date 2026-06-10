import { type Constraints, type MathOperation, type Problem } from './types';
import { isMultiplicationTableTopic } from './schoolRules';

export type GridPuzzleCellId = string;

export interface GridPuzzleEquation {
    id: string;
    left: GridPuzzleCellId;
    operation: MathOperation;
    right: GridPuzzleCellId;
    result: GridPuzzleCellId;
}

export interface GridPuzzlePosition {
    x: number;
    y: number;
}

export interface GridPuzzle {
    id: string;
    values: Record<GridPuzzleCellId, number>;
    positions: Record<GridPuzzleCellId, GridPuzzlePosition>;
    revealed: GridPuzzleCellId[];
    blanks: GridPuzzleCellId[];
    equations: GridPuzzleEquation[];
}

interface GridPuzzleTemplate {
    id: string;
    minGrade: number;
    positions: Record<GridPuzzleCellId, GridPuzzlePosition>;
    equations: Omit<GridPuzzleEquation, 'operation'>[];
}

const SUPPORTED_OPERATIONS: MathOperation[] = ['+', '-', '*', '/'];

const TEMPLATES: GridPuzzleTemplate[] = [
    {
        id: 'compact-cross',
        minGrade: 1,
        positions: {
            a: { x: 12, y: 14 },
            b: { x: 50, y: 14 },
            r1: { x: 88, y: 14 },
            c: { x: 12, y: 50 },
            d: { x: 50, y: 50 },
            r2: { x: 88, y: 50 },
            c1: { x: 12, y: 86 },
            c2: { x: 50, y: 86 },
        },
        equations: [
            { id: 'row-top', left: 'a', right: 'b', result: 'r1' },
            { id: 'row-mid', left: 'c', right: 'd', result: 'r2' },
            { id: 'col-left', left: 'a', right: 'c', result: 'c1' },
            { id: 'col-mid', left: 'b', right: 'd', result: 'c2' },
        ],
    },
    {
        id: 'right-branch',
        minGrade: 2,
        positions: {
            a: { x: 12, y: 12 },
            b: { x: 44, y: 12 },
            r1: { x: 76, y: 12 },
            c: { x: 12, y: 40 },
            d: { x: 44, y: 40 },
            r2: { x: 76, y: 40 },
            c1: { x: 12, y: 68 },
            c2: { x: 44, y: 68 },
            r3: { x: 76, y: 68 },
            tail: { x: 44, y: 92 },
            tailResult: { x: 76, y: 92 },
        },
        equations: [
            { id: 'row-top', left: 'a', right: 'b', result: 'r1' },
            { id: 'row-mid', left: 'c', right: 'd', result: 'r2' },
            { id: 'col-left', left: 'a', right: 'c', result: 'c1' },
            { id: 'col-mid', left: 'b', right: 'd', result: 'c2' },
            { id: 'col-right', left: 'r1', right: 'r2', result: 'r3' },
            { id: 'tail', left: 'c2', right: 'tail', result: 'tailResult' },
        ],
    },
    {
        id: 'wide-web',
        minGrade: 3,
        positions: {
            a: { x: 10, y: 11 },
            b: { x: 36, y: 11 },
            r1: { x: 62, y: 11 },
            c: { x: 10, y: 36 },
            d: { x: 36, y: 36 },
            r2: { x: 62, y: 36 },
            g: { x: 10, y: 61 },
            e: { x: 36, y: 61 },
            f: { x: 62, y: 61 },
            r3: { x: 88, y: 61 },
            h: { x: 36, y: 86 },
            r4: { x: 62, y: 86 },
            bottomResult: { x: 88, y: 86 },
        },
        equations: [
            { id: 'row-top', left: 'a', right: 'b', result: 'r1' },
            { id: 'row-mid', left: 'c', right: 'd', result: 'r2' },
            { id: 'col-left', left: 'a', right: 'c', result: 'g' },
            { id: 'col-mid', left: 'b', right: 'd', result: 'e' },
            { id: 'col-right', left: 'r1', right: 'r2', result: 'f' },
            { id: 'row-low', left: 'e', right: 'f', result: 'r3' },
            { id: 'row-bottom', left: 'h', right: 'r4', result: 'bottomResult' },
        ],
    },
    {
        id: 'ladder',
        minGrade: 3,
        positions: {
            a: { x: 14, y: 10 },
            b: { x: 42, y: 10 },
            r1: { x: 70, y: 10 },
            c: { x: 42, y: 35 },
            r2: { x: 70, y: 35 },
            e: { x: 42, y: 60 },
            r3: { x: 70, y: 60 },
            f: { x: 42, y: 86 },
            r4: { x: 70, y: 86 },
            side: { x: 90, y: 35 },
            bottomResult: { x: 90, y: 86 },
        },
        equations: [
            { id: 'top', left: 'a', right: 'b', result: 'r1' },
            { id: 'middle-right', left: 'c', right: 'r2', result: 'side' },
            { id: 'center-vertical', left: 'b', right: 'c', result: 'e' },
            { id: 'right-vertical', left: 'r1', right: 'r2', result: 'r3' },
            { id: 'bottom', left: 'f', right: 'r4', result: 'bottomResult' },
        ],
    },
];

const randomInt = (min: number, max: number) => {
    const safeMin = Math.ceil(min);
    const safeMax = Math.floor(max);
    return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
};

const shuffle = <T,>(items: T[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const getGradeNumber = (settings: Constraints) => {
    const match = settings.schoolGrade?.match(/\d+/);
    return match ? Number(match[0]) : 3;
};

const pickTemplate = (settings: Constraints) => {
    const grade = getGradeNumber(settings);
    const available = TEMPLATES.filter(template => template.minGrade <= grade);
    return randomChoice(available.length ? available : [TEMPLATES[0]]);
};

const randomChoice = <T,>(items: T[]) => items[randomInt(0, items.length - 1)];

const pickOperation = (settings: Constraints): MathOperation => {
    const topicOperations = settings.schoolTopics?.flatMap(topic => {
        if (topic === 'addition') return ['+' as const];
        if (topic === 'subtraction') return ['-' as const];
        if (topic === 'multiplication' || topic === 'large_multiplication' || isMultiplicationTableTopic(topic)) return ['*' as const];
        if (topic === 'division' || topic === 'large_division' || topic === 'indian_division' || topic === 'long_division') return ['/' as const];
        return [];
    }) ?? [];
    const operations = (topicOperations.length ? topicOperations : settings.allowedOperations)
        .filter((op): op is MathOperation => SUPPORTED_OPERATIONS.includes(op));
    if (!operations.length) return '+';

    const grade = getGradeNumber(settings);
    if (grade >= 4) {
        const preferred = operations.filter(op => op === '*' || op === '/');
        if (preferred.length && Math.random() < 0.7) return randomChoice(preferred);
    }

    return randomChoice(operations);
};

const getBaseLimit = (settings: Constraints) => {
    const grade = settings.schoolGrade;
    if (grade === 'grade1') return Math.min(settings.maxSumResult || 10, 10);
    if (grade === 'grade2') return Math.min(settings.maxSumResult || 20, 30);
    if (grade === 'grade4' || grade === 'grade5') return Math.min(settings.maxSumResult || 999, 999);
    return Math.min(settings.maxSumResult || 100, 100);
};

const compute = (left: number, operation: MathOperation, right: number) => {
    if (operation === '+') return left + right;
    if (operation === '-') return left - right;
    if (operation === '*') return left * right;
    return left / right;
};

const getEquationIdsForCell = (cell: GridPuzzleCellId, equations: GridPuzzleEquation[]) => (
    equations.filter(equation => equation.left === cell || equation.right === cell || equation.result === cell)
);

const getDisplayExpression = (puzzle: GridPuzzle, equation: GridPuzzleEquation, blankId: GridPuzzleCellId) => {
    const left = blankId === equation.left ? '?' : puzzle.values[equation.left].toString();
    const right = blankId === equation.right ? '?' : puzzle.values[equation.right].toString();
    const result = blankId === equation.result ? '?' : puzzle.values[equation.result].toString();
    return `${left} ${equation.operation} ${right} = ${result}`;
};

const canExplainEveryBlank = (selected: GridPuzzleCellId[], equations: GridPuzzleEquation[]) => (
    selected.every(blank => getEquationIdsForCell(blank, equations).some(equation => {
        const otherCells = [equation.left, equation.right, equation.result].filter(cell => cell !== blank);
        return otherCells.every(cell => !selected.includes(cell));
    }))
);

const chooseBlanks = (settings: Constraints, cellIds: GridPuzzleCellId[], equations: GridPuzzleEquation[]) => {
    const grade = getGradeNumber(settings);
    const target = Math.min(
        Math.max(4, grade >= 4 ? 6 : grade >= 3 ? 5 : 4),
        Math.max(4, Math.floor(cellIds.length * 0.58))
    );
    const resultCells = equations.map(equation => equation.result);
    const operandCells = cellIds.filter(cell => !resultCells.includes(cell));
    const candidates = shuffle([
        ...shuffle(resultCells),
        ...shuffle(operandCells),
    ].filter((cell, index, all) => all.indexOf(cell) === index));

    const selected: GridPuzzleCellId[] = [];
    for (const candidate of candidates) {
        if (selected.includes(candidate)) continue;
        const next = [...selected, candidate];
        if (!canExplainEveryBlank(next, equations)) continue;
        selected.push(candidate);
        if (selected.length >= target) break;
    }

    return selected.length >= 3 ? selected : shuffle(cellIds).slice(0, Math.min(4, cellIds.length));
};

const isEquationAllowed = (operation: MathOperation, right: number, result: number, settings: Constraints) => {
    if (!Number.isInteger(result)) return false;
    if (operation === '/' && right === 0) return false;
    if (result < 0 && !settings.allowNegativeResult) return false;
    if (operation === '+' && result > settings.maxSumResult) return false;
    if (operation === '*' && result > getGridMaxProduct(settings)) return false;
    if (operation === '/' && settings.maxDivisionResult && result > getGridMaxDivisionQuotient(settings)) return false;
    return result >= 0 && result <= Math.max(settings.maxSumResult, getGridMaxProduct(settings), 100);
};

const getGridMaxProduct = (settings: Constraints) => (
    settings.schoolTopics?.includes('large_multiplication')
        ? 9999
        : getGradeNumber(settings) >= 4
        ? Math.min(Math.max(settings.maxMulProduct, settings.maxSumResult, 144), 999)
        : settings.maxMulProduct
);

const getGridMaxDivisionQuotient = (settings: Constraints) => (
    settings.schoolTopics?.includes('large_division')
        ? 333
        : settings.maxDivisionResult ?? (getGradeNumber(settings) >= 4 ? 99 : 10)
);

const shouldUseLargeMultiplication = (settings: Constraints) => {
    const topics = settings.schoolTopics ?? [];
    return topics.includes('large_multiplication') && (!topics.includes('multiplication') || Math.random() < 0.65);
};

const shouldUseLargeDivision = (settings: Constraints) => {
    const topics = settings.schoolTopics ?? [];
    return topics.includes('large_division') && (!topics.includes('division') || Math.random() < 0.65);
};

const seedOperand = (settings: Constraints) => {
    const grade = getGradeNumber(settings);
    if (grade >= 4) return randomInt(6, Math.min(99, Math.max(20, getBaseLimit(settings))));
    if (grade >= 3) return randomInt(3, Math.min(30, getBaseLimit(settings)));
    return seedValue(settings);
};

const chooseRightForKnownLeft = (left: number, operation: MathOperation, settings: Constraints): number | null => {
    const maxResult = Math.max(10, getBaseLimit(settings));
    const grade = getGradeNumber(settings);

    if (operation === '+') return randomInt(2, Math.max(2, Math.min(maxResult - left, grade >= 4 ? 120 : maxResult)));
    if (operation === '-') return left > 1 ? randomInt(1, left) : null;
    if (operation === '*') {
        if (shouldUseLargeMultiplication(settings)) {
            const maxRight = Math.min(9, Math.floor(getGridMaxProduct(settings) / Math.max(1, left)));
            if (left >= 100 && left <= 999 && maxRight >= 2) return randomInt(2, maxRight);
        }
        const tableOptions = settings.allowedMultiplicationTables?.filter(table => table >= 1 && table <= 10) ?? [];
        if (tableOptions.length && tableOptions.includes(left)) {
            const maxRight = Math.min(10, Math.floor(getGridMaxProduct(settings) / Math.max(1, left)));
            return maxRight >= 2 ? randomInt(2, maxRight) : null;
        }
        if (tableOptions.length) return randomChoice(tableOptions);
        const maxRight = Math.min(grade >= 4 ? 12 : 10, Math.floor(getGridMaxProduct(settings) / Math.max(1, left)));
        return maxRight >= 2 ? randomInt(2, maxRight) : null;
    }
    const divisors = (settings.allowedDivisionDivisors?.length ? settings.allowedDivisionDivisors : [2, 3, 4, 5, 6, 7, 8, 9, 10])
        .filter(divisor => divisor > 1 && divisor <= (settings.schoolTopics?.includes('large_division') ? 9 : 10) && left % divisor === 0 && left / divisor <= getGridMaxDivisionQuotient(settings));
    return divisors.length ? randomChoice(divisors) : null;
};

const chooseLeftForKnownRight = (right: number, operation: MathOperation, settings: Constraints): number | null => {
    const maxResult = Math.max(10, getBaseLimit(settings));
    const grade = getGradeNumber(settings);

    if (operation === '+') return randomInt(2, Math.max(2, Math.min(maxResult - right, grade >= 4 ? 120 : maxResult)));
    if (operation === '-') return randomInt(right, Math.max(right + 1, Math.min(maxResult, right + (grade >= 4 ? 120 : maxResult))));
    if (operation === '*') {
        if (shouldUseLargeMultiplication(settings)) {
            if (right >= 2 && right <= 9) return randomInt(100, Math.min(999, Math.floor(getGridMaxProduct(settings) / right)));
        }
        const tableOptions = settings.allowedMultiplicationTables?.filter(table => table >= 1 && table <= 10) ?? [];
        if (tableOptions.length) {
            const table = randomChoice(tableOptions);
            return table * right <= getGridMaxProduct(settings) ? table : null;
        }
        const maxLeft = Math.min(grade >= 4 ? 99 : 10, Math.floor(getGridMaxProduct(settings) / Math.max(1, right)));
        return maxLeft >= 2 ? randomInt(2, maxLeft) : null;
    }
    if (right <= 1) return null;
    const maxQuotient = Math.max(2, getGridMaxDivisionQuotient(settings));
    return right * randomInt(2, maxQuotient);
};

const chooseFreshOperands = (operation: MathOperation, settings: Constraints): { left: number; right: number } | null => {
    const grade = getGradeNumber(settings);
    const maxResult = Math.max(10, getBaseLimit(settings));

    if (operation === '+') {
        const left = seedOperand(settings);
        const right = randomInt(2, Math.max(2, Math.min(maxResult - left, grade >= 4 ? 120 : maxResult)));
        return { left, right };
    }

    if (operation === '-') {
        const left = seedOperand(settings);
        return { left, right: randomInt(1, left) };
    }

    if (operation === '*') {
        if (shouldUseLargeMultiplication(settings)) {
            const largeTables = settings.allowedMultiplicationTables?.filter(table => table >= 2 && table <= 9) ?? [];
            const right = randomChoice(largeTables.length ? largeTables : [2, 3, 4, 5, 6, 7, 8, 9]);
            const maxLeft = Math.max(100, Math.min(999, Math.floor(getGridMaxProduct(settings) / right)));
            return { left: randomInt(100, maxLeft), right };
        }
        if (grade >= 4) {
            const right = randomChoice(settings.allowedMultiplicationTables?.length ? settings.allowedMultiplicationTables : [6, 7, 8, 9, 10, 11, 12]);
            const maxLeft = Math.max(6, Math.min(99, Math.floor(getGridMaxProduct(settings) / right)));
            return { left: randomInt(6, maxLeft), right };
        }
        const tableOptions = settings.allowedMultiplicationTables?.filter(table => table >= 1 && table <= 10) ?? [];
        const left = tableOptions.length ? randomChoice(tableOptions) : randomInt(2, 10);
        const maxRight = Math.max(2, Math.min(10, Math.floor(settings.maxMulProduct / left)));
        return { left, right: randomInt(2, maxRight) };
    }

    const divisorOptions = settings.allowedDivisionDivisors?.length ? settings.allowedDivisionDivisors : [2, 3, 4, 5, 6, 7, 8, 9, 10];
    const largeDivisors = divisorOptions.filter(value => value >= 2 && value <= 9);
    const divisor = randomChoice(shouldUseLargeDivision(settings) ? (largeDivisors.length ? largeDivisors : [2, 3, 4, 5, 6, 7, 8, 9]) : divisorOptions);
    const maxQuotient = getGridMaxDivisionQuotient(settings);
    const minQuotient = shouldUseLargeDivision(settings) ? Math.ceil(100 / divisor) : 2;
    const quotient = randomInt(minQuotient, Math.max(minQuotient, Math.min(maxQuotient, Math.floor(999 / divisor))));
    return { left: divisor * quotient, right: divisor };
};

export const getGridPuzzleEquationForBlank = (puzzle: GridPuzzle, blankId: GridPuzzleCellId): GridPuzzleEquation => {
    const containing = getEquationIdsForCell(blankId, puzzle.equations);
    return containing.find(equation => {
        const otherCells = [equation.left, equation.right, equation.result].filter(cell => cell !== blankId);
        return otherCells.every(cell => !puzzle.blanks.includes(cell));
    }) ?? containing[0] ?? puzzle.equations[0];
};

const createProblemForEquation = (puzzle: GridPuzzle, equation: GridPuzzleEquation, blankId: GridPuzzleCellId): Problem => {
    const left = puzzle.values[equation.left];
    const right = puzzle.values[equation.right];
    const equationResult = puzzle.values[equation.result];
    const expression = getDisplayExpression(puzzle, equation, blankId);
    const missingValue = puzzle.values[blankId];

    const metadata = blankId === equation.result
        ? equation.operation === '+'
            ? { type: 'addition' as const, left, right }
            : equation.operation === '-'
                ? { type: 'subtraction' as const, left, right }
                : equation.operation === '*'
                    ? { type: 'multiplication' as const, left, right }
                    : { type: 'division' as const, dividend: left, divisor: right }
        : equation.operation === '+'
            ? { type: 'missing_addition' as const, known: blankId === equation.left ? right : left, total: equationResult, hideLeft: blankId === equation.left }
            : equation.operation === '-'
                ? blankId === equation.left
                    ? { type: 'missing_subtraction' as const, variant: 'minuend' as const, known: right, result: equationResult }
                    : { type: 'missing_subtraction' as const, variant: 'subtrahend' as const, known: left, result: equationResult }
                : equation.operation === '*'
                    ? { type: 'missing_multiplication' as const, known: blankId === equation.left ? right : left, total: equationResult, hideLeft: blankId === equation.left }
                    : blankId === equation.left
                        ? { type: 'missing_division' as const, variant: 'dividend' as const, known: right, quotient: equationResult }
                        : { type: 'missing_division' as const, variant: 'divisor' as const, known: left, quotient: equationResult };

    return {
        id: `grid-${puzzle.id}-${blankId}`,
        expression,
        result: missingValue,
        steps: [`${getDisplayExpression(puzzle, equation, blankId)}`, `Chýba číslo ${missingValue}.`],
        metadata,
    };
};

export const getGridPuzzleProblem = (puzzle: GridPuzzle, blankId: GridPuzzleCellId): Problem => {
    const equation = getGridPuzzleEquationForBlank(puzzle, blankId);
    return createProblemForEquation(puzzle, equation, blankId);
};

const seedValue = (settings: Constraints) => randomInt(1, Math.max(5, getBaseLimit(settings)));

const buildPuzzleFromTemplate = (settings: Constraints, template: GridPuzzleTemplate): GridPuzzle | null => {
    const values: Record<GridPuzzleCellId, number> = {};
    const equations: GridPuzzleEquation[] = [];

    for (const definition of template.equations) {
        let equation: GridPuzzleEquation | null = null;
        let chosenLeft = 0;
        let chosenRight = 0;
        let chosenResult = 0;

        for (let attempt = 0; attempt < 40; attempt++) {
            const operation = pickOperation(settings);
            const existingLeft = values[definition.left];
            const existingRight = values[definition.right];
            const fresh = existingLeft === undefined && existingRight === undefined
                ? chooseFreshOperands(operation, settings)
                : null;
            const left = existingLeft ?? fresh?.left ?? (
                existingRight !== undefined
                    ? chooseLeftForKnownRight(existingRight, operation, settings)
                    : null
            );
            const right = existingRight ?? fresh?.right ?? (
                left !== null && left !== undefined
                    ? chooseRightForKnownLeft(left, operation, settings)
                    : null
            );

            if (left === null || right === null || left === undefined || right === undefined) continue;

            chosenLeft = left;
            chosenRight = right;
            chosenResult = compute(chosenLeft, operation, chosenRight);

            if (!isEquationAllowed(operation, chosenRight, chosenResult, settings)) continue;
            if (values[definition.result] !== undefined && values[definition.result] !== chosenResult) continue;

            equation = { ...definition, operation };
            break;
        }

        if (!equation) return null;

        values[definition.left] = chosenLeft;
        values[definition.right] = chosenRight;
        values[definition.result] = chosenResult;
        equations.push(equation);
    }

    const cellIds = Object.keys(template.positions);
    if (!cellIds.every(cell => Number.isFinite(values[cell]))) return null;

    const blanks = chooseBlanks(settings, cellIds, equations);
    if (!canExplainEveryBlank(blanks, equations)) return null;

    return {
        id: `${Date.now().toString(36)}-${template.id}-${Math.random().toString(36).slice(2)}`,
        values,
        positions: template.positions,
        revealed: cellIds.filter(cell => !blanks.includes(cell)),
        blanks,
        equations,
    };
};

export const generateGridPuzzle = (settings: Constraints): GridPuzzle => {
    const maxAttempts = 500;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const template = pickTemplate(settings);
        const puzzle = buildPuzzleFromTemplate(settings, template);
        if (puzzle) return puzzle;
    }

    const fallbackTemplate = TEMPLATES[0];
    if (getGradeNumber(settings) >= 4) {
        const useDivision = settings.schoolTopics?.includes('large_division') && !settings.schoolTopics?.includes('large_multiplication');
        const divisor = 4;
        const quotientA = 48;
        const quotientB = 27;
        const leftA = useDivision ? divisor * quotientA : 136;
        const rightA = useDivision ? divisor : 4;
        const resultA = useDivision ? quotientA : leftA * rightA;
        const leftB = useDivision ? divisor * quotientB : 87;
        const rightB = useDivision ? divisor : 6;
        const resultB = useDivision ? quotientB : leftB * rightB;

        return {
            id: `${Date.now().toString(36)}-fallback-grade4`,
            values: { a: leftA, b: rightA, r1: resultA, c: leftB, d: rightB, r2: resultB, c1: leftA + leftB, c2: rightA + rightB },
            positions: fallbackTemplate.positions,
            revealed: ['a', 'b', 'c', 'd'],
            blanks: ['r1', 'r2', 'c1', 'c2'],
            equations: [
                { id: 'row-top', left: 'a', operation: useDivision ? '/' : '*', right: 'b', result: 'r1' },
                { id: 'row-mid', left: 'c', operation: useDivision ? '/' : '*', right: 'd', result: 'r2' },
                { id: 'col-left', left: 'a', operation: '+', right: 'c', result: 'c1' },
                { id: 'col-mid', left: 'b', operation: '+', right: 'd', result: 'c2' },
            ],
        };
    }

    return {
        id: `${Date.now().toString(36)}-fallback`,
        values: { a: 3, b: 4, r1: 7, c: 5, d: 2, r2: 7, c1: 8, c2: 6 },
        positions: fallbackTemplate.positions,
        revealed: ['a', 'b', 'c', 'd'],
        blanks: ['r1', 'r2', 'c1', 'c2'],
        equations: [
            { id: 'row-top', left: 'a', operation: '+', right: 'b', result: 'r1' },
            { id: 'row-mid', left: 'c', operation: '+', right: 'd', result: 'r2' },
            { id: 'col-left', left: 'a', operation: '+', right: 'c', result: 'c1' },
            { id: 'col-mid', left: 'b', operation: '+', right: 'd', result: 'c2' },
        ],
    };
};
