import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Backpack, Delete, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateProblem } from '../lib/generator';
import { diagnoseAnswerDetailed, isAnswerCorrect } from '../lib/explanations';
import { type Constraints, type Problem, type TrainingResult } from '../lib/types';
import RunnerFox from './RunnerFox';

interface Props { settings: Constraints; totalProblems: number; onComplete: (results: TrainingResult[]) => void; onExit: () => void; }
const WORLDS = [
    ['Letná lúka','world-summer','Bobor mostár','🌉','🍎'], ['Jesenný les','world-autumn','Sova strážkyňa','🪵','🍂'],
    ['Zimné hory','world-winter','Tučniak prievozník','🛷','❄️'], ['Jarná záhrada','world-spring','Žabka pri potoku','🪷','🌷'],
    ['Púštne mesto','world-desert','Ťava karavanárka','🏜️','💎'], ['Ľadové kráľovstvo','world-ice','Ľadový čarodej','🏰','🔷'],
    ['Kozmická stanica','world-space','Robot navigátor','🚀','⭐'],
] as const;
const makeProblems = (settings: Constraints, count: number) => Array.from({ length: count }, () => generateProblem(settings));

const PlatformAdventureSession: React.FC<Props> = ({ settings, totalProblems, onComplete, onExit }) => {
    const worldCount = Math.min(7, Math.max(1, Math.ceil(totalProblems / 5)));
    const initialPerWorld = Math.max(1, Math.ceil(totalProblems / worldCount));
    const [worldIndex, setWorldIndex] = useState(0);
    const [groundProblems, setGroundProblems] = useState(() => makeProblems(settings, initialPerWorld));
    const [groundIndex, setGroundIndex] = useState(0);
    const [inventory, setInventory] = useState<Problem[]>([]);
    const [position, setPosition] = useState(5);
    const [direction, setDirection] = useState<1 | -1>(1);
    const [jumping, setJumping] = useState(false);
    const [onPlatform, setOnPlatform] = useState(false);
    const swipeStart = useRef<number | null>(null);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState('');
    const [paid, setPaid] = useState(0);
    const [results, setResults] = useState<TrainingResult[]>([]);
    const [gateOpen, setGateOpen] = useState(false);
    const [gateMessage, setGateMessage] = useState('');
    const [finished, setFinished] = useState(false);
    const [name, worldClass, guide, gate, item] = WORLDS[worldIndex];
    // Sprievodca nikdy nepýta celú bežnú zásobu z úseku: dieťaťu zostáva
    // rezerva na chybu aj pár žetónov do ďalšieho sveta.
    const paymentTarget = initialPerWorld <= 2
        ? 1
        : Math.min(5, Math.max(2, Math.floor(initialPerWorld * 0.6)));
    const currentProblem = inventory[0];
    const targetPosition = groundProblems.length <= 1 ? 145 : 35 + (groundIndex / (groundProblems.length - 1)) * 210;
    const camera = Math.max(0, Math.min(200, position - 25));
    const screenPosition = position - camera;
    const platformPositions = [62, 118, 174, 230];

    const jump = useCallback(() => {
        if (paymentOpen || jumping || finished) return;
        setOnPlatform(false); setJumping(true);
        window.setTimeout(() => {
            setJumping(false);
            setPosition(current => {
                if (platformPositions.some(platform => Math.abs(platform - current) < 12)) setOnPlatform(true);
                return current;
            });
        }, 520);
    }, [finished, jumping, paymentOpen]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft' || e.key === 'a') setDirection(-1); if (e.key === 'ArrowRight' || e.key === 'd') setDirection(1); if (e.key === 'ArrowUp' || e.key === ' ') jump(); };
        window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
    }, [jump]);

    useEffect(() => {
        if (paymentOpen || gateMessage || finished) return;
        let frame = 0;
        let previous = performance.now();
        const animate = (now: number) => {
            const delta = Math.min(32, now - previous);
            previous = now;
            setPosition(old => {
            const next = old + direction * delta * 0.021;
            if (next <= 3) { setDirection(1); return 3; }
            if (!gateOpen && next >= 280) return 280;
            return Math.min(296, next);
            });
            frame = window.requestAnimationFrame(animate);
        };
        frame = window.requestAnimationFrame(animate);
        return () => window.cancelAnimationFrame(frame);
    }, [direction, finished, gateMessage, gateOpen, paymentOpen]);

    useEffect(() => {
        if (onPlatform && !platformPositions.some(platform => Math.abs(platform - position) < 13)) setOnPlatform(false);
    }, [onPlatform, position]);

    // Zbieranie iba vloží príklad do batoha. Počíta sa až pri prechode.
    useEffect(() => {
        if (groundIndex < groundProblems.length && Math.abs(position - targetPosition) <= 2.5) {
            setInventory(old => [...old, groundProblems[groundIndex]]); setGroundIndex(i => i + 1);
        }
    }, [groundIndex, groundProblems, position, targetPosition]);

    useEffect(() => {
        if (groundIndex >= groundProblems.length && position >= 278 && !gateMessage && !paymentOpen && !gateOpen) {
            if (inventory.length) { setPaymentOpen(true); setAnswer(''); setFeedback(''); }
            else setGateMessage(`${guide}: Batoh je prázdny. Vráť sa po príklady.`);
        }
    }, [gateMessage, gateOpen, groundIndex, groundProblems.length, guide, inventory.length, paymentOpen, position]);

    const submit = () => {
        if (!currentProblem || !answer.trim() || feedback) return;
        const userAnswer = Number(answer), correct = isAnswerCorrect(currentProblem, userAnswer);
        const diagnosis = correct ? undefined : diagnoseAnswerDetailed(currentProblem, userAnswer);
        const nextPaid = paid + (correct ? 1 : 0), left = inventory.slice(1);
        setResults(old => [...old, { problem: currentProblem, userAnswer, correct, diagnosis: diagnosis?.message, diagnosisCode: diagnosis?.code, diagnosisTitle: diagnosis?.title }]);
        setInventory(left); setPaid(nextPaid);
        setFeedback(correct ? 'Správne! Jeden príklad je zaplatený.' : `Žetón sa minul. Správne bolo ${currentProblem.result}.`);
        window.setTimeout(() => {
            if (nextPaid >= paymentTarget) { setPaymentOpen(false); setGateOpen(true); setGateMessage(`${guide}: Ďakujem! Prechod je otvorený.`); }
            else if (!left.length) { setPaymentOpen(false); setGateMessage(`${guide}: Máš ${nextPaid} z ${paymentTarget}. Nazbieraj ďalšie príklady.`); }
            else { setAnswer(''); setFeedback(''); }
        }, 800);
    };

    const continueGate = () => {
        if (!gateOpen) {
            const count = Math.max(2, paymentTarget - paid + 1); setGroundProblems(makeProblems(settings, count)); setGroundIndex(0); setPosition(5); setDirection(1); setGateMessage(''); return;
        }
        if (worldIndex + 1 >= worldCount) { setGateMessage(''); setFinished(true); return; }
        setWorldIndex(i => i + 1); setGroundProblems(makeProblems(settings, initialPerWorld)); setGroundIndex(0); setPosition(5); setDirection(1); setPaid(0); setGateOpen(false); setGateMessage('');
    };

    if (finished) return <div className="platform-diploma"><div className="diploma-stars">★ ★ ★</div><Trophy size={72}/><div className="diploma-kicker">DIPLOM</div><h1>Matematik 1. úrovne</h1><p>Zvládol si všetky matematické svety. V batohu zostalo {inventory.length} príkladov.</p><button className="btn btn-primary" onClick={() => onComplete(results)}>Prevziať diplom</button></div>;

    return <div className={`platform-session ${worldClass}`}>
        <div className="platform-topbar"><button className="btn-sm" onClick={onExit}>← Odísť</button><div><strong>{name}</strong><small>Svet {worldIndex + 1} z {worldCount}</small></div><div className="platform-score"><Backpack size={16}/> {inventory.length}</div></div>
        <div className="platform-scene" onPointerDown={event => { swipeStart.current = event.clientX; }} onPointerUp={event => { if (swipeStart.current !== null && Math.abs(event.clientX-swipeStart.current)>25) setDirection(event.clientX>swipeStart.current?1:-1); swipeStart.current=null; }}><div className="scene-sun"/><div className="scene-cloud cloud-one">☁</div><div className="scene-cloud cloud-two">☁</div><div className="scene-hills"/><div className="platform-ground"/>
            {platformPositions.map((worldX,i) => <div key={worldX} className="floating-platform" style={{left:`${worldX-camera}%`,bottom:`${24+(i%2)*9}%`}}/>)}
            {groundIndex < groundProblems.length && <motion.div className="math-collectible" style={{left:`${targetPosition-camera}%`}} animate={{y:[0,-8,0]}} transition={{repeat:Infinity,duration:1.2}}><span>{item}</span><b>?</b></motion.div>}
            <div className={`platform-hero ${jumping?'is-jumping':''} ${onPlatform?'on-platform':''}`} style={{left:`${screenPosition}%`}}><RunnerFox jumping={jumping} onPlatform={onPlatform} direction={direction}/></div><div className={`platform-gate ${gateOpen?'gate-open':''}`} style={{left:`${285-camera}%`,right:'auto'}}><span>{gate}</span><b>{gateOpen?'VOĽNÉ':`${paid}/${paymentTarget}`}</b></div><div className="platform-guide" style={{left:`${272-camera}%`,right:'auto'}}><span>🧙</span><small>{guide}</small></div>
        </div>
        <div className="platform-hint">Bežíš {direction>0?'doprava →':'← doľava'} · potiahnutím zmeníš smer</div><div className="platform-controls platform-controls-runner"><button className="jump-button" onClick={jump}>SKOK</button></div>
        <AnimatePresence>
            {paymentOpen && currentProblem && <motion.div className="platform-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}}><motion.div className="platform-quiz" initial={{scale:.8}} animate={{scale:1}}><div className="quiz-loot">{guide} potrebuje {paymentTarget} správnych príkladov</div><div className="payment-progress">Zaplatené: {paid}/{paymentTarget} · V batohu: {inventory.length}</div><div className={`quiz-expression ${currentProblem.kind === 'word_problem' || currentProblem.expression.length > 32 ? 'quiz-expression-long' : ''}`}>{currentProblem.expression.replace(/\*/g,'×').replace(/\//g,'÷')}</div><div className="quiz-answer">{answer||'?'}</div>{feedback?<div className={feedback.startsWith('Správne')?'quiz-correct':'quiz-wrong'}>{feedback}</div>:<><div className="platform-numberpad">{[1,2,3,4,5,6,7,8,9,0].map(n=><button key={n} onClick={()=>setAnswer(a=>`${a}${n}`)}>{n}</button>)}<button onClick={()=>setAnswer(a=>a.slice(0,-1))}><Delete size={20}/></button></div><button className="btn btn-primary w-full" onClick={submit}>Použiť príklad</button></>}</motion.div></motion.div>}
            {gateMessage && <motion.div className="platform-modal-backdrop" initial={{opacity:0}} animate={{opacity:1}}><div className="platform-gate-card"><div className="gate-character">🧙 {gate}</div><h2>{gateOpen?'Prechod otvorený!':'Treba doplniť batoh'}</h2><p>{gateMessage}</p><button className="btn btn-primary w-full" onClick={continueGate}>{gateOpen?'Pokračovať':'Vrátiť sa po príklady'}</button></div></motion.div>}
        </AnimatePresence>
    </div>;
};
export default PlatformAdventureSession;
