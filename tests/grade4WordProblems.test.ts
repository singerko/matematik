import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProblem } from '../src/lib/generator';
import type { Constraints } from '../src/lib/types';

const settings: Constraints = {
    allowedOperations: ['+', '-', '*', '/'],
    maxNumbers: 2,
    allowNegativeIntermediates: false,
    allowNegativeResult: false,
    maxSumResult: 999,
    maxMulProduct: 100,
    maxOneNumberInMul: 10,
    maxMulOperand: 10,
    requireIntegerDivision: true,
    maxDivisor: 10,
    maxDivisionResult: 100,
    allowParentheses: false,
    allowCrossingTens: true,
    missingOperand: false,
    problemCount: 10,
    schoolGrade: 'grade4',
    schoolTopics: ['word_problem'],
};

test('grade 4 word problems include Komparo-inspired templates', () => {
    const problems = Array.from({ length: 160 }, () => generateProblem(settings));
    const expressions = problems.map(problem => problem.expression);

    assert.ok(expressions.some(expression => expression.includes('kolobežku')));
    assert.ok(expressions.some(expression => expression.includes('bicyklov')));
    assert.ok(expressions.some(expression => expression.includes('Kupé')));
    assert.ok(expressions.some(expression => expression.includes('obvod')));
    assert.ok(expressions.some(expression => expression.includes('Tretinu')));

    for (const problem of problems) {
        assert.equal(problem.kind, 'word_problem');
        assert.equal(Number.isFinite(problem.result), true);
        assert.ok(problem.steps.length >= 1);
    }
});
