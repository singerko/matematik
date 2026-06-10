import { type Constraints, type Problem, type MathOperation, type ProblemMetadata, type SchoolTopic, type UnitConversionCategory, type WordProblemBaseTopic } from './types';
import { arabicToRoman } from './romanNumerals';
import { getMultiplicationTableFromTopic, isMultiplicationTableTopic } from './schoolRules';

// Helper to get random int between min and max (inclusive)
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to get random int, biased towards max
const randomIntBiased = (min: number, max: number) => {
    // Square root distribution favors higher numbers
    // 75% of values will be in upper half
    return Math.floor(min + (max - min) * Math.sqrt(Math.random()));
};

// Helper to pick random item from array
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const uniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const resolveMissingMode = (settings: Constraints): 'off' | 'only' | 'mixed' => {
    if (settings.missingOperandMode) return settings.missingOperandMode;
    return settings.missingOperand ? 'mixed' : 'off';
};

const shouldGenerateMissingOperand = (settings: Constraints) => {
    const mode = resolveMissingMode(settings);
    if (mode === 'only') return true;
    if (mode === 'mixed') return Math.random() < 0.5;
    return false;
};

export const generateProblem = (settings: Constraints): Problem => {
    if (settings.schoolTopics?.length) {
        return generateSchoolTopicProblem(settings);
    }

    if (settings.exactOperationCount === 1 && settings.maxNumbers === 2) {
        return generateSingleOperationProblem(settings);
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 50;

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        try {
            // Build a tree.
            const root = buildTree(settings, settings.maxNumbers);
            const expr = treeToString(root);
            // Final verification (just in case)
            const result = evaluateExpressionSimple(expr);

            if (!settings.allowNegativeResult && result < 0) continue;
            if (settings.maxSumResult && result > settings.maxSumResult) continue; // Basic check, though construction should handle it

            // If missingOperand is enabled, we mix it up (e.g. 50% chance)
            // User request: "bude ponukat oba druhy prikladov"
            if (shouldGenerateMissingOperand(settings)) {
                // Find all leaves
                const leaves: Node[] = [];
                collectLeaves(root, leaves);

                if (leaves.length > 0) {
                    const targetLeaf = randomChoice(leaves);
                    const newExpr = treeToString(root, targetLeaf);
                    // For UI, we want "3 + ? = 5" format? 
                    // Or just "3 + ?" and the user inputs the result?
                    // The user request said: "napriklad 1 + ? = 2".
                    // The current UI displays "Problem: [Expression]". User types input.
                    // If I set expression to "1 + ? = 2", the user sees "1 + ? = 2". And types what?
                    // Ah, the game loop expects "result".
                    // If the problem is "1 + ? = 2", the user should type the missing number.

                    // Current UI asks: "Calculate: [Expression] = [InputBox]"
                    // If I change expression to "1 + ? = 5", then the UI shows "1 + ? = 5 = [InputBox]". That's confusing.
                    // The user wants "dopocitat clen". "1 + ? = 2".
                    // Ideally the UI formats it.
                    // But if I return expression "1 + ? = 2", and result is the missing number.
                    // The UI might show "1 + ? = 2 = ?"

                    // Let's assume for now I just return "1 + ?" and the UI adds "= ?".
                    // Or I return "1 + ? = 5" and the UI is robust enough? 
                    // The user said: "vypocet clenu ... napriklad 1 + ? = 2".
                    // If I act as if the expression is "1 + ?", the UI likely shows "1 + ?". 
                    // The user knows to solve for ?.
                    // BUT, providing the *result* of the full equation is crucial for context.
                    // "1 + ?" is ambiguous without "= 2".
                    // So the expression MUST be "1 + ? = [OriginalResult]".

                    const originalResult = evaluateExpressionSimple(treeToString(root));
                    return {
                        id: uniqueId(),
                        expression: `${newExpr} = ${originalResult}`,
                        result: targetLeaf.value!, // The hidden number is the new answer
                        steps: []
                    };
                }
            }

            // Basic string formatting
            return {
                id: uniqueId(),
                expression: expr,
                result: result,
                steps: [] // We will populate steps during evaluation relative to user input or just verify
            };

        } catch {
            // Retry if generation failed (e.g. constraints couldn't be met)
            continue;
        }
    }
    throw new Error("Could not generate a valid problem with current settings.");
};

const createProblem = (expression: string, result: number, metadata?: ProblemMetadata): Problem => ({
    id: uniqueId(),
    kind: 'standard',
    expression,
    result,
    steps: [],
    metadata,
});

const generateLargeMultiplicationProblem = (settings: Constraints): Problem => {
    const tables = settings.allowedMultiplicationTables?.filter(table => table >= 2 && table <= 9);
    const multiplier = randomChoice(tables?.length ? tables : [2, 3, 4, 5, 6, 7, 8, 9]);
    const multiplicand = randomInt(100, Math.max(100, Math.min(settings.maxSumResult ?? 999, 999)));
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
        metadata: { type: 'multiplication', left: multiplicand, right: multiplier },
    };
};

const generateLargeDivisionProblem = (settings: Constraints): Problem => {
    return generateLongDivisionProblem({
        ...settings,
        maxLongDividend: Math.max(100, Math.min(settings.maxLongDividend ?? settings.maxSumResult ?? 999, 999)),
        maxLongDivisor: 9,
        allowLongDivisionRemainder: true,
    });
};

const generateBiasedIndianDividend = (maxDividend: number) => {
    const maxText = maxDividend.toString();
    const maxDigits = maxText.length;
    const preferredDigits = /^10+$/.test(maxText) ? maxDigits - 1 : maxDigits;
    const fallbackDigits = Math.max(2, preferredDigits - 1);
    const targetDigits = preferredDigits > 2 && Math.random() < 0.85 ? preferredDigits : fallbackDigits;
    const min = Math.pow(10, targetDigits - 1);
    const maxForDigits = Math.min(maxDividend, Math.pow(10, targetDigits) - 1);
    return randomInt(min, maxForDigits);
};

const generateLongDivisionProblem = (settings: Constraints): Problem => {
    const maxDividend = Math.max(10, settings.maxLongDividend ?? 100);
    const maxDivisor = Math.max(2, settings.maxLongDivisor ?? 9);
    const allowFinalRemainder = settings.allowLongDivisionRemainder ?? false;
    const divisorOptions = settings.allowedDivisionDivisors?.filter(divisor => divisor >= 2 && divisor <= maxDivisor);

    for (let attempt = 0; attempt < 200; attempt++) {
        const divisor = randomChoice(divisorOptions?.length ? divisorOptions : Array.from({ length: maxDivisor - 1 }, (_, index) => index + 2));
        const dividend = generateBiasedIndianDividend(maxDividend);
        const digits = dividend.toString().split('').map(Number);

        if (digits[0] < divisor) continue;

        let carry = 0;
        let quotientText = '';
        const steps = [];

        for (const digit of digits) {
            const partialDividend = carry * 10 + digit;
            const quotientDigit = Math.floor(partialDividend / divisor);
            const remainder = partialDividend % divisor;
            steps.push({ partialDividend, quotientDigit, remainder });
            quotientText += quotientDigit.toString();
            carry = remainder;
        }

        const quotient = parseInt(quotientText, 10);
        if (!allowFinalRemainder && carry !== 0) continue;

        return {
            id: uniqueId(),
            kind: 'long_division',
            expression: `${dividend} / ${divisor}`,
            result: quotient,
            finalRemainder: carry,
            steps: [],
            longDivision: {
                dividend,
                divisor,
                quotient,
                remainder: carry,
                allowFinalRemainder,
                steps,
            },
            metadata: { type: 'long_division' },
        };
    }

    throw new Error("Could not generate long division problem.");
};

const generateIndianDivisionProblem = (settings: Constraints): Problem => {
    const maxDividend = Math.max(10, settings.maxIndianDividend ?? 100);
    const maxDivisor = Math.max(2, settings.maxIndianDivisor ?? 9);
    const allowFinalRemainder = settings.allowIndianDivisionRemainder ?? false;

    for (let attempt = 0; attempt < 200; attempt++) {
        const divisor = randomInt(2, maxDivisor);
        const dividend = generateBiasedIndianDividend(maxDividend);
        const digits = dividend.toString().split('').map(Number);

        if (digits[0] < divisor) continue;

        let carry = 0;
        let quotientText = '';
        const steps = [];

        for (const digit of digits) {
            const partialDividend = carry * 10 + digit;
            const quotientDigit = Math.floor(partialDividend / divisor);
            const remainder = partialDividend % divisor;
            steps.push({ partialDividend, quotientDigit, remainder });
            quotientText += quotientDigit.toString();
            carry = remainder;
        }

        const quotient = parseInt(quotientText, 10);
        if (!allowFinalRemainder && carry !== 0) continue;

        return {
            id: uniqueId(),
            kind: 'indian_division',
            expression: `${dividend} / ${divisor}`,
            result: quotient,
            finalRemainder: carry,
            steps: [],
            indianDivision: {
                dividend,
                divisor,
                quotient,
                remainder: carry,
                allowFinalRemainder,
                steps,
            },
            metadata: { type: 'indian_division' },
        };
    }

    throw new Error("Could not generate Indian division problem.");
};

const generateNumberComparisonProblem = (settings: Constraints): Problem => {
    const maxValue = Math.max(10, settings.maxSumResult ?? 100);
    let a = randomInt(1, maxValue);
    let b = randomInt(1, maxValue);
    while (b === a) b = randomInt(1, maxValue);

    const variant: 'larger' | 'smaller' = Math.random() < 0.5 ? 'larger' : 'smaller';
    const result = variant === 'larger' ? (a > b ? 1 : 0) : (a < b ? 1 : 0);
    const stepRel = a > b ? '>' : '<';
    const expression = variant === 'larger'
        ? `Ktoré číslo je väčšie: ${a} alebo ${b}? 1=prvý, 0=druhý`
        : `Ktoré číslo je menšie: ${a} alebo ${b}? 1=prvý, 0=druhý`;

    return {
        id: uniqueId(),
        kind: 'standard',
        expression,
        result,
        steps: [
            `${a} ${stepRel} ${b}`,
            variant === 'larger'
                ? `Väčšie je ${Math.max(a, b)}.`
                : `Menšie je ${Math.min(a, b)}.`,
            `Správna odpoveď je ${result}.`,
        ],
        metadata: { type: 'number_comparison', variant, left: a, right: b },
    };
};

const generateRoundingProblem = (settings: Constraints): Problem => {
    const maxValue = Math.max(20, settings.maxSumResult ?? 100);
    const useHundreds = maxValue >= 200 && Math.random() < 0.5;
    const place: 10 | 100 = useHundreds ? 100 : 10;
    const min = place === 100 ? 100 : 11;
    let value = randomInt(min, maxValue);

    for (let attempt = 0; attempt < 100 && value % place === 0; attempt++) {
        value = randomInt(min, maxValue);
    }

    if (value % place === 0) {
        value = Math.max(min, value - 1);
    }

    const lower = Math.floor(value / place) * place;
    const upper = lower + place;
    const rounded = (value - lower) >= place / 2 ? upper : lower;

    return {
        id: uniqueId(),
        kind: 'standard',
        expression: `Zaokrúhli ${value} na ${place === 100 ? 'stovky' : 'desiatky'}`,
        result: rounded,
        steps: [
            `Najbližšie ${place === 100 ? 'stovky' : 'desiatky'}: ${lower} a ${upper}.`,
            `Číslo ${value} je bližšie k ${rounded}.`,
        ],
        metadata: { type: 'rounding', value, place },
    };
};

const UNIT_CONVERSIONS: ReadonlyArray<{
    from: 'm' | 'km' | 'h' | 'eur' | 'cm' | 'dm' | 'min' | 'kg' | 'g' | 'l' | 'dl' | 'ml';
    to: 'cm' | 'dm' | 'm' | 'min' | 'cent' | 'h' | 'km' | 'g' | 'kg' | 'dl' | 'ml' | 'l';
    factor: number;
    operation: 'multiply' | 'divide';
    fromLabel: string;
    toLabel: string;
    category: UnitConversionCategory | 'time';
}> = [
    { from: 'm', to: 'cm', factor: 100, operation: 'multiply', fromLabel: 'm', toLabel: 'cm', category: 'length' },
    { from: 'm', to: 'dm', factor: 10, operation: 'multiply', fromLabel: 'm', toLabel: 'dm', category: 'length' },
    { from: 'dm', to: 'cm', factor: 10, operation: 'multiply', fromLabel: 'dm', toLabel: 'cm', category: 'length' },
    { from: 'km', to: 'm', factor: 1000, operation: 'multiply', fromLabel: 'km', toLabel: 'm', category: 'length' },
    { from: 'kg', to: 'g', factor: 1000, operation: 'multiply', fromLabel: 'kg', toLabel: 'g', category: 'weight' },
    { from: 'l', to: 'ml', factor: 1000, operation: 'multiply', fromLabel: 'l', toLabel: 'ml', category: 'volume' },
    { from: 'l', to: 'dl', factor: 10, operation: 'multiply', fromLabel: 'l', toLabel: 'dl', category: 'volume' },
    { from: 'dl', to: 'ml', factor: 100, operation: 'multiply', fromLabel: 'dl', toLabel: 'ml', category: 'volume' },
    { from: 'h', to: 'min', factor: 60, operation: 'multiply', fromLabel: 'h', toLabel: 'min', category: 'time' },
    { from: 'eur', to: 'cent', factor: 100, operation: 'multiply', fromLabel: 'eur', toLabel: 'centov', category: 'money' },
    { from: 'cm', to: 'm', factor: 100, operation: 'divide', fromLabel: 'cm', toLabel: 'm', category: 'length' },
    { from: 'dm', to: 'm', factor: 10, operation: 'divide', fromLabel: 'dm', toLabel: 'm', category: 'length' },
    { from: 'cm', to: 'dm', factor: 10, operation: 'divide', fromLabel: 'cm', toLabel: 'dm', category: 'length' },
    { from: 'm', to: 'km', factor: 1000, operation: 'divide', fromLabel: 'm', toLabel: 'km', category: 'length' },
    { from: 'g', to: 'kg', factor: 1000, operation: 'divide', fromLabel: 'g', toLabel: 'kg', category: 'weight' },
    { from: 'ml', to: 'l', factor: 1000, operation: 'divide', fromLabel: 'ml', toLabel: 'l', category: 'volume' },
    { from: 'dl', to: 'l', factor: 10, operation: 'divide', fromLabel: 'dl', toLabel: 'l', category: 'volume' },
    { from: 'ml', to: 'dl', factor: 100, operation: 'divide', fromLabel: 'ml', toLabel: 'dl', category: 'volume' },
    { from: 'min', to: 'h', factor: 60, operation: 'divide', fromLabel: 'min', toLabel: 'h', category: 'time' },
];

const COMPOSITE_UNIT_CONVERSIONS: ReadonlyArray<{
    category: UnitConversionCategory;
    to: 'cm' | 'g' | 'ml';
    terms: ReadonlyArray<{ unit: 'm' | 'dm' | 'cm' | 'kg' | 'g' | 'l' | 'dl' | 'ml'; factor: number; min: number; max: number }>;
}> = [
    {
        category: 'length',
        to: 'cm',
        terms: [
            { unit: 'm', factor: 100, min: 1, max: 5 },
            { unit: 'dm', factor: 10, min: 2, max: 30 },
            { unit: 'cm', factor: 1, min: 15, max: 250 },
        ],
    },
    {
        category: 'weight',
        to: 'g',
        terms: [
            { unit: 'kg', factor: 1000, min: 1, max: 5 },
            { unit: 'g', factor: 1, min: 100, max: 900 },
        ],
    },
    {
        category: 'volume',
        to: 'ml',
        terms: [
            { unit: 'l', factor: 1000, min: 1, max: 5 },
            { unit: 'dl', factor: 100, min: 2, max: 20 },
            { unit: 'ml', factor: 1, min: 50, max: 900 },
        ],
    },
];

const getEnabledUnitConversionCategories = (settings: Constraints): UnitConversionCategory[] =>
    settings.unitConversionCategories?.length
        ? settings.unitConversionCategories
        : ['length', 'weight', 'money', 'volume'];

const generateCompositeUnitConversionProblem = (settings: Constraints): Problem => {
    const enabledCategories = getEnabledUnitConversionCategories(settings);
    const conversions = COMPOSITE_UNIT_CONVERSIONS.filter(conversion => enabledCategories.includes(conversion.category));
    const conversion = randomChoice(conversions.length ? [...conversions] : [...COMPOSITE_UNIT_CONVERSIONS]);
    const selectedTerms = conversion.terms
        .map(term => ({ ...term, value: randomInt(term.min, term.max) }))
        .filter(() => Math.random() < 0.85);
    const terms = selectedTerms.length >= 2
        ? selectedTerms
        : conversion.terms.slice(0, 2).map(term => ({ ...term, value: randomInt(term.min, term.max) }));
    const converted = terms.map(term => ({
        value: term.value,
        unit: term.unit,
        converted: term.value * term.factor,
    }));
    const result = converted.reduce((sum, term) => sum + term.converted, 0);

    return {
        id: uniqueId(),
        kind: 'standard',
        expression: `${converted.map(term => `${term.value} ${term.unit}`).join(' + ')} = ? ${conversion.to}`,
        result,
        steps: [
            ...converted.map(term => `${term.value} ${term.unit} = ${term.converted} ${conversion.to}`),
            `${converted.map(term => term.converted).join(' + ')} = ${result}`,
        ],
        metadata: {
            type: 'unit_conversion_sum',
            terms: converted.map(term => ({ value: term.value, unit: term.unit })),
            to: conversion.to,
            result,
        },
    };
};

const generateUnitConversionProblem = (settings: Constraints): Problem => {
    const enabledCategories = getEnabledUnitConversionCategories(settings);
    const compositeConversions = COMPOSITE_UNIT_CONVERSIONS.filter(conversion => enabledCategories.includes(conversion.category));
    if (compositeConversions.length > 0 && Math.random() < 0.35) {
        return generateCompositeUnitConversionProblem(settings);
    }

    const conversions = UNIT_CONVERSIONS.filter(conversion =>
        conversion.category !== 'time' && enabledCategories.includes(conversion.category)
    );
    const conv = randomChoice(conversions.length ? [...conversions] : [...UNIT_CONVERSIONS]);
    const factor = conv.factor;

    if (conv.operation === 'multiply') {
        const value = randomInt(2, factor === 1000 ? 9 : 12);
        const result = value * factor;
        return {
            id: uniqueId(),
            kind: 'standard',
            expression: `${value} ${conv.fromLabel} = ? ${conv.toLabel}`,
            result,
            steps: [
                `1 ${conv.fromLabel} = ${factor} ${conv.toLabel}`,
                `${value} × ${factor} = ${result}`,
            ],
            metadata: { type: 'unit_conversion', from: conv.from, to: conv.to, value, result },
        };
    }

    const baseValue = randomInt(2, 9);
    const value = baseValue * factor;
    return {
        id: uniqueId(),
        kind: 'standard',
        expression: `${value} ${conv.fromLabel} = ? ${conv.toLabel}`,
        result: baseValue,
        steps: [
            `${factor} ${conv.fromLabel} = 1 ${conv.toLabel}`,
            `${value} : ${factor} = ${baseValue}`,
        ],
        metadata: { type: 'unit_conversion', from: conv.from, to: conv.to, value, result: baseValue },
    };
};

const generateGeometryAreaProblem = (): Problem => {
    const leftRows = randomInt(2, 5);
    const leftCols = randomInt(2, 5);
    const rightRows = randomInt(2, 5);
    const rightCols = randomInt(2, 5);

    const leftArea = leftRows * leftCols;
    const rightArea = rightRows * rightCols;

    // Avoid equality too often to keep it a "larger" question
    if (leftArea === rightArea && Math.random() < 0.8) {
        return generateGeometryAreaProblem();
    }

    const result = leftArea > rightArea ? 1 : 0;

    return {
        id: uniqueId(),
        kind: 'standard',
        expression: `Ktorý obdĺžnik má väčšiu plochu? 1=Prvý (${leftRows}x${leftCols}), 0=Druhý (${rightRows}x${rightCols})`,
        result,
        steps: [
            `Prvý obdĺžnik: ${leftRows} × ${leftCols} = ${leftArea} kociek`,
            `Druhý obdĺžnik: ${rightRows} × ${rightCols} = ${rightArea} kociek`,
            leftArea > rightArea ? `${leftArea} > ${rightArea}` : leftArea < rightArea ? `${rightArea} > ${leftArea}` : 'Rovnaké',
        ],
        metadata: { type: 'geometry_area', leftRows, leftCols, rightRows, rightCols },
    };
};

const generateRomanNumeralProblem = (settings: Constraints): Problem => {
    const maxValue = Math.min(100, Math.max(20, settings.maxSumResult ?? 100));
    const value = randomInt(1, maxValue);
    const roman = arabicToRoman(value);

    if (Math.random() < 0.5) {
        return {
            id: uniqueId(),
            kind: 'standard',
            expression: `Rímske číslo ${roman} zapíš arabsky`,
            result: value,
            steps: [`${roman} = ${value}`],
            metadata: { type: 'roman_to_arabic', roman, value },
        };
    }

    return {
        id: uniqueId(),
        kind: 'standard',
        expression: `Arabské číslo ${value} zapíš rímsky`,
        result: value,
        steps: [`${value} = ${roman}`],
        metadata: { type: 'arabic_to_roman', value, roman },
    };
};

const generateMoneyCoinsProblem = (settings: Constraints): Problem => {
    const max = Math.min(20, settings.maxSumResult || 20);
    const coins: number[] = [];
    let currentSum = 0;
    
    // Fill with 1 and 2 euro coins
    while (currentSum < max - 1) {
        const c = Math.random() > 0.6 ? 2 : 1;
        if (currentSum + c > max) {
            coins.push(1);
            currentSum += 1;
        } else {
            coins.push(c);
            currentSum += c;
        }
        if (coins.length >= 8) break; // Keep it visual
    }
    
    if (currentSum < max && Math.random() > 0.4) {
        const remaining = max - currentSum;
        const next = Math.random() > 0.5 ? 2 : 1;
        if (next <= remaining) {
             coins.push(next);
             currentSum += next;
        }
    }

    return {
        id: uniqueId(),
        kind: 'standard',
        expression: `Koľko eur je na obrázku?`,
        result: currentSum,
        steps: coins.map(c => `${c}€`).concat([`Spolu: ${currentSum}€`]),
        metadata: { type: 'money_coins', coins },
    };
};

const generateLogicalSequenceProblem = (): Problem => {
    const symbols = ['🔴', '🔵', '🟢', '🟡', '🟠', '🟣', '🟥', '🟦', '🟩', '🟨', '🟧', '🟪', '⭐', '💎', '🍀'];
    
    // Pick 2 or 3 distinct symbols
    const s1 = randomChoice(symbols);
    const s2 = randomChoice(symbols.filter(s => s !== s1));
    const s3 = randomChoice(symbols.filter(s => s !== s1 && s !== s2));

    const patterns = [
        [s1, s2], // ABAB
        [s1, s1, s2], // AABAAB
        [s1, s2, s2], // ABBABB
        [s1, s2, s3], // ABCABC
    ];

    const pattern = randomChoice(patterns);
    const fullSequence: string[] = [];
    const iterations = 3;
    for (let i = 0; i < iterations; i++) {
        fullSequence.push(...pattern);
    }

    const sequenceToShow = fullSequence.slice(0, -1);
    const targetValue = fullSequence[fullSequence.length - 1];

    // Options: target + some randoms
    const options = [targetValue, ...symbols.filter(s => !pattern.includes(s)).slice(0, 3)].sort(() => Math.random() - 0.5);

    return {
        id: uniqueId(),
        kind: 'standard',
        expression: `Doplň chýbajúci tvar: ${sequenceToShow.join(' ')} ... ?`,
        result: 0, // Not used when using directAnswer
        steps: [`Vzor je: ${pattern.join(' ')}`, `Nasleduje: ${targetValue}`],
        metadata: { type: 'logical_sequence', pattern, fullSequence, options },
    };
};

const generateSchoolTopicProblem = (settings: Constraints): Problem => {
    const topics = settings.schoolTopics?.filter(topic => {
        if (topic === 'addition') return settings.allowedOperations.includes('+');
        if (topic === 'subtraction') return settings.allowedOperations.includes('-');
        if (topic === 'multiplication') return settings.allowedOperations.includes('*');
        if (isMultiplicationTableTopic(topic)) return settings.allowedOperations.includes('*');
        if (topic === 'division') return settings.allowedOperations.includes('/');
        if (topic === 'large_multiplication') return true;
        if (topic === 'large_division') return true;
        if (topic === 'indian_division') return true;
        if (topic === 'long_division') return true;
        if (topic === 'word_problem') return true;
        if (topic === 'order_operations') return true;
        if (topic === 'divisibility') return true;
        if (topic === 'multiples_divisors') return true;
        if (topic === 'fractions_intro') return true;
        if (topic === 'number_comparison') return true;
        if (topic === 'rounding') return true;
        if (topic === 'unit_conversion') return true;
        if (topic === 'geometry_area') return true;
        if (topic === 'roman_numerals') return true;
        if (topic === 'money_coins') return true;
        if (topic === 'logical_sequences') return true;
        return false;
    }) ?? [];

    if (topics.length === 0) {
        throw new Error("No school topics configured.");
    }

    const topic = randomChoice(topics);

    if (topic === 'indian_division') {
        return generateIndianDivisionProblem(settings);
    }

    if (topic === 'long_division') {
        return generateLongDivisionProblem(settings);
    }

    if (topic === 'large_multiplication') {
        return generateLargeMultiplicationProblem(settings);
    }

    if (topic === 'large_division') {
        return generateLargeDivisionProblem(settings);
    }

    if (topic === 'word_problem') {
        return generateWordProblem(settings);
    }

    if (topic === 'order_operations') {
        return generateOrderOperationsProblem();
    }

    if (topic === 'divisibility') {
        return generateDivisibilityProblem();
    }

    if (topic === 'multiples_divisors') {
        return generateMultiplesDivisorsProblem();
    }

    if (topic === 'fractions_intro') {
        return generateFractionIntroProblem();
    }

    if (topic === 'number_comparison') {
        return generateNumberComparisonProblem(settings);
    }

    if (topic === 'rounding') {
        return generateRoundingProblem(settings);
    }

    if (topic === 'unit_conversion') {
        return generateUnitConversionProblem(settings);
    }

    if (topic === 'geometry_area') {
        return generateGeometryAreaProblem();
    }

    if (topic === 'roman_numerals') {
        return generateRomanNumeralProblem(settings);
    }

    if (topic === 'money_coins') {
        return generateMoneyCoinsProblem(settings);
    }

    if (topic === 'logical_sequences') {
        return generateLogicalSequenceProblem();
    }

    if (isMultiplicationTableTopic(topic)) {
        const table = getMultiplicationTableFromTopic(topic);
        return generateSingleOperationProblem({
            ...settings,
            schoolTopics: undefined,
            allowedOperations: ['*'],
            allowedMultiplicationTables: table ? [table] : settings.allowedMultiplicationTables,
        });
    }

    const operationMap: Partial<Record<SchoolTopic, MathOperation>> = {
        addition: '+',
        subtraction: '-',
        multiplication: '*',
        division: '/',
    };
    const operation = operationMap[topic];
    if (!operation) throw new Error(`Unsupported school topic: ${topic}`);

    return generateSingleOperationProblem({
        ...settings,
        schoolTopics: undefined,
        allowedOperations: [operation],
    });
};

const generateMultiplesDivisorsProblem = (): Problem => {
    const base = randomInt(2, 10);

    if (Math.random() < 0.5) {
        const multiplier = randomInt(2, 10);
        const result = base * multiplier;
        return {
            id: uniqueId(),
            kind: 'standard',
            expression: `Napíš ${multiplier}. násobok čísla ${base}`,
            result,
            steps: [`${base} × ${multiplier} = ${result}`],
            metadata: { type: 'multiple_request', order: multiplier, base },
        };
    }

    const divisor = randomInt(2, 10);
    const result = divisor * randomInt(2, 10);
    return {
        id: uniqueId(),
        kind: 'standard',
        expression: `Napíš jedného deliteľa čísla ${result} väčšieho ako 1`,
        result: divisor,
        steps: [`${result} : ${divisor} = ${result / divisor}`],
        metadata: { type: 'divisor_request', number: result },
    };
};

const generateFractionIntroProblem = (): Problem => {
    const denominator = randomChoice([2, 3, 4, 5, 6, 8]);
    const numerator = randomInt(1, denominator - 1);
    const mode = randomChoice(['numerator', 'denominator', 'name', 'compare'] as const);

    if (mode === 'denominator') {
        return {
            id: uniqueId(),
            kind: 'standard',
            expression: `Zlomok: celok je rozdelený na ${denominator} rovnakých častí. Aký je menovateľ?`,
            result: denominator,
            steps: [`Menovateľ hovorí, na koľko rovnakých častí je rozdelený celok: ${denominator}.`],
            metadata: { type: 'fraction_denominator', denominator },
        };
    }

    if (mode === 'name') {
        const named = randomChoice([
            { label: 'polovica' as const, denominator: 2 },
            { label: 'tretina' as const, denominator: 3 },
            { label: 'štvrtina' as const, denominator: 4 },
        ]);
        return {
            id: uniqueId(),
            kind: 'standard',
            expression: `Zlomok: akú hodnotu má menovateľ pri slove ${named.label}?`,
            result: named.denominator,
            steps: [`${named.label} znamená, že celok je rozdelený na ${named.denominator} rovnaké časti.`],
            metadata: { type: 'fraction_name', label: named.label },
        };
    }

    if (mode === 'compare') {
        const left = randomInt(1, denominator - 1);
        let right = randomInt(1, denominator - 1);
        if (right === left) right = Math.max(1, Math.min(denominator - 1, right + (right + 1 < denominator ? 1 : -1)));
        const result = left > right ? 1 : 0;
        return {
            id: uniqueId(),
            kind: 'standard',
            expression: `Zlomok: čo je väčšie ${left}/${denominator} alebo ${right}/${denominator}? 1=prvý, 0=druhý`,
            result,
            steps: [
                `Menovateľ je rovnaký: ${denominator}.`,
                `Porovnáme čitateľov: ${left} a ${right}.`,
                result === 1 ? `Väčší je prvý zlomok ${left}/${denominator}.` : `Väčší je druhý zlomok ${right}/${denominator}.`,
            ],
            metadata: { type: 'fraction_compare', leftNum: left, leftDen: denominator, rightNum: right, rightDen: denominator },
        };
    }

    return {
        id: uniqueId(),
        kind: 'standard',
        expression: `Zlomok: z ${denominator} rovnakých častí sú vyfarbené ${numerator}. Aký je čitateľ?`,
        result: numerator,
        steps: [`Čitateľ hovorí, koľko častí je vyfarbených: ${numerator}.`],
        metadata: { type: 'fraction_numerator', denominator, numerator },
    };
};

const generateDivisibilityProblem = (): Problem => {
    const divisor = randomChoice([2, 3, 4, 5, 6, 9, 10]);
    const quotient = randomInt(2, 15);
    const divisible = Math.random() < 0.65;
    const number = divisible ? divisor * quotient : divisor * quotient + randomInt(1, divisor - 1);
    const result = divisible ? 1 : 0;

    return {
        id: uniqueId(),
        kind: 'standard',
        expression: `Je ${number} deliteľné číslom ${divisor}? 1=áno, 0=nie`,
        result,
        steps: [
            divisible
                ? `${number} = ${divisor} × ${quotient}, preto áno.`
                : `${number} nie je násobok čísla ${divisor}, preto nie.`,
        ],
        metadata: { type: 'divisibility', number, divisor },
    };
};

const generateOrderOperationsProblem = (): Problem => {
    const a = randomInt(2, 9);
    const b = randomInt(2, 9);
    const c = randomInt(2, 9);

    if (Math.random() < 0.5) {
        return createProblem(`${a} + ${b} * ${c}`, a + b * c, { type: 'order_operations', hasParentheses: false, a, b, c });
    }

    return createProblem(`(${a} + ${b}) * ${c}`, (a + b) * c, { type: 'order_operations', hasParentheses: true, a, b, c });
};

const pickWordProblemFallbackTopic = (settings: Constraints): SchoolTopic => {
    if (settings.allowedOperations.includes('*')) return 'multiplication';
    if (settings.allowedOperations.includes('/')) return 'division';
    if (settings.allowedOperations.includes('-')) return 'subtraction';
    return 'addition';
};

const isAdvancedGrade = (settings: Constraints) =>
    settings.schoolGrade === 'grade3' || settings.schoolGrade === 'grade4' || settings.schoolGrade === 'grade5';
const isUpperPrimary = (settings: Constraints) =>
    settings.schoolGrade === 'grade4' || settings.schoolGrade === 'grade5';

const wordProblem = (expression: string, result: number, steps: string[], baseTopic?: WordProblemBaseTopic): Problem => ({
    id: uniqueId(),
    kind: 'word_problem',
    expression,
    result,
    steps,
    metadata: { type: 'word_problem', baseTopic },
});

// --- Simple 1-step templates ---
const buildSimpleAddition = (left: number, right: number, result: number) => randomChoice([
    { expression: `Na ihrisku bolo ${left} detí. Prišlo ešte ${right} detí. Koľko detí je na ihrisku spolu?`, steps: [`${left} + ${right} = ${result}`] },
    { expression: `Ema mala ${left} kociek. Adam jej dal ešte ${right}. Koľko kociek má Ema spolu?`, steps: [`${left} + ${right} = ${result}`] },
    { expression: `V košíku je ${left} hrušiek a ${right} jabĺk. Koľko kusov ovocia je v košíku?`, steps: [`${left} + ${right} = ${result}`] },
    { expression: `Na stole sú ${left} modré kocky, ${right} červených kociek a 1 prázdna krabica. Koľko kociek je na stole?`, steps: [`${left} + ${right} = ${result}`] },
]);

const buildSimpleSubtraction = (left: number, right: number, result: number) => randomChoice([
    { expression: `Miška mala ${left} ceruziek. ${right} ceruziek požičala spolužiakom. Koľko ceruziek jej zostalo?`, steps: [`${left} - ${right} = ${result}`] },
    { expression: `Na strome bolo ${left} jabĺk. ${right} jabĺk spadlo. Koľko jabĺk ostalo na strome?`, steps: [`${left} - ${right} = ${result}`] },
    { expression: `V autobuse sedelo ${left} ľudí. Na zastávke vystúpilo ${right}. Koľko ľudí zostalo v autobuse?`, steps: [`${left} - ${right} = ${result}`] },
    { expression: `Miška mala ${left} ceruziek a 2 gumy. ${right} ceruziek požičala. Koľko ceruziek jej zostalo?`, steps: [`${left} - ${right} = ${result}`] },
]);

const buildSimpleMultiplication = (left: number, right: number, result: number) => randomChoice([
    { expression: `V ${left} vreckách je po ${right} guľôčok. Koľko guľôčok je spolu?`, steps: [`${left} * ${right} = ${result}`] },
    { expression: `${left} detí má po ${right} nálepiek. Koľko nálepiek majú spolu?`, steps: [`${left} * ${right} = ${result}`] },
    { expression: `Na ${left} tanieroch sú po ${right} koláče. Koľko koláčov je spolu?`, steps: [`${left} * ${right} = ${result}`] },
    { expression: `V triede sú ${left} rady lavíc. V každej rade sedí ${right} detí. Pri okne sú ešte 2 prázdne stoličky. Koľko detí sedí v laviciach?`, steps: [`${left} * ${right} = ${result}`] },
]);

const buildSimpleDivision = (dividend: number, divisor: number, quotient: number) => randomChoice([
    { expression: `${dividend} cukríkov rozdelíme rovnako medzi ${divisor} detí. Koľko cukríkov dostane každé dieťa?`, steps: [`${dividend} / ${divisor} = ${quotient}`] },
    { expression: `${dividend} kariet rozdelíme do ${divisor} rovnakých kôpok. Koľko kariet bude v jednej kôpke?`, steps: [`${dividend} / ${divisor} = ${quotient}`] },
    { expression: `${dividend} kociek rozdelíme do ${divisor} krabíc rovnako. Koľko kociek bude v jednej krabici?`, steps: [`${dividend} / ${divisor} = ${quotient}`] },
    { expression: `${dividend} obrázkov rozdelíme rovnako na ${divisor} nástenky. Dve nástenky sú červené. Koľko obrázkov bude na jednej nástenke?`, steps: [`${dividend} / ${divisor} = ${quotient}`] },
]);

// --- Comparison templates ("o N viac/menej", "N-krát toľko") ---
const buildComparisonAddSub = (settings: Constraints): Problem => {
    const useAddition = Math.random() < 0.5 && settings.allowedOperations.includes('+');
    const ops = useAddition
        ? generateAdditionOperands(settings)
        : generateSubtractionOperands(settings);
    const { left: base, right: diff, result } = ops;

    if (useAddition) {
        const template = randomChoice([
            { expression: `Peter má ${base} jabĺk. Anna má o ${diff} jabĺk viac. Koľko jabĺk má Anna?`, steps: [`${base} + ${diff} = ${result}`] },
            { expression: `V triede A je ${base} žiakov. V triede B je o ${diff} žiakov viac. Koľko žiakov je v triede B?`, steps: [`${base} + ${diff} = ${result}`] },
            { expression: `Knižka stála ${base} eur. Lego stálo o ${diff} eur viac. Koľko eur stálo Lego?`, steps: [`${base} + ${diff} = ${result}`] },
        ]);
        return wordProblem(template.expression, result, template.steps);
    }

    const template = randomChoice([
        { expression: `Anna má ${base} jabĺk. Peter má o ${diff} jabĺk menej. Koľko jabĺk má Peter?`, steps: [`${base} - ${diff} = ${result}`] },
        { expression: `Tomáš ušiel ${base} kilometrov. Lucia ušla o ${diff} kilometrov menej. Koľko kilometrov ušla Lucia?`, steps: [`${base} - ${diff} = ${result}`] },
        { expression: `V akváriu je ${base} rybičiek. V druhom je o ${diff} rybičiek menej. Koľko rybičiek je v druhom akváriu?`, steps: [`${base} - ${diff} = ${result}`] },
    ]);
    return wordProblem(template.expression, result, template.steps);
};

const buildComparisonMul = (settings: Constraints): Problem => {
    const maxOperand = settings.maxMulOperand ?? settings.maxOneNumberInMul;
    const base = randomInt(2, Math.min(10, maxOperand));
    const factor = randomInt(2, Math.min(9, maxOperand));
    const result = base * factor;
    const template = randomChoice([
        { expression: `Anna má ${base} jabĺk. Peter má ${factor}-krát toľko. Koľko jabĺk má Peter?`, steps: [`${base} * ${factor} = ${result}`] },
        { expression: `Maťo prečítal ${base} kníh. Mama prečítala ${factor}-krát toľko. Koľko kníh prečítala mama?`, steps: [`${base} * ${factor} = ${result}`] },
        { expression: `V malej krabici je ${base} kociek. Vo veľkej je ${factor}-krát viac kociek. Koľko kociek je vo veľkej krabici?`, steps: [`${base} * ${factor} = ${result}`] },
    ]);
    return wordProblem(template.expression, result, template.steps);
};

// --- Multi-step (shopping with change) ---
const buildMultiStepShopping = (settings: Constraints): Problem => {
    const maxOperand = Math.min(10, settings.maxMulOperand ?? settings.maxOneNumberInMul ?? 10);
    const count = randomInt(2, Math.min(5, maxOperand));
    const price = randomInt(2, Math.min(9, maxOperand));
    const spent = count * price;
    const start = spent + randomInt(5, 30);
    const result = start - spent;
    const template = randomChoice([
        {
            expression: `Anna mala ${start} eur. Kúpila si ${count} knihy po ${price} eur. Koľko eur jej zostalo?`,
            steps: [`${count} * ${price} = ${spent}`, `${start} - ${spent} = ${result}`],
        },
        {
            expression: `Peter mal ${start} eur. Kúpil ${count} pier po ${price} eur. Koľko eur mu zostalo?`,
            steps: [`${count} * ${price} = ${spent}`, `${start} - ${spent} = ${result}`],
        },
        {
            expression: `V pokladni bolo ${start} mincí. Roztriedili sme ich do ${count} kôpok po ${price}, zvyšok ostal v pokladni. Koľko mincí ostalo v pokladni?`,
            steps: [`${count} * ${price} = ${spent}`, `${start} - ${spent} = ${result}`],
        },
    ]);
    return wordProblem(template.expression, result, template.steps);
};

const buildMultiStepGroups = (settings: Constraints): Problem => {
    const maxOperand = Math.min(10, settings.maxMulOperand ?? settings.maxOneNumberInMul ?? 10);
    const groups = randomInt(2, Math.min(6, maxOperand));
    const perGroup = randomInt(3, Math.min(9, maxOperand));
    const total = groups * perGroup;
    const subset = randomInt(2, Math.max(2, total - 2));
    const result = total - subset;
    const template = randomChoice([
        {
            expression: `V škole je ${groups} tried po ${perGroup} žiakov. Z nich ${subset} ide na výlet. Koľko žiakov nejde na výlet?`,
            steps: [`${groups} * ${perGroup} = ${total}`, `${total} - ${subset} = ${result}`],
        },
        {
            expression: `Včera bolo na trhu ${groups} stánkov a v každom mali po ${perGroup} jabĺk. ${subset} jabĺk sa predalo. Koľko ich zostalo?`,
            steps: [`${groups} * ${perGroup} = ${total}`, `${total} - ${subset} = ${result}`],
        },
    ]);
    return wordProblem(template.expression, result, template.steps);
};

// --- Units (money, time, length) ---
const buildUnitsMoney = (settings: Constraints): Problem => {
    const maxOperand = Math.min(10, settings.maxMulOperand ?? settings.maxOneNumberInMul ?? 10);
    const count = randomInt(2, Math.min(9, maxOperand));
    const price = randomInt(2, Math.min(12, maxOperand));
    const result = count * price;
    const template = randomChoice([
        { expression: `Auto v obchode stojí ${price} eur. Koľko eur zaplatím za ${count} áut?`, steps: [`${count} * ${price} = ${result}`] },
        { expression: `Jedna zmrzlina stojí ${price} eur. Koľko eur stojí ${count} zmrzlín?`, steps: [`${count} * ${price} = ${result}`] },
        { expression: `Lístok do kina stojí ${price} eur. Koľko eur stojí ${count} lístkov?`, steps: [`${count} * ${price} = ${result}`] },
    ]);
    return wordProblem(template.expression, result, template.steps);
};

const buildUnitsTime = (): Problem => {
    if (Math.random() < 0.5) {
        const hours = randomInt(2, 9);
        const result = hours * 60;
        return wordProblem(
            `Hodina má 60 minút. Koľko minút trvá ${hours} hodín?`,
            result,
            [`${hours} * 60 = ${result}`],
        );
    }
    const days = randomInt(2, 7);
    const result = days * 24;
    return wordProblem(
        `Deň má 24 hodín. Koľko hodín trvá ${days} dní?`,
        result,
        [`${days} * 24 = ${result}`],
    );
};

const buildUnitsLength = (): Problem => {
    if (Math.random() < 0.5) {
        const meters = randomInt(2, 9);
        const result = meters * 100;
        return wordProblem(
            `Jeden meter má 100 centimetrov. Koľko centimetrov je ${meters} metrov?`,
            result,
            [`${meters} * 100 = ${result}`],
        );
    }
    const km = randomInt(2, 9);
    const result = km * 1000;
    return wordProblem(
        `Jeden kilometer má 1000 metrov. Koľko metrov je ${km} kilometrov?`,
        result,
        [`${km} * 1000 = ${result}`],
    );
};

const generateWordProblem = (settings: Constraints): Problem => {
    const possibleTopics = settings.schoolTopics?.filter(topic => topic !== 'word_problem' && topic !== 'indian_division') ?? [];
    const topic = possibleTopics.length ? randomChoice(possibleTopics) : pickWordProblemFallbackTopic(settings);
    const multiplicationTable = getMultiplicationTableFromTopic(topic);

    // Advanced variants for grade3+
    if (isAdvancedGrade(settings) && Math.random() < 0.35) {
        if ((topic === 'addition' || topic === 'subtraction') && settings.allowedOperations.some(op => op === '+' || op === '-')) {
            try { return buildComparisonAddSub(settings); } catch { /* fall through */ }
        }
        if (topic === 'multiplication' || multiplicationTable !== null) {
            return buildComparisonMul(settings);
        }
    }

    // Multi-step + units for grade4+
    if (isUpperPrimary(settings)) {
        const roll = Math.random();
        if (roll < 0.18) return buildMultiStepShopping(settings);
        if (roll < 0.30) return buildMultiStepGroups(settings);
        if (roll < 0.40) return buildUnitsMoney(settings);
        if (roll < 0.48) return buildUnitsTime();
        if (roll < 0.55) return buildUnitsLength();
    } else if (settings.schoolGrade === 'grade3') {
        const roll = Math.random();
        if (roll < 0.18) return buildUnitsMoney(settings);
    }

    if (topic === 'subtraction') {
        const { left, right, result } = generateSubtractionOperands(settings);
        const template = buildSimpleSubtraction(left, right, result);
        return wordProblem(template.expression, result, template.steps);
    }

    if (topic === 'multiplication' || multiplicationTable !== null) {
        const maxOperand = settings.maxMulOperand ?? settings.maxOneNumberInMul;
        const left = multiplicationTable ?? randomInt(2, Math.min(10, maxOperand));
        const right = randomInt(2, Math.min(10, maxOperand));
        const result = left * right;
        const template = buildSimpleMultiplication(left, right, result);
        return wordProblem(template.expression, result, template.steps);
    }

    if (topic === 'division') {
        const divisor = settings.allowedDivisionDivisors?.length ? randomChoice(settings.allowedDivisionDivisors) : randomInt(2, settings.maxDivisor);
        const quotient = randomInt(2, settings.maxDivisionResult ?? 10);
        const dividend = divisor * quotient;
        const template = buildSimpleDivision(dividend, divisor, quotient);
        return wordProblem(template.expression, quotient, template.steps);
    }

    const { left, right, result } = generateAdditionOperands(settings);
    const template = buildSimpleAddition(left, right, result);
    return wordProblem(template.expression, result, template.steps);
};

const pickRoundTensOperand = (limit: number) => {
    const maxTens = Math.floor(limit / 10);
    if (maxTens <= 0) return 10;
    return randomInt(1, maxTens) * 10;
};

const shouldCrossTensInAddition = (left: number, right: number) =>
    (left % 10) + (right % 10) >= 10;

const shouldCrossTensInSubtraction = (left: number, right: number) =>
    (left % 10) < (right % 10);

const generateAdditionOperands = (settings: Constraints) => {
    const maxValue = settings.maxSumResult;
    const crossingMode = settings.crossingTensMode ?? (settings.allowCrossingTens ? 'any' : 'non_crossing');
    const restrictToRoundTens = settings.allowRoundTensOperand ?? false;

    const maxRight = settings.maxSecondOperand ?? maxValue;

    for (let attempt = 0; attempt < 100; attempt++) {
        let left = randomInt(1, Math.max(1, maxValue - 1));
        let right = randomInt(1, Math.max(1, Math.min(maxValue - left, maxRight)));

        if (restrictToRoundTens) {
            if (Math.random() < 0.5) {
                right = pickRoundTensOperand(Math.min(maxValue - left, maxRight));
            } else {
                left = pickRoundTensOperand(maxValue - 1);
                right = randomInt(1, Math.max(1, Math.min(maxValue - left, maxRight)));
            }
        } else if (settings.allowRoundTensOperand && Math.random() < 0.4) {
            if (Math.random() < 0.5) {
                right = pickRoundTensOperand(Math.min(maxValue - left, maxRight));
            } else {
                left = pickRoundTensOperand(maxValue - 1);
                right = randomInt(1, Math.max(1, Math.min(maxValue - left, maxRight)));
            }
        }

        if (left + right > maxValue || right <= 0) continue;
        if (restrictToRoundTens && left % 10 !== 0 && right % 10 !== 0) continue;

        const crosses = shouldCrossTensInAddition(left, right);
        if (crossingMode === 'crossing' && !crosses) continue;
        if (crossingMode === 'non_crossing' && crosses) continue;

        return { left, right, result: left + right };
    }

    throw new Error("Could not generate addition operands.");
};

const generateSubtractionOperands = (settings: Constraints) => {
    const maxValue = settings.maxSumResult;
    const crossingMode = settings.crossingTensMode ?? (settings.allowCrossingTens ? 'any' : 'non_crossing');
    const restrictToRoundTens = settings.allowRoundTensOperand ?? false;

    const maxRight = settings.maxSecondOperand ?? maxValue;

    for (let attempt = 0; attempt < 100; attempt++) {
        const left = randomInt(1, maxValue);
        let right = randomInt(1, Math.min(left, maxRight));

        if (restrictToRoundTens) {
            right = Math.min(left, maxRight, pickRoundTensOperand(Math.min(left, maxRight)));
        } else if (settings.allowRoundTensOperand && Math.random() < 0.4) {
            right = Math.min(left, maxRight, pickRoundTensOperand(Math.min(left, maxRight)));
        }

        if (right <= 0 || left - right < 0) continue;
        if (restrictToRoundTens && right % 10 !== 0) continue;

        const crosses = shouldCrossTensInSubtraction(left, right);
        if (crossingMode === 'crossing' && !crosses) continue;
        if (crossingMode === 'non_crossing' && crosses) continue;

        return { left, right, result: left - right };
    }

    throw new Error("Could not generate subtraction operands.");
};

const generateSingleOperationProblem = (settings: Constraints): Problem => {
    const allowedOperations = settings.allowedOperations.filter(op => ['+', '-', '*', '/'].includes(op));
    if (allowedOperations.length === 0) {
        throw new Error("No supported operations configured.");
    }

    let attempts = 0;
    while (attempts < 100) {
        attempts++;
        const op = randomChoice(allowedOperations);
        const missingMode = resolveMissingMode(settings);
        const generateMissing = missingMode === 'only' || (missingMode === 'mixed' && Math.random() < 0.5);

        if (op === '*') {
            const tables = settings.allowedMultiplicationTables?.length
                ? settings.allowedMultiplicationTables
                : undefined;
            const maxOperand = settings.maxMulOperand ?? settings.maxOneNumberInMul;
            const tableLimit = settings.schoolGrade === 'grade4' ? Math.min(10, maxOperand) : maxOperand;
            const left = tables?.length ? randomChoice(tables) : randomInt(1, tableLimit);
            const right = randomInt(1, tableLimit);
            const result = left * right;

            if (result > settings.maxMulProduct) continue;
            if (generateMissing) {
                const hideLeft = Math.random() < 0.5;
                return createProblem(
                    hideLeft ? `? * ${right} = ${result}` : `${left} * ? = ${result}`,
                    hideLeft ? left : right,
                    { type: 'missing_multiplication', known: hideLeft ? right : left, total: result, hideLeft },
                );
            }
            return createProblem(`${left} * ${right}`, result, { type: 'multiplication', left, right });
        }

        if (op === '/') {
            const divisors = settings.allowedDivisionDivisors?.length
                ? settings.allowedDivisionDivisors
                : undefined;
            const divisor = divisors?.length ? randomChoice(divisors) : randomInt(1, settings.maxDivisor);
            const quotient = randomInt(1, settings.maxDivisionResult ?? 10);
            const dividend = divisor * quotient;

            if (divisor > settings.maxDivisor) continue;
            if (generateMissing) {
                const hideDividend = Math.random() < 0.5;
                return createProblem(
                    hideDividend ? `? / ${divisor} = ${quotient}` : `${dividend} / ? = ${quotient}`,
                    hideDividend ? dividend : divisor,
                    hideDividend
                        ? { type: 'missing_division', variant: 'dividend', known: divisor, quotient }
                        : { type: 'missing_division', variant: 'divisor', known: dividend, quotient },
                );
            }
            return createProblem(`${dividend} / ${divisor}`, quotient, { type: 'division', dividend, divisor });
        }

        if (op === '+') {
            const { left, right, result } = generateAdditionOperands(settings);
            if (generateMissing) {
                const hideLeft = Math.random() < 0.5;
                return createProblem(
                    hideLeft ? `? + ${right} = ${result}` : `${left} + ? = ${result}`,
                    hideLeft ? left : right,
                    { type: 'missing_addition', known: hideLeft ? right : left, total: result, hideLeft },
                );
            }
            return createProblem(`${left} + ${right}`, result, { type: 'addition', left, right });
        }

        if (op === '-') {
            const { left, right, result } = generateSubtractionOperands(settings);
            if (!settings.allowNegativeResult && result < 0) continue;
            if (generateMissing) {
                const hideLeft = Math.random() < 0.5;
                return createProblem(
                    hideLeft ? `? - ${right} = ${result}` : `${left} - ? = ${result}`,
                    hideLeft ? left : right,
                    hideLeft
                        ? { type: 'missing_subtraction', variant: 'minuend', known: right, result }
                        : { type: 'missing_subtraction', variant: 'subtrahend', known: left, result },
                );
            }
            return createProblem(`${left} - ${right}`, result, { type: 'subtraction', left, right });
        }
    }

    throw new Error("Could not generate a valid single-operation problem.");
};

// Simplified evaluator for generation phase
const evaluateExpressionSimple = (expr: string): number => {
    // safe eval for generation check - we trust our generator output to be safe
    // replacing x with * just in case, though we use * for internal
    try {
        return Function(`"use strict"; return (${expr})`)();
    } catch {
        return 0;
    }
};



// Expose root building for internal usage if needed, or just rely on generateProblem
// We need 'root' in generateProblem now. Refactoring generateExpression to return root or moving logic up.
// I will move logic up in generateProblem.

type Node = {
    type: 'op' | 'num';
    value?: number;
    op?: MathOperation;
    left?: Node;
    right?: Node;
    valueResult?: number; // Cached result of this subtree
};

const collectLeaves = (node: Node, leaves: Node[]) => {
    if (node.type === 'num') {
        leaves.push(node);
    }
    if (node.left) collectLeaves(node.left, leaves);
    if (node.right) collectLeaves(node.right, leaves);
};

// === buildTree helpers ===
// buildTree je orchestrátor — vyberie operáciu, alokuje rozpočet uzlov a deleguje
// na per-operáciu helpery (buildAdditionRight, ...). Helpery vedia, ako overiť
// constraints typu maxSumResult / crossingTens / requireIntegerDivision.

const computeLeftMax = (
    op: MathOperation,
    maxValueLimit: number | undefined,
    leftBudget: number,
    rightBudget: number,
): number | undefined => {
    if (maxValueLimit === undefined) return undefined;
    if (op === '+') {
        // left + right <= max, right >= rightBudget (každý uzol prispieva aspoň 1)
        const leftMax = maxValueLimit - rightBudget;
        if (leftMax < leftBudget) throw new Error('Impossible alloc');
        return leftMax;
    }
    return maxValueLimit;
};

const buildAdditionRight = (
    settings: Constraints,
    leftNode: Node,
    rightBudget: number,
    maxValueLimit: number | undefined,
): Node | null => {
    const valLeft = leftNode.valueResult!;
    const maxVal = (maxValueLimit ?? settings.maxSumResult) - valLeft;
    if (maxVal < rightBudget) return null;

    for (let k = 0; k < 5; k++) {
        try {
            const r = buildTree(settings, rightBudget, maxVal);
            if (!settings.allowCrossingTens) {
                if (Math.floor(valLeft / 10) !== Math.floor((valLeft + r.valueResult!) / 10)) continue;
            }
            return r;
        } catch { /* try another right subtree */ }
    }
    return null;
};

const buildSubtractionRight = (
    settings: Constraints,
    leftNode: Node,
    rightBudget: number,
    maxValueLimit: number | undefined,
): Node | null => {
    const valLeft = leftNode.valueResult!;
    const maxVal = settings.allowNegativeResult ? 9999 : valLeft;

    for (let k = 0; k < 5; k++) {
        try {
            const r = buildTree(settings, rightBudget, maxVal);
            if (!settings.allowCrossingTens) {
                if (Math.floor(valLeft / 10) !== Math.floor((valLeft - r.valueResult!) / 10)) continue;
            }
            const res = valLeft - r.valueResult!;
            if (maxValueLimit !== undefined && res > maxValueLimit) continue;
            if (!settings.allowNegativeResult && res < 0) continue;
            return r;
        } catch { /* try another right subtree */ }
    }
    return null;
};

const buildMultiplicationRight = (
    settings: Constraints,
    leftNode: Node,
    rightBudget: number,
    maxValueLimit: number | undefined,
): Node | null => {
    const valLeft = leftNode.valueResult!;
    const productLimit = Math.floor((maxValueLimit ?? settings.maxMulProduct) / (valLeft === 0 ? 1 : valLeft));
    try {
        return buildTree(settings, rightBudget, Math.min(productLimit, settings.maxOneNumberInMul));
    } catch {
        return null;
    }
};

const buildDivisionRight = (
    settings: Constraints,
    leftNode: Node,
    rightBudget: number,
): Node | null => {
    const valLeft = leftNode.valueResult!;
    try {
        const r = buildTree(settings, rightBudget, settings.maxDivisor);
        if (r.valueResult === 0) return null;
        if (settings.requireIntegerDivision && valLeft % r.valueResult! !== 0) return null;
        return r;
    } catch {
        return null;
    }
};

const isTrivialMulOrDiv = (op: MathOperation, leftNode: Node, rightNode: Node, maxNodesBudget: number) =>
    (op === '*' || op === '/') &&
    (leftNode.valueResult === 1 || rightNode.valueResult === 1) &&
    maxNodesBudget <= 4;

const combineNode = (op: MathOperation, leftNode: Node, rightNode: Node): Node => {
    const valLeft = leftNode.valueResult!;
    const valRight = rightNode.valueResult!;
    let res = 0;
    switch (op) {
        case '+': res = valLeft + valRight; break;
        case '-': res = valLeft - valRight; break;
        case '*': res = valLeft * valRight; break;
        case '/': res = valLeft / valRight; break;
    }
    return { type: 'op', op, left: leftNode, right: rightNode, valueResult: res };
};

const buildTree = (settings: Constraints, maxNodesBudget: number, maxValueLimit?: number): Node => {
    if (maxNodesBudget <= 1) return generateLeaf(settings, maxValueLimit);

    const realOps = settings.allowedOperations.filter(o => o !== '()');
    if (realOps.length === 0) return generateLeaf(settings, maxValueLimit);

    const selectedOp = randomChoice(realOps);

    let leftBudget: number;
    let rightBudget: number;
    if (!settings.allowParentheses && selectedOp !== '+') {
        // Bez zátvoriek vynútime ľavú asociativitu — pravý uzol je list
        rightBudget = 1;
        leftBudget = maxNodesBudget - 1;
    } else {
        leftBudget = randomInt(1, maxNodesBudget - 1);
        rightBudget = maxNodesBudget - leftBudget;
    }

    const maxRetries = maxNodesBudget > 5 ? 5 : 10;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const leftMax = computeLeftMax(selectedOp, maxValueLimit, leftBudget, rightBudget);
            const leftNode = buildTree(settings, leftBudget, leftMax);

            let rightNode: Node | null = null;
            if (selectedOp === '+') rightNode = buildAdditionRight(settings, leftNode, rightBudget, maxValueLimit);
            else if (selectedOp === '-') rightNode = buildSubtractionRight(settings, leftNode, rightBudget, maxValueLimit);
            else if (selectedOp === '*') rightNode = buildMultiplicationRight(settings, leftNode, rightBudget, maxValueLimit);
            else if (selectedOp === '/') rightNode = buildDivisionRight(settings, leftNode, rightBudget);

            if (!rightNode) continue;
            if (isTrivialMulOrDiv(selectedOp, leftNode, rightNode, maxNodesBudget)) continue;

            return combineNode(selectedOp, leftNode, rightNode);
        } catch { /* retry whole iteration */ }
    }

    throw new Error('Retry');
};

// ... (Rest of file - specifically buildTreeWithLimit assumes standard buildTree)
// We replace buildTreeWithLimit usages with direct buildTree calls that now support the limit.

const treeToString = (node: Node, hiddenNode?: Node): string => {
    if (node === hiddenNode) return '?';

    if (node.type === 'num') return node.value!.toString();
    const l = treeToString(node.left!, hiddenNode);
    const r = treeToString(node.right!, hiddenNode);

    // Precedence: * / > + -
    const pParent = precedence(node.op!);
    const pLeft = node.left!.type === 'op' ? precedence(node.left!.op!) : 99;
    const pRight = node.right!.type === 'op' ? precedence(node.right!.op!) : 99;

    let lStr = l;
    let rStr = r;

    // Logic: If child op has lower precedence than current op, wrap child.
    if (pLeft < pParent) lStr = `(${l})`;
    if (pRight <= pParent && node.op !== '+') rStr = `(${r})`; // Logic for strict parsing (e.g. - or /)
    if (node.op === '*' || node.op === '/') {
        if (pRight < pParent) rStr = `(${r})`;
    }

    return `${lStr} ${node.op} ${rStr}`;
};

const precedence = (op: string) => {
    if (op === '*' || op === '/') return 2;
    if (op === '+' || op === '-') return 1;
    return 0;
};

// Helper for leaf generation
const generateLeaf = (settings: Constraints, maxValueLimit?: number): Node => {
    let max = maxValueLimit;

    // If no specific limit, use global
    if (max === undefined) {
        if (settings.allowedOperations.includes('+') || settings.allowedOperations.includes('-')) {
            max = settings.maxSumResult;
        } else if (settings.allowedOperations.includes('*')) {
            max = settings.maxOneNumberInMul;
        } else if (settings.allowedOperations.includes('/')) {
            max = settings.maxDivisor;
        } else {
            max = 10;
        }
    }

    // Heuristics to keep numbers interesting but valid
    if (max > settings.maxSumResult && (settings.allowedOperations.includes('+'))) max = settings.maxSumResult;

    if (!max || max < 1) max = 1;

    // Favor larger numbers, but respect limit
    const val = randomIntBiased(1, max);
    return { type: 'num', value: val, valueResult: val };
};

// We don't need buildTreeWithLimit anymore, remove it or alias it
// But generateProblem calls buildTree.
// We need to keep generateProblem intact.
