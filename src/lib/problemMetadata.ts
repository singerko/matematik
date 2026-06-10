import type { Problem, ProblemMetadata } from './types';

const normalizeExpression = (expression: string) => expression.replace(/\s+/g, '');

export const getProblemMetadata = (problem: Problem): ProblemMetadata | null => {
    if (problem.metadata) return problem.metadata;

    if (problem.kind === 'indian_division') return { type: 'indian_division' };
    if (problem.kind === 'long_division') return { type: 'long_division' };
    if (problem.kind === 'word_problem') return { type: 'word_problem' };
    if (problem.kind === 'large_multiplication' && problem.largeMultiplication) {
        return {
            type: 'multiplication',
            left: problem.largeMultiplication.multiplicand,
            right: problem.largeMultiplication.multiplier,
        };
    }

    const expr = normalizeExpression(problem.expression);

    // Standard binary operations
    const standard = expr.match(/^(\d+)([+\-*/])(\d+)$/);
    if (standard) {
        const left = Number(standard[1]);
        const op = standard[2];
        const right = Number(standard[3]);
        if (op === '+') return { type: 'addition', left, right };
        if (op === '-') return { type: 'subtraction', left, right };
        if (op === '*') return { type: 'multiplication', left, right };
        if (op === '/') return { type: 'division', dividend: left, divisor: right };
    }

    // Order operations: a + b * c or (a + b) * c
    const order = expr.match(/^(\(?)(\d+)\+(\d+)(\)?)\*(\d+)$/);
    if (order) {
        return {
            type: 'order_operations',
            hasParentheses: order[1] === '(' && order[4] === ')',
            a: Number(order[2]),
            b: Number(order[3]),
            c: Number(order[5]),
        };
    }

    // Missing operand: addition
    const missAdd1 = expr.match(/^\?\+(\d+)=(\d+)$/);
    if (missAdd1) return { type: 'missing_addition', known: Number(missAdd1[1]), total: Number(missAdd1[2]), hideLeft: true };
    const missAdd2 = expr.match(/^(\d+)\+\?=(\d+)$/);
    if (missAdd2) return { type: 'missing_addition', known: Number(missAdd2[1]), total: Number(missAdd2[2]), hideLeft: false };

    // Missing operand: subtraction
    const missSubM = expr.match(/^\?-(\d+)=(\d+)$/);
    if (missSubM) return { type: 'missing_subtraction', variant: 'minuend', known: Number(missSubM[1]), result: Number(missSubM[2]) };
    const missSubS = expr.match(/^(\d+)-\?=(\d+)$/);
    if (missSubS) return { type: 'missing_subtraction', variant: 'subtrahend', known: Number(missSubS[1]), result: Number(missSubS[2]) };

    // Missing operand: multiplication
    const missMul = expr.match(/^(\?|\d+)\*(\?|\d+)=(\d+)$/);
    if (missMul) {
        const total = Number(missMul[3]);
        if (missMul[1] === '?') return { type: 'missing_multiplication', known: Number(missMul[2]), total, hideLeft: true };
        return { type: 'missing_multiplication', known: Number(missMul[1]), total, hideLeft: false };
    }

    // Missing operand: division
    const missDiv = expr.match(/^(\?|\d+)\/(\?|\d+)=(\d+)$/);
    if (missDiv) {
        const quotient = Number(missDiv[3]);
        if (missDiv[1] === '?') return { type: 'missing_division', variant: 'dividend', known: Number(missDiv[2]), quotient };
        return { type: 'missing_division', variant: 'divisor', known: Number(missDiv[1]), quotient };
    }

    // School-specific text expressions (full Slovak text, no whitespace strip)
    const divisibility = problem.expression.match(/^Je (\d+) deliteľné číslom (\d+)\? 1=áno, 0=nie$/);
    if (divisibility) return { type: 'divisibility', number: Number(divisibility[1]), divisor: Number(divisibility[2]) };

    const multiple = problem.expression.match(/^Napíš (\d+)\. násobok čísla (\d+)$/);
    if (multiple) return { type: 'multiple_request', order: Number(multiple[1]), base: Number(multiple[2]) };

    const divisorRequest = problem.expression.match(/^Napíš jedného deliteľa čísla (\d+) väčšieho ako 1$/);
    if (divisorRequest) return { type: 'divisor_request', number: Number(divisorRequest[1]) };

    const fractionNum = problem.expression.match(/^Zlomok: z (\d+) rovnakých častí sú vyfarbené (\d+)\. Aký je čitateľ\?$/);
    if (fractionNum) return { type: 'fraction_numerator', denominator: Number(fractionNum[1]), numerator: Number(fractionNum[2]) };

    const fractionDen = problem.expression.match(/^Zlomok: celok je rozdelený na (\d+) rovnakých častí\. Aký je menovateľ\?$/);
    if (fractionDen) return { type: 'fraction_denominator', denominator: Number(fractionDen[1]) };

    const fractionName = problem.expression.match(/^Zlomok: akú hodnotu má menovateľ pri slove (polovica|tretina|štvrtina)\?$/);
    if (fractionName) return { type: 'fraction_name', label: fractionName[1] as 'polovica' | 'tretina' | 'štvrtina' };

    const fractionCmp = problem.expression.match(/^Zlomok: čo je väčšie (\d+)\/(\d+) alebo (\d+)\/(\d+)\? 1=prvý, 0=druhý$/);
    if (fractionCmp) {
        return {
            type: 'fraction_compare',
            leftNum: Number(fractionCmp[1]),
            leftDen: Number(fractionCmp[2]),
            rightNum: Number(fractionCmp[3]),
            rightDen: Number(fractionCmp[4]),
        };
    }

    const comparison = problem.expression.match(/^Ktoré číslo je (väčšie|menšie): (\d+) alebo (\d+)\? 1=prvý, 0=druhý$/);
    if (comparison) {
        return {
            type: 'number_comparison',
            variant: comparison[1] === 'väčšie' ? 'larger' : 'smaller',
            left: Number(comparison[2]),
            right: Number(comparison[3]),
        };
    }

    const rounding = problem.expression.match(/^Zaokrúhli (\d+) na (desiatky|stovky)$/);
    if (rounding) {
        return {
            type: 'rounding',
            value: Number(rounding[1]),
            place: rounding[2] === 'stovky' ? 100 : 10,
        };
    }

    const unitConv = problem.expression.match(/^(\d+) (mm|cm|dm|m|km|g|kg|ml|dl|l|min|h|eur|centov) = \? (mm|cm|dm|m|km|g|kg|ml|dl|l|min|h|eur|centov)$/);
    if (unitConv) {
        const fromRaw = unitConv[2];
        const toRaw = unitConv[3];
        const normalizeUnit = (u: string) => (u === 'centov' ? 'cent' : u);
        return {
            type: 'unit_conversion',
            from: normalizeUnit(fromRaw) as 'mm' | 'cm' | 'dm' | 'm' | 'km' | 'g' | 'kg' | 'ml' | 'dl' | 'l' | 'min' | 'h' | 'eur' | 'cent',
            to: normalizeUnit(toRaw) as 'mm' | 'cm' | 'dm' | 'm' | 'km' | 'g' | 'kg' | 'ml' | 'dl' | 'l' | 'min' | 'h' | 'eur' | 'cent',
            value: Number(unitConv[1]),
            result: problem.result,
        };
    }

    const romanToArabic = problem.expression.match(/^Rímske číslo ([IVXLCDM]+) zapíš arabsky$/);
    if (romanToArabic) return { type: 'roman_to_arabic', roman: romanToArabic[1], value: problem.result };

    const arabicToRoman = problem.expression.match(/^Arabské číslo (\d+) zapíš rímsky$/);
    if (arabicToRoman && problem.steps[0]) {
        const roman = problem.steps[0].split('=').at(1)?.trim();
        if (roman) return { type: 'arabic_to_roman', value: Number(arabicToRoman[1]), roman };
    }

    return null;
};
