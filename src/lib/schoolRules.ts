import type { MultiplicationTableTopic, SchoolGrade, SchoolSettings, SchoolTopic } from './types';

export const MULTIPLICATION_TABLE_TOPICS: MultiplicationTableTopic[] = [
    'multiplication_table_1',
    'multiplication_table_2',
    'multiplication_table_3',
    'multiplication_table_4',
    'multiplication_table_5',
    'multiplication_table_6',
    'multiplication_table_7',
    'multiplication_table_8',
    'multiplication_table_9',
    'multiplication_table_10',
];

export const isMultiplicationTableTopic = (topic: SchoolTopic): topic is MultiplicationTableTopic => (
    MULTIPLICATION_TABLE_TOPICS.includes(topic as MultiplicationTableTopic)
);

export const getMultiplicationTableFromTopic = (topic: SchoolTopic): number | null => {
    if (!isMultiplicationTableTopic(topic)) return null;
    return Number(topic.replace('multiplication_table_', ''));
};

export const getMultiplicationTablesFromTopics = (topics: SchoolTopic[]): number[] => (
    topics
        .map(getMultiplicationTableFromTopic)
        .filter((table): table is number => table !== null)
);

export interface GradeCapabilities {
    availableTopics: SchoolTopic[];
    maxProblemCount: number;
    addition?: {
        allowCrossingTensToggle: boolean;
        restrictToRoundTensToggle: boolean;
    };
    subtraction?: {
        allowCrossingTensToggle: boolean;
        restrictToRoundTensToggle: boolean;
    };
    multiplication: {
        selectableTables: number[];
        forceAllTables: boolean;
        maxOperand: number;
        maxProduct: number;
    };
    division: {
        selectableDivisors: number[];
        forceAllDivisors: boolean;
        maxDivisor: number;
        maxQuotient: number;
        integerOnly: boolean;
    };
}

export const getGradeCapabilities = (grade: SchoolGrade): GradeCapabilities => {
    switch (grade) {
        case 'grade1':
            return {
                availableTopics: ['addition', 'subtraction', 'word_problem', 'number_comparison', 'money_coins', 'logical_sequences'],
                maxProblemCount: 30,
                addition: {
                    allowCrossingTensToggle: false,
                    restrictToRoundTensToggle: false,
                },
                subtraction: {
                    allowCrossingTensToggle: false,
                    restrictToRoundTensToggle: false,
                },
                multiplication: {
                    selectableTables: [],
                    forceAllTables: false,
                    maxOperand: 5,
                    maxProduct: 20,
                },
                division: {
                    selectableDivisors: [],
                    forceAllDivisors: false,
                    maxDivisor: 5,
                    maxQuotient: 5,
                    integerOnly: true,
                },
            };
        case 'grade2':
            return {
                availableTopics: ['addition', 'subtraction', ...MULTIPLICATION_TABLE_TOPICS, 'word_problem', 'number_comparison', 'rounding', 'logical_sequences'],
                maxProblemCount: 50,
                addition: {
                    allowCrossingTensToggle: true,
                    restrictToRoundTensToggle: true,
                },
                subtraction: {
                    allowCrossingTensToggle: true,
                    restrictToRoundTensToggle: true,
                },
                multiplication: {
                    selectableTables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                    forceAllTables: false,
                    maxOperand: 10,
                    maxProduct: 100,
                },
                division: {
                    selectableDivisors: [],
                    forceAllDivisors: false,
                    maxDivisor: 10,
                    maxQuotient: 10,
                    integerOnly: true,
                },
            };
        case 'grade3':
            return {
                availableTopics: ['addition', 'subtraction', 'multiplication', 'division', 'word_problem', 'number_comparison', 'rounding', 'unit_conversion', 'logical_sequences'],
                maxProblemCount: 50,
                addition: {
                    allowCrossingTensToggle: true,
                    restrictToRoundTensToggle: false,
                },
                subtraction: {
                    allowCrossingTensToggle: true,
                    restrictToRoundTensToggle: false,
                },
                multiplication: {
                    selectableTables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
                    forceAllTables: false,
                    maxOperand: 999,
                    maxProduct: 9999,
                },
                division: {
                    selectableDivisors: [2, 3, 4, 5, 6, 7, 8, 9, 10],
                    forceAllDivisors: false,
                    maxDivisor: 10,
                    maxQuotient: 333,
                    integerOnly: true,
                },
            };
        case 'grade4':
            return {
                availableTopics: ['addition', 'subtraction', 'multiplication', 'division', 'large_multiplication', 'large_division', 'indian_division', 'long_division', 'word_problem', 'rounding', 'unit_conversion', 'geometry_area', 'roman_numerals'],
                maxProblemCount: 50,
                multiplication: {
                    selectableTables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
                    forceAllTables: false,
                    maxOperand: 10,
                    maxProduct: 100,
                },
                division: {
                    selectableDivisors: [2, 3, 4, 5, 6, 7, 8, 9, 10],
                    forceAllDivisors: false,
                    maxDivisor: 10,
                    maxQuotient: 10,
                    integerOnly: true,
                },
            };
        case 'grade5':
            return {
                availableTopics: ['multiplication', 'division', 'long_division', 'order_operations', 'divisibility', 'multiples_divisors', 'fractions_intro', 'word_problem', 'rounding', 'unit_conversion', 'geometry_area'],
                maxProblemCount: 50,
                multiplication: {
                    selectableTables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                    forceAllTables: true,
                    maxOperand: 10,
                    maxProduct: 100,
                },
                division: {
                    selectableDivisors: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                    forceAllDivisors: true,
                    maxDivisor: 10,
                    maxQuotient: 10,
                    integerOnly: true,
                },
            };
    }
};

export const createDefaultSchoolSettings = (grade: SchoolGrade): SchoolSettings => {
    switch (grade) {
        case 'grade1':
            return {
                grade,
                problemCount: 10,
                enabledTopics: ['addition'],
                maxValue: 10,
                crossingTensMode: 'non_crossing',
                restrictToRoundTens: false,
                problemFormat: 'standard',
                trainingMode: 'learn',
                practiceStyle: 'classic',
            };
        case 'grade2':
            return {
                grade,
                problemCount: 10,
                enabledTopics: ['addition'],
                maxValue: 20,
                crossingTensMode: 'non_crossing',
                restrictToRoundTens: false,
                problemFormat: 'standard',
                trainingMode: 'learn',
                practiceStyle: 'classic',
            };
        case 'grade3':
            return {
                grade,
                problemCount: 10,
                enabledTopics: ['multiplication'],
                multiplicationTables: [2, 3, 4, 5],
                divisionDivisors: [2, 3, 4, 5],
                maxValue: 100,
                crossingTensMode: 'crossing',
                restrictToRoundTens: false,
                problemFormat: 'standard',
                trainingMode: 'learn',
                practiceStyle: 'classic',
            };
        case 'grade4':
            return {
                grade,
                problemCount: 10,
                enabledTopics: ['multiplication', 'division', 'large_multiplication', 'large_division'],
                multiplicationTables: [2, 3, 4, 5, 6, 7, 8, 9],
                divisionDivisors: [2, 3, 4, 5, 6, 7, 8, 9],
                maxValue: 999,
                crossingTensMode: 'non_crossing',
                restrictToRoundTens: false,
                problemFormat: 'standard',
                maxIndianDividend: 999,
                maxIndianDivisor: 9,
                allowIndianDivisionRemainder: true,
                maxLongDividend: 999,
                maxLongDivisor: 9,
                allowLongDivisionRemainder: true,
                trainingMode: 'learn',
                practiceStyle: 'classic',
                unitConversionCategories: ['length', 'weight', 'money', 'volume'],
            };
        case 'grade5':
            return {
                grade,
                problemCount: 10,
                enabledTopics: ['multiplication', 'division', 'order_operations', 'divisibility', 'multiples_divisors', 'fractions_intro'],
                multiplicationTables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                divisionDivisors: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
                maxValue: 100,
                crossingTensMode: 'non_crossing',
                restrictToRoundTens: false,
                problemFormat: 'standard',
                trainingMode: 'learn',
                practiceStyle: 'classic',
            };
    }
};
