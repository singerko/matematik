const ROMAN_PAIRS: ReadonlyArray<[number, string]> = [
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
];

export const arabicToRoman = (value: number): string => {
    let remaining = value;
    let result = '';

    for (const [arabic, roman] of ROMAN_PAIRS) {
        while (remaining >= arabic) {
            result += roman;
            remaining -= arabic;
        }
    }

    return result;
};

export const romanToArabic = (roman: string): number | null => {
    const normalized = roman.trim().toUpperCase();
    if (!normalized || !/^[IVXLCDM]+$/.test(normalized)) return null;

    let index = 0;
    let result = 0;

    for (const [arabic, symbol] of ROMAN_PAIRS) {
        while (normalized.startsWith(symbol, index)) {
            result += arabic;
            index += symbol.length;
        }
    }

    return index === normalized.length && arabicToRoman(result) === normalized ? result : null;
};

export const normalizeRomanAnswer = (value: string): string => value.trim().toUpperCase();
