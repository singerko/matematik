import {
    type Constraints,
    type Profile,
    type SchoolTopic,
    DEFAULT_SETTINGS,
} from './types';
import { getGradeCapabilities, getMultiplicationTablesFromTopics, isMultiplicationTableTopic } from './schoolRules';

export const resolveProfileConstraints = (profile: Profile): Constraints => {
    if (profile.mode !== 'school' || !profile.schoolSettings) {
        return {
            ...DEFAULT_SETTINGS,
            ...profile.settings,
            missingOperandMode: profile.settings.missingOperand ? 'mixed' : 'off',
            crossingTensMode: profile.settings.allowCrossingTens ? 'any' : 'non_crossing',
            trainingMode: profile.settings.trainingMode ?? 'learn',
            practiceStyle: profile.settings.practiceStyle ?? 'classic',
        };
    }

    const school = profile.schoolSettings;
    const capabilities = getGradeCapabilities(school.grade);
    const enabledTopics: SchoolTopic[] = school.enabledTopics.length
        ? school.enabledTopics
        : school.grade === 'grade1' || school.grade === 'grade2'
            ? ['addition']
            : ['multiplication'];
    const enabledMultiplicationTableTopics = getMultiplicationTablesFromTopics(enabledTopics);

    const multiplicationTables = capabilities.multiplication.forceAllTables
        ? capabilities.multiplication.selectableTables
        : enabledMultiplicationTableTopics.length
            ? enabledMultiplicationTableTopics.filter((table) =>
                capabilities.multiplication.selectableTables.includes(table))
        : (school.multiplicationTables?.length
            ? school.multiplicationTables.filter((table) =>
                capabilities.multiplication.selectableTables.includes(table))
            : [capabilities.multiplication.selectableTables[0]]);

    const divisionDivisors = capabilities.division.forceAllDivisors
        ? capabilities.division.selectableDivisors
        : (school.divisionDivisors?.length
            ? school.divisionDivisors.filter((divisor) =>
                capabilities.division.selectableDivisors.includes(divisor))
            : [capabilities.division.selectableDivisors[0]]);

    return {
        ...DEFAULT_SETTINGS,
        allowedOperations: [
            ...(enabledTopics.includes('addition') ? ['+'] as const : []),
            ...(enabledTopics.includes('subtraction') ? ['-'] as const : []),
            ...(enabledTopics.includes('multiplication') ? ['*'] as const : []),
            ...(enabledTopics.some(isMultiplicationTableTopic) ? ['*'] as const : []),
            ...(enabledTopics.includes('division') ? ['/'] as const : []),
            ...(enabledTopics.includes('large_multiplication') ? ['*'] as const : []),
            ...(enabledTopics.includes('large_division') ? ['/'] as const : []),
            ...(enabledTopics.includes('indian_division') ? ['/'] as const : []),
            ...(enabledTopics.includes('long_division') ? ['/'] as const : []),
            ...(enabledTopics.includes('word_problem')
                ? (school.grade === 'grade1' || school.grade === 'grade2'
                    ? ['+', '-'] as const
                    : ['+', '-', '*', '/'] as const)
                : []),
            ...(enabledTopics.includes('order_operations') ? ['+', '*'] as const : []),
            ...(enabledTopics.includes('divisibility') ? ['/'] as const : []),
            ...(enabledTopics.includes('multiples_divisors') ? ['*', '/'] as const : []),
            ...(enabledTopics.includes('fractions_intro') ? ['+'] as const : []),
        ],
        maxNumbers: 2,
        exactOperationCount: 1,
        allowNegativeIntermediates: false,
        allowNegativeResult: false,
        maxSumResult: school.grade === 'grade1' ? (school.maxValue ?? 10) : school.grade === 'grade2' ? (school.maxValue ?? 20) : (school.maxValue ?? 100),
        maxMulProduct: capabilities.multiplication.maxProduct,
        maxOneNumberInMul: capabilities.multiplication.maxOperand,
        maxMulOperand: capabilities.multiplication.maxOperand,
        requireIntegerDivision: capabilities.division.integerOnly,
        maxDivisor: capabilities.division.maxDivisor,
        maxDivisionResult: capabilities.division.maxQuotient,
        allowParentheses: false,
        allowCrossingTens: school.crossingTensMode !== 'non_crossing',
        allowRoundTensOperand: school.restrictToRoundTens ?? false,
        crossingTensMode: school.grade === 'grade1' ? 'non_crossing' : school.grade === 'grade2' || school.grade === 'grade3' ? (school.crossingTensMode ?? 'non_crossing') : 'any',
        schoolTopics: enabledTopics,
        maxIndianDividend: school.maxIndianDividend ?? 100,
        maxIndianDivisor: school.maxIndianDivisor ?? 9,
        allowIndianDivisionRemainder: school.allowIndianDivisionRemainder ?? false,
        maxLongDividend: school.maxLongDividend ?? 100,
        maxLongDivisor: school.maxLongDivisor ?? 9,
        allowLongDivisionRemainder: school.allowLongDivisionRemainder ?? false,
        maxSecondOperand: school.maxSecondOperand,
        schoolGrade: school.grade,
        missingOperand: school.problemFormat !== 'standard',
        missingOperandMode:
            school.problemFormat === 'standard'
                ? 'off'
                : school.problemFormat === 'missing'
                    ? 'only'
                    : 'mixed',
        problemCount: school.problemCount,
        trainingMode: school.trainingMode ?? 'learn',
        practiceStyle: school.practiceStyle ?? 'classic',
        unitConversionCategories: school.unitConversionCategories?.length
            ? school.unitConversionCategories
            : ['length', 'weight', 'money', 'volume'],
        allowedMultiplicationTables: multiplicationTables,
        allowedDivisionDivisors: divisionDivisors,
    };
};
