import test from 'node:test';
import assert from 'node:assert/strict';
import { updateProfileProgress } from '../src/lib/progress';
import type { Profile, TrainingResult } from '../src/lib/types';

const createProfile = (): Profile => ({
    id: 'student-1',
    name: 'Student',
    settings: {
        allowedOperations: ['+'],
        maxNumbers: 2,
        allowNegativeIntermediates: false,
        allowNegativeResult: false,
        maxSumResult: 20,
        maxMulProduct: 100,
        maxOneNumberInMul: 10,
        requireIntegerDivision: true,
        maxDivisor: 10,
        allowParentheses: false,
        allowCrossingTens: true,
        missingOperand: false,
        problemCount: 10,
    },
});

const result = (index: number): TrainingResult => ({
    problem: {
        id: `p-${index}`,
        expression: `${index} + 1`,
        result: index + 1,
        steps: [],
    },
    userAnswer: index + 1,
    correct: true,
});

test('profile progress stores only the last 10 completed sessions', () => {
    let profile = createProfile();

    for (let i = 0; i < 12; i++) {
        profile = updateProfileProgress(profile, [result(i)]);
    }

    assert.equal(profile.progress?.sessionHistory?.length, 10);
    assert.equal(profile.progress?.sessionsCompleted, 12);
    assert.equal(profile.progress?.sessionHistory?.[0].totalProblems, 1);
    assert.equal(profile.progress?.sessionHistory?.[0].correctProblems, 1);
    assert.ok(profile.progress?.sessionHistory?.[0].completedAt);
});
