import {
    type TutorialAudience,
    type TutorialCatalogItem,
    type TutorialCategory,
} from '../types';

const TUTORIAL_ITEMS: TutorialCatalogItem[] = [
    {
        id: 'grade1_addition_intro',
        method: 'arithmetic',
        grade: 'grade1',
        categoryId: 'grade1_addition',
        title: 'Sčítanie do 10',
        description: 'Ukáže spojenie dvoch skupín bodov do jedného výsledku.',
    },
    {
        id: 'grade1_subtraction_intro',
        method: 'arithmetic',
        grade: 'grade1',
        categoryId: 'grade1_subtraction',
        title: 'Odčítanie do 10',
        description: 'Ukáže odobratie časti bodov a spočítanie toho, čo zostalo.',
    },
    {
        id: 'grade2_addition_crossing',
        method: 'arithmetic',
        grade: 'grade2',
        categoryId: 'grade2_addition',
        title: 'Sčítanie cez desiatku',
        description: 'Ukáže rozklad druhého čísla tak, aby sme najprv doplnili do 10.',
    },
    {
        id: 'grade2_subtraction_crossing',
        method: 'arithmetic',
        grade: 'grade2',
        categoryId: 'grade2_subtraction',
        title: 'Odčítanie cez desiatku',
        description: 'Ukáže odčítanie po častiach cez celú desiatku.',
    },
    {
        id: 'grade3_multiplication_intro',
        method: 'arithmetic',
        grade: 'grade3',
        categoryId: 'grade3_multiplication',
        title: 'Násobenie',
        description: 'Vysvetlí násobenie ako opakované sčítanie.',
    },
    {
        id: 'grade3_division_intro',
        method: 'arithmetic',
        grade: 'grade3',
        categoryId: 'grade3_division',
        title: 'Delenie',
        description: 'Vysvetlí delenie ako rozdelenie na rovnaké časti a kontrolu násobením.',
    },
    {
        id: 'grade4_indian_division_intro',
        method: 'indian_division',
        grade: 'grade4',
        categoryId: 'grade4_division',
        title: 'Indické delenie',
        description: 'Krok za krokom ukáže delenie po cifrách, zápis podielu aj prenášanie zvyšku.',
    },
    {
        id: 'grade4_long_division_intro',
        method: 'long_division',
        grade: 'grade4',
        categoryId: 'grade4_division',
        title: 'Klasické písomné delenie',
        description: 'Tradičný zápis pod seba - mínus medzikrok, čiara a znesenie ďalšej cifry.',
    },
    {
        id: 'grade5_order_operations_intro',
        method: 'arithmetic',
        grade: 'grade5',
        categoryId: 'grade5_order_operations',
        title: 'Poradie operácií',
        description: 'Ukáže, že násobenie má prednosť pred sčítaním a zátvorky sa počítajú ako prvé.',
    },
    {
        id: 'grade5_fractions_intro',
        method: 'arithmetic',
        grade: 'grade5',
        categoryId: 'grade5_fractions',
        title: 'Úvod do zlomkov',
        description: 'Ukáže čitateľ ako počet vyfarbených častí a menovateľ ako počet všetkých častí.',
    },
    {
        id: 'grade5_fraction_compare_intro',
        method: 'arithmetic',
        grade: 'grade5',
        categoryId: 'grade5_fractions',
        title: 'Porovnávanie zlomkov',
        description: 'Porovná dva zlomky s rovnakým menovateľom podľa počtu vyfarbených častí.',
    },
    {
        id: 'grade5_divisibility_intro',
        method: 'arithmetic',
        grade: 'grade5',
        categoryId: 'grade5_divisibility',
        title: 'Deliteľnosť',
        description: 'Ukáže deliteľnosť ako rovnomerné rozdelenie bez zvyšku.',
    },
    {
        id: 'grade5_multiples_divisors_intro',
        method: 'arithmetic',
        grade: 'grade5',
        categoryId: 'grade5_multiples_divisors',
        title: 'Násobky a delitele',
        description: 'Ukáže násobky ako rad rovnakých skupín a delitele ako čísla, ktoré skupiny presne vytvoria.',
    },
];

const CATEGORY_LABELS: Record<string, string> = {
    grade1_addition: 'Sčítanie',
    grade1_subtraction: 'Odčítanie',
    grade2_addition: 'Sčítanie',
    grade2_subtraction: 'Odčítanie',
    grade3_multiplication: 'Násobenie',
    grade3_division: 'Delenie',
    grade4_division: 'Delenie',
    grade5_order_operations: 'Poradie operácií',
    grade5_fractions: 'Zlomky',
    grade5_divisibility: 'Deliteľnosť',
    grade5_multiples_divisors: 'Násobky a delitele',
};

export const getTutorialCatalogForGrade = (grade: TutorialAudience): TutorialCategory[] => {
    const items = TUTORIAL_ITEMS.filter(item => item.grade === grade);
    const grouped = new Map<string, TutorialCatalogItem[]>();

    items.forEach(item => {
        grouped.set(item.categoryId, [...(grouped.get(item.categoryId) ?? []), item]);
    });

    return Array.from(grouped.entries()).map(([id, categoryItems]) => ({
        id,
        title: CATEGORY_LABELS[id] ?? id,
        items: categoryItems,
    }));
};
