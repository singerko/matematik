import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProblem } from '../src/lib/generator';
import type { Constraints } from '../src/lib/types';

const settings: Constraints = {
    allowedOperations: ['*'],
    maxNumbers: 2,
    allowNegativeIntermediates: false,
    allowNegativeResult: false,
    maxSumResult: 100,
    maxMulProduct: 100,
    maxOneNumberInMul: 10,
    maxMulOperand: 10,
    requireIntegerDivision: true,
    maxDivisor: 10,
    allowParentheses: false,
    allowCrossingTens: true,
    missingOperand: false,
    missingOperandMode: 'off',
    problemCount: 10,
    schoolGrade: 'grade2',
    schoolTopics: ['multiplication_table_2'],
    allowedMultiplicationTables: [2],
};

test('selected multiplication table is generated in both operand orders', () => {
    const expressions = Array.from({ length: 120 }, () => generateProblem(settings).expression);

    assert.ok(expressions.some(expression => /^2 \* \d+$/.test(expression)), 'expected examples like 2 * n');
    assert.ok(expressions.some(expression => /^\d+ \* 2$/.test(expression)), 'expected examples like n * 2');
    assert.ok(expressions.every(expression => {
        const match = expression.match(/^(\d+) \* (\d+)$/);
        return match && (Number(match[1]) === 2 || Number(match[2]) === 2);
    }));
});

test('missing multiplication keeps the selected table number visible', () => {
    const expressions = Array.from({ length: 120 }, () => generateProblem({
        ...settings,
        missingOperandMode: 'only',
        missingOperand: true,
    }).expression);

    assert.ok(expressions.some(expression => /^2 \* \? = \d+$/.test(expression)));
    assert.ok(expressions.some(expression => /^\? \* 2 = \d+$/.test(expression)));
    assert.ok(expressions.every(expression => {
        const match = expression.match(/^(\?|\d+) \* (\?|\d+) = \d+$/);
        return match && (match[1] === '2' || match[2] === '2');
    }));
});
