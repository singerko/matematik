export type MathOperation = '+' | '-' | '*' | '/' | '()';
export type ProfileMode = 'custom' | 'school';
export type TrainingMode = 'learn' | 'test' | 'lightning';
export type PracticeStyle = 'classic' | 'grid_puzzle';
export type SchoolGrade = 'grade1' | 'grade2' | 'grade3' | 'grade4' | 'grade5';
export type MultiplicationTableTopic =
    | 'multiplication_table_1'
    | 'multiplication_table_2'
    | 'multiplication_table_3'
    | 'multiplication_table_4'
    | 'multiplication_table_5'
    | 'multiplication_table_6'
    | 'multiplication_table_7'
    | 'multiplication_table_8'
    | 'multiplication_table_9'
    | 'multiplication_table_10';
export type SchoolTopic = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'large_multiplication' | 'large_division' | 'indian_division' | 'long_division' | 'word_problem' | 'order_operations' | 'divisibility' | 'multiples_divisors' | 'fractions_intro' | 'number_comparison' | 'rounding' | 'unit_conversion' | 'geometry_area' | 'roman_numerals' | 'money_coins' | 'logical_sequences' | MultiplicationTableTopic;

export type LengthUnit = 'mm' | 'cm' | 'dm' | 'm' | 'km';
export type WeightUnit = 'g' | 'kg';
export type VolumeUnit = 'ml' | 'dl' | 'l';
export type TimeUnit = 'min' | 'h' | 'day';
export type MoneyUnit = 'cent' | 'eur';
export type AnyUnit = LengthUnit | WeightUnit | VolumeUnit | TimeUnit | MoneyUnit;
export type UnitConversionCategory = 'length' | 'weight' | 'money' | 'volume';
export type ProblemFormat = 'standard' | 'missing' | 'mixed';
export type CrossingTensMode = 'crossing' | 'non_crossing';
export type ProblemKind = 'standard' | 'large_multiplication' | 'indian_division' | 'long_division' | 'word_problem';
export type TutorialMethod = 'indian_division' | 'long_division' | 'arithmetic';
export type TutorialId =
    | 'grade1_addition_intro'
    | 'grade1_subtraction_intro'
    | 'grade2_addition_crossing'
    | 'grade2_subtraction_crossing'
    | 'grade3_multiplication_intro'
    | 'grade3_division_intro'
    | 'grade5_order_operations_intro'
    | 'grade5_fractions_intro'
    | 'grade5_fraction_compare_intro'
    | 'grade5_divisibility_intro'
    | 'grade5_multiples_divisors_intro'
    | 'grade4_indian_division_intro'
    | 'grade4_long_division_intro';
export type TutorialAudience = SchoolGrade;

export interface IndianDivisionStep {
    partialDividend: number;
    quotientDigit: number;
    remainder: number;
}

export interface IndianDivisionProblemData {
    dividend: number;
    divisor: number;
    quotient: number;
    remainder: number;
    allowFinalRemainder: boolean;
    steps: IndianDivisionStep[];
}

// Long division zdieľa rovnaký dátový model — rovnaké kroky aj zvyšky.
// Líši sa len vizuálnym zápisom (pod seba s mínus krokmi).
export type LongDivisionStep = IndianDivisionStep;
export type LongDivisionProblemData = IndianDivisionProblemData;

export interface LargeMultiplicationStep {
    position: number;
    digit: number;
    carryIn: number;
    partialProduct: number;
    resultDigit: number;
    carryOut: number;
}

export interface LargeMultiplicationProblemData {
    multiplicand: number;
    multiplier: number;
    product: number;
    steps: LargeMultiplicationStep[];
}

export interface TutorialIndianDivisionState {
    kind: 'indian_division';
    problem: IndianDivisionProblemData;
    activeStepIndex: number;
    quotientDigitsShown: number;
    remainderDigitsShown: number;
    highlightDividendPart?: number;
    highlightDivisor?: boolean;
    highlightNextDigitIndex?: number;
    finalHighlight?: boolean;
    remainderInParentheses?: boolean;
    suppressActiveDigitHighlight?: boolean;
    flashQuotient?: boolean;
    flashRemainder?: boolean;
}

export type ArithmeticTutorialKind = 'addition_to_ten' | 'subtraction_through_ten' | 'multiplication_groups' | 'division_groups' | 'order_operations_groups' | 'divisibility_groups' | 'multiples_divisors_groups' | 'fraction_parts' | 'fraction_compare';

export interface TutorialArithmeticState {
    kind: 'arithmetic';
    visualKind: ArithmeticTutorialKind;
    expression: string;
    groups: number[][];
    groupLabels?: string[];
    activeGroupIndex?: number;
    comparisonGroups?: number[][];
    comparisonActiveGroupIndex?: number;
    primaryLabel?: string;
    comparisonLabel?: string;
    resultText?: string;
    note?: string;
}

export interface TutorialLongDivisionState {
    kind: 'long_division';
    problem: LongDivisionProblemData;
    activeStepIndex: number;
    revealedSteps: number; // koľko vykonaných krokov je viditeľných pod hlavičkou
    highlightField?: 'partial' | 'product' | 'remainder';
    finalHighlight?: boolean;
}

export type TutorialVisualState = TutorialIndianDivisionState | TutorialLongDivisionState | TutorialArithmeticState;

export interface TutorialCue {
    id: string;
    speechText?: string;
    delayMs?: number;
    state: TutorialVisualState;
}

export interface TutorialStep {
    id: string;
    title: string;
    cues: TutorialCue[];
}

export interface TutorialScript {
    method: TutorialMethod;
    audience: TutorialAudience;
    title: string;
    problemExpression: string;
    steps: TutorialStep[];
}

export interface TutorialCatalogItem {
    id: TutorialId;
    method: TutorialMethod;
    grade: SchoolGrade;
    categoryId: string;
    title: string;
    description: string;
}

export interface TutorialCategory {
    id: string;
    title: string;
    items: TutorialCatalogItem[];
}

export interface Constraints {
    allowedOperations: MathOperation[];
    maxNumbers: number; // e.g. 3 for a+b+c
    allowNegativeIntermediates: boolean; // if false, no sub-expression can be negative
    allowNegativeResult: boolean; // if false, final result cannot be negative
    maxSumResult: number; // max value for addition result
    maxMulProduct: number; // max value for multiplication product
    maxOneNumberInMul: number; // constrain one operand in multiplication (e.g. max 10 means 3*12 is invalid, but 3*5 is valid)
    // For division
    requireIntegerDivision: boolean;
    maxDivisor: number;
    maxDivisionResult?: number;
    maxMulOperand?: number;
    exactOperationCount?: number;
    allowedMultiplicationTables?: number[];
    allowedDivisionDivisors?: number[];
    schoolTopics?: SchoolTopic[];
    missingOperandMode?: 'off' | 'only' | 'mixed';
    allowRoundTensOperand?: boolean;
    crossingTensMode?: 'any' | CrossingTensMode;
    maxIndianDividend?: number;
    maxIndianDivisor?: number;
    allowIndianDivisionRemainder?: boolean;
    maxLongDividend?: number;
    maxLongDivisor?: number;
    allowLongDivisionRemainder?: boolean;
    allowParentheses: boolean;
    allowCrossingTens: boolean;
    missingOperand: boolean;
    problemCount: number;
    trainingMode?: TrainingMode;
    practiceStyle?: PracticeStyle;
    maxSecondOperand?: number; // limit second (right) operand, e.g. 10 for "first up to 100, second up to 10"
    schoolGrade?: SchoolGrade; // optional hint for word-problem complexity
    unitConversionCategories?: UnitConversionCategory[];
}

export interface SchoolSettings {
    grade: SchoolGrade;
    problemCount: number;
    enabledTopics: SchoolTopic[];
    multiplicationTables?: number[];
    divisionDivisors?: number[];
    maxValue?: number;
    crossingTensMode?: CrossingTensMode;
    restrictToRoundTens?: boolean;
    problemFormat: ProblemFormat;
    maxIndianDividend?: number;
    maxIndianDivisor?: number;
    allowIndianDivisionRemainder?: boolean;
    maxLongDividend?: number;
    maxLongDivisor?: number;
    allowLongDivisionRemainder?: boolean;
    maxSecondOperand?: number; // limit second (right) operand for grade2
    trainingMode?: TrainingMode;
    practiceStyle?: PracticeStyle;
    unitConversionCategories?: UnitConversionCategory[];
}

export interface Profile {
    id: string;
    name: string;
    mode?: ProfileMode;
    settings: Constraints;
    schoolSettings?: SchoolSettings;
    progress?: ProfileProgress;
}

export type WordProblemBaseTopic = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'comparison' | 'multistep' | 'units';

export type ProblemMetadata =
    | { type: 'addition'; left: number; right: number }
    | { type: 'subtraction'; left: number; right: number }
    | { type: 'multiplication'; left: number; right: number }
    | { type: 'division'; dividend: number; divisor: number }
    | { type: 'missing_addition'; known: number; total: number; hideLeft: boolean }
    | { type: 'missing_subtraction'; variant: 'minuend' | 'subtrahend'; known: number; result: number }
    | { type: 'missing_multiplication'; known: number; total: number; hideLeft: boolean }
    | { type: 'missing_division'; variant: 'dividend' | 'divisor'; known: number; quotient: number }
    | { type: 'order_operations'; hasParentheses: boolean; a: number; b: number; c: number }
    | { type: 'divisibility'; number: number; divisor: number }
    | { type: 'multiple_request'; order: number; base: number }
    | { type: 'divisor_request'; number: number }
    | { type: 'fraction_numerator'; denominator: number; numerator: number }
    | { type: 'fraction_denominator'; denominator: number }
    | { type: 'fraction_name'; label: 'polovica' | 'tretina' | 'štvrtina' }
    | { type: 'fraction_compare'; leftNum: number; leftDen: number; rightNum: number; rightDen: number }
    | { type: 'indian_division' }
    | { type: 'long_division' }
    | { type: 'word_problem'; baseTopic?: WordProblemBaseTopic }
    | { type: 'number_comparison'; variant: 'larger' | 'smaller'; left: number; right: number }
    | { type: 'rounding'; value: number; place: 10 | 100 | 1000 }
    | { type: 'unit_conversion'; from: AnyUnit; to: AnyUnit; value: number; result: number }
    | { type: 'unit_conversion_sum'; terms: { value: number; unit: AnyUnit }[]; to: AnyUnit; result: number }
    | { type: 'geometry_area'; leftRows: number; leftCols: number; rightRows: number; rightCols: number }
    | { type: 'money_coins'; coins: number[] }
    | { type: 'logical_sequence'; pattern: string[]; fullSequence: string[]; options: string[] }
    | { type: 'roman_to_arabic'; roman: string; value: number }
    | { type: 'arabic_to_roman'; value: number; roman: string };

export interface Problem {
    id: string;
    kind?: ProblemKind;
    expression: string; // The display string, e.g. "3 + (2 * 5)"
    result: number;
    steps: string[]; // Steps to solve it
    finalRemainder?: number;
    largeMultiplication?: LargeMultiplicationProblemData;
    indianDivision?: IndianDivisionProblemData;
    longDivision?: LongDivisionProblemData;
    isAdaptiveFollowUp?: boolean;
    metadata?: ProblemMetadata;
}

export interface TrainingResult {
    problem: Problem;
    userAnswer: number | string;
    correct: boolean;
    diagnosis?: string;
    diagnosisCode?: ErrorDiagnosisCode;
    diagnosisTitle?: string;
}

export interface TopicProgress {
    attempts: number;
    correct: number;
    lastPracticedAt: string;
}

export type ErrorDiagnosisCode =
    | 'timeout'
    | 'unreadable_answer'
    | 'wrong_operation'
    | 'off_by_one'
    | 'crossing_tens_addition'
    | 'crossing_tens_subtraction'
    | 'multiplication_table'
    | 'division_inverse'
    | 'step_division'
    | 'step_division_quotient'
    | 'step_division_remainder'
    | 'step_division_both'
    | 'word_problem_operation'
    | 'word_problem_multistep'
    | 'word_problem_intermediate'
    | 'missing_operand'
    | 'order_operations'
    | 'divisibility_yes_no'
    | 'multiple_order'
    | 'divisor_remainder'
    | 'fraction_parts'
    | 'number_comparison_choice'
    | 'rounding_direction'
    | 'unit_conversion_direction'
    | 'near_result'
    | 'unknown';

export interface ErrorDiagnosisStats {
    attempts: number;
    lastSeenAt: string;
}

export interface ProfileProgress {
    topics: Record<string, TopicProgress>;
    errorDiagnoses?: Record<string, ErrorDiagnosisStats>;
    sessionsCompleted: number;
    lastSessionAt?: string;
    hardProblems?: Problem[]; // Problems to revisit
    bestStreak?: number;
    totalStars?: number;
    lastSessionStars?: number;
    lastSessionStreak?: number;
}

export const DEFAULT_SETTINGS: Constraints = {
    allowedOperations: ['+', '-'],
    maxNumbers: 2,
    allowNegativeIntermediates: false,
    allowNegativeResult: false,
    maxSumResult: 20,
    maxMulProduct: 100,
    maxOneNumberInMul: 10,
    maxMulOperand: 10,
    requireIntegerDivision: true,
    maxDivisor: 10,
    maxDivisionResult: 10,
    allowParentheses: false,
    allowCrossingTens: true,
    missingOperand: false,
    problemCount: 10,
    trainingMode: 'learn',
    practiceStyle: 'classic',
};

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
    grade: 'grade2',
    problemCount: 10,
    enabledTopics: ['addition'],
    multiplicationTables: [2],
    divisionDivisors: [2],
    maxValue: 20,
    crossingTensMode: 'non_crossing',
    restrictToRoundTens: false,
    problemFormat: 'standard',
    maxIndianDividend: 100,
    maxIndianDivisor: 9,
    allowIndianDivisionRemainder: false,
    maxLongDividend: 100,
    maxLongDivisor: 9,
    allowLongDivisionRemainder: false,
    trainingMode: 'learn',
    practiceStyle: 'classic',
    unitConversionCategories: ['length', 'weight', 'money', 'volume'],
};
