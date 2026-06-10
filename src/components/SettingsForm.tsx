import React, { useEffect, useState } from 'react';
import { BarChart3, BookOpen, Settings, Play, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import {
    type Constraints,
    type MathOperation,
    type Profile,
    type ProfileMode,
    type PracticeStyle,
    type ProblemFormat,
    type SchoolGrade,
    type SchoolSettings,
    type SchoolTopic,
    type TrainingMode,
    type UnitConversionCategory,
    DEFAULT_SCHOOL_SETTINGS,
} from '../lib/types';
import { createDefaultSchoolSettings, getGradeCapabilities } from '../lib/schoolRules';
import { MULTIPLICATION_TABLE_TOPICS } from '../lib/schoolRules';
import { resolveProfileConstraints } from '../lib/profileConstraints';
import { getTutorialCatalogForGrade } from '../lib/tutorials/catalog';
import { getWeakestProgressTopics } from '../lib/progress';
import { getTopicLabel } from '../lib/explanations';

const SCHOOL_TOPIC_LABELS: Record<SchoolTopic, string> = {
    addition: 'Sčítanie',
    subtraction: 'Odčítanie',
    multiplication: 'Násobenie',
    division: 'Delenie',
    large_multiplication: 'Trojmiestne × jednomiestne',
    large_division: 'Trojmiestne : jednomiestne',
    indian_division: 'Indické delenie',
    long_division: 'Klasické písomné delenie',
    word_problem: 'Slovné úlohy',
    order_operations: 'Poradie operácií',
    divisibility: 'Deliteľnosť',
    multiples_divisors: 'Násobky a delitele',
    fractions_intro: 'Zlomky',
    number_comparison: 'Porovnávanie čísel',
    rounding: 'Zaokrúhľovanie',
    unit_conversion: 'Premena jednotiek',
    geometry_area: 'Geometria - plocha',
    roman_numerals: 'Rímske číslice',
    money_coins: 'Peniaze - Mince',
    logical_sequences: 'Logické postupnosti',
    multiplication_table_1: 'Násobilka 1',
    multiplication_table_2: 'Násobilka 2',
    multiplication_table_3: 'Násobilka 3',
    multiplication_table_4: 'Násobilka 4',
    multiplication_table_5: 'Násobilka 5',
    multiplication_table_6: 'Násobilka 6',
    multiplication_table_7: 'Násobilka 7',
    multiplication_table_8: 'Násobilka 8',
    multiplication_table_9: 'Násobilka 9',
    multiplication_table_10: 'Násobilka 10',
};

const getSchoolTopicLabel = (topic: SchoolTopic, _grade: SchoolGrade) => {
    return SCHOOL_TOPIC_LABELS[topic];
};

const GROUPED_SCHOOL_TOPICS: Array<{ title: string; topics: SchoolTopic[] }> = [
    { title: 'Sčítanie a odčítanie', topics: ['addition', 'subtraction'] },
    { title: 'Malá násobilka', topics: MULTIPLICATION_TABLE_TOPICS },
    { title: 'Násobenie', topics: ['multiplication', 'large_multiplication'] },
    { title: 'Delenie', topics: ['division', 'large_division', 'indian_division', 'long_division'] },
];

const CHILD_TOPIC_LABELS: Partial<Record<SchoolTopic, string>> = {
    multiplication: 'Malá násobilka',
    division: 'Delenie z malej násobilky',
};

const UNIT_CONVERSION_CATEGORY_LABELS: Record<UnitConversionCategory, string> = {
    length: 'Dĺžka',
    weight: 'Hmotnosť',
    money: 'Mena',
    volume: 'Objem',
};

const UNIT_CONVERSION_CATEGORIES: UnitConversionCategory[] = ['length', 'weight', 'money', 'volume'];

const getSchoolTopicOptionLabel = (topic: SchoolTopic, grade: SchoolGrade) => {
    return CHILD_TOPIC_LABELS[topic] ?? getSchoolTopicLabel(topic, grade);
};

interface Props {
    profile: Profile;
    onSave: (updatedProfile: Profile) => void;
    onStart: (count: number, style: PracticeStyle, settingsForGame?: Constraints) => void;
    onStartRecommended: () => void;
    onOpenProgress: () => void;
    onOpenContent: () => void;
    onLogout: () => void;
    onOpenTutorialLibrary: () => void;
}

const SettingsForm: React.FC<Props> = ({ profile, onSave, onStart, onStartRecommended, onOpenProgress, onOpenContent, onLogout, onOpenTutorialLibrary }) => {
    const [settings, setSettings] = useState<Constraints>(profile.settings);
    const [localSchoolSettings, setLocalSchoolSettings] = useState<SchoolSettings>(profile.schoolSettings ?? DEFAULT_SCHOOL_SETTINGS);
    const [localInputs, setLocalInputs] = useState({
        maxNumbers: profile.settings.maxNumbers.toString(),
        maxSumResult: profile.settings.maxSumResult.toString(),
        maxMulProduct: profile.settings.maxMulProduct.toString(),
        maxOneNumberInMul: profile.settings.maxOneNumberInMul.toString(),
        maxDivisor: profile.settings.maxDivisor.toString(),
        schoolMaxValue: (profile.schoolSettings?.maxValue ?? DEFAULT_SCHOOL_SETTINGS.maxValue ?? 20).toString(),
        schoolMaxSecondOperand: (profile.schoolSettings?.maxSecondOperand ?? '').toString(),
        schoolIndianDividend: (profile.schoolSettings?.maxIndianDividend ?? DEFAULT_SCHOOL_SETTINGS.maxIndianDividend ?? 100).toString(),
        schoolIndianDivisor: (profile.schoolSettings?.maxIndianDivisor ?? DEFAULT_SCHOOL_SETTINGS.maxIndianDivisor ?? 9).toString(),
        schoolLongDividend: (profile.schoolSettings?.maxLongDividend ?? DEFAULT_SCHOOL_SETTINGS.maxLongDividend ?? 100).toString(),
        schoolLongDivisor: (profile.schoolSettings?.maxLongDivisor ?? DEFAULT_SCHOOL_SETTINGS.maxLongDivisor ?? 9).toString(),
    });
    const [showConfig, setShowConfig] = useState(true);

    useEffect(() => {
        setSettings(profile.settings);
        setLocalSchoolSettings(profile.schoolSettings ?? DEFAULT_SCHOOL_SETTINGS);
        setLocalInputs({
            maxNumbers: profile.settings.maxNumbers.toString(),
            maxSumResult: profile.settings.maxSumResult.toString(),
            maxMulProduct: profile.settings.maxMulProduct.toString(),
            maxOneNumberInMul: profile.settings.maxOneNumberInMul.toString(),
            maxDivisor: profile.settings.maxDivisor.toString(),
            schoolMaxValue: (profile.schoolSettings?.maxValue ?? DEFAULT_SCHOOL_SETTINGS.maxValue ?? 20).toString(),
            schoolMaxSecondOperand: (profile.schoolSettings?.maxSecondOperand ?? '').toString(),
            schoolIndianDividend: (profile.schoolSettings?.maxIndianDividend ?? DEFAULT_SCHOOL_SETTINGS.maxIndianDividend ?? 100).toString(),
            schoolIndianDivisor: (profile.schoolSettings?.maxIndianDivisor ?? DEFAULT_SCHOOL_SETTINGS.maxIndianDivisor ?? 9).toString(),
            schoolLongDividend: (profile.schoolSettings?.maxLongDividend ?? DEFAULT_SCHOOL_SETTINGS.maxLongDividend ?? 100).toString(),
            schoolLongDivisor: (profile.schoolSettings?.maxLongDivisor ?? DEFAULT_SCHOOL_SETTINGS.maxLongDivisor ?? 9).toString(),
        });
    }, [profile]);

    const effectiveMode: ProfileMode = profile.mode ?? 'custom';
    const schoolSettings = localSchoolSettings;
    const liveProfile: Profile = {
        ...profile,
        settings,
        schoolSettings,
    };
    const schoolCapabilities = getGradeCapabilities(schoolSettings.grade);
    const tutorialCategories = getTutorialCatalogForGrade(schoolSettings.grade);
    const weakestProgressTopics = getWeakestProgressTopics(liveProfile.progress);
    const effectiveProblemCount = effectiveMode === 'school'
        ? schoolSettings.problemCount
        : (settings.problemCount || 10);
    const effectiveTrainingMode: TrainingMode = effectiveMode === 'school'
        ? (schoolSettings.trainingMode ?? 'learn')
        : (settings.trainingMode ?? 'learn');
    const effectivePracticeStyle: PracticeStyle = effectiveMode === 'school'
        ? (schoolSettings.practiceStyle ?? 'classic')
        : (settings.practiceStyle ?? 'classic');
    const canStartTraining = effectiveMode !== 'school' || schoolSettings.enabledTopics.length > 0;

    const saveProfile = (updater: (current: Profile) => Profile) => {
        onSave(updater(profile));
    };

    const updateMode = (mode: ProfileMode) => {
        saveProfile(current => ({
            ...current,
            mode,
            schoolSettings: current.schoolSettings ?? { ...DEFAULT_SCHOOL_SETTINGS },
        }));
    };

    const updateSchoolSettings = (patch: Partial<Profile['schoolSettings']>) => {
        const nextSchoolSettings = {
            ...schoolSettings,
            ...patch,
        };
        setLocalSchoolSettings(nextSchoolSettings);
        saveProfile(current => ({
            ...current,
            mode: current.mode ?? 'school',
            schoolSettings: nextSchoolSettings,
        }));
    };

    const updateSchoolGrade = (grade: SchoolGrade) => {
        updateSchoolSettings(createDefaultSchoolSettings(grade));
    };

    const updateTrainingMode = (trainingMode: TrainingMode) => {
        if (effectiveMode === 'school') {
            updateSchoolSettings({ trainingMode });
            return;
        }

        updateSetting('trainingMode', trainingMode);
    };

    const updatePracticeStyle = (practiceStyle: PracticeStyle) => {
        if (effectiveMode === 'school') {
            updateSchoolSettings({ practiceStyle });
            return;
        }

        updateSetting('practiceStyle', practiceStyle);
    };

    const toggleSchoolTopic = (topic: SchoolTopic) => {
        const currentTopics: SchoolTopic[] = schoolSettings.enabledTopics.length
            ? schoolSettings.enabledTopics
            : [];
        const nextTopics: SchoolTopic[] = currentTopics.includes(topic)
            ? currentTopics.filter(item => item !== topic)
            : [...currentTopics, topic];

        updateSchoolSettings({ enabledTopics: nextTopics });
    };

    const toggleSelectableNumber = (
        listKey: 'multiplicationTables' | 'divisionDivisors',
        value: number,
        fallback: number
    ) => {
        const currentValues = schoolSettings[listKey]?.length
            ? schoolSettings[listKey]!
            : [fallback];
        let nextValues = currentValues.includes(value)
            ? currentValues.filter(item => item !== value)
            : [...currentValues, value].sort((a, b) => a - b);

        if (nextValues.length === 0) {
            nextValues = [fallback];
        }

        updateSchoolSettings({ [listKey]: nextValues });
    };

    const toggleUnitConversionCategory = (category: UnitConversionCategory) => {
        const currentCategories = schoolSettings.unitConversionCategories?.length
            ? schoolSettings.unitConversionCategories
            : UNIT_CONVERSION_CATEGORIES;
        let nextCategories = currentCategories.includes(category)
            ? currentCategories.filter(item => item !== category)
            : [...currentCategories, category];

        if (nextCategories.length === 0) {
            nextCategories = [category];
        }

        updateSchoolSettings({ unitConversionCategories: nextCategories });
    };

    const updateSetting = <K extends keyof Constraints>(key: K, value: Constraints[K]) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        saveProfile(current => ({ ...current, settings: newSettings }));
    };

    const handleNumberChange = (key: keyof typeof localInputs, value: string) => {
        setLocalInputs(prev => ({ ...prev, [key]: value }));
    };

    const handleNumberBlur = (key: keyof typeof localInputs, settingKey: keyof Constraints, min: number, max?: number) => {
        let val = parseInt(localInputs[key], 10);
        if (isNaN(val)) val = min;
        if (val < min) val = min;
        if (max !== undefined && val > max) val = max;

        setLocalInputs(prev => ({ ...prev, [key]: val.toString() }));
        updateSetting(settingKey, val as Constraints[keyof Constraints]);
    };

    const handleSchoolMaxValueBlur = () => {
        let val = parseInt(localInputs.schoolMaxValue, 10);
        if (isNaN(val)) val = DEFAULT_SCHOOL_SETTINGS.maxValue ?? 20;
        if (val < 10) val = 10;
        if (val > 1000) val = 1000;

        setLocalInputs(prev => ({ ...prev, schoolMaxValue: val.toString() }));
        updateSchoolSettings({ maxValue: val });
    };

    const handleSchoolMaxSecondOperandBlur = () => {
        const raw = localInputs.schoolMaxSecondOperand.trim();
        if (raw === '' || raw === '0') {
            setLocalInputs(prev => ({ ...prev, schoolMaxSecondOperand: '' }));
            updateSchoolSettings({ maxSecondOperand: undefined });
            return;
        }
        let val = parseInt(raw, 10);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 1000) val = 1000;
        setLocalInputs(prev => ({ ...prev, schoolMaxSecondOperand: val.toString() }));
        updateSchoolSettings({ maxSecondOperand: val });
    };

    const handleSchoolIndianNumberBlur = (field: 'schoolIndianDividend' | 'schoolIndianDivisor') => {
        let val = parseInt(localInputs[field], 10);
        if (isNaN(val)) {
            val = field === 'schoolIndianDividend'
                ? (DEFAULT_SCHOOL_SETTINGS.maxIndianDividend ?? 100)
                : (DEFAULT_SCHOOL_SETTINGS.maxIndianDivisor ?? 9);
        }

        if (field === 'schoolIndianDividend') {
            if (val < 10) val = 10;
            if (val > 9999) val = 9999;
            setLocalInputs(prev => ({ ...prev, schoolIndianDividend: val.toString() }));
            updateSchoolSettings({ maxIndianDividend: val });
            return;
        }

        if (val < 2) val = 2;
        if (val > 99) val = 99;
        setLocalInputs(prev => ({ ...prev, schoolIndianDivisor: val.toString() }));
        updateSchoolSettings({ maxIndianDivisor: val });
    };

    const handleSchoolLongNumberBlur = (field: 'schoolLongDividend' | 'schoolLongDivisor') => {
        let val = parseInt(localInputs[field], 10);
        if (isNaN(val)) {
            val = field === 'schoolLongDividend'
                ? (DEFAULT_SCHOOL_SETTINGS.maxLongDividend ?? 100)
                : (DEFAULT_SCHOOL_SETTINGS.maxLongDivisor ?? 9);
        }

        if (field === 'schoolLongDividend') {
            if (val < 10) val = 10;
            if (val > 9999) val = 9999;
            setLocalInputs(prev => ({ ...prev, schoolLongDividend: val.toString() }));
            updateSchoolSettings({ maxLongDividend: val });
            return;
        }

        if (val < 2) val = 2;
        if (val > 99) val = 99;
        setLocalInputs(prev => ({ ...prev, schoolLongDivisor: val.toString() }));
        updateSchoolSettings({ maxLongDivisor: val });
    };

    const toggleOp = (op: Constraints['allowedOperations'][number]) => {
        const current = settings.allowedOperations;
        let next = current.includes(op)
            ? current.filter(item => item !== op)
            : [...current, op];

        if (next.length === 0) next = ['+'];
        updateSetting('allowedOperations', next);
    };

    const renderSchoolConfig = () => {
        const isGrade1 = schoolSettings.grade === 'grade1';
        const isGrade2 = schoolSettings.grade === 'grade2';
        const isGrade1To3 = schoolSettings.grade === 'grade1' || schoolSettings.grade === 'grade2' || schoolSettings.grade === 'grade3';
        const multiplicationEnabled = schoolSettings.enabledTopics.includes('multiplication');
        const divisionEnabled = schoolSettings.enabledTopics.includes('division');
        const indianDivisionEnabled = schoolSettings.enabledTopics.includes('indian_division');
        const longDivisionEnabled = schoolSettings.enabledTopics.includes('long_division');
        const unitConversionEnabled = schoolSettings.enabledTopics.includes('unit_conversion');
        const compactNumberGridStyle: React.CSSProperties = {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '0.5rem',
            width: '100%',
        };
        const compactNumberButtonStyle = (active: boolean): React.CSSProperties => ({
            minWidth: 0,
            padding: '0.75rem 0',
            background: active ? undefined : 'rgba(255,255,255,0.1)',
        });
        const availableTopicSet = new Set<SchoolTopic>(schoolCapabilities.availableTopics);
        const groupedTopicSet = new Set<SchoolTopic>(GROUPED_SCHOOL_TOPICS.flatMap(group => group.topics));
        const visibleTopicGroups = GROUPED_SCHOOL_TOPICS
            .map(group => ({
                ...group,
                topics: group.topics.filter(topic => availableTopicSet.has(topic)),
            }))
            .filter(group => group.topics.length > 0);
        const standaloneTopics = schoolCapabilities.availableTopics.filter(topic => !groupedTopicSet.has(topic));
        const renderTopicCheckbox = (topic: SchoolTopic, nested = false) => {
            const checked = schoolSettings.enabledTopics.includes(topic);
            return (
                <label
                    key={topic}
                    className="flex items-center gap-2"
                    style={{
                        cursor: 'pointer',
                        fontWeight: 'normal',
                        margin: 0,
                        padding: nested ? '0.45rem 0.55rem' : '0.55rem 0.65rem',
                        borderRadius: '0.6rem',
                        background: checked ? 'rgba(59,130,246,0.16)' : 'rgba(255,255,255,0.06)',
                        border: checked ? '1px solid rgba(147,197,253,0.35)' : '1px solid rgba(255,255,255,0.08)',
                        minWidth: 0,
                    }}
                >
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSchoolTopic(topic)}
                    />
                    <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                        {getSchoolTopicOptionLabel(topic, schoolSettings.grade)}
                    </span>
                </label>
            );
        };

        return (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="card glass flex flex-col gap-4 min-w-0" style={{ width: '100%', overflowX: 'hidden' }}>
                <div>
                    <label>Ročník</label>
                    <div className="flex gap-2 flex-wrap" style={{ minWidth: 0 }}>
                        {(['grade1', 'grade2', 'grade3', 'grade4', 'grade5'] as const).map((grade) => (
                            <button
                                key={grade}
                                type="button"
                                className={`btn ${schoolSettings.grade === grade ? 'btn-primary' : ''}`}
                                style={{ background: schoolSettings.grade === grade ? '' : 'rgba(255,255,255,0.1)', flex: '1 1 8rem', minWidth: 0 }}
                                onClick={() => updateSchoolGrade(grade)}
                            >
                                {grade === 'grade1' ? '1. ročník' : grade === 'grade2' ? '2. ročník' : grade === 'grade3' ? '3. ročník' : grade === 'grade4' ? '4. ročník' : '5. ročník'}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label>Typ zadania</label>
                    <div className="flex gap-4 flex-wrap">
                        {([
                            { key: 'standard', label: 'Klasické' },
                            { key: 'missing', label: 'Doplňovačka' },
                        ] as { key: 'standard' | 'missing'; label: string }[]).map(({ key, label }) => {
                            const checked = schoolSettings.problemFormat === key || schoolSettings.problemFormat === 'mixed';
                            return (
                                <label key={key} className="flex items-center gap-2" style={{ cursor: 'pointer', fontWeight: 'normal' }}>
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                            const stdOn = schoolSettings.problemFormat === 'standard' || schoolSettings.problemFormat === 'mixed';
                                            const misOn = schoolSettings.problemFormat === 'missing' || schoolSettings.problemFormat === 'mixed';
                                            let nextStd = key === 'standard' ? !stdOn : stdOn;
                                            const nextMis = key === 'missing' ? !misOn : misOn;
                                            if (!nextStd && !nextMis) nextStd = true;
                                            const nextFormat: ProblemFormat = nextStd && nextMis ? 'mixed' : nextStd ? 'standard' : 'missing';
                                            updateSchoolSettings({ problemFormat: nextFormat });
                                        }}
                                    />
                                    {label}
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label>Typy príkladov</label>
                    <div style={{ display: 'grid', gap: '0.75rem', minWidth: 0 }}>
                        {visibleTopicGroups.map(group => (
                            <div
                                key={group.title}
                                style={{
                                    border: '1px solid rgba(148,163,184,0.16)',
                                    borderRadius: '0.75rem',
                                    padding: '0.75rem',
                                    background: 'rgba(15,23,42,0.24)',
                                    minWidth: 0,
                                }}
                            >
                                <div style={{ fontWeight: 800, color: '#e2e8f0', marginBottom: '0.55rem' }}>
                                    {group.title}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: '0.55rem' }}>
                                    {group.topics.map(topic => renderTopicCheckbox(topic, true))}
                                </div>
                            </div>
                        ))}
                        {standaloneTopics.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: '0.55rem' }}>
                                {standaloneTopics.map(topic => renderTopicCheckbox(topic))}
                            </div>
                        )}
                    </div>
                </div>

                {isGrade1To3 && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '1rem' }}>
                            <div>
                                <label>Prvé číslo do</label>
                                <input
                                    type="number"
                                    className="input"
                                    min={10}
                                    max={1000}
                                    step={1}
                                    value={localInputs.schoolMaxValue}
                                    onChange={(e) => setLocalInputs(prev => ({ ...prev, schoolMaxValue: e.target.value }))}
                                    onBlur={handleSchoolMaxValueBlur}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                            <div>
                                <label>Druhé číslo do</label>
                                <input
                                    type="number"
                                    className="input"
                                    min={1}
                                    max={1000}
                                    step={1}
                                    placeholder="bez limitu"
                                    value={localInputs.schoolMaxSecondOperand}
                                    onChange={(e) => setLocalInputs(prev => ({ ...prev, schoolMaxSecondOperand: e.target.value }))}
                                    onBlur={handleSchoolMaxSecondOperandBlur}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        </div>

                        <div>
                            <label>Prechod cez desiatku</label>
                            <div className="flex gap-2 flex-wrap" style={{ minWidth: 0 }}>
                                {([
                                    { value: 'non_crossing', label: 'Bez prechodu' },
                                    { value: 'crossing', label: 'S prechodom' },
                                ] as const).map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`btn ${schoolSettings.crossingTensMode === option.value ? 'btn-primary' : ''}`}
                                        style={{ background: schoolSettings.crossingTensMode === option.value ? '' : 'rgba(255,255,255,0.1)', flex: '1 1 9rem', minWidth: 0 }}
                                        onClick={() => updateSchoolSettings({ crossingTensMode: option.value })}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={schoolSettings.restrictToRoundTens ?? false}
                                onChange={(e) => updateSchoolSettings({ restrictToRoundTens: e.target.checked })}
                            />
                            <span>Obmedziť na pripočítavanie a odpočítavanie desiatok</span>
                        </div>
                    </>
                )}

                {multiplicationEnabled && (
                    <div>
                        <label>Násobilky na precvičenie</label>
                        {schoolCapabilities.multiplication.forceAllTables ? (
                            <div style={{ color: '#cbd5e1' }}>V tomto ročníku sa precvičuje celá násobilka.</div>
                        ) : (
                            <div style={compactNumberGridStyle}>
                                {schoolCapabilities.multiplication.selectableTables.map((table) => {
                                    const active = schoolSettings.multiplicationTables?.includes(table) ?? false;
                                    return (
                                        <button
                                            key={table}
                                            type="button"
                                            className={`btn ${active ? 'btn-primary' : ''}`}
                                            style={compactNumberButtonStyle(active)}
                                            onClick={() => toggleSelectableNumber(
                                                'multiplicationTables',
                                                table,
                                                schoolCapabilities.multiplication.selectableTables[0]
                                            )}
                                        >
                                            {table}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {divisionEnabled && (
                    <div>
                        <label>Delitelia na precvičenie</label>
                        {schoolCapabilities.division.forceAllDivisors ? (
                            <div style={{ color: '#cbd5e1' }}>V tomto ročníku sa precvičuje celé delenie do 10.</div>
                        ) : (
                            <div style={compactNumberGridStyle}>
                                {schoolCapabilities.division.selectableDivisors.map((divisor) => {
                                    const active = schoolSettings.divisionDivisors?.includes(divisor) ?? false;
                                    return (
                                        <button
                                            key={divisor}
                                            type="button"
                                            className={`btn ${active ? 'btn-primary' : ''}`}
                                            style={compactNumberButtonStyle(active)}
                                            onClick={() => toggleSelectableNumber(
                                                'divisionDivisors',
                                                divisor,
                                                schoolCapabilities.division.selectableDivisors[0]
                                            )}
                                        >
                                            {divisor}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {unitConversionEnabled && (
                    <div>
                        <label>Podtémy premeny jednotiek</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '0.55rem' }}>
                            {UNIT_CONVERSION_CATEGORIES.map((category) => {
                                const activeCategories = schoolSettings.unitConversionCategories?.length
                                    ? schoolSettings.unitConversionCategories
                                    : UNIT_CONVERSION_CATEGORIES;
                                const active = activeCategories.includes(category);
                                return (
                                    <label
                                        key={category}
                                        className="flex items-center gap-2"
                                        style={{
                                            cursor: 'pointer',
                                            fontWeight: 'normal',
                                            margin: 0,
                                            padding: '0.55rem 0.65rem',
                                            borderRadius: '0.6rem',
                                            background: active ? 'rgba(59,130,246,0.16)' : 'rgba(255,255,255,0.06)',
                                            border: active ? '1px solid rgba(147,197,253,0.35)' : '1px solid rgba(255,255,255,0.08)',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={() => toggleUnitConversionCategory(category)}
                                        />
                                        <span>{UNIT_CONVERSION_CATEGORY_LABELS[category]}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {indianDivisionEnabled && (
                    <div className="p-2 border border-white/10 rounded">
                        <label>Indické delenie</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                            <div>
                                <span className="text-xs block mb-1">Max delenec</span>
                                <input
                                    type="number"
                                    className="input"
                                    min={10}
                                    max={9999}
                                    value={localInputs.schoolIndianDividend}
                                    onChange={(e) => setLocalInputs(prev => ({ ...prev, schoolIndianDividend: e.target.value }))}
                                    onBlur={() => handleSchoolIndianNumberBlur('schoolIndianDividend')}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                            <div>
                                <span className="text-xs block mb-1">Max deliteľ</span>
                                <input
                                    type="number"
                                    className="input"
                                    min={2}
                                    max={99}
                                    value={localInputs.schoolIndianDivisor}
                                    onChange={(e) => setLocalInputs(prev => ({ ...prev, schoolIndianDivisor: e.target.value }))}
                                    onBlur={() => handleSchoolIndianNumberBlur('schoolIndianDivisor')}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2" style={{ marginTop: '0.75rem' }}>
                            <input
                                type="checkbox"
                                checked={schoolSettings.allowIndianDivisionRemainder ?? false}
                                onChange={(e) => updateSchoolSettings({ allowIndianDivisionRemainder: e.target.checked })}
                            />
                            <span>Povoliť zvyšok vo výsledku</span>
                        </div>
                    </div>
                )}

                {longDivisionEnabled && (
                    <div className="p-2 border border-white/10 rounded">
                        <label>Klasické písomné delenie</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                            <div>
                                <span className="text-xs block mb-1">Max delenec</span>
                                <input
                                    type="number"
                                    className="input"
                                    min={10}
                                    max={9999}
                                    value={localInputs.schoolLongDividend}
                                    onChange={(e) => setLocalInputs(prev => ({ ...prev, schoolLongDividend: e.target.value }))}
                                    onBlur={() => handleSchoolLongNumberBlur('schoolLongDividend')}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                            <div>
                                <span className="text-xs block mb-1">Max deliteľ</span>
                                <input
                                    type="number"
                                    className="input"
                                    min={2}
                                    max={99}
                                    value={localInputs.schoolLongDivisor}
                                    onChange={(e) => setLocalInputs(prev => ({ ...prev, schoolLongDivisor: e.target.value }))}
                                    onBlur={() => handleSchoolLongNumberBlur('schoolLongDivisor')}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2" style={{ marginTop: '0.75rem' }}>
                            <input
                                type="checkbox"
                                checked={schoolSettings.allowLongDivisionRemainder ?? false}
                                onChange={(e) => updateSchoolSettings({ allowLongDivisionRemainder: e.target.checked })}
                            />
                            <span>Povoliť zvyšok vo výsledku</span>
                        </div>
                    </div>
                )}

                <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                        {isGrade1
                            ? 'Prvý ročník používa jednoduché sčítanie a odčítanie do 10 alebo do nastaveného limitu bez prechodu cez desiatku.'
                            : isGrade2
                        ? 'Generovanie používa iba jednoduché príklady s jednou operáciou. Limit "do N" určuje hornú hranicu výsledku pri sčítaní a hornú hranicu čísla, od ktorého sa odčítava.'
                        : schoolSettings.grade === 'grade3'
                            ? 'Tretí ročník je zameraný na násobilku, delenie a jednoduché sčítanie alebo odčítanie do 100.'
                        : schoolSettings.grade === 'grade4'
                            ? 'Štvrtý ročník má samostatne sčítanie/odčítanie, základnú násobilku/delenie a nové príklady s trojmiestnym číslom krát alebo delené jednomiestnym.'
                        : indianDivisionEnabled
                            ? 'Indické delenie ide krok po kroku. Žiak v každom kroku zadáva číslicu podielu a zvyšok, ktorý sa prenáša do ďalšieho kroku.'
                            : 'Generovanie používa iba jednoduché príklady s jednou operáciou. Pri delení je povolené len celočíselné delenie a výsledok je najviac 10.'}
                </div>

                {tutorialCategories.length > 0 && (
                    <button
                        type="button"
                        className="btn w-full"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                        onClick={onOpenTutorialLibrary}
                    >
                        Otvoriť tutoriály
                    </button>
                )}
            </motion.div>
        );
    };

    const renderCustomConfig = () => (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="card glass flex flex-col gap-4">
            <div>
                <label>Operácie</label>
                <div className="flex gap-2 flex-wrap">
                    {(['+', '-', '*', '/'] as MathOperation[]).map((op) => (
                        <button
                            key={op}
                            type="button"
                            className={`btn ${settings.allowedOperations.includes(op) ? 'btn-primary' : ''}`}
                            style={{ minWidth: '3rem', background: settings.allowedOperations.includes(op) ? '' : 'rgba(255,255,255,0.1)' }}
                            onClick={() => toggleOp(op)}
                        >
                            {op}
                        </button>
                    ))}
                </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={settings.allowParentheses || false}
                    onChange={e => updateSetting('allowParentheses', e.target.checked)}
                />
                <span>Povoliť zátvorky ( )</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={settings.allowCrossingTens !== false}
                    onChange={e => updateSetting('allowCrossingTens', e.target.checked)}
                />
                <span>Prechod cez desiatku (napr. 8+5, 14-6)</span>
            </div>

            <div className="grid-cols-2 gap-4" style={{ display: 'grid' }}>
                <div>
                    <label>Počet čísel (min 2)</label>
                    <input
                        type="number" className="input" min={2} max={10}
                        value={localInputs.maxNumbers}
                        onChange={e => handleNumberChange('maxNumbers', e.target.value)}
                        onBlur={() => handleNumberBlur('maxNumbers', 'maxNumbers', 2, 10)}
                        onFocus={(e) => e.target.select()}
                    />
                </div>
                <div>
                    <label>Limit výsledku (Sčítanie, min 10)</label>
                    <input
                        type="number" className="input" min={10}
                        value={localInputs.maxSumResult}
                        onChange={e => handleNumberChange('maxSumResult', e.target.value)}
                        onBlur={() => handleNumberBlur('maxSumResult', 'maxSumResult', 10)}
                        onFocus={(e) => e.target.select()}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.5rem', marginTop: '0.5rem' }}>
                <input
                    type="checkbox"
                    checked={settings.missingOperand || false}
                    onChange={e => updateSetting('missingOperand', e.target.checked)}
                />
                <span style={{ fontWeight: 'bold' }}>Doplňovačka (1 + ? = 2)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                    <input
                        type="checkbox"
                        checked={settings.allowNegativeIntermediates}
                        onChange={e => updateSetting('allowNegativeIntermediates', e.target.checked)}
                    />
                    <span style={{ fontSize: '0.9rem' }}>Záporné medzivýsledky</span>
                </div>
                <div className="flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                    <input
                        type="checkbox"
                        checked={settings.allowNegativeResult}
                        onChange={e => updateSetting('allowNegativeResult', e.target.checked)}
                    />
                    <span style={{ fontSize: '0.9rem' }}>Záporný výsledok</span>
                </div>
            </div>

            {settings.allowedOperations.includes('*') && (
                <div className="p-2 border border-white/10 rounded">
                    <label className="text-sm text-blue-300">Pravidlá násobenia</label>
                    <div className="grid-cols-2 gap-2 mt-2" style={{ display: 'grid' }}>
                        <div>
                            <span className="text-xs block mb-1">Max súčin</span>
                            <input
                                type="number" className="input"
                                value={localInputs.maxMulProduct}
                                onChange={e => handleNumberChange('maxMulProduct', e.target.value)}
                                onBlur={() => handleNumberBlur('maxMulProduct', 'maxMulProduct', 10, 1000)}
                                onFocus={(e) => e.target.select()}
                            />
                        </div>
                        <div>
                            <span className="text-xs block mb-1">Max činiteľ</span>
                            <input
                                type="number" className="input"
                                value={localInputs.maxOneNumberInMul}
                                onChange={e => handleNumberChange('maxOneNumberInMul', e.target.value)}
                                onBlur={() => handleNumberBlur('maxOneNumberInMul', 'maxOneNumberInMul', 2, 100)}
                                onFocus={(e) => e.target.select()}
                            />
                        </div>
                    </div>
                </div>
            )}

            {settings.allowedOperations.includes('/') && (
                <div className="p-2 border border-white/10 rounded">
                    <label className="text-sm text-purple-300">Pravidlá delenia</label>
                    <div className="mt-2 text-xs">
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                type="checkbox"
                                checked={settings.requireIntegerDivision}
                                onChange={e => updateSetting('requireIntegerDivision', e.target.checked)}
                            />
                            <span>Len celé čísla</span>
                        </div>
                        <div>
                            <span>Max deliteľ</span>
                            <input
                                type="number" className="input mt-1"
                                value={localInputs.maxDivisor}
                                onChange={e => handleNumberChange('maxDivisor', e.target.value)}
                                onBlur={() => handleNumberBlur('maxDivisor', 'maxDivisor', 2, 100)}
                                onFocus={(e) => e.target.select()}
                            />
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );

    return (
        <div className="flex flex-col gap-4" style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '2rem' }}>
            <div className="flex justify-between items-center glass p-4" style={{ borderRadius: '1rem' }}>
                <div className="flex items-center gap-2">
                    <div className="btn" style={{ padding: '0.5rem', background: '#3b82f6' }}>
                        <span style={{ fontWeight: 800 }}>{profile.name[0].toUpperCase()}</span>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{profile.name}</span>
                </div>
                <button type="button" onClick={onLogout} className="btn" style={{ padding: '0.5rem', background: 'transparent', color: '#ef4444' }}>
                    <LogOut size={20} />
                </button>
            </div>

            <div className="card glass">
                <h2 className="text-center">Začať tréning</h2>
                <div className="flex flex-col gap-4">
                    <label className="text-center">Koľko príkladov?</label>
                    <div className="flex justify-center gap-2">
                        {[5, 10, 20, 50].map(n => (
                            <button
                                key={n}
                                type="button"
                                className={`btn ${effectiveProblemCount === n ? 'btn-primary' : ''}`}
                                style={{ background: effectiveProblemCount === n ? '' : 'rgba(255,255,255,0.1)' }}
                                onClick={() => {
                                    if (effectiveMode === 'school') {
                                        updateSchoolSettings({ problemCount: n });
                                    } else {
                                        updateSetting('problemCount', n);
                                    }
                                }}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <div>
                        <label className="text-center">Režim tréningu</label>
                        <div className="flex gap-2">
                            {([
                                { value: 'learn', label: 'Učím sa' },
                                { value: 'test', label: 'Testujem sa' },
                                { value: 'lightning', label: 'Bleskovka' },
                            ] as { value: TrainingMode; label: string }[]).map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`btn w-full ${effectiveTrainingMode === option.value ? 'btn-primary' : ''}`}
                                    style={{ background: effectiveTrainingMode === option.value ? '' : 'rgba(255,255,255,0.1)', fontSize: '0.9rem', padding: '0.75rem 0.25rem' }}
                                    onClick={() => updateTrainingMode(option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-center">Spôsob počítania</label>
                        <div className="flex gap-2 flex-wrap">
                            {([
                                { value: 'classic', label: 'Klasické príklady' },
                                { value: 'grid_puzzle', label: 'Mriežková hra' },
                            ] as { value: PracticeStyle; label: string }[]).map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`btn ${effectivePracticeStyle === option.value ? 'btn-primary' : ''}`}
                                    style={{
                                        background: effectivePracticeStyle === option.value ? '' : 'rgba(255,255,255,0.1)',
                                        flex: '1 1 11rem',
                                        minWidth: 0,
                                    }}
                                    onClick={() => updatePracticeStyle(option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary w-full mt-2"
                        disabled={!canStartTraining}
                        style={!canStartTraining ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                        onClick={() => {
                            const settingsForGame = effectiveMode === 'school'
                                ? resolveProfileConstraints({
                                    ...profile,
                                    mode: 'school',
                                    settings,
                                    schoolSettings,
                                })
                                : settings;
                            onStart(
                                settingsForGame.problemCount || (settings.problemCount || 10),
                                settingsForGame.practiceStyle ?? effectivePracticeStyle,
                                settingsForGame
                            );
                        }}
                    >
                        <Play size={20} className="mr-2" />
                        Štart
                    </button>
                    {!canStartTraining && (
                        <div className="text-center text-sm text-yellow-200">
                            Vyber aspoň jeden typ príkladov.
                        </div>
                    )}
                </div>
            </div>

            {profile.progress && (
                <div className="card glass">
                    <h2 className="text-center">Pokrok</h2>
                    <div style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                        Dokončené tréningy: {profile.progress.sessionsCompleted}
                    </div>
                    {weakestProgressTopics.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {weakestProgressTopics.map(item => (
                                <div key={item.topic} className="flex justify-between" style={{ background: 'rgba(255,255,255,0.06)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                    <span>{getTopicLabel(item.topic)}</span>
                                    <span style={{ color: item.accuracy < 70 ? '#fca5a5' : '#cbd5e1' }}>{item.accuracy}%</span>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn btn-primary w-full"
                                onClick={onStartRecommended}
                            >
                                <Play size={20} className="mr-2" />
                                Trénovať slabé témy
                            </button>
                            <button
                                type="button"
                                className="btn w-full"
                                style={{ background: 'rgba(255,255,255,0.1)' }}
                                onClick={onOpenProgress}
                            >
                                <BarChart3 size={20} className="mr-2" />
                                Zobraziť štatistiky
                            </button>
                        </div>
                    ) : (
                        <div style={{ color: '#cbd5e1' }}>Po prvom tréningu sa tu zobrazia témy na precvičenie.</div>
                    )}
                </div>
            )}

            <div className="card glass">
                <label>Režim profilu</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        className={`btn w-full ${effectiveMode === 'school' ? 'btn-primary' : ''}`}
                        style={{ background: effectiveMode === 'school' ? '' : 'rgba(255,255,255,0.1)' }}
                        onClick={() => updateMode('school')}
                    >
                        Školský
                    </button>
                    <button
                        type="button"
                        className={`btn w-full ${effectiveMode === 'custom' ? 'btn-primary' : ''}`}
                        style={{ background: effectiveMode === 'custom' ? '' : 'rgba(255,255,255,0.1)' }}
                        onClick={() => updateMode('custom')}
                    >
                        Vlastný
                    </button>
                </div>
            </div>

            <button
                type="button"
                className="btn w-full"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onClick={onOpenContent}
            >
                <BookOpen size={20} className="mr-2" />
                Obsah pre rodiča/učiteľa
            </button>

            <button
                type="button"
                className="btn w-full justify-between"
                style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontWeight: 600,
                    color: 'white'
                }}
                onClick={() => setShowConfig(!showConfig)}
            >
                <div className="flex items-center gap-2">
                    <Settings size={20} />
                    <span>{effectiveMode === 'school' ? 'Školské nastavenia' : 'Nastavenia obťažnosti'}</span>
                </div>
                <span>{showConfig ? 'Skryť' : 'Upraviť'}</span>
            </button>

            {showConfig && (effectiveMode === 'school' ? renderSchoolConfig() : renderCustomConfig())}

            <div
                style={{
                    color: '#94a3b8',
                    fontSize: '0.78rem',
                    textAlign: 'center',
                    lineHeight: 1.45,
                    paddingBottom: '0.5rem',
                }}
            >
                Build v{__APP_VERSION__} · {new Date(__BUILD_TIME__).toLocaleString('sk-SK')}
                {effectiveMode === 'school' && (
                    <div>Témy: {schoolSettings.enabledTopics.join(', ') || 'žiadne'}</div>
                )}
            </div>
        </div>
    );
};

export default SettingsForm;
