import type { ErrorDiagnosisCode, Problem, ProblemMetadata } from './types';
import { getProblemMetadata } from './problemMetadata';
import { normalizeRomanAnswer, romanToArabic } from './romanNumerals';

export interface HintStrategy {
    id: string;
    title: string;
    text: string;
}

export interface ProblemExplanation {
    topic: string;
    hint: string;
    hints?: HintStrategy[];
    steps: string[];
    recommendation: string;
}

export interface AnswerDiagnosis {
    code: ErrorDiagnosisCode;
    title: string;
    message: string;
}

const formatExpression = (expression: string) => expression.replace(/\*/g, '×').replace(/\//g, '÷');

export const toNumericAnswer = (answer: number | string) => {
    if (typeof answer === 'number') return Number.isNaN(answer) ? null : answer;
    const normalized = answer.trim().toLowerCase();
    if (normalized === 'áno' || normalized === 'ano' || normalized === 'prvý' || normalized === 'prvy') return 1;
    if (normalized === 'nie' || normalized === 'druhý' || normalized === 'druhy') return 0;
    if (!/^-?(?:\d+|\d+[,.]\d+)$/.test(normalized)) return null;
    const parsed = Number(normalized.replace(',', '.'));
    return Number.isNaN(parsed) ? null : parsed;
};

export const isAnswerCorrect = (problem: Problem, userAnswer: number | string): boolean => {
    const metadata = getProblemMetadata(problem);
    if (metadata?.type === 'arabic_to_roman') {
        return typeof userAnswer === 'string' && normalizeRomanAnswer(userAnswer) === metadata.roman;
    }

    if (metadata?.type === 'roman_to_arabic' && typeof userAnswer === 'string') {
        const parsedRoman = romanToArabic(userAnswer);
        if (parsedRoman !== null) return parsedRoman === metadata.value;
    }

    const answer = toNumericAnswer(userAnswer);
    if (answer === null) return false;

    if (metadata?.type === 'divisor_request') {
        return Number.isInteger(answer) && answer > 1 && metadata.number % answer === 0;
    }

    return Math.abs(answer - problem.result) < 0.001;
};

// === Hint text builders (legacy fallbacks; primary path uses HintStrategy[]) ===

const additionHint = (left: number, right: number) => {
    if ((left % 10) + (right % 10) >= 10) {
        const toTen = 10 - (left % 10);
        if (toTen > 0 && toTen < right) {
            return `Skús doplniť ${left} najprv do najbližšej desiatky. Z ${right} použi ${toTen} a zvyšok dopočítaj potom.`;
        }
    }
    return `Spočítaj najprv jednotky a potom skontroluj, či výsledok nie je väčší ako ${left + right}.`;
};

const subtractionHint = (left: number, right: number) => {
    if ((left % 10) < (right % 10)) {
        const toTen = left % 10;
        const rest = right - toTen;
        if (toTen > 0 && rest > 0) {
            return `Skús odčítať po častiach: najprv ${toTen}, aby si sa dostal na desiatku, potom ešte ${rest}.`;
        }
    }
    return `Predstav si ${left} predmetov a odober ${right}. Výsledok musí byť menší alebo rovnaký ako ${left}.`;
};

const buildAdditionSteps = (left: number, right: number) => {
    const result = left + right;
    const toTen = 10 - (left % 10);

    if ((left % 10) + (right % 10) >= 10 && toTen > 0 && toTen < right) {
        const rest = right - toTen;
        return [
            `${left} + ${right}`,
            `${left} + ${toTen} = ${left + toTen}`,
            `${left + toTen} + ${rest} = ${result}`,
            `Výsledok je ${result}.`,
        ];
    }

    return [
        `${left} + ${right}`,
        `Spočítame spolu ${left} a ${right}.`,
        `Výsledok je ${result}.`,
    ];
};

const buildSubtractionSteps = (left: number, right: number) => {
    const result = left - right;
    const toTen = left % 10;

    if ((left % 10) < (right % 10) && toTen > 0 && right > toTen) {
        const rest = right - toTen;
        return [
            `${left} - ${right}`,
            `${left} - ${toTen} = ${left - toTen}`,
            `${left - toTen} - ${rest} = ${result}`,
            `Výsledok je ${result}.`,
        ];
    }

    return [
        `${left} - ${right}`,
        `Od ${left} odoberieme ${right}.`,
        `Výsledok je ${result}.`,
    ];
};

// === Strategy generators (multi-hint flow) ===

const additionStrategies = (left: number, right: number): HintStrategy[] => {
    const strategies: HintStrategy[] = [];
    const crosses = (left % 10) + (right % 10) >= 10;

    if (crosses) {
        const toTen = 10 - (left % 10);
        if (toTen > 0 && toTen < right) {
            const rest = right - toTen;
            strategies.push({
                id: 'cross_decompose_right',
                title: 'Cez desiatku',
                text: `Rozdeľ ${right} na ${toTen} a ${rest}. Najprv ${left} + ${toTen} = ${left + toTen}, potom pripočítaj ${rest}.`,
            });
        }
        if (Math.abs(left - right) <= 2 && Math.min(left, right) >= 3) {
            const smaller = Math.min(left, right);
            const diff = Math.abs(left - right);
            if (diff === 0) {
                strategies.push({
                    id: 'double',
                    title: 'Cez dvojicu',
                    text: `${smaller} + ${smaller} si môžeš zapamätať ako dvojicu: ${smaller * 2}.`,
                });
            } else {
                strategies.push({
                    id: 'near_double',
                    title: 'Cez dvojicu',
                    text: `Spomeň si na ${smaller} + ${smaller} = ${smaller * 2}. Potom pripočítaj ${diff}.`,
                });
            }
        }
        if (left < right) {
            strategies.push({
                id: 'commute',
                title: 'Vymeň poradie',
                text: `${left} + ${right} sa rovná ${right} + ${left}. Skús počítať od väčšieho čísla — niekedy je to ľahšie.`,
            });
        }
    } else {
        strategies.push({
            id: 'simple_add',
            title: 'Po jednotkách',
            text: 'Spočítaj jednotky a desiatky zvlášť. Potom si výsledok skontroluj odhadom.',
        });
    }

    return strategies;
};

const subtractionStrategies = (left: number, right: number): HintStrategy[] => {
    const strategies: HintStrategy[] = [];
    const crosses = (left % 10) < (right % 10);

    if (crosses) {
        const toTen = left % 10;
        const rest = right - toTen;
        if (toTen > 0 && rest > 0) {
            strategies.push({
                id: 'cross_decompose_left',
                title: 'Cez desiatku',
                text: `Rozdeľ ${right} na ${toTen} a ${rest}. Najprv odober ${toTen} (zostane ${left - toTen}), potom odober ešte ${rest}.`,
            });
        }
        strategies.push({
            id: 'count_up',
            title: 'Doplnenie zhora',
            text: `Namiesto odčítania si polož otázku: ${right} + ? = ${left}. Koľko treba pripočítať k ${right}, aby si dostal ${left}?`,
        });
        const k = 10 - (right % 10);
        if (k > 0 && k < 10 && (right + k) <= left + k) {
            strategies.push({
                id: 'equal_addition',
                title: 'Rovnaké pridanie',
                text: `Pridaj k obom číslam ${k}: ${left} − ${right} sa rovná ${left + k} − ${right + k}. Pravá strana je teraz desiatka, odčítanie je ľahšie.`,
            });
        }
    } else {
        strategies.push({
            id: 'simple_sub',
            title: 'Po jednotkách',
            text: 'Odčítaj jednotky a desiatky zvlášť. Výsledok musí byť menší alebo rovný prvému číslu.',
        });
    }

    return strategies;
};

const multiplicationStrategies = (left: number, right: number): HintStrategy[] => {
    const strategies: HintStrategy[] = [];
    strategies.push({
        id: 'mul_table',
        title: 'Rad násobilky',
        text: `Spomeň si na rad násobilky čísla ${left} alebo ${right}.`,
    });

    const harder = Math.max(left, right);
    const easier = Math.min(left, right);
    if (harder >= 6 && harder <= 10 && easier >= 2) {
        strategies.push({
            id: 'mul_decompose_via_5',
            title: 'Rozklad cez 5',
            text: `${harder} rozdeľ na 5 + ${harder - 5}. Najprv vypočítaj ${easier} × 5, potom ${easier} × ${harder - 5} a obe časti spočítaj.`,
        });
    }
    if (left !== right) {
        strategies.push({
            id: 'mul_commute',
            title: 'Vymeň poradie',
            text: `${left} × ${right} sa rovná ${right} × ${left}. Skús si ten rad, ktorý ti ide lepšie.`,
        });
    }

    return strategies;
};

const divisionStrategies = (left: number, right: number): HintStrategy[] => {
    const strategies: HintStrategy[] = [];
    strategies.push({
        id: 'div_inverse',
        title: 'Cez násobenie',
        text: `Hľadaj číslo, ktoré po vynásobení ${right} dá ${left}. Spomeň si na rad násobilky ${right}.`,
    });
    if (left <= 50 && right >= 2) {
        strategies.push({
            id: 'div_count',
            title: 'Koľkokrát sa zmestí',
            text: `Pýtaj sa: koľkokrát sa ${right} zmestí do ${left}? Postupne odčítavaj ${right}, kým sa dostaneš na 0.`,
        });
    }
    return strategies;
};

// === explainProblem ===

const explainStandardWordProblem = (problem: Problem): ProblemExplanation => ({
    topic: 'slovna uloha',
    hint: 'Najprv si povedz, čo v úlohe pribúda, ubúda, opakuje sa alebo sa delí na rovnaké časti.',
    steps: problem.steps.length ? [...problem.steps, `Odpoveď je ${problem.result}.`] : [`Odpoveď je ${problem.result}.`],
    recommendation: 'Precvič premenu textu na príklad a podčiarkovanie dôležitých čísel.',
});

const explainByMetadata = (problem: Problem, metadata: ProblemMetadata): ProblemExplanation => {
    switch (metadata.type) {
        case 'addition': {
            const { left, right } = metadata;
            const hints = additionStrategies(left, right);
            return {
                topic: (left % 10) + (right % 10) >= 10 ? 'scitanie s prechodom cez desiatku' : 'scitanie',
                hint: hints[0]?.text ?? additionHint(left, right),
                hints,
                steps: buildAdditionSteps(left, right),
                recommendation: 'Precvič sčítanie a kontrolu výsledku odhadom.',
            };
        }
        case 'subtraction': {
            const { left, right } = metadata;
            const hints = subtractionStrategies(left, right);
            return {
                topic: (left % 10) < (right % 10) ? 'odcitanie s prechodom cez desiatku' : 'odcitanie',
                hint: hints[0]?.text ?? subtractionHint(left, right),
                hints,
                steps: buildSubtractionSteps(left, right),
                recommendation: 'Precvič odčítanie po častiach.',
            };
        }
        case 'multiplication': {
            const { left, right } = metadata;
            const hints = multiplicationStrategies(left, right);
            return {
                topic: 'nasobenie',
                hint: hints[0]?.text ?? `Násobenie znamená ${right}-krát zobrať číslo ${left}.`,
                hints,
                steps: [
                    `${left} × ${right}`,
                    `${left} zoberieme ${right}-krát.`,
                    `${left} × ${right} = ${left * right}`,
                ],
                recommendation: 'Precvič konkrétnu násobilku a kontrolu delením.',
            };
        }
        case 'division': {
            const { dividend, divisor } = metadata;
            const hints = divisionStrategies(dividend, divisor);
            return {
                topic: 'delenie',
                hint: hints[0]?.text ?? `Hľadaj číslo, ktoré po vynásobení ${divisor} dá ${dividend}.`,
                hints,
                steps: [
                    `${dividend} : ${divisor}`,
                    `Pýtame sa: koľkokrát sa ${divisor} zmestí do ${dividend}?`,
                    `${dividend} : ${divisor} = ${dividend / divisor}`,
                ],
                recommendation: 'Precvič delenie ako opačnú operáciu k násobeniu.',
            };
        }
        case 'missing_addition': {
            const { known, total } = metadata;
            return {
                topic: 'doplnovacka pri scitani',
                hint: `Hľadáme číslo, ktoré doplní ${known} do ${total}. Môžeš počítať ${total} − ${known}.`,
                steps: [
                    `${known} + ? = ${total}`,
                    `Chýbajúce číslo nájdeme opačnou operáciou: ${total} − ${known}.`,
                    `${total} − ${known} = ${total - known}`,
                    `Chýba ${total - known}.`,
                ],
                recommendation: 'Precvič dopĺňanie do výsledku a vzťah medzi sčítaním a odčítaním.',
            };
        }
        case 'missing_subtraction': {
            if (metadata.variant === 'minuend') {
                const { known: subtrahend, result } = metadata;
                return {
                    topic: 'doplnovacka pri odcitani',
                    hint: `Hľadáme pôvodné číslo. Keď po odčítaní ${subtrahend} zostane ${result}, pôvodné číslo získaš sčítaním.`,
                    steps: [
                        `? − ${subtrahend} = ${result}`,
                        `Pôvodné číslo je ${result} + ${subtrahend}.`,
                        `${result} + ${subtrahend} = ${result + subtrahend}`,
                        `Chýba ${result + subtrahend}.`,
                    ],
                    recommendation: 'Precvič vzťah medzi odčítaním a kontrolou sčítaním.',
                };
            }
            const { known: left, result } = metadata;
            return {
                topic: 'doplnovacka pri odcitani',
                hint: `Hľadáme, koľko treba odobrať z ${left}, aby zostalo ${result}. Počítaj ${left} − ${result}.`,
                steps: [
                    `${left} − ? = ${result}`,
                    `Chýbajúce číslo je rozdiel medzi ${left} a ${result}.`,
                    `${left} − ${result} = ${left - result}`,
                    `Chýba ${left - result}.`,
                ],
                recommendation: 'Precvič odčítanie ako hľadanie rozdielu.',
            };
        }
        case 'missing_multiplication': {
            const { known, total, hideLeft } = metadata;
            const leftDisplay = hideLeft ? '?' : known;
            const rightDisplay = hideLeft ? known : '?';
            return {
                topic: 'doplnovacka pri nasobeni',
                hint: `Hľadáme činiteľ. Použi opačnú operáciu: ${total} : ${known}.`,
                steps: [
                    `${leftDisplay} × ${rightDisplay} = ${total}`,
                    `${total} : ${known} = ${total / known}`,
                    `Chýba ${total / known}.`,
                ],
                recommendation: 'Precvič násobilku spolu s delením ako opačnou operáciou.',
            };
        }
        case 'missing_division': {
            if (metadata.variant === 'dividend') {
                const { known: divisor, quotient } = metadata;
                return {
                    topic: 'doplnovacka pri deleni',
                    hint: `Hľadáme delenec. Použi násobenie: ${quotient} × ${divisor}.`,
                    steps: [
                        `? : ${divisor} = ${quotient}`,
                        `${quotient} × ${divisor} = ${quotient * divisor}`,
                        `Chýba ${quotient * divisor}.`,
                    ],
                    recommendation: 'Precvič kontrolu delenia násobením.',
                };
            }
            const { known: dividend, quotient } = metadata;
            return {
                topic: 'doplnovacka pri deleni',
                hint: `Hľadáme deliteľ. Použi delenie ${dividend} : ${quotient}.`,
                steps: [
                    `${dividend} : ? = ${quotient}`,
                    `${dividend} : ${quotient} = ${dividend / quotient}`,
                    `Chýba ${dividend / quotient}.`,
                ],
                recommendation: 'Precvič vzťah delenec, deliteľ a podiel.',
            };
        }
        case 'order_operations': {
            return {
                topic: 'poradie operacii',
                hint: `Rozdeľ príklad ${formatExpression(problem.expression)} na menšie kroky a dodrž poradie operácií.`,
                steps: [`${formatExpression(problem.expression)} = ${problem.result}`],
                recommendation: 'Precvič poradie operácií a zápis medzikrokov.',
            };
        }
        case 'divisibility': {
            const { number, divisor } = metadata;
            const divisible = number % divisor === 0;
            return {
                topic: 'delitelnost',
                hint: `Hľadaj, či je ${number} násobkom čísla ${divisor}. Odpovedz 1 pre áno alebo 0 pre nie.`,
                steps: [
                    `${number} : ${divisor}`,
                    divisible
                        ? `${number} je násobok čísla ${divisor}.`
                        : `${number} nie je násobok čísla ${divisor}.`,
                    `Správna odpoveď je ${divisible ? 1 : 0}.`,
                ],
                recommendation: 'Precvič násobky a kontrolu deliteľnosti delením alebo násobením.',
            };
        }
        case 'multiple_request': {
            const { order, base } = metadata;
            return {
                topic: 'nasobky a delitele',
                hint: `Násobok nájdeš násobením: ${base} × ${order}.`,
                steps: [`${base} × ${order} = ${base * order}`, `Správna odpoveď je ${base * order}.`],
                recommendation: 'Precvič násobky ako výsledky násobenia.',
            };
        }
        case 'divisor_request': {
            const { number } = metadata;
            return {
                topic: 'nasobky a delitele',
                hint: `Deliteľ je číslo, ktorým vieme ${number} vydeliť bezo zvyšku.`,
                steps: problem.steps.length ? problem.steps : [`Hľadaj číslo, ktoré delí ${number} bezo zvyšku.`],
                recommendation: 'Precvič vzťah medzi násobkom a deliteľom.',
            };
        }
        case 'fraction_numerator': {
            const { denominator, numerator } = metadata;
            return {
                topic: 'uvod do zlomkov',
                hint: 'Čitateľ je počet vyfarbených častí. Menovateľ je počet všetkých častí.',
                steps: [
                    `Všetky časti: ${denominator}`,
                    `Vyfarbené časti: ${numerator}`,
                    `Čitateľ je ${numerator}.`,
                ],
                recommendation: 'Precvič rozlišovanie čitateľa a menovateľa.',
            };
        }
        case 'fraction_denominator': {
            const { denominator } = metadata;
            return {
                topic: 'uvod do zlomkov',
                hint: 'Menovateľ hovorí, na koľko rovnakých častí je rozdelený celok.',
                steps: [
                    `Celok je rozdelený na ${denominator} rovnakých častí.`,
                    `Menovateľ je ${denominator}.`,
                ],
                recommendation: 'Precvič rozlišovanie čitateľa a menovateľa.',
            };
        }
        case 'fraction_name': {
            const { label } = metadata;
            const denominator = label === 'polovica' ? 2 : label === 'tretina' ? 3 : 4;
            return {
                topic: 'uvod do zlomkov',
                hint: `${label} pomenúva, na koľko rovnakých častí delíme celok.`,
                steps: [
                    `${label} znamená ${denominator} rovnaké časti.`,
                    `Menovateľ je ${denominator}.`,
                ],
                recommendation: 'Precvič pomenovania polovica, tretina a štvrtina.',
            };
        }
        case 'fraction_compare': {
            const { leftNum, leftDen, rightNum } = metadata;
            const result = leftNum > rightNum ? 1 : 0;
            return {
                topic: 'porovnavanie zlomkov',
                hint: `Menovateľ je rovnaký (${leftDen}), preto porovnaj čitateľov ${leftNum} a ${rightNum}.`,
                steps: [
                    `${leftNum}/${leftDen} a ${rightNum}/${leftDen} majú rovnaký menovateľ.`,
                    `Väčší čitateľ znamená väčší zlomok.`,
                    result === 1 ? 'Väčší je prvý zlomok.' : 'Väčší je druhý zlomok.',
                ],
                recommendation: 'Precvič porovnávanie zlomkov s rovnakým menovateľom.',
            };
        }
        case 'number_comparison': {
            const { variant, left, right } = metadata;
            const rel = left > right ? '>' : '<';
            const isLargerVariant = variant === 'larger';
            const winner = isLargerVariant ? Math.max(left, right) : Math.min(left, right);
            return {
                topic: 'porovnavanie cisel',
                hint: isLargerVariant
                    ? `Hľadáme väčšie číslo. Predstav si obe na číselnej osi alebo porovnaj cifry zľava.`
                    : `Hľadáme menšie číslo. Predstav si obe na číselnej osi alebo porovnaj cifry zľava.`,
                steps: [
                    `${left} ${rel} ${right}`,
                    `${isLargerVariant ? 'Väčšie' : 'Menšie'} je ${winner}.`,
                ],
                recommendation: 'Precvič porovnávanie čísel cez číselnú os a porovnávanie cifier zľava.',
            };
        }
        case 'rounding': {
            const { value, place } = metadata;
            const lower = Math.floor(value / place) * place;
            const upper = lower + place;
            const rounded = (value - lower) >= place / 2 ? upper : lower;
            return {
                topic: 'zaokruhlovanie',
                hint: `Pozri sa, ku ktorej ${place === 100 ? 'stovke' : 'desiatke'} je ${value} bližšie. Ak je rozdiel rovnaký, zaokrúhli nahor.`,
                steps: [
                    `Najbližšie ${place === 100 ? 'stovky' : 'desiatky'}: ${lower} a ${upper}.`,
                    `Rozdiel od ${lower} je ${value - lower}, od ${upper} je ${upper - value}.`,
                    `Bližšia hodnota je ${rounded}.`,
                ],
                recommendation: 'Precvič zaokrúhľovanie pomocou číselnej osi.',
            };
        }
        case 'unit_conversion': {
            const { from, to, value, result } = metadata;
            const factorMap: Record<string, number> = {
                'm->cm': 100,
                'm->dm': 10,
                'dm->cm': 10,
                'km->m': 1000,
                'kg->g': 1000,
                'l->ml': 1000,
                'l->dl': 10,
                'dl->ml': 100,
                'h->min': 60,
                'eur->cent': 100,
                'cm->m': 100,
                'dm->m': 10,
                'cm->dm': 10,
                'm->km': 1000,
                'g->kg': 1000,
                'ml->l': 1000,
                'dl->l': 10,
                'ml->dl': 100,
                'min->h': 60,
            };
            const key = `${from}->${to}`;
            const factor = factorMap[key] ?? 1;
            const isMultiply = ['m->cm', 'm->dm', 'dm->cm', 'km->m', 'kg->g', 'l->ml', 'l->dl', 'dl->ml', 'h->min', 'eur->cent'].includes(key);
            return {
                topic: 'jednotky',
                hint: isMultiply
                    ? `1 ${from} sa rovná ${factor} ${to}. Vypočítaj ${value} × ${factor}.`
                    : `${factor} ${from} sa rovná 1 ${to}. Vypočítaj ${value} : ${factor}.`,
                steps: isMultiply
                    ? [`1 ${from} = ${factor} ${to}`, `${value} × ${factor} = ${result}`]
                    : [`${factor} ${from} = 1 ${to}`, `${value} : ${factor} = ${result}`],
                recommendation: 'Precvič si vzťahy medzi jednotkami: 1 m = 10 dm = 100 cm, 1 km = 1000 m, 1 kg = 1000 g, 1 l = 10 dl = 1000 ml.',
            };
        }
        case 'unit_conversion_sum': {
            const { terms, to, result } = metadata;
            return {
                topic: 'jednotky',
                hint: `Premeň každú časť na ${to} a potom ich sčítaj.`,
                steps: [
                    ...terms.map(term => `${term.value} ${term.unit} premeň na ${to}`),
                    `Sčítaj všetky premenené hodnoty: ${result} ${to}.`,
                ],
                recommendation: 'Precvič skladané prevody tak, že najprv všetko prepíšeš do jednej jednotky a až potom sčítaš.',
            };
        }
        case 'roman_to_arabic': {
            const { roman, value } = metadata;
            return {
                topic: 'rimske cislice',
                hint: `Rozlož ${roman} zľava doprava. Väčšie značky sa sčítavajú, dvojice ako IV alebo IX znamenajú odčítanie.`,
                steps: [`${roman} = ${value}`],
                recommendation: 'Precvič hodnoty I, V, X, L, C a pravidlo odčítania pri IV, IX, XL, XC.',
            };
        }
        case 'arabic_to_roman': {
            const { value, roman } = metadata;
            return {
                topic: 'rimske cislice',
                hint: `Rozlož ${value} na desiatky, päťky a jednotky. Potom ich zapíš rímskymi značkami.`,
                steps: [`${value} = ${roman}`],
                recommendation: 'Precvič prevod arabských čísel na rímske po častiach.',
            };
        }
        case 'indian_division': {
            const indian = problem.indianDivision;
            if (!indian) break;
            return {
                topic: 'indicke delenie',
                hint: `V aktuálnom kroku deľ iba vyznačenú časť delenca číslom ${indian.divisor}. Zapíš jednu číslicu výsledku a zvyšok.`,
                steps: [
                    `${indian.dividend} : ${indian.divisor}`,
                    ...indian.steps.map(step => `${step.partialDividend} : ${indian.divisor} = ${step.quotientDigit}, zvyšok ${step.remainder}`),
                    `Celý výsledok je ${indian.quotient}, zvyšok ${indian.remainder}.`,
                ],
                recommendation: 'Precvič delenie po krokoch a zápis zvyšku pri každej číslici.',
            };
        }
        case 'long_division': {
            const long = problem.longDivision;
            if (!long) break;
            return {
                topic: 'klasicke delenie',
                hint: `V aktuálnom kroku deľ ${long.steps[0]?.partialDividend ?? ''} : ${long.divisor}. Zapíš cifru pod čiaru, mínus súčin a znesieme ďalšiu cifru.`,
                steps: [
                    `${long.dividend} : ${long.divisor}`,
                    ...long.steps.map(step => `${step.partialDividend} : ${long.divisor} = ${step.quotientDigit}, mínus ${step.quotientDigit * long.divisor}, zvyšok ${step.remainder}`),
                    `Celý výsledok je ${long.quotient}${long.remainder ? `, zvyšok ${long.remainder}` : ''}.`,
                ],
                recommendation: 'Precvič si zápis pod čiarou: cifra do podielu, mínus súčin, znesenie ďalšej cifry.',
            };
        }
        case 'word_problem':
            return explainStandardWordProblem(problem);
    }

    return {
        topic: problem.expression.includes('(') || /[*/].*[+-]|[+-].*[*/]/.test(problem.expression) ? 'poradie operacii' : 'zmiesany priklad',
        hint: `Rozdeľ príklad ${formatExpression(problem.expression)} na menšie kroky a dodrž poradie operácií.`,
        steps: [`${formatExpression(problem.expression)} = ${problem.result}`],
        recommendation: 'Precvič poradie operácií a zápis medzikrokov.',
    };
};

export const explainProblem = (problem: Problem): ProblemExplanation => {
    if (problem.kind === 'word_problem') return explainStandardWordProblem(problem);

    const metadata = getProblemMetadata(problem);
    if (metadata) return explainByMetadata(problem, metadata);

    return {
        topic: problem.expression.includes('(') || /[*/].*[+-]|[+-].*[*/]/.test(problem.expression) ? 'poradie operacii' : 'zmiesany priklad',
        hint: `Rozdeľ príklad ${formatExpression(problem.expression)} na menšie kroky a dodrž poradie operácií.`,
        steps: [`${formatExpression(problem.expression)} = ${problem.result}`],
        recommendation: 'Precvič poradie operácií a zápis medzikrokov.',
    };
};

export const getProblemTopic = (problem: Problem) => explainProblem(problem).topic;

const TOPIC_LABELS: Record<string, string> = {
    'scitanie': 'sčítanie',
    'scitanie s prechodom cez desiatku': 'sčítanie s prechodom cez desiatku',
    'odcitanie': 'odčítanie',
    'odcitanie s prechodom cez desiatku': 'odčítanie s prechodom cez desiatku',
    'nasobenie': 'násobenie',
    'delenie': 'delenie',
    'indicke delenie': 'indické delenie',
    'klasicke delenie': 'klasické písomné delenie',
    'doplnovacka pri scitani': 'doplňovačka pri sčítaní',
    'doplnovacka pri odcitani': 'doplňovačka pri odčítaní',
    'doplnovacka pri nasobeni': 'doplňovačka pri násobení',
    'doplnovacka pri deleni': 'doplňovačka pri delení',
    'slovna uloha': 'slovná úloha',
    'poradie operacii': 'poradie operácií',
    'zmiesany priklad': 'zmiešaný príklad',
    'delitelnost': 'deliteľnosť',
    'nasobky a delitele': 'násobky a delitele',
    'uvod do zlomkov': 'úvod do zlomkov',
    'porovnavanie zlomkov': 'porovnávanie zlomkov',
    'porovnavanie cisel': 'porovnávanie čísel',
    'zaokruhlovanie': 'zaokrúhľovanie',
    'jednotky': 'premena jednotiek',
    'rimske cislice': 'rímske číslice',
};

export const getTopicLabel = (topic: string): string => {
    if (TOPIC_LABELS[topic]) return TOPIC_LABELS[topic];
    const multiplicationTable = topic.match(/^nasobilka (\d+)$/);
    if (multiplicationTable) return `násobilka ${multiplicationTable[1]}`;
    return topic;
};

// === diagnoseAnswer ===

const parseStep = (step?: string) => {
    const normalized = step?.replace(/\s+/g, '');
    const match = normalized?.match(/^(\d+)([+\-*/])(\d+)=(\d+)$/);
    if (!match) return null;
    return {
        left: Number(match[1]),
        op: match[2],
        right: Number(match[3]),
        result: Number(match[4]),
    };
};

const diagnoseWordProblemAnswer = (problem: Problem, userAnswer: number | string) => {
    if (typeof userAnswer !== 'number' || Number.isNaN(userAnswer)) {
        return 'Skús si ešte raz prečítať zadanie a zapíš výsledok ako číslo. Verím, že tie správne čísla tam nájdeš!';
    }

    if (problem.steps.length >= 2) {
        const firstStep = parseStep(problem.steps[0]);
        if (firstStep && Math.abs(firstStep.result - userAnswer) < 0.001) {
            return `Toto je medzivýsledok prvého kroku (${firstStep.result}). Výborne, že ho máš! Úloha má však ešte druhý krok — pokračuj a vypočítaj celkový výsledok.`;
        }
        const lastStep = parseStep(problem.steps[problem.steps.length - 1]);
        if (lastStep && Math.abs(lastStep.left - userAnswer) < 0.001) {
            return 'Vyzerá to, že si zostal pri jednom z čísel z úlohy a neurobil si druhý krok výpočtu. Skús to ešte raz.';
        }
        return 'Slovná úloha má dva kroky. Najprv vypočítaj medzivýsledok a potom z neho dopočítaj odpoveď. Skús na to prísť!';
    }

    const firstStep = parseStep(problem.steps[0]);
    if (!firstStep) return 'Skús sa zamyslieť, či sa v príbehu veci spájajú, uberajú alebo opakujú. To ti napovie správnu operáciu.';

    const { left, op, right } = firstStep;
    const alternates = [
        { op: '+', value: left + right, label: 'sčítanie' },
        { op: '-', value: left - right, label: 'odčítanie' },
        { op: '*', value: left * right, label: 'násobenie' },
        ...(right !== 0 ? [{ op: '/', value: left / right, label: 'delenie' }] : []),
    ].filter(item => item.op !== op);

    const usedAlternate = alternates.find(item => Math.abs(item.value - userAnswer) < 0.001);
    if (usedAlternate) {
        return `Dobrý pokus, ale použil si ${usedAlternate.label}. Prečítaj si ešte raz, či sa v texte niečo pridáva alebo naopak stráca.`;
    }

    return 'Skús si v texte podčiarknuť dôležité čísla. Niekedy sú tam aj také, ktoré na výpočet nepotrebuješ. Skús to ešte raz!';
};

const diagnoseStandardArithmetic = (
    op: '+' | '-' | '*' | '/',
    left: number,
    right: number,
    expectedResult: number,
    userAnswer: number,
): string => {
    const difference = Math.abs(userAnswer - expectedResult);
    const alternateResults = [
        { op: '+', value: left + right },
        { op: '-', value: left - right },
        { op: '*', value: left * right },
        ...(right !== 0 ? [{ op: '/', value: left / right }] : []),
    ].filter(item => item.op !== op);

    const matchingAlternate = alternateResults.find(item => Math.abs(item.value - userAnswer) < 0.001);
    if (matchingAlternate) {
        return `Vyzerá to, že si použil inú operáciu (${matchingAlternate.op}) namiesto správnej.`;
    }

    if ((op === '+' || op === '-') && difference === 1) {
        return 'Výsledok je veľmi blízko. Pravdepodobne ide o chybu o 1 pri počítaní jednotiek.';
    }

    if (op === '+' && (left % 10) + (right % 10) >= 10) {
        return 'Pravdepodobná chyba pri prechode cez desiatku.';
    }

    if (op === '-' && (left % 10) < (right % 10)) {
        return 'Pravdepodobná chyba pri odčítaní cez desiatku.';
    }

    if (op === '*' && userAnswer % left === 0 && userAnswer !== expectedResult) {
        return `Vyzerá to na chybu v násobilke ${left} alebo ${right}.`;
    }

    if (op === '/' && userAnswer * right !== left) {
        return 'Skontroluj delenie pomocou násobenia.';
    }

    return difference <= 2
        ? 'Výsledok je blízko, skontroluj posledný krok.'
        : 'Skontroluj zvolenú operáciu a zápis medzikrokov.';
};

export const diagnoseAnswer = (problem: Problem, userAnswer: number | string): string => {
    if (problem.kind === 'indian_division' || problem.kind === 'long_division') {
        return 'Skontroluj číslicu podielu aj zvyšok v aktuálnom kroku delenia.';
    }
    if (problem.kind === 'word_problem') {
        return diagnoseWordProblemAnswer(problem, userAnswer);
    }

    const numericAnswer = toNumericAnswer(userAnswer);
    const metadata = getProblemMetadata(problem);

    if (metadata) {
        switch (metadata.type) {
            case 'divisibility': {
                const { number, divisor } = metadata;
                const divisible = number % divisor === 0;
                if (numericAnswer !== null && numericAnswer !== 0 && numericAnswer !== 1) {
                    return 'Tu nehľadáme výsledok delenia, ale odpoveď áno/nie. Zadaj 1 pre áno alebo 0 pre nie.';
                }
                if (divisible) {
                    return `${number} je deliteľné číslom ${divisor}, lebo ${divisor} × ${number / divisor} = ${number}. Správna odpoveď je 1.`;
                }
                const lowerMultiple = Math.floor(number / divisor) * divisor;
                const upperMultiple = lowerMultiple + divisor;
                return `${number} nie je deliteľné číslom ${divisor}. Najbližšie násobky sú ${lowerMultiple} a ${upperMultiple}, preto správna odpoveď je 0.`;
            }
            case 'multiple_request': {
                const { order, base } = metadata;
                if (numericAnswer === base + order) {
                    return `Vyzerá to, že si čísla sčítal. ${order}. násobok čísla ${base} počítame ${base} × ${order}.`;
                }
                if (numericAnswer !== null && numericAnswer % base === 0) {
                    return `Toto je ${numericAnswer / base}. násobok čísla ${base}, ale úloha pýta ${order}. násobok.`;
                }
                return `${order}. násobok čísla ${base} nájdeš ako ${base} × ${order}.`;
            }
            case 'divisor_request': {
                const { number } = metadata;
                if (numericAnswer === 1) {
                    return 'Číslo 1 síce delí každé číslo, ale úloha pýta deliteľa väčšieho ako 1.';
                }
                if (numericAnswer === number) {
                    return `${number} je deliteľ čísla ${number}, ale skús nájsť menší deliteľ pomocou násobilky.`;
                }
                if (numericAnswer !== null && Number.isInteger(numericAnswer)) {
                    const remainder = number % numericAnswer;
                    return remainder === 0
                        ? `${numericAnswer} je správny deliteľ čísla ${number}.`
                        : `${numericAnswer} nie je deliteľ čísla ${number}, lebo po delení zostane zvyšok ${remainder}.`;
                }
                return 'Deliteľ musí byť celé číslo väčšie ako 1, ktorým sa dá deliť bezo zvyšku.';
            }
            case 'fraction_numerator': {
                const { denominator, numerator } = metadata;
                if (numericAnswer === denominator) {
                    return 'Zadal si menovateľ. Čitateľ je počet vyfarbených častí.';
                }
                if (numericAnswer !== null) {
                    return `Vyfarbených je ${numerator} z ${denominator} častí, preto čitateľ je ${numerator}.`;
                }
                return 'Pri zlomku najprv rozlíš čitateľ hore a menovateľ dole.';
            }
            case 'fraction_denominator': {
                const { denominator } = metadata;
                if (numericAnswer !== denominator) {
                    return `Menovateľ je počet všetkých rovnakých častí celku. Tu je to ${denominator}.`;
                }
                return 'Pri zlomku najprv rozlíš čitateľ hore a menovateľ dole.';
            }
            case 'fraction_name': {
                const { label } = metadata;
                const denominator = label === 'polovica' ? 2 : label === 'tretina' ? 3 : 4;
                return `${label} znamená, že celok je rozdelený na ${denominator} rovnaké časti. Menovateľ je ${denominator}.`;
            }
            case 'fraction_compare': {
                const { leftNum, leftDen, rightNum } = metadata;
                const expected = leftNum > rightNum ? 1 : 0;
                if (numericAnswer !== null && numericAnswer !== 0 && numericAnswer !== 1) {
                    return 'Tu vyberáme prvý alebo druhý zlomok. Odpovedz 1 pre prvý alebo 0 pre druhý.';
                }
                return expected === 1
                    ? `Menovateľ je rovnaký (${leftDen}), porovnávame čitateľov. ${leftNum} > ${rightNum}, preto je väčší prvý zlomok.`
                    : `Menovateľ je rovnaký (${leftDen}), porovnávame čitateľov. ${rightNum} > ${leftNum}, preto je väčší druhý zlomok.`;
            }
            case 'order_operations': {
                const { hasParentheses, a, b, c } = metadata;
                if (numericAnswer === null) return 'Odpoveď nebola čitateľné číslo.';
                const ignoredPrecedence = (a + b) * c;
                const ignoredParentheses = a + b * c;
                if (!hasParentheses && Math.abs(numericAnswer - ignoredPrecedence) < 0.001) {
                    return 'Pravdepodobne si počítal zľava doprava. Násobenie má prednosť pred sčítaním.';
                }
                if (hasParentheses && Math.abs(numericAnswer - ignoredParentheses) < 0.001) {
                    return 'Pravdepodobne si preskočil zátvorku. Najprv sa počíta to, čo je v zátvorke.';
                }
                return 'Skontroluj poradie operácií.';
            }
            case 'addition': {
                if (numericAnswer === null) return 'Odpoveď nebola čitateľné číslo.';
                return diagnoseStandardArithmetic('+', metadata.left, metadata.right, problem.result, numericAnswer);
            }
            case 'subtraction': {
                if (numericAnswer === null) return 'Odpoveď nebola čitateľné číslo.';
                return diagnoseStandardArithmetic('-', metadata.left, metadata.right, problem.result, numericAnswer);
            }
            case 'multiplication': {
                if (numericAnswer === null) return 'Odpoveď nebola čitateľné číslo.';
                return diagnoseStandardArithmetic('*', metadata.left, metadata.right, problem.result, numericAnswer);
            }
            case 'division': {
                if (numericAnswer === null) return 'Odpoveď nebola čitateľné číslo.';
                return diagnoseStandardArithmetic('/', metadata.dividend, metadata.divisor, problem.result, numericAnswer);
            }
            case 'missing_addition':
            case 'missing_subtraction':
            case 'missing_multiplication':
            case 'missing_division':
                return 'Skontroluj, či hľadáš chýbajúce číslo, nie výsledok celého príkladu.';
            case 'number_comparison': {
                const { variant, left, right } = metadata;
                if (numericAnswer !== null && numericAnswer !== 0 && numericAnswer !== 1) {
                    return 'Vyber prvé alebo druhé číslo: 1 pre prvé, 0 pre druhé.';
                }
                const rel = left > right ? '>' : '<';
                return variant === 'larger'
                    ? `${left} ${rel} ${right}, takže väčšie je ${Math.max(left, right)}.`
                    : `${left} ${rel} ${right}, takže menšie je ${Math.min(left, right)}.`;
            }
            case 'rounding': {
                const { value, place } = metadata;
                const lower = Math.floor(value / place) * place;
                const upper = lower + place;
                const correct = (value - lower) >= place / 2 ? upper : lower;
                if (numericAnswer === lower || numericAnswer === upper) {
                    return numericAnswer === correct
                        ? `${numericAnswer} je správne zaokrúhlenie.`
                        : `Zvolil si druhú stranu — ${value} je bližšie k ${correct}, nie k ${numericAnswer}.`;
                }
                return `Najbližšie hodnoty sú ${lower} a ${upper}. Bližšia je ${correct}.`;
            }
            case 'unit_conversion': {
                const { from, to, value, result } = metadata;
                const fromSmallerToLarger = (from === 'm' && (to === 'dm' || to === 'cm')) || (from === 'dm' && to === 'cm') || (from === 'km' && to === 'm') || (from === 'kg' && to === 'g') || (from === 'l' && (to === 'dl' || to === 'ml')) || (from === 'dl' && to === 'ml') || (from === 'eur' && to === 'cent');
                if (numericAnswer === value) {
                    return 'Toto je číslo zo zadania. Treba ho ešte premeniť na inú jednotku.';
                }
                return fromSmallerToLarger || (from === 'h' && to === 'min')
                    ? `Premeňuj cez násobenie: 1 ${from} = ${result / value} ${to}.`
                    : `Premeňuj cez delenie: ${value / result} ${from} = 1 ${to}.`;
            }
            case 'unit_conversion_sum':
                return `Najprv premeň každú časť na ${metadata.to}, až potom hodnoty sčítaj.`;
            case 'roman_to_arabic': {
                const { roman, value } = metadata;
                return `${roman} má hodnotu ${value}. Skontroluj značky zľava doprava.`;
            }
            case 'arabic_to_roman': {
                const { value, roman } = metadata;
                return `${value} sa rímsky zapisuje ${roman}. Skús číslo rozložiť na desiatky, päťky a jednotky.`;
            }
            case 'indian_division':
                return 'Skontroluj číslicu podielu aj zvyšok v aktuálnom kroku delenia.';
            case 'word_problem':
                return diagnoseWordProblemAnswer(problem, userAnswer);
        }
    }

    if (numericAnswer === null) {
        return 'Odpoveď nebola čitateľné číslo.';
    }

    const difference = Math.abs(numericAnswer - problem.result);
    return difference <= 2
        ? 'Výsledok je blízko, skontroluj posledný krok.'
        : 'Skontroluj zvolenú operáciu a zápis medzikrokov.';
};

const DIAGNOSIS_LABELS: Record<ErrorDiagnosisCode, string> = {
    timeout: 'časový limit',
    unreadable_answer: 'nečitateľná odpoveď',
    wrong_operation: 'zamenená operácia',
    off_by_one: 'chyba o 1',
    crossing_tens_addition: 'prechod cez desiatku pri sčítaní',
    crossing_tens_subtraction: 'prechod cez desiatku pri odčítaní',
    multiplication_table: 'násobilka',
    division_inverse: 'kontrola delenia násobením',
    step_division: 'krok písomného delenia',
    step_division_quotient: 'cifra podielu v delení',
    step_division_remainder: 'zvyšok v kroku delenia',
    step_division_both: 'cifra aj zvyšok v delení',
    word_problem_operation: 'výber operácie v slovnej úlohe',
    word_problem_multistep: 'dvojkroková slovná úloha',
    word_problem_intermediate: 'medzivýsledok slovnej úlohy',
    missing_operand: 'hľadanie chýbajúceho čísla',
    order_operations: 'poradie operácií',
    divisibility_yes_no: 'deliteľnosť áno/nie',
    multiple_order: 'poradie násobku',
    divisor_remainder: 'deliteľ a zvyšok',
    fraction_parts: 'čitateľ a menovateľ',
    number_comparison_choice: 'výber prvého alebo druhého čísla',
    rounding_direction: 'smer zaokrúhlenia',
    unit_conversion_direction: 'smer premeny jednotiek',
    near_result: 'blízky výsledok',
    unknown: 'neznámy typ chyby',
};

export const getDiagnosisLabel = (code: ErrorDiagnosisCode): string => DIAGNOSIS_LABELS[code] ?? DIAGNOSIS_LABELS.unknown;

const classifyStandardArithmetic = (
    op: '+' | '-' | '*' | '/',
    left: number,
    right: number,
    expectedResult: number,
    userAnswer: number | null,
): ErrorDiagnosisCode => {
    if (userAnswer === null) return 'unreadable_answer';

    const alternateResults = [
        { op: '+', value: left + right },
        { op: '-', value: left - right },
        { op: '*', value: left * right },
        ...(right !== 0 ? [{ op: '/', value: left / right }] : []),
    ].filter(item => item.op !== op);

    if (alternateResults.some(item => Math.abs(item.value - userAnswer) < 0.001)) return 'wrong_operation';
    if ((op === '+' || op === '-') && Math.abs(userAnswer - expectedResult) === 1) return 'off_by_one';
    if (op === '+' && (left % 10) + (right % 10) >= 10) return 'crossing_tens_addition';
    if (op === '-' && (left % 10) < (right % 10)) return 'crossing_tens_subtraction';
    if (op === '*' && userAnswer % left === 0 && userAnswer !== expectedResult) return 'multiplication_table';
    if (op === '/' && userAnswer * right !== left) return 'division_inverse';
    return Math.abs(userAnswer - expectedResult) <= 2 ? 'near_result' : 'unknown';
};

const classifyWordProblemAnswer = (problem: Problem, userAnswer: number | string): ErrorDiagnosisCode => {
    const numericAnswer = toNumericAnswer(userAnswer);
    if (numericAnswer === null) return 'unreadable_answer';
    if (problem.steps.length >= 2) return 'word_problem_multistep';

    const firstStep = parseStep(problem.steps[0]);
    if (!firstStep) return 'word_problem_operation';

    const { left, op, right } = firstStep;
    const alternates = [
        { op: '+', value: left + right },
        { op: '-', value: left - right },
        { op: '*', value: left * right },
        ...(right !== 0 ? [{ op: '/', value: left / right }] : []),
    ].filter(item => item.op !== op);

    return alternates.some(item => Math.abs(item.value - numericAnswer) < 0.001)
        ? 'wrong_operation'
        : 'word_problem_operation';
};

const classifyAnswer = (problem: Problem, userAnswer: number | string): ErrorDiagnosisCode => {
    if (typeof userAnswer === 'string' && userAnswer === 'Čas vypršal') return 'timeout';
    if (problem.kind === 'indian_division' || problem.kind === 'long_division') return 'step_division';
    if (problem.kind === 'word_problem') return classifyWordProblemAnswer(problem, userAnswer);

    const numericAnswer = toNumericAnswer(userAnswer);
    const metadata = getProblemMetadata(problem);

    if (!metadata) return numericAnswer === null ? 'unreadable_answer' : Math.abs(numericAnswer - problem.result) <= 2 ? 'near_result' : 'unknown';

    switch (metadata.type) {
        case 'addition':
            return classifyStandardArithmetic('+', metadata.left, metadata.right, problem.result, numericAnswer);
        case 'subtraction':
            return classifyStandardArithmetic('-', metadata.left, metadata.right, problem.result, numericAnswer);
        case 'multiplication':
            return classifyStandardArithmetic('*', metadata.left, metadata.right, problem.result, numericAnswer);
        case 'division':
            return classifyStandardArithmetic('/', metadata.dividend, metadata.divisor, problem.result, numericAnswer);
        case 'missing_addition':
        case 'missing_subtraction':
        case 'missing_multiplication':
        case 'missing_division':
            return 'missing_operand';
        case 'order_operations':
            return 'order_operations';
        case 'divisibility':
            return 'divisibility_yes_no';
        case 'multiple_request':
            return 'multiple_order';
        case 'divisor_request':
            return 'divisor_remainder';
        case 'fraction_numerator':
        case 'fraction_denominator':
        case 'fraction_name':
        case 'fraction_compare':
            return 'fraction_parts';
        case 'number_comparison':
            return 'number_comparison_choice';
        case 'rounding':
            return 'rounding_direction';
        case 'unit_conversion':
            return 'unit_conversion_direction';
        case 'roman_to_arabic':
        case 'arabic_to_roman':
            return 'unknown';
        case 'indian_division':
        case 'long_division':
            return 'step_division';
        case 'word_problem':
            return classifyWordProblemAnswer(problem, userAnswer);
    }

    return 'unknown';
};

export const diagnoseAnswerDetailed = (problem: Problem, userAnswer: number | string): AnswerDiagnosis => {
    const code = classifyAnswer(problem, userAnswer);
    return {
        code,
        title: getDiagnosisLabel(code),
        message: diagnoseAnswer(problem, userAnswer),
    };
};
