/**
 * SÚBOR: Summary.tsx
 * ČO TO JE: Vysvedčenie.
 * 
 * Táto obrazovka sa ukáže na konci hry.
 * Spúčíta, koľko si mal správne a dá ti známku (percentá).
 */

import React from 'react';
import { type ErrorDiagnosisCode, type Problem, type TrainingResult } from '../lib/types';
import { Trophy, Home, Star, Flame } from 'lucide-react';
import { explainProblem, getDiagnosisLabel, getProblemTopic, getTopicLabel } from '../lib/explanations';
import { computeBestStreak, computeStars } from '../lib/progress';
import { speakText } from '../lib/speech';
import { getProblemMetadata } from '../lib/problemMetadata';

interface Props {
    results: TrainingResult[]; // Zoznam všetkých tvojich odpovedí.
    onBack: () => void; // Tlačidlo "Domov".
    onPracticeRecommended?: (results: TrainingResult[]) => void;
}

const Summary: React.FC<Props> = ({ results, onBack, onPracticeRecommended }) => {
    // Spočítame, koľko je "correct" (správnych).
    const correctCount = results.filter(r => r.correct).length;
    const total = results.length;

    // Vypočítame percentá (matematika v praxi!).
    const percentage = total === 0 ? 0 : Math.round((correctCount / total) * 100);

    React.useEffect(() => {
        const message = percentage === 100
            ? 'Gratulujem! Všetko si vypočítal bez chyby. Si hviezda!'
            : percentage >= 75
                ? `Skvelý výkon! Máš ${percentage} percent správne.`
                : 'Dobrá práca. Nabudúce to bude ešte lepšie!';
        speakText(message);
    }, [percentage]);

    const stars = computeStars(results);
    const streak = computeBestStreak(results);
    const wrongResults = results.filter(r => !r.correct);
    const wrongTopics = wrongResults.reduce<Record<string, number>>((acc, result) => {
        const topic = getProblemTopic(result.problem);
        acc[topic] = (acc[topic] ?? 0) + 1;
        return acc;
    }, {});
    const weakestTopics = Object.entries(wrongTopics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2);
    const diagnosisCounts = wrongResults.reduce<Record<string, number>>((acc, result) => {
        const code = result.diagnosisCode ?? 'unknown';
        acc[code] = (acc[code] ?? 0) + 1;
        return acc;
    }, {});
    const mostCommonDiagnoses = Object.entries(diagnosisCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    const recommendations = Array.from(new Set(
        wrongResults
            .slice(0, 3)
            .map(result => explainProblem(result.problem).recommendation)
    ));

    const getCorrectAnswerLabel = (problem: Problem) => {
        const metadata = getProblemMetadata(problem);
        if (metadata?.type === 'arabic_to_roman') {
            return metadata.roman;
        }

        if (problem.kind === 'indian_division' && problem.indianDivision) {
            return problem.indianDivision.allowFinalRemainder
                ? `výsledok ${problem.indianDivision.quotient}, zvyšok ${problem.indianDivision.remainder}`
                : `výsledok ${problem.indianDivision.quotient}, zvyšok ${problem.indianDivision.remainder}`;
        }

        if (problem.kind === 'long_division' && problem.longDivision) {
            return `výsledok ${problem.longDivision.quotient}, zvyšok ${problem.longDivision.remainder}`;
        }

        return `${problem.result}`;
    };

    return (
        <div className="flex flex-col items-center p-4 gap-6" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="text-center mt-8">
                <Trophy size={64} className="text-yellow-400 mx-auto mb-4" />
                <h1 className="text-4xl mb-2">Výborná práca!</h1>
                <div className="text-6xl font-black text-blue-400">{percentage}%</div>
                <p className="text-gray-400">Vyriešené {correctCount} z {total} príkladov správne.</p>
                <div className="flex justify-center items-center gap-2 mt-4">
                    {[1, 2, 3].map(i => (
                        <Star
                            key={i}
                            size={36}
                            fill={i <= stars ? '#facc15' : 'transparent'}
                            color={i <= stars ? '#facc15' : '#475569'}
                            strokeWidth={2}
                        />
                    ))}
                </div>
                <div className="text-sm text-gray-300 mt-2">
                    {stars === 3 && 'Všetky príklady správne — tri hviezdy!'}
                    {stars === 2 && 'Skvelý výkon — dve hviezdy.'}
                    {stars === 1 && 'Dobrá práca — jedna hviezda.'}
                    {stars === 0 && 'Skús to nabudúce ešte raz, hviezdy ťa čakajú.'}
                </div>
                {streak >= 3 && (
                    <div className="flex justify-center items-center gap-1 mt-2 text-orange-300">
                        <Flame size={18} />
                        <span>Najdlhšia séria správnych odpovedí: {streak}</span>
                    </div>
                )}
            </div>

            {wrongResults.length > 0 ? (
                <div className="w-full p-4 rounded-lg" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(147,197,253,0.25)' }}>
                    <div className="font-bold text-lg mb-2">Čo trénovať ďalej</div>
                    {weakestTopics.length > 0 && (
                        <div className="text-sm text-blue-100 mb-2">
                            Najviac chýb bolo v témach: {weakestTopics.map(([topic, count]) => `${getTopicLabel(topic)} (${count})`).join(', ')}.
                        </div>
                    )}
                    {mostCommonDiagnoses.length > 0 && (
                        <div className="text-sm text-blue-100 mb-2">
                            Typy chýb: {mostCommonDiagnoses.map(([code, count]) => `${getDiagnosisLabel(code as ErrorDiagnosisCode)} (${count})`).join(', ')}.
                        </div>
                    )}
                    {recommendations.map((recommendation, index) => (
                        <div key={index} className="text-sm text-gray-200">- {recommendation}</div>
                    ))}
                </div>
            ) : (
                <div className="w-full p-4 rounded-lg text-center" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(134,239,172,0.25)' }}>
                    Všetky príklady boli správne. Nabudúce môžeš zvýšiť počet príkladov alebo pridať ťažšiu tému.
                </div>
            )}

            <div className="w-full flex flex-col gap-2">
                {results.map((r, i) => (
                    <div key={i} className={`p-4 rounded-lg flex justify-between items-center ${r.correct ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                        <div>
                            <div className="font-bold text-lg">{r.problem.expression}</div>
                            {r.problem.kind === 'indian_division' && r.problem.indianDivision && (
                                <div className="text-sm text-blue-300">
                                    Správne: výsledok {r.problem.indianDivision.quotient}, zvyšok {r.problem.indianDivision.remainder}
                                </div>
                            )}
                            {r.problem.kind === 'long_division' && r.problem.longDivision && (
                                <div className="text-sm text-blue-300">
                                    Správne: výsledok {r.problem.longDivision.quotient}, zvyšok {r.problem.longDivision.remainder}
                                </div>
                            )}
                            {!r.correct && (
                                <>
                                    <div className="text-sm text-red-400">Tvoja odpoveď: {r.userAnswer}</div>
                                    {r.diagnosis && (
                                        <div className="text-sm text-yellow-200">
                                            {r.diagnosisTitle && <strong>{r.diagnosisTitle}: </strong>}
                                            {r.diagnosis}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="font-mono font-bold text-xl">
                            {r.correct ? (
                                <span className="text-green-400">✓</span>
                            ) : (
                                <span className="text-red-400">
                                    = {getCorrectAnswerLabel(r.problem)}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <button className="btn btn-primary w-full max-w-sm" onClick={onBack}>
                <Home size={20} className="mr-2" />
                Domov
            </button>
            {wrongResults.length > 0 && onPracticeRecommended && (
                <button className="btn w-full max-w-sm" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => onPracticeRecommended(results)}>
                    Trénovať odporúčané
                </button>
            )}
        </div>
    );
};

export default Summary;
