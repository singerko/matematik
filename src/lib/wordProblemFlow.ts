import type { Problem } from './types';
import { getProblemMetadata } from './problemMetadata';

export type WordProblemOperation = '+' | '-' | '*' | '/';

export interface WordProblemStep {
    operation: WordProblemOperation;
    expression: string;
    result: number;
}

export const getWordProblemOperation = (problem: Problem): WordProblemOperation | null => {
    if (problem.kind !== 'word_problem') return null;

    const metadata = getProblemMetadata(problem);
    if (metadata?.type === 'word_problem') {
        if (metadata.baseTopic === 'addition') return '+';
        if (metadata.baseTopic === 'subtraction') return '-';
        if (metadata.baseTopic === 'multiplication' || metadata.baseTopic === 'comparison' || metadata.baseTopic === 'units') return '*';
        if (metadata.baseTopic === 'division') return '/';
    }

    const firstStep = problem.steps[0]?.replace(/\s+/g, '');
    if (firstStep?.includes('+')) return '+';
    if (firstStep?.includes('-')) return '-';
    if (firstStep?.includes('*')) return '*';
    if (firstStep?.includes('/')) return '/';
    return null;
};

export const formatOperation = (operation: string) => operation === '*' ? '×' : operation === '/' ? '÷' : operation;

export const WORD_PROBLEM_OPERATIONS: readonly WordProblemOperation[] = ['+', '-', '*', '/'];

export const parseWordProblemStep = (step?: string): WordProblemStep | null => {
    const normalized = step?.replace(/\s+/g, '');
    const match = normalized?.match(/^(\d+)([+\-*/])(\d+)=(\d+)$/);
    if (!match) return null;

    return {
        operation: match[2] as WordProblemOperation,
        expression: `${match[1]} ${formatOperation(match[2])} ${match[3]}`,
        result: Number(match[4]),
    };
};

export const getWordProblemSteps = (problem: Problem): WordProblemStep[] => {
    if (problem.kind !== 'word_problem') return [];
    return problem.steps
        .map(step => parseWordProblemStep(step))
        .filter((step): step is WordProblemStep => Boolean(step));
};

export const getFirstIntermediateStep = (problem: Problem): WordProblemStep | null => {
    const steps = getWordProblemSteps(problem);
    return steps.length >= 2 ? steps[0] : null;
};
