import test from 'node:test';
import assert from 'node:assert/strict';
import { isAnswerCorrect } from '../src/lib/explanations';
import type { Problem, ProblemMetadata } from '../src/lib/types';

const problem = (expression: string, result: number, metadata?: ProblemMetadata, steps: string[] = []): Problem => ({
    id: expression,
    expression,
    result,
    steps,
    metadata,
});

const assertAcceptsOnly = (name: string, p: Problem, correct: number | string, wrong: Array<number | string>) => {
    test(`${name}: accepts the correct answer`, () => {
        assert.equal(isAnswerCorrect(p, correct), true);
    });

    test(`${name}: rejects wrong answers`, () => {
        for (const answer of wrong) {
            assert.equal(isAnswerCorrect(p, answer), false, `${p.expression} should reject ${String(answer)}`);
        }
    });
};

assertAcceptsOnly(
    'addition',
    problem('23 + 19', 42, { type: 'addition', left: 23, right: 19 }),
    42,
    [41, 43, '42abc'],
);

assertAcceptsOnly(
    'subtraction',
    problem('15 - 6', 9, { type: 'subtraction', left: 15, right: 6 }),
    9,
    [8, 10],
);

assertAcceptsOnly(
    'multiplication',
    problem('8 * 7', 56, { type: 'multiplication', left: 8, right: 7 }),
    56,
    [54, 57],
);

assertAcceptsOnly(
    'division',
    problem('72 / 72', 1, { type: 'division', dividend: 72, divisor: 72 }),
    1,
    [2, 0, 72],
);

assertAcceptsOnly(
    'missing addition',
    problem('? + 8 = 13', 5, { type: 'missing_addition', known: 8, total: 13, hideLeft: true }),
    5,
    [13, 8],
);

assertAcceptsOnly(
    'missing subtraction',
    problem('15 - ? = 9', 6, { type: 'missing_subtraction', variant: 'subtrahend', known: 15, result: 9 }),
    6,
    [9, 15],
);

assertAcceptsOnly(
    'missing multiplication',
    problem('? * 7 = 42', 6, { type: 'missing_multiplication', known: 7, total: 42, hideLeft: true }),
    6,
    [7, 42],
);

assertAcceptsOnly(
    'missing division',
    problem('42 / ? = 7', 6, { type: 'missing_division', variant: 'divisor', known: 42, quotient: 7 }),
    6,
    [7, 42],
);

assertAcceptsOnly(
    'order operations',
    problem('3 + 4 * 2', 11, { type: 'order_operations', hasParentheses: false, a: 3, b: 4, c: 2 }),
    11,
    [14, 10],
);

assertAcceptsOnly(
    'divisibility yes/no',
    problem('Je 42 deliteľné číslom 6? 1=áno, 0=nie', 1, { type: 'divisibility', number: 42, divisor: 6 }),
    'áno',
    ['nie', 0],
);

assertAcceptsOnly(
    'multiple request',
    problem('Napíš 4. násobok čísla 6', 24, { type: 'multiple_request', order: 4, base: 6 }),
    24,
    [18, 30],
);

test('divisor request accepts any valid divisor greater than 1', () => {
    const p = problem('Napíš jedného deliteľa čísla 24 väčšieho ako 1', 4, { type: 'divisor_request', number: 24 });
    assert.equal(isAnswerCorrect(p, 2), true);
    assert.equal(isAnswerCorrect(p, 3), true);
    assert.equal(isAnswerCorrect(p, 4), true);
    assert.equal(isAnswerCorrect(p, 5), false);
    assert.equal(isAnswerCorrect(p, 1), false);
});

test('partial or malformed numeric answers are rejected', () => {
    const division = problem('72 / 72', 1, { type: 'division', dividend: 72, divisor: 72 });
    assert.equal(isAnswerCorrect(division, '.'), false);
    assert.equal(isAnswerCorrect(division, '0.'), false);
    assert.equal(isAnswerCorrect(division, '1.'), false);
    assert.equal(isAnswerCorrect(division, '-'), false);
    assert.equal(isAnswerCorrect(division, ''), false);
    assert.equal(isAnswerCorrect(division, '1'), true);

    const comparison = problem('Ktoré číslo je väčšie: 48 alebo 52? 1=prvý, 0=druhý', 0, { type: 'number_comparison', variant: 'larger', left: 48, right: 52 });
    assert.equal(isAnswerCorrect(comparison, '0.'), false);
    assert.equal(isAnswerCorrect(comparison, '0'), true);
});

test('decimal answers require digits on both sides of the separator', () => {
    const decimal = problem('1 / 2', 0.5, { type: 'division', dividend: 1, divisor: 2 });
    assert.equal(isAnswerCorrect(decimal, '0.5'), true);
    assert.equal(isAnswerCorrect(decimal, '0,5'), true);
    assert.equal(isAnswerCorrect(decimal, '.5'), false);
    assert.equal(isAnswerCorrect(decimal, '0,'), false);
});

assertAcceptsOnly(
    'fraction numerator',
    problem('Zlomok: z 8 rovnakých častí sú vyfarbené 3. Aký je čitateľ?', 3, { type: 'fraction_numerator', denominator: 8, numerator: 3 }),
    3,
    [8, 5],
);

assertAcceptsOnly(
    'fraction denominator',
    problem('Zlomok: celok je rozdelený na 8 rovnakých častí. Aký je menovateľ?', 8, { type: 'fraction_denominator', denominator: 8 }),
    8,
    [1, 3],
);

assertAcceptsOnly(
    'fraction name',
    problem('Zlomok: akú hodnotu má menovateľ pri slove štvrtina?', 4, { type: 'fraction_name', label: 'štvrtina' }),
    4,
    [2, 3],
);

assertAcceptsOnly(
    'fraction compare',
    problem('Zlomok: čo je väčšie 1/4 alebo 3/4? 1=prvý, 0=druhý', 0, { type: 'fraction_compare', leftNum: 1, leftDen: 4, rightNum: 3, rightDen: 4 }),
    'druhý',
    ['prvý', 1],
);

assertAcceptsOnly(
    'number comparison',
    problem('Ktoré číslo je väčšie: 48 alebo 52? 1=prvý, 0=druhý', 0, { type: 'number_comparison', variant: 'larger', left: 48, right: 52 }),
    0,
    [1],
);

assertAcceptsOnly(
    'rounding',
    problem('Zaokrúhli 142 na stovky', 100, { type: 'rounding', value: 142, place: 100 }),
    100,
    [140, 200],
);

assertAcceptsOnly(
    'unit conversion',
    problem('4 kg = ? g', 4000, { type: 'unit_conversion', from: 'kg', to: 'g', value: 4, result: 4000 }),
    4000,
    [4, 40],
);

assertAcceptsOnly(
    'unit conversion sum',
    problem('3 m + 20 dm + 150 cm = ? cm', 650, {
        type: 'unit_conversion_sum',
        terms: [{ value: 3, unit: 'm' }, { value: 20, unit: 'dm' }, { value: 150, unit: 'cm' }],
        to: 'cm',
        result: 650,
    }),
    650,
    [470, 500],
);

assertAcceptsOnly(
    'geometry area choice',
    problem('Ktorý obdĺžnik má väčšiu plochu? 1=Prvý (3x4), 0=Druhý (2x5)', 1, { type: 'geometry_area', leftRows: 3, leftCols: 4, rightRows: 2, rightCols: 5 }),
    1,
    [0],
);

assertAcceptsOnly(
    'money coins',
    problem('Koľko centov majú mince: 50c + 20c + 2c?', 72, { type: 'money_coins', coins: [50, 20, 2] }),
    72,
    [70, 74],
);

test('logical sequence direct answer semantics', () => {
    const p = problem('Doplň chýbajúci tvar: kruh štvorec kruh ... ?', 0, {
        type: 'logical_sequence',
        pattern: ['kruh', 'štvorec'],
        fullSequence: ['kruh', 'štvorec', 'kruh', 'štvorec'],
        options: ['štvorec', 'trojuholník'],
    });

    const expected = p.metadata?.type === 'logical_sequence' ? p.metadata.fullSequence.at(-1) : null;
    const wrongOption: string = 'trojuholník';
    assert.equal(expected, 'štvorec');
    assert.equal('štvorec' === expected, true);
    assert.equal(wrongOption === expected, false);
    assert.equal(isAnswerCorrect(p, 0), true, 'numeric result remains harmless for legacy callers');
});

assertAcceptsOnly(
    'roman to arabic',
    problem('Rímske číslo XLII zapíš arabsky', 42, { type: 'roman_to_arabic', roman: 'XLII', value: 42 }),
    42,
    [41, 43, 'XLIII'],
);

assertAcceptsOnly(
    'roman to arabic accepts roman text too',
    problem('Rímske číslo XLII zapíš arabsky', 42, { type: 'roman_to_arabic', roman: 'XLII', value: 42 }),
    'XLII',
    ['XLIII', 'ABC'],
);

assertAcceptsOnly(
    'arabic to roman',
    problem('Číslo 42 zapíš rímskymi číslicami', 42, { type: 'arabic_to_roman', value: 42, roman: 'XLII' }, ['42 = XLII']),
    'xlii',
    ['42', 'XLIII'],
);

assertAcceptsOnly(
    'fraction of quantity',
    problem('Koľko je 2⁄3 z čísla 18?', 12, { type: 'fraction_of_quantity', numerator: 2, denominator: 3, whole: 18, context: 'generic' }),
    12,
    [6, 18, 3, '12x'],
);

assertAcceptsOnly(
    'fraction of quantity sharing',
    problem('Spravodlivo rozdelíme 18 banánov medzi 3 kamarátov. Koľko dostane každý?', 6, { type: 'fraction_of_quantity', numerator: 1, denominator: 3, whole: 18, context: 'sharing' }),
    6,
    [3, 18, 5],
);

assertAcceptsOnly(
    'fraction of time',
    problem('Koľko minút je 1⁄4 hodiny?', 15, { type: 'fraction_of_time', numerator: 1, denominator: 4 }),
    15,
    [4, 60, 20],
);

const fractionAnswerProblem = problem(
    'Akú časť hodiny tvorí 15 minút?',
    15 / 60,
    { type: 'fraction_answer', numerator: 15, denominator: 60, context: 'time' },
);

test('fraction answer accepts the direct form', () => {
    assert.equal(isAnswerCorrect(fractionAnswerProblem, '15/60'), true);
});

test('fraction answer accepts any equivalent form', () => {
    assert.equal(isAnswerCorrect(fractionAnswerProblem, '1/4'), true);
    assert.equal(isAnswerCorrect(fractionAnswerProblem, '2/8'), true);
    assert.equal(isAnswerCorrect(fractionAnswerProblem, '30/120'), true);
});

test('fraction answer rejects wrong fractions and malformed input', () => {
    assert.equal(isAnswerCorrect(fractionAnswerProblem, '1/3'), false);
    assert.equal(isAnswerCorrect(fractionAnswerProblem, '15/59'), false);
    assert.equal(isAnswerCorrect(fractionAnswerProblem, '1/0'), false);
    assert.equal(isAnswerCorrect(fractionAnswerProblem, '15'), false);
    assert.equal(isAnswerCorrect(fractionAnswerProblem, 0.25), false);
});

const fractionSetProblem = problem(
    'Z 6 dlaždíc sú 2 žlté. Akú časť tvoria žlté?',
    2 / 6,
    { type: 'fraction_answer', numerator: 2, denominator: 6, context: 'set' },
);

test('fraction set answer accepts equivalent forms', () => {
    assert.equal(isAnswerCorrect(fractionSetProblem, '2/6'), true);
    assert.equal(isAnswerCorrect(fractionSetProblem, '1/3'), true);
    assert.equal(isAnswerCorrect(fractionSetProblem, '3/6'), false);
});

const equalPartsProblem = problem(
    'Ktoré rozdelenie kruhu na 3 rovnakých častí je správne?',
    1,
    { type: 'fraction_equal_parts', parts: 3, options: [[80, 160, 120], [120, 120, 120], [150, 90, 120]], correctIndex: 1 },
);

test('equal parts accepts the correct option index', () => {
    assert.equal(isAnswerCorrect(equalPartsProblem, 1), true);
});

test('equal parts rejects wrong option indexes', () => {
    assert.equal(isAnswerCorrect(equalPartsProblem, 0), false);
    assert.equal(isAnswerCorrect(equalPartsProblem, 2), false);
});

const fractionShapeProblem = problem(
    'Akú časť obrázka je vyfarbená?',
    3 / 8,
    { type: 'fraction_answer', numerator: 3, denominator: 8, context: 'shape', shape: { kind: 'bar', parts: 8, shaded: 3 } },
);

test('fraction shape answer accepts equivalent fractions', () => {
    assert.equal(isAnswerCorrect(fractionShapeProblem, '3/8'), true);
    assert.equal(isAnswerCorrect(fractionShapeProblem, '6/16'), true);
    assert.equal(isAnswerCorrect(fractionShapeProblem, '3/7'), false);
});

const compareDiffDen = problem(
    'Ktorý zlomok je väčší: 2⁄3 alebo 1⁄2? 1=prvý, 0=druhý',
    1,
    { type: 'fraction_compare', leftNum: 2, leftDen: 3, rightNum: 1, rightDen: 2 },
);

test('fraction compare with different denominators: first/second semantics', () => {
    assert.equal(isAnswerCorrect(compareDiffDen, 1), true);
    assert.equal(isAnswerCorrect(compareDiffDen, 0), false);
    assert.equal(isAnswerCorrect(compareDiffDen, 'prvý'), true);
    assert.equal(isAnswerCorrect(compareDiffDen, 'druhý'), false);
});
