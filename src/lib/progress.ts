import type { ErrorDiagnosisCode, Problem, Profile, ProfileProgress, TrainingResult } from './types';
import { getDiagnosisLabel, getProblemTopic } from './explanations';
import { getProblemMetadata } from './problemMetadata';

const emptyProgress = (): ProfileProgress => ({
    topics: {},
    errorDiagnoses: {},
    sessionsCompleted: 0,
});

export const computeBestStreak = (results: TrainingResult[]): number => {
    let current = 0;
    let best = 0;
    for (const r of results) {
        if (r.correct) {
            current++;
            if (current > best) best = current;
        } else {
            current = 0;
        }
    }
    return best;
};

export const computeStars = (results: TrainingResult[]): number => {
    if (results.length === 0) return 0;
    const correct = results.filter(r => r.correct).length;
    const ratio = correct / results.length;
    if (ratio >= 1.0) return 3;
    if (ratio >= 0.8) return 2;
    if (ratio >= 0.6) return 1;
    return 0;
};

const uniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const createProblem = (expression: string, result: number): Problem => ({
    id: uniqueId(),
    kind: 'standard',
    expression,
    result,
    steps: [],
    isAdaptiveFollowUp: true,
});

const getSpecificProgressTopics = (problem: Problem): string[] => {
    const metadata = getProblemMetadata(problem);
    if (!metadata) return [];

    if (metadata.type === 'multiplication') {
        return [metadata.left, metadata.right]
            .filter(value => value >= 2 && value <= 10)
            .map(value => `nasobilka ${value}`);
    }

    if (metadata.type === 'division') {
        const quotient = metadata.dividend / metadata.divisor;
        return [metadata.divisor, quotient]
            .filter(value => Number.isInteger(value) && value >= 2 && value <= 10)
            .map(value => `nasobilka ${value}`);
    }

    return [];
};

export const updateProfileProgress = (profile: Profile, results: TrainingResult[]): Profile => {
    const now = new Date().toISOString();
    const progress = profile.progress ?? emptyProgress();
    const topics = { ...progress.topics };
    const errorDiagnoses = { ...(progress.errorDiagnoses ?? {}) };
    let hardProblems = [...(progress.hardProblems ?? [])];

    results.forEach(result => {
        const topicNames = [getProblemTopic(result.problem), ...getSpecificProgressTopics(result.problem)];

        topicNames.forEach(topic => {
            const current = topics[topic] ?? {
                attempts: 0,
                correct: 0,
                lastPracticedAt: now,
            };

            topics[topic] = {
                attempts: current.attempts + 1,
                correct: current.correct + (result.correct ? 1 : 0),
                lastPracticedAt: now,
            };
        });

        // Manage Hard Problems (Math Diary)
        if (result.correct) {
            hardProblems = hardProblems.filter(p => p.expression !== result.problem.expression);
        } else {
            const diagnosisCode: ErrorDiagnosisCode = result.diagnosisCode ?? 'unknown';
            const currentDiagnosis = errorDiagnoses[diagnosisCode] ?? {
                attempts: 0,
                lastSeenAt: now,
            };
            errorDiagnoses[diagnosisCode] = {
                attempts: currentDiagnosis.attempts + 1,
                lastSeenAt: now,
            };

            // Only add if not already present and not an adaptive follow-up
            if (!result.problem.isAdaptiveFollowUp && !hardProblems.some(p => p.expression === result.problem.expression)) {
                hardProblems.push(result.problem);
            }
        }
    });

    // Limit hard problems count to keep it manageable
    if (hardProblems.length > 30) {
        hardProblems = hardProblems.slice(-30);
    }

    const sessionStars = computeStars(results);
    const sessionStreak = computeBestStreak(results);
    const previousBestStreak = progress.bestStreak ?? 0;
    const previousTotalStars = progress.totalStars ?? 0;
    const sessionHistory = [
        {
            id: uniqueId(),
            completedAt: now,
            totalProblems: results.length,
            correctProblems: results.filter(result => result.correct).length,
            results,
        },
        ...(progress.sessionHistory ?? []),
    ].slice(0, 10);

    return {
        ...profile,
        progress: {
            topics,
            errorDiagnoses,
            sessionsCompleted: progress.sessionsCompleted + 1,
            lastSessionAt: now,
            sessionHistory,
            bestStreak: Math.max(previousBestStreak, sessionStreak),
            totalStars: previousTotalStars + sessionStars,
            lastSessionStars: sessionStars,
            lastSessionStreak: sessionStreak,
            hardProblems,
        },
    };
};

export const getMostCommonErrorDiagnoses = (progress?: ProfileProgress, limit = 4) => {
    if (!progress?.errorDiagnoses) return [];

    return Object.entries(progress.errorDiagnoses)
        .map(([code, stats]) => ({
            code: code as ErrorDiagnosisCode,
            label: getDiagnosisLabel(code as ErrorDiagnosisCode),
            attempts: stats.attempts,
            lastSeenAt: stats.lastSeenAt,
        }))
        .sort((a, b) => b.attempts - a.attempts || a.label.localeCompare(b.label))
        .slice(0, limit);
};

export const createProblemsFromDiary = (progress?: ProfileProgress): Problem[] => {
    return progress?.hardProblems ?? [];
};

export const getWeakestProgressTopics = (progress?: ProfileProgress, limit = 3) => {
    if (!progress) return [];

    return Object.entries(progress.topics)
        .filter(([, topic]) => topic.attempts > 0)
        .map(([topic, stats]) => ({
            topic,
            attempts: stats.attempts,
            correct: stats.correct,
            accuracy: Math.round((stats.correct / stats.attempts) * 100),
        }))
        .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
        .slice(0, limit);
};

export const getAllProgressTopics = (progress?: ProfileProgress) => {
    if (!progress) return [];

    return Object.entries(progress.topics)
        .filter(([, topic]) => topic.attempts > 0)
        .map(([topic, stats]) => ({
            topic,
            attempts: stats.attempts,
            correct: stats.correct,
            accuracy: Math.round((stats.correct / stats.attempts) * 100),
            lastPracticedAt: stats.lastPracticedAt,
        }))
        .sort((a, b) => a.accuracy - b.accuracy || a.topic.localeCompare(b.topic));
};

const recommendedForTopic = (topic: string): Problem[] => {
    const multiplicationTable = topic.match(/^nasobilka (\d+)$/);
    if (multiplicationTable) {
        const table = Number(multiplicationTable[1]);
        return [
            createProblem(`${table} * 6`, table * 6),
            createProblem(`${table} * 8`, table * 8),
            createProblem(`${table * 7} / ${table}`, 7),
            createProblem(`${table * 9} / 9`, table),
        ];
    }

    if (topic === 'scitanie') {
        return [createProblem('4 + 3', 7), createProblem('6 + 2', 8), createProblem('5 + 5', 10)];
    }

    if (topic === 'odcitanie') {
        return [createProblem('9 - 4', 5), createProblem('8 - 3', 5), createProblem('10 - 6', 4)];
    }

    if (topic.includes('scitanie s prechodom')) {
        return [createProblem('8 + 5', 13), createProblem('7 + 6', 13), createProblem('9 + 4', 13)];
    }

    if (topic.includes('odcitanie s prechodom')) {
        return [createProblem('14 - 6', 8), createProblem('13 - 7', 6), createProblem('16 - 9', 7)];
    }

    if (topic.includes('nasob')) {
        return [createProblem('6 * 7', 42), createProblem('7 * 8', 56), createProblem('9 * 6', 54)];
    }

    if (topic.includes('delen')) {
        return [createProblem('42 / 6', 7), createProblem('56 / 8', 7), createProblem('54 / 9', 6)];
    }

    if (topic.includes('doplnovacka')) {
        return [createProblem('8 + ? = 13', 5), createProblem('15 - ? = 9', 6), createProblem('? * 7 = 42', 6)];
    }

    if (topic.includes('slovna')) {
        return [
            {
                ...createProblem('Na polici bolo 18 kníh. 7 kníh deti požičali. Koľko kníh ostalo?', 11),
                kind: 'word_problem',
                steps: ['18 - 7 = 11'],
            },
            {
                ...createProblem('V 6 miskách sú po 4 jahody. Koľko jahôd je spolu?', 24),
                kind: 'word_problem',
                steps: ['6 * 4 = 24'],
            },
        ];
    }

    if (topic.includes('poradie')) {
        return [createProblem('3 + 4 * 2', 11), createProblem('(3 + 4) * 2', 14), createProblem('5 + 2 * 6', 17)];
    }

    if (topic.includes('delitelnost')) {
        return [
            createProblem('Je 42 deliteľné číslom 6? 1=áno, 0=nie', 1),
            createProblem('Je 45 deliteľné číslom 4? 1=áno, 0=nie', 0),
            createProblem('Je 72 deliteľné číslom 9? 1=áno, 0=nie', 1),
        ];
    }

    if (topic.includes('nasobky')) {
        return [
            createProblem('Napíš 4. násobok čísla 6', 24),
            createProblem('Napíš jedného deliteľa čísla 36 väčšieho ako 1', 6),
            createProblem('Napíš 7. násobok čísla 8', 56),
        ];
    }

    if (topic.includes('zlomkov')) {
        return [
            createProblem('Zlomok: z 6 rovnakých častí sú vyfarbené 2. Aký je čitateľ?', 2),
            createProblem('Zlomok: celok je rozdelený na 8 rovnakých častí. Aký je menovateľ?', 8),
            createProblem('Zlomok: akú hodnotu má menovateľ pri slove štvrtina?', 4),
        ];
    }

    if (topic.includes('porovnavanie zlomkov')) {
        return [
            createProblem('Zlomok: čo je väčšie 3/6 alebo 2/6? 1=prvý, 0=druhý', 1),
            createProblem('Zlomok: čo je väčšie 1/4 alebo 3/4? 1=prvý, 0=druhý', 0),
            createProblem('Zlomok: z 8 rovnakých častí sú vyfarbené 5. Aký je čitateľ?', 5),
        ];
    }

    return [createProblem('12 + 8', 20), createProblem('25 - 9', 16)];
};

const recommendedForDiagnosis = (code: ErrorDiagnosisCode): Problem[] => {
    switch (code) {
        case 'crossing_tens_addition':
            return [
                createProblem('8 + 5', 13),
                createProblem('7 + 6', 13),
                createProblem('9 + 4', 13),
                createProblem('6 + 8', 14),
            ];
        case 'crossing_tens_subtraction':
            return [
                createProblem('14 - 6', 8),
                createProblem('13 - 7', 6),
                createProblem('16 - 9', 7),
                createProblem('12 - 5', 7),
            ];
        case 'off_by_one':
        case 'near_result':
            return [
                createProblem('8 + 4', 12),
                createProblem('15 - 7', 8),
                createProblem('6 * 7', 42),
                createProblem('42 / 6', 7),
            ];
        case 'wrong_operation':
            return [
                createProblem('9 + 6', 15),
                createProblem('15 - 6', 9),
                createProblem('6 * 4', 24),
                createProblem('24 / 6', 4),
            ];
        case 'multiplication_table':
            return [
                createProblem('6 * 7', 42),
                createProblem('7 * 8', 56),
                createProblem('9 * 6', 54),
                createProblem('8 * 4', 32),
            ];
        case 'division_inverse':
            return [
                createProblem('42 / 6', 7),
                createProblem('56 / 8', 7),
                createProblem('54 / 9', 6),
                createProblem('36 / 4', 9),
            ];
        case 'missing_operand':
            return [
                createProblem('8 + ? = 13', 5),
                createProblem('15 - ? = 9', 6),
                createProblem('? * 7 = 42', 6),
                createProblem('36 / ? = 6', 6),
            ];
        case 'order_operations':
            return [
                createProblem('3 + 4 * 2', 11),
                createProblem('(3 + 4) * 2', 14),
                createProblem('5 + 2 * 6', 17),
                createProblem('(5 + 2) * 6', 42),
            ];
        case 'divisibility_yes_no':
            return [
                createProblem('Je 42 deliteľné číslom 6? 1=áno, 0=nie', 1),
                createProblem('Je 45 deliteľné číslom 4? 1=áno, 0=nie', 0),
                createProblem('Je 72 deliteľné číslom 9? 1=áno, 0=nie', 1),
            ];
        case 'multiple_order':
            return [
                createProblem('Napíš 4. násobok čísla 6', 24),
                createProblem('Napíš 7. násobok čísla 8', 56),
                createProblem('Napíš 5. násobok čísla 9', 45),
            ];
        case 'divisor_remainder':
            return [
                createProblem('Napíš jedného deliteľa čísla 36 väčšieho ako 1', 6),
                createProblem('Napíš jedného deliteľa čísla 24 väčšieho ako 1', 4),
                createProblem('Napíš jedného deliteľa čísla 45 väčšieho ako 1', 5),
            ];
        case 'fraction_parts':
            return [
                createProblem('Zlomok: z 6 rovnakých častí sú vyfarbené 2. Aký je čitateľ?', 2),
                createProblem('Zlomok: celok je rozdelený na 8 rovnakých častí. Aký je menovateľ?', 8),
                createProblem('Zlomok: čo je väčšie 3/6 alebo 2/6? 1=prvý, 0=druhý', 1),
            ];
        case 'fraction_of_quantity':
            return [
                { ...createProblem('Koľko je 1⁄3 z čísla 18?', 6), metadata: { type: 'fraction_of_quantity', numerator: 1, denominator: 3, whole: 18, context: 'generic' } },
                { ...createProblem('Koľko je 2⁄3 z čísla 18?', 12), metadata: { type: 'fraction_of_quantity', numerator: 2, denominator: 3, whole: 18, context: 'generic' } },
                { ...createProblem('Čokoláda má 24 kociek. Koľko kociek tvorí 3⁄4 čokolády?', 18), metadata: { type: 'fraction_of_quantity', numerator: 3, denominator: 4, whole: 24, context: 'chocolate' } },
                { ...createProblem('Koľko je 1⁄4 z čísla 20?', 5), metadata: { type: 'fraction_of_quantity', numerator: 1, denominator: 4, whole: 20, context: 'generic' } },
            ];
        case 'fraction_of_time':
            return [
                { ...createProblem('Koľko minút je 1⁄4 hodiny?', 15), metadata: { type: 'fraction_of_time', numerator: 1, denominator: 4 } },
                { ...createProblem('Koľko minút je 1⁄3 hodiny?', 20), metadata: { type: 'fraction_of_time', numerator: 1, denominator: 3 } },
                { ...createProblem('Koľko minút je 2⁄3 hodiny?', 40), metadata: { type: 'fraction_of_time', numerator: 2, denominator: 3 } },
                { ...createProblem('Koľko minút je 1⁄2 hodiny?', 30), metadata: { type: 'fraction_of_time', numerator: 1, denominator: 2 } },
            ];
        case 'fraction_answer':
            return [
                { ...createProblem('Akú časť hodiny tvorí 15 minút?', 15 / 60), metadata: { type: 'fraction_answer', numerator: 15, denominator: 60, context: 'time' } },
                { ...createProblem('Akú časť hodiny tvorí 20 minút?', 20 / 60), metadata: { type: 'fraction_answer', numerator: 20, denominator: 60, context: 'time' } },
                { ...createProblem('Z 6 dlaždíc sú 2 žlté. Akú časť tvoria žlté?', 2 / 6), metadata: { type: 'fraction_answer', numerator: 2, denominator: 6, context: 'set' } },
                { ...createProblem('Z 4 guľôčok je 1 modrá. Akú časť tvoria modré?', 1 / 4), metadata: { type: 'fraction_answer', numerator: 1, denominator: 4, context: 'set' } },
            ];
        case 'fraction_equal_parts':
            return [
                { ...createProblem('Ktoré rozdelenie kruhu na 3 rovnakých častí je správne?', 0), metadata: { type: 'fraction_equal_parts', parts: 3, options: [[120, 120, 120], [150, 120, 90], [90, 150, 120]], correctIndex: 0 } },
                { ...createProblem('Ktoré rozdelenie kruhu na 4 rovnakých častí je správne?', 1), metadata: { type: 'fraction_equal_parts', parts: 4, options: [[120, 90, 90, 60], [90, 90, 90, 90], [60, 120, 90, 90]], correctIndex: 1 } },
            ];
        case 'decimal_fraction':
            return [
                { ...createProblem('Zapíš 0,3 ako zlomok.', 0.3), metadata: { type: 'fraction_answer', numerator: 3, denominator: 10, context: 'decimal' } },
                { ...createProblem('Zapíš 0,7 ako zlomok.', 0.7), metadata: { type: 'fraction_answer', numerator: 7, denominator: 10, context: 'decimal' } },
                { ...createProblem('Zapíš 7⁄10 ako desatinné číslo.', 0.7), metadata: { type: 'decimal_from_fraction', numerator: 7, denominator: 10, value: 0.7 } },
                { ...createProblem('Zapíš 1⁄4 ako desatinné číslo.', 0.25), metadata: { type: 'decimal_from_fraction', numerator: 1, denominator: 4, value: 0.25 } },
            ];
        case 'decimal_place':
            return [
                { ...createProblem('Koľko desatín má číslo 0,7?', 7), metadata: { type: 'decimal_place', value: 0.7, unit: 'desatiny', count: 7, direction: 'to_count' } },
                { ...createProblem('Zapíš desatinným číslom: tri desatiny.', 0.3), metadata: { type: 'decimal_place', value: 0.3, unit: 'desatiny', count: 3, direction: 'to_decimal' } },
                { ...createProblem('Koľko stotín má číslo 0,25?', 25), metadata: { type: 'decimal_place', value: 0.25, unit: 'stotiny', count: 25, direction: 'to_count' } },
            ];
        case 'decimal_compare':
            return [
                { ...createProblem('Ktoré číslo je väčšie: 0,3 alebo 0,25? 1=prvý, 0=druhý', 1), metadata: { type: 'decimal_compare', leftLabel: '0,3', rightLabel: '0,25', leftValue: 0.3, rightValue: 0.25 } },
                { ...createProblem('Ktoré číslo je väčšie: 1⁄2 alebo 0,4? 1=prvý, 0=druhý', 1), metadata: { type: 'decimal_compare', leftLabel: '1⁄2', rightLabel: '0,4', leftValue: 0.5, rightValue: 0.4 } },
            ];
        case 'decimal_order':
            return [
                { ...createProblem('Ktoré číslo je najmenšie?', 1), metadata: { type: 'decimal_order', options: [{ label: '0,5', value: 0.5 }, { label: '0,3', value: 0.3 }, { label: '3⁄4', value: 0.75 }], correctIndex: 1, extreme: 'smallest' } },
                { ...createProblem('Ktoré číslo je najväčšie?', 2), metadata: { type: 'decimal_order', options: [{ label: '0,2', value: 0.2 }, { label: '1⁄4', value: 0.25 }, { label: '0,6', value: 0.6 }], correctIndex: 2, extreme: 'largest' } },
            ];
        case 'decimal_sequence':
            return [
                { ...createProblem('Pokračuj v rade: 0,6; 0,7; 0,8; ?', 0.9), metadata: { type: 'decimal_sequence', terms: [0.6, 0.7, 0.8], step: 0.1, answer: 0.9 } },
                { ...createProblem('Pokračuj v rade: 1,5; 1,7; 1,9; ?', 2.1), metadata: { type: 'decimal_sequence', terms: [1.5, 1.7, 1.9], step: 0.2, answer: 2.1 } },
            ];
        case 'decimal_number_line':
            return [
                { ...createProblem('Aké číslo je na číselnej osi označené šípkou?', 0.3), metadata: { type: 'decimal_number_line', min: 0, max: 1, step: 0.1, mark: 0.3 } },
                { ...createProblem('Aké číslo je na číselnej osi označené šípkou?', 0.7), metadata: { type: 'decimal_number_line', min: 0, max: 1, step: 0.1, mark: 0.7 } },
            ];
        case 'decimal_arithmetic':
            return [
                { ...createProblem('0,4 + 0,3', 0.7), metadata: { type: 'decimal_arithmetic', left: 0.4, right: 0.3, op: '+', result: 0.7, context: 'plain' } },
                { ...createProblem('1,5 − 0,8', 0.7), metadata: { type: 'decimal_arithmetic', left: 1.5, right: 0.8, op: '-', result: 0.7, context: 'plain' } },
                { ...createProblem('Nákup stojí 3,50 €. Zaplatíš 5 €. Koľko ti vrátia?', 1.5), metadata: { type: 'decimal_arithmetic', left: 5, right: 3.5, op: '-', result: 1.5, context: 'money' } },
            ];
        case 'cube_plan_count':
        case 'cube_solid_count':
            return [
                { ...createProblem('Koľko kociek má teleso s týmto podlažným plánom?', 6), metadata: { type: 'cube_plan_count', grid: [[1, 2], [3, 0]], question: 'total' } },
                { ...createProblem('Koľko kociek má teleso s týmto podlažným plánom?', 7), metadata: { type: 'cube_plan_count', grid: [[2, 1], [1, 3]], question: 'total' } },
                { ...createProblem('Koľko kociek je na sebe v najvyššom stĺpci?', 3), metadata: { type: 'cube_plan_count', grid: [[1, 2], [3, 1]], question: 'max' } },
            ];
        case 'cube_match':
            return [
                { ...createProblem('Ktorý podlažný plán patrí k telesu?', 0), metadata: { type: 'cube_match', grid: [[1, 2], [3, 0]], options: [[[1, 2], [3, 0]], [[2, 1], [3, 0]], [[1, 2], [0, 3]]], correctIndex: 0 } },
            ];
        case 'coin_equation':
            return [
                { ...createProblem('Rovnaké mince majú rovnakú hodnotu. Koľko centov má jedna neznáma minca?', 2), metadata: { type: 'coin_equation', leftValues: [5, 1], knownOnRight: [], unknownCount: 3, unit: 'c', answer: 2 } },
                { ...createProblem('Rovnaké mince majú rovnakú hodnotu. Koľko centov má jedna neznáma minca?', 5), metadata: { type: 'coin_equation', leftValues: [10], knownOnRight: [], unknownCount: 2, unit: 'c', answer: 5 } },
                { ...createProblem('Rovnaké kocky sú rovnako ťažké. Koľko kg váži jedna kocka?', 2), metadata: { type: 'coin_equation', leftValues: [5, 1], knownOnRight: [], unknownCount: 3, unit: 'kg', answer: 2 } },
            ];
        case 'coin_payment':
            return [
                { ...createProblem('Najmenej koľkými mincami zaplatíš 7 c?', 2), metadata: { type: 'coin_payment', amount: 7, variant: 'fewest', answer: 2 } },
                { ...createProblem('Dá sa zaplatiť 7 c práve 3 mincami? 1=áno, 0=nie', 1), metadata: { type: 'coin_payment', amount: 7, variant: 'exact_possible', exactCount: 3, answer: 1 } },
            ];
        case 'egyptian_decompose':
            return [
                { ...createProblem('Ktorý zápis sa rovná 3⁄4?', 0), metadata: { type: 'egyptian_decompose', numerator: 3, denominator: 4, options: ['1⁄2 + 1⁄4', '1⁄3 + 1⁄4', '1⁄2 + 1⁄3'], correctIndex: 0 } },
                { ...createProblem('Ktorý zápis sa rovná 5⁄6?', 1), metadata: { type: 'egyptian_decompose', numerator: 5, denominator: 6, options: ['1⁄2 + 1⁄4', '1⁄2 + 1⁄3', '1⁄3 + 1⁄4'], correctIndex: 1 } },
            ];
        case 'number_line_read':
            return [
                { ...createProblem('Aké číslo je v označenom bode na číselnej osi?', 2), metadata: { type: 'number_line_read', min: 0, max: 1, marks: [{ value: 1, pos: 0.25 }, { value: 3, pos: 0.75 }], askPos: 0.5, answer: 2 } },
            ];
        case 'number_comparison_choice':
            return [
                createProblem('Ktoré číslo je väčšie: 48 alebo 52? 1=prvý, 0=druhý', 0),
                createProblem('Ktoré číslo je menšie: 31 alebo 29? 1=prvý, 0=druhý', 0),
            ];
        case 'rounding_direction':
            return [
                createProblem('Zaokrúhli 47 na desiatky', 50),
                createProblem('Zaokrúhli 142 na stovky', 100),
                createProblem('Zaokrúhli 168 na stovky', 200),
            ];
        case 'unit_conversion_direction':
            return [
                createProblem('3 m = ? cm', 300),
                createProblem('5 m = ? dm', 50),
                createProblem('70 cm = ? dm', 7),
                createProblem('4 kg = ? g', 4000),
                createProblem('3 l = ? dl', 30),
                createProblem('2 l = ? ml', 2000),
                createProblem('6 dl = ? ml', 600),
                createProblem('5000 g = ? kg', 5),
                createProblem('3000 ml = ? l', 3),
                createProblem('40 dl = ? l', 4),
                createProblem('2 h = ? min', 120),
                createProblem('300 cm = ? m', 3),
                createProblem('4000 m = ? km', 4),
                createProblem('180 min = ? h', 3),
            ];
        case 'word_problem_operation':
            return [
                {
                    ...createProblem('Na ihrisku bolo 9 detí. Prišli ešte 4 deti. Koľko detí je spolu?', 13),
                    kind: 'word_problem',
                    steps: ['9 + 4 = 13'],
                    metadata: { type: 'word_problem', baseTopic: 'addition' },
                },
                {
                    ...createProblem('Miška mala 15 ceruziek. 6 požičala. Koľko jej zostalo?', 9),
                    kind: 'word_problem',
                    steps: ['15 - 6 = 9'],
                    metadata: { type: 'word_problem', baseTopic: 'subtraction' },
                },
                {
                    ...createProblem('V 4 miskách sú po 6 jahôd. Koľko jahôd je spolu?', 24),
                    kind: 'word_problem',
                    steps: ['4 * 6 = 24'],
                    metadata: { type: 'word_problem', baseTopic: 'multiplication' },
                },
                {
                    ...createProblem('24 cukríkov rozdelíme rovnako medzi 6 detí. Koľko dostane každé dieťa?', 4),
                    kind: 'word_problem',
                    steps: ['24 / 6 = 4'],
                    metadata: { type: 'word_problem', baseTopic: 'division' },
                },
            ];
        case 'word_problem_multistep':
        case 'word_problem_intermediate':
            return [
                {
                    ...createProblem('Anna mala 30 eur. Kúpila si 3 knihy po 7 eur. Koľko eur jej zostalo?', 9),
                    kind: 'word_problem',
                    steps: ['3 * 7 = 21', '30 - 21 = 9'],
                    metadata: { type: 'word_problem', baseTopic: 'multistep' },
                },
                {
                    ...createProblem('V škole sú 4 triedy po 8 žiakov. 5 žiakov ide na súťaž. Koľko žiakov nejde na súťaž?', 27),
                    kind: 'word_problem',
                    steps: ['4 * 8 = 32', '32 - 5 = 27'],
                    metadata: { type: 'word_problem', baseTopic: 'multistep' },
                },
                {
                    ...createProblem('Peter mal 25 eur. Kúpil 2 perá po 6 eur. Koľko eur mu zostalo?', 13),
                    kind: 'word_problem',
                    steps: ['2 * 6 = 12', '25 - 12 = 13'],
                    metadata: { type: 'word_problem', baseTopic: 'multistep' },
                },
            ];
        case 'step_division':
        case 'step_division_quotient':
        case 'step_division_remainder':
        case 'step_division_both':
            return [
                createProblem('84 / 4', 21),
                createProblem('96 / 3', 32),
                createProblem('75 / 5', 15),
                createProblem('68 / 2', 34),
            ];
        case 'timeout':
        case 'unreadable_answer':
        case 'unknown':
            return [];
    }
};

export const createRecommendedProblemsForTopic = (topic: string, limit = 8): Problem[] =>
    recommendedForTopic(topic).slice(0, limit);

export const createRecommendedProblemsFromProgress = (progress?: ProfileProgress, limit = 10): Problem[] => {
    const weakestTopics = getWeakestProgressTopics(progress, 4);
    const commonDiagnoses = getMostCommonErrorDiagnoses(progress, 3);
    const recommended = [
        ...commonDiagnoses.flatMap(item => recommendedForDiagnosis(item.code)),
        ...weakestTopics.flatMap(item => recommendedForTopic(item.topic)),
    ];

    return uniqueProblems(recommended).slice(0, limit);
};

const uniqueProblems = (problems: Problem[]) => {
    const seen = new Set<string>();
    return problems.filter(problem => {
        if (seen.has(problem.expression)) return false;
        seen.add(problem.expression);
        return true;
    });
};

export const createRecommendedProblemsFromRecentAndProgress = (
    results: TrainingResult[],
    progress?: ProfileProgress,
    limit = 10,
): Problem[] => {
    const recentDiagnoses = Array.from(new Set(
        results
            .filter(result => !result.correct && result.diagnosisCode)
            .map(result => result.diagnosisCode!)
    ));
    const recentTopics = Array.from(new Set(
        results
            .filter(result => !result.correct)
            .map(result => getProblemTopic(result.problem))
    ));
    const progressDiagnoses = getMostCommonErrorDiagnoses(progress, 3).map(item => item.code);
    const progressTopics = getWeakestProgressTopics(progress, 4).map(item => item.topic);
    const diagnoses = [...recentDiagnoses, ...progressDiagnoses.filter(code => !recentDiagnoses.includes(code))];
    const topics = [...recentTopics, ...progressTopics.filter(topic => !recentTopics.includes(topic))];

    return uniqueProblems([
        ...diagnoses.flatMap(code => recommendedForDiagnosis(code)),
        ...topics.flatMap(topic => recommendedForTopic(topic)),
    ]).slice(0, limit);
};
