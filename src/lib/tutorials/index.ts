import { generateProblem } from '../generator';
import { resolveProfileConstraints } from '../profileConstraints';
import {
    type Profile,
    type TutorialAudience,
    type TutorialId,
    type TutorialScript,
} from '../types';
import { buildIndianDivisionTutorial } from './buildIndianDivisionTutorial';
import { buildLongDivisionTutorial } from './buildLongDivisionTutorial';

const range = (count: number) => Array.from({ length: count }, (_, index) => index);
const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const buildArithmeticTutorial = (
    audience: TutorialAudience,
    title: string,
    problemExpression: string,
    stepTexts: {
        title: string;
        speechText: string;
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
    }[],
): TutorialScript => ({
    method: 'arithmetic',
    audience,
    title,
    problemExpression,
    steps: stepTexts.map((step, index) => ({
        id: `step-${index}`,
        title: step.title,
        cues: [{
            id: `cue-${index}`,
            speechText: step.speechText,
            state: {
                kind: 'arithmetic',
                visualKind: tutorialIdToVisualKind(title),
                expression: step.expression,
                groups: step.groups,
                groupLabels: step.groupLabels,
                activeGroupIndex: step.activeGroupIndex,
                comparisonGroups: step.comparisonGroups,
                comparisonActiveGroupIndex: step.comparisonActiveGroupIndex,
                primaryLabel: step.primaryLabel,
                comparisonLabel: step.comparisonLabel,
                resultText: step.resultText,
                note: step.note,
            },
        }],
    })),
});

const tutorialIdToVisualKind = (title: string) => {
    if (title.includes('Porovnávanie zlomkov')) return 'fraction_compare';
    if (title.includes('zlomkov')) return 'fraction_parts';
    if (title.includes('Deliteľnosť')) return 'divisibility_groups';
    if (title.includes('Násobky')) return 'multiples_divisors_groups';
    if (title.includes('Poradie')) return 'order_operations_groups';
    if (title.includes('Sčítanie')) return 'addition_to_ten';
    if (title.includes('Odčítanie')) return 'subtraction_through_ten';
    if (title.includes('Násobenie')) return 'multiplication_groups';
    return 'division_groups';
};

export const buildTutorialById = (profile: Profile, tutorialId: TutorialId): TutorialScript => {
    const constraints = resolveProfileConstraints(profile);
    const audience = profile.schoolSettings?.grade ?? 'grade4';

    switch (tutorialId) {
        case 'grade1_addition_intro':
            {
                const example = pick([{ a: 4, b: 3 }, { a: 5, b: 2 }, { a: 6, b: 3 }]);
                return buildArithmeticTutorial(audience, 'Sčítanie do 10', `${example.a} + ${example.b}`, [
                {
                    title: 'Dve skupiny',
                    speechText: `Vidíme ${example.a} modrých bodov a ${example.b} zelených bodov.`,
                    expression: `${example.a} + ${example.b}`,
                    groups: [range(example.a), range(example.b)],
                    groupLabels: [String(example.a), String(example.b)],
                    note: 'Sčítanie znamená dať skupiny spolu.',
                },
                {
                    title: 'Spojíme ich',
                    speechText: 'Dáme ich spolu a spočítame všetky body.',
                    expression: `${example.a} + ${example.b}`,
                    groups: [range(example.a + example.b)],
                    groupLabels: [`spolu ${example.a + example.b}`],
                    resultText: `${example.a} + ${example.b} = ${example.a + example.b}`,
                },
            ]);
            }
        case 'grade1_subtraction_intro':
            {
                const example = pick([{ a: 8, b: 3 }, { a: 9, b: 4 }, { a: 7, b: 2 }]);
                return buildArithmeticTutorial(audience, 'Odčítanie do 10', `${example.a} - ${example.b}`, [
                {
                    title: `Začíname s ${example.a}`,
                    speechText: `Máme ${example.a} bodov.`,
                    expression: `${example.a} - ${example.b}`,
                    groups: [range(example.a)],
                    groupLabels: [String(example.a)],
                    note: 'Odčítanie znamená odobrať časť.',
                },
                {
                    title: `Odobrali sme ${example.b}`,
                    speechText: `Odobrali sme ${example.b} bodov. Zostalo ${example.a - example.b}.`,
                    expression: `${example.a} - ${example.b} = ${example.a - example.b}`,
                    groups: [range(example.a - example.b), range(example.b)],
                    groupLabels: [`zostalo ${example.a - example.b}`, `odobrali sme ${example.b}`],
                    activeGroupIndex: 0,
                    resultText: `${example.a} - ${example.b} = ${example.a - example.b}`,
                },
            ]);
            }
        case 'grade2_addition_crossing':
            return buildArithmeticTutorial(audience, 'Sčítanie cez desiatku', '8 + 5', [
                {
                    title: 'Príklad 8 + 5',
                    speechText: 'Vidíme osem modrých bodov a päť zelených bodov.',
                    expression: '8 + 5',
                    groups: [range(8), range(5)],
                    groupLabels: ['8', '5'],
                    note: 'Najprv chceme doplniť 8 do 10.',
                },
                {
                    title: 'Doplníme do 10',
                    speechText: 'Z päťky vezmeme dva body. Osem plus dva je desať.',
                    expression: '8 + 2 = 10',
                    groups: [range(8), range(2), range(3)],
                    groupLabels: ['8', '+2', 'zostali 3'],
                    activeGroupIndex: 1,
                    resultText: '8 + 2 = 10',
                },
                {
                    title: 'Dopočítame zvyšok',
                    speechText: 'Ostali ešte tri body. Desať plus tri je trinásť.',
                    expression: '10 + 3 = 13',
                    groups: [range(10), range(3)],
                    groupLabels: ['10', '+3'],
                    activeGroupIndex: 1,
                    resultText: '8 + 5 = 13',
                },
            ]);
        case 'grade2_subtraction_crossing':
            return buildArithmeticTutorial(audience, 'Odčítanie cez desiatku', '14 - 6', [
                {
                    title: 'Príklad 14 - 6',
                    speechText: 'Máme štrnásť bodov a chceme odobrať šesť.',
                    expression: '14 - 6',
                    groups: [range(14), range(6)],
                    groupLabels: ['14', 'odoberieme 6'],
                    note: 'Šesť rozdelíme na štyri a dva.',
                },
                {
                    title: 'Najprv na desiatku',
                    speechText: 'Najprv odoberieme štyri, aby zostala celá desiatka.',
                    expression: '14 - 4 = 10',
                    groups: [range(10), range(4)],
                    groupLabels: ['zostalo 10', 'odobrali sme 4'],
                    activeGroupIndex: 1,
                    resultText: '14 - 4 = 10',
                },
                {
                    title: 'Odoberieme zvyšok',
                    speechText: 'Zo šestky ostali ešte dva. Desať mínus dva je osem.',
                    expression: '10 - 2 = 8',
                    groups: [range(8), range(2)],
                    groupLabels: ['zostalo 8', 'odobrali sme 2'],
                    activeGroupIndex: 1,
                    resultText: '14 - 6 = 8',
                },
            ]);
        case 'grade3_multiplication_intro':
            {
                const example = pick([{ groupSize: 4, count: 3 }, { groupSize: 3, count: 5 }, { groupSize: 5, count: 4 }]);
                const groups = Array.from({ length: example.count }, () => range(example.groupSize));
                return buildArithmeticTutorial(audience, 'Násobenie', `${example.groupSize} × ${example.count}`, [
                {
                    title: 'Tri rovnaké skupiny',
                    speechText: `${example.groupSize} krát ${example.count} môžeme vidieť ako ${example.count} rovnaké skupiny po ${example.groupSize}.`,
                    expression: `${example.groupSize} × ${example.count}`,
                    groups,
                    groupLabels: Array.from({ length: example.count }, () => String(example.groupSize)),
                    note: `${example.count} skupiny po ${example.groupSize}.`,
                },
                {
                    title: 'Opakované sčítanie',
                    speechText: 'Skupiny spočítame opakovaným sčítaním.',
                    expression: Array.from({ length: example.count }, () => String(example.groupSize)).join(' + '),
                    groups,
                    groupLabels: Array.from({ length: example.count }, (_, index) => index === 0 ? String(example.groupSize) : `+${example.groupSize}`),
                    activeGroupIndex: 1,
                    resultText: Array.from({ length: example.count }, () => String(example.groupSize)).join(' + '),
                },
                {
                    title: 'Výsledok',
                    speechText: `Spolu je ${example.groupSize * example.count} bodov.`,
                    expression: `${example.groupSize} × ${example.count} = ${example.groupSize * example.count}`,
                    groups,
                    groupLabels: Array.from({ length: example.count }, () => String(example.groupSize)),
                    resultText: String(example.groupSize * example.count),
                },
            ]);
            }
        case 'grade3_division_intro':
            return buildArithmeticTutorial(audience, 'Delenie', '12 : 3', [
                {
                    title: 'Dvanásť delíme na tri časti',
                    speechText: 'Máme dvanásť bodov a delíme ich na tri rovnaké skupiny.',
                    expression: '12 : 3',
                    groups: [range(12)],
                    groupLabels: ['12'],
                    note: 'Hľadáme, koľko bude v jednej skupine.',
                },
                {
                    title: 'Tri rovnaké skupiny',
                    speechText: 'Rozdelíme body rovnomerne. V každej skupine sú štyri.',
                    expression: '12 : 3',
                    groups: [range(4), range(4), range(4)],
                    groupLabels: ['4', '4', '4'],
                    activeGroupIndex: 0,
                    resultText: 'v jednej skupine sú 4',
                },
                {
                    title: 'Kontrola násobením',
                    speechText: 'Kontrola je tri krát štyri rovná sa dvanásť.',
                    expression: '3 × 4 = 12',
                    groups: [range(4), range(4), range(4)],
                    groupLabels: ['4', '4', '4'],
                    resultText: '12 : 3 = 4',
                },
            ]);
        case 'grade5_order_operations_intro':
            return buildArithmeticTutorial(audience, 'Poradie operácií', '3 + 4 × 2', [
                {
                    title: 'Bez zátvoriek',
                    speechText: 'V príklade tri plus štyri krát dva najprv počítame násobenie.',
                    expression: '3 + 4 × 2',
                    groups: [range(3), range(4), range(4)],
                    groupLabels: ['3', '4', '4'],
                    activeGroupIndex: 1,
                    note: 'Násobenie má prednosť pred sčítaním.',
                },
                {
                    title: 'Najprv násobenie',
                    speechText: 'Štyri krát dva je osem. Až potom pripočítame tri.',
                    expression: '4 × 2 = 8',
                    groups: [range(3), range(8)],
                    groupLabels: ['3 zatiaľ čaká', '8'],
                    activeGroupIndex: 1,
                    resultText: '3 + 8',
                },
                {
                    title: 'Dopočítame súčet',
                    speechText: 'Tri plus osem je jedenásť.',
                    expression: '3 + 8 = 11',
                    groups: [range(3), range(8)],
                    groupLabels: ['3', '8'],
                    resultText: '3 + 4 × 2 = 11',
                },
                {
                    title: 'Zátvorky menia poradie',
                    speechText: 'Ak sú čísla tri plus štyri v zátvorke, začneme práve nimi.',
                    expression: '(3 + 4) × 2',
                    groups: [range(3), range(4), range(7)],
                    groupLabels: ['3', '+4', 'druhá skupina zatiaľ čaká'],
                    activeGroupIndex: 0,
                    note: 'Zátvorka sa počíta ako prvá.',
                },
                {
                    title: 'Najprv zátvorka',
                    speechText: 'Tri plus štyri je sedem. Potom sedem vynásobíme dvomi.',
                    expression: '(3 + 4) = 7',
                    groups: [range(7), range(7)],
                    groupLabels: ['7', '7'],
                    activeGroupIndex: 0,
                    resultText: '7 × 2',
                },
                {
                    title: 'Výsledok so zátvorkou',
                    speechText: 'Sedem krát dva je štrnásť. Vidíme, že zátvorky zmenili výsledok.',
                    expression: '7 × 2 = 14',
                    groups: [range(7), range(7)],
                    groupLabels: ['7', '7'],
                    resultText: '(3 + 4) × 2 = 14',
                    note: 'Rovnaké čísla, iné poradie počítania, iný výsledok.',
                },
            ]);
        case 'grade5_fractions_intro':
            {
                const example = pick([{ numerator: 3, denominator: 6 }, { numerator: 2, denominator: 5 }, { numerator: 4, denominator: 8 }]);
                const groups = Array.from({ length: example.denominator }, () => range(1));
                return buildArithmeticTutorial(audience, 'Úvod do zlomkov', `${example.numerator} / ${example.denominator}`, [
                {
                    title: 'Celok rozdelený na časti',
                    speechText: `Celok je rozdelený na ${example.denominator} rovnakých častí. To bude menovateľ.`,
                    expression: `menovateľ = ${example.denominator}`,
                    groups,
                    activeGroupIndex: -1,
                    resultText: `${example.denominator} rovnakých častí`,
                },
                {
                    title: 'Vyfarbené časti',
                    speechText: `Vyfarbených je ${example.numerator} častí. To je čitateľ.`,
                    expression: `čitateľ = ${example.numerator}`,
                    groups,
                    activeGroupIndex: example.numerator - 1,
                    resultText: `${example.numerator} / ${example.denominator}`,
                    note: 'Čitateľ hovorí, koľko častí je vyfarbených.',
                },
                {
                    title: 'Zlomok',
                    speechText: `Hore je čitateľ ${example.numerator}, dole menovateľ ${example.denominator}.`,
                    expression: `${example.numerator} / ${example.denominator}`,
                    groups,
                    activeGroupIndex: example.numerator - 1,
                    resultText: `čitateľ ${example.numerator}, menovateľ ${example.denominator}`,
                },
                {
                    title: 'Menovateľ',
                    speechText: 'Menovateľ hovorí, na koľko rovnakých častí je rozdelený celý obrázok.',
                    expression: `menovateľ = ${example.denominator}`,
                    groups,
                    activeGroupIndex: example.denominator - 1,
                    resultText: `všetkých častí je ${example.denominator}`,
                },
                {
                    title: 'Porovnanie',
                    speechText: 'Ak majú dva zlomky rovnaký menovateľ, väčší je ten, ktorý má väčší čitateľ.',
                    expression: `${example.numerator} / ${example.denominator} > ${Math.max(1, example.numerator - 1)} / ${example.denominator}`,
                    groups,
                    activeGroupIndex: example.numerator - 1,
                    resultText: `${example.numerator} vyfarbených častí je viac ako ${Math.max(1, example.numerator - 1)}`,
                },
            ]);
            }
        case 'grade5_fraction_compare_intro':
            {
                const example = pick([{ left: 3, right: 2, denominator: 6 }, { left: 5, right: 3, denominator: 8 }, { left: 4, right: 1, denominator: 5 }]);
                const groups = Array.from({ length: example.denominator }, () => range(1));
                return buildArithmeticTutorial(audience, 'Porovnávanie zlomkov', `${example.left}/${example.denominator} a ${example.right}/${example.denominator}`, [
                {
                    title: 'Rovnaký menovateľ',
                    speechText: `Oba zlomky sú rozdelené na ${example.denominator} rovnakých častí. Menovateľ je rovnaký.`,
                    expression: `${example.left}/${example.denominator} ? ${example.right}/${example.denominator}`,
                    groups,
                    comparisonGroups: groups,
                    activeGroupIndex: -1,
                    comparisonActiveGroupIndex: -1,
                    primaryLabel: `${example.left}/${example.denominator}`,
                    comparisonLabel: `${example.right}/${example.denominator}`,
                    note: 'Keď je menovateľ rovnaký, porovnávame čitateľov.',
                },
                {
                    title: 'Prvý zlomok',
                    speechText: `V prvom zlomku sú vyfarbené ${example.left} časti.`,
                    expression: `${example.left}/${example.denominator}`,
                    groups,
                    comparisonGroups: groups,
                    activeGroupIndex: example.left - 1,
                    comparisonActiveGroupIndex: -1,
                    primaryLabel: `${example.left} vyfarbené z ${example.denominator}`,
                    comparisonLabel: `${example.right}/${example.denominator}`,
                    resultText: `čitateľ prvého je ${example.left}`,
                },
                {
                    title: 'Druhý zlomok',
                    speechText: `V druhom zlomku sú vyfarbené ${example.right} časti.`,
                    expression: `${example.right}/${example.denominator}`,
                    groups,
                    comparisonGroups: groups,
                    activeGroupIndex: example.left - 1,
                    comparisonActiveGroupIndex: example.right - 1,
                    primaryLabel: `${example.left} vyfarbené z ${example.denominator}`,
                    comparisonLabel: `${example.right} vyfarbené z ${example.denominator}`,
                    resultText: `čitateľ druhého je ${example.right}`,
                },
                {
                    title: 'Porovnanie',
                    speechText: `${example.left} je viac ako ${example.right}, preto je väčší prvý zlomok.`,
                    expression: `${example.left}/${example.denominator} > ${example.right}/${example.denominator}`,
                    groups,
                    comparisonGroups: groups,
                    activeGroupIndex: example.left - 1,
                    comparisonActiveGroupIndex: example.right - 1,
                    primaryLabel: `${example.left}/${example.denominator}`,
                    comparisonLabel: `${example.right}/${example.denominator}`,
                    resultText: 'väčší je prvý zlomok',
                    note: `Porovnali sme len čitatele: ${example.left} > ${example.right}.`,
                },
            ]);
            }
        case 'grade5_divisibility_intro':
            {
                const example = pick([{ number: 42, divisor: 6, quotient: 7 }, { number: 36, divisor: 9, quotient: 4 }, { number: 45, divisor: 5, quotient: 9 }]);
                const groups = Array.from({ length: example.divisor }, () => range(example.quotient));
                return buildArithmeticTutorial(audience, 'Deliteľnosť', `${example.number} : ${example.divisor}`, [
                {
                    title: 'Skúmame delenie',
                    speechText: `Skúšame, či sa číslo ${example.number} dá rozdeliť na ${example.divisor} rovnakých skupín.`,
                    expression: `${example.number} : ${example.divisor}`,
                    groups: [range(example.number)],
                    groupLabels: [String(example.number)],
                    note: 'Deliteľné znamená, že po rozdelení nezostane zvyšok.',
                },
                {
                    title: 'Rovnaké skupiny',
                    speechText: `Rozdelíme body do ${example.divisor} rovnakých skupín. V každej je ${example.quotient}.`,
                    expression: `${example.number} = ${example.divisor} × ${example.quotient}`,
                    groups,
                    groupLabels: Array.from({ length: example.divisor }, () => String(example.quotient)),
                    activeGroupIndex: 0,
                    resultText: `${example.divisor} skupín po ${example.quotient}`,
                },
                {
                    title: 'Bez zvyšku',
                    speechText: `Neostal žiadny bod navyše, preto je ${example.number} deliteľné číslom ${example.divisor}.`,
                    expression: `${example.number} : ${example.divisor} = ${example.quotient}`,
                    groups,
                    groupLabels: Array.from({ length: example.divisor }, () => String(example.quotient)),
                    resultText: 'odpoveď: Áno',
                    note: `Kontrola: ${example.divisor} × ${example.quotient} = ${example.number}.`,
                },
            ]);
            }
        case 'grade5_multiples_divisors_intro':
            {
                const example = pick([{ base: 6, count: 4 }, { base: 8, count: 3 }, { base: 7, count: 5 }]);
                const product = example.base * example.count;
                const groups = Array.from({ length: example.count }, () => range(example.base));
                return buildArithmeticTutorial(audience, 'Násobky a delitele', `${example.count}. násobok čísla ${example.base}`, [
                {
                    title: 'Rad násobkov',
                    speechText: `Násobky čísla ${example.base} vznikajú tak, že stále pridávame ${example.base}.`,
                    expression: `${example.base}, ${example.base * 2}, ${example.base * 3}, ${product}`,
                    groups: Array.from({ length: example.count }, () => range(example.base)),
                    groupLabels: Array.from({ length: example.count }, (_, index) => `${example.base * (index + 1)}`),
                    note: `Každý ďalší násobok je o ${example.base} väčší.`,
                },
                {
                    title: `${example.count}. násobok`,
                    speechText: `${example.count}. násobok čísla ${example.base} znamená ${example.count} rovnakých skupín po ${example.base}.`,
                    expression: `${example.count} × ${example.base} = ${product}`,
                    groups,
                    groupLabels: Array.from({ length: example.count }, () => String(example.base)),
                    activeGroupIndex: example.count - 1,
                    resultText: `${example.count}. násobok je ${product}`,
                },
                {
                    title: 'Deliteľ',
                    speechText: `Číslo ${example.base} je deliteľ čísla ${product}, lebo ${product} vieme presne rozdeliť na skupiny po ${example.base}.`,
                    expression: `${product} : ${example.base} = ${example.count}`,
                    groups,
                    groupLabels: Array.from({ length: example.count }, () => String(example.base)),
                    resultText: `${example.base} delí ${product}`,
                    note: `Kontrola: ${example.count} × ${example.base} = ${product}.`,
                },
            ]);
            }
        case 'grade4_indian_division_intro': {
            const tutorialProblem = generateProblem({
                ...constraints,
                schoolTopics: ['indian_division'],
                allowedOperations: ['/'],
            });
            return buildIndianDivisionTutorial(tutorialProblem, audience);
        }
        case 'grade4_long_division_intro': {
            const tutorialProblem = generateProblem({
                ...constraints,
                schoolTopics: ['long_division'],
                allowedOperations: ['/'],
            });
            return buildLongDivisionTutorial(tutorialProblem, audience);
        }
    }
};
