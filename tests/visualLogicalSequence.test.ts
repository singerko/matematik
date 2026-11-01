import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProblem } from '../src/lib/generator';
import { getGradeCapabilities } from '../src/lib/schoolRules';
import type { Constraints } from '../src/lib/types';

const grade4LogicalSettings: Constraints = {
    allowedOperations: ['+', '-', '*', '/'],
    maxNumbers: 2,
    allowNegativeIntermediates: false,
    allowNegativeResult: false,
    maxSumResult: 999,
    maxMulProduct: 100,
    maxOneNumberInMul: 10,
    requireIntegerDivision: true,
    maxDivisor: 10,
    allowParentheses: false,
    allowCrossingTens: true,
    missingOperand: false,
    problemCount: 10,
    schoolGrade: 'grade4',
    schoolTopics: ['logical_sequences'],
};

test('grade 4 offers logical sequences', () => {
    assert.ok(getGradeCapabilities('grade4').availableTopics.includes('logical_sequences'));
});

test('grade 4 logical sequences can generate visual A-D problems', () => {
    const problems = Array.from({ length: 80 }, () => generateProblem(grade4LogicalSettings));
    const visualProblem = problems.find(problem => problem.metadata?.type === 'logical_sequence' && problem.metadata.visual);

    assert.ok(visualProblem);
    assert.equal(visualProblem.metadata?.type, 'logical_sequence');
    assert.deepEqual(visualProblem.metadata.options, ['A', 'B', 'C', 'D']);
    assert.equal(visualProblem.metadata.visual?.frames.length, 4);
    assert.equal(visualProblem.metadata.visual?.options.length, 4);
    assert.equal(visualProblem.metadata.fullSequence.at(-1), 'C');
});
