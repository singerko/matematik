import type { SchoolGrade } from './types';

export interface GradeContentSection {
    title: string;
    items: string[];
}

export interface GradeContentOverview {
    grade: SchoolGrade;
    label: string;
    goal: string;
    sections: GradeContentSection[];
}

export const GRADE_CONTENT: GradeContentOverview[] = [
    {
        grade: 'grade1',
        label: '1. ročník',
        goal: 'Budovanie predstavy o počte, sčítaní a odčítaní do 10.',
        sections: [
            { title: 'Témy', items: ['sčítanie do 10', 'odčítanie do 10', 'porovnávanie čísel', 'jednoduché slovné úlohy'] },
            { title: 'Doučovanie', items: ['vizuálne spájanie skupín', 'odoberanie časti skupiny', 'druhý pokus po nápovede'] },
        ],
    },
    {
        grade: 'grade2',
        label: '2. ročník',
        goal: 'Počítanie do 20/100, prechod cez desiatku a postupné učenie malej násobilky.',
        sections: [
            { title: 'Témy', items: ['sčítanie a odčítanie', 'prechod cez desiatku', 'samostatné násobilky 1 až 10', 'porovnávanie čísel', 'zaokrúhľovanie na desiatky', 'slovné úlohy s nadbytočnou informáciou'] },
            { title: 'Doučovanie', items: ['rozklad na desiatku', 'doplnenie zhora pri odčítaní', 'vizuálne vysvetlenia po chybe', 'odporúčaný tréning slabých tém'] },
        ],
    },
    {
        grade: 'grade3',
        label: '3. ročník',
        goal: 'Násobilka, delenie a ich vzťah.',
        sections: [
            { title: 'Témy', items: ['násobenie', 'delenie', 'sčítanie/odčítanie do 100', 'porovnávanie čísel', 'zaokrúhľovanie', 'premena jednotiek (cm, m, h, min, eur)', 'slovné úlohy'] },
            { title: 'Doučovanie', items: ['násobenie ako rovnaké skupiny', 'delenie ako rozdelenie na rovnaké časti', 'porovnávacie slovné úlohy', 'adaptívne opakovanie chýb'] },
        ],
    },
    {
        grade: 'grade4',
        label: '4. ročník',
        goal: 'Upevnenie násobenia, delenia a indického delenia.',
        sections: [
            { title: 'Témy', items: ['násobilka', 'delenie', 'indické delenie', 'zaokrúhľovanie', 'premena jednotiek', 'slovné úlohy (aj dvojkrokové)'] },
            { title: 'Doučovanie', items: ['krokovanie indického delenia', 'zápis zvyšku', 'dvojkrokové úlohy a peniaze', 'hlasový a vizuálny tutoriál'] },
        ],
    },
    {
        grade: 'grade5',
        label: '5. ročník',
        goal: 'Prechod k výrazom, deliteľnosti a základom zlomkov.',
        sections: [
            { title: 'Témy', items: ['poradie operácií', 'zátvorky', 'deliteľnosť', 'násobky a delitele', 'úvod do zlomkov', 'zaokrúhľovanie', 'premena jednotiek'] },
            { title: 'Doučovanie', items: ['vizuálne poradie operácií a zátvorky', 'áno/nie pri deliteľnosti', 'vizuálne násobky, delitele, zlomky a porovnávanie'] },
        ],
    },
];
