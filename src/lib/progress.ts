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

    return {
        ...profile,
        progress: {
            topics,
            errorDiagnoses,
            sessionsCompleted: progress.sessionsCompleted + 1,
            lastSessionAt: now,
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
