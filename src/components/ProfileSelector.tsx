/**
 * SÚBOR: ProfileSelector.tsx
 * ČO TO JE: Obrazovka "Kto som".
 * 
 * Tu sa aplikácia pýta, kto sa ide hrať.
 * Buď si vyberieš už existujúce meno, alebo si vytvoríš nové.
 */

import React, { useState, useEffect } from 'react';
import { getProfiles, createProfile } from '../lib/storage';
import { type Profile, type ProfileMode, type SchoolGrade } from '../lib/types';
import { createDefaultSchoolSettings } from '../lib/schoolRules';
import { User, Plus, ChevronRight, Github } from 'lucide-react'; // Ikonky
import { SingerLandLogo } from './SingerLandLogo';

interface Props {
    onSelect: (profile: Profile) => void; // Funkcia, ktorú zavoláme, keď si niekoho vyberieme.
}

const ProfileSelector: React.FC<Props> = ({ onSelect }) => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isCreating, setIsCreating] = useState(false); // Či práve píšeme nové meno.
    const [newName, setNewName] = useState('');
    const [mode, setMode] = useState<ProfileMode>('school');
    const [grade, setGrade] = useState<SchoolGrade | null>(null);

    // "useEffect" je špeciálna funkcia Reactu. Spustí sa len raz - keď sa táto obrazovka objaví.
    // Povieme jej: "Načítaj zoznam ľudí z pamäte".
    useEffect(() => {
        setProfiles(getProfiles());
    }, []);

    // Keď stlačíme "Vytvoriť".
    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault(); // Zastaví štandardné odoslanie formulára (aby sa nestránka neobnovila).
        if (!newName.trim()) return; // Ak je meno prázdne, nič nerob.
        if (mode === 'school' && !grade) return; // Ak je školský režim, ročník je povinný.
        const p = createProfile(newName.trim(), mode === 'school' && grade ? {
            mode,
            schoolSettings: createDefaultSchoolSettings(grade)
        } : {
            mode: 'custom',
        }); // Vyrobíme nový profil v "storage.ts".
        setProfiles(getProfiles()); // A znova načítame zoznam, aby sme tam videli aj seba.
        setIsCreating(false);
        setNewName('');
        setGrade(null);
        onSelect(p); // A hneď ho aj vyberieme.
    };

    // Čo sa zobrazí na obrazovke:
    return (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: '80vh' }}>
            <div className="card glass" style={{ width: '100%', maxWidth: '400px' }}>
                <div className="flex justify-center" style={{ marginBottom: '0.5rem' }}>
                    <SingerLandLogo subtitle="matematik" size="lg" />
                </div>
                <h2 className="text-center" style={{ color: '#94a3b8' }}>Kto ide počítať?</h2>

                <div className="flex flex-col gap-2 mt-4">
                    {profiles.map(p => (
                        <button key={p.id} className="btn config-item justify-between" onClick={() => onSelect(p)} style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                            <div className="flex items-center gap-2">
                                <User size={20} />
                                <span>{p.name}</span>
                            </div>
                            <ChevronRight size={20} />
                        </button>
                    ))}
                </div>

                {isCreating ? (
                    <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-2">
                        <input
                            autoFocus
                            className="input"
                            placeholder="Zadaj meno..."
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                        <div>
                            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Typ profilu</div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className={`btn w-full ${mode === 'school' ? 'btn-primary' : ''}`}
                                    style={{ background: mode === 'school' ? '' : 'rgba(255,255,255,0.08)' }}
                                    onClick={() => setMode('school')}
                                >
                                    Školský
                                </button>
                                <button
                                    type="button"
                                    className={`btn w-full ${mode === 'custom' ? 'btn-primary' : ''}`}
                                    style={{ background: mode === 'custom' ? '' : 'rgba(255,255,255,0.08)' }}
                                    onClick={() => setMode('custom')}
                                >
                                    Vlastný
                                </button>
                            </div>
                        </div>
                        {mode === 'school' && (
                            <div>
                                <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Ročník</div>
                                <div className="flex gap-2">
                                    {(['grade1', 'grade2', 'grade3', 'grade4', 'grade5'] as const).map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            className={`btn w-full ${grade === option ? 'btn-primary' : ''}`}
                                            style={{ background: grade === option ? '' : 'rgba(255,255,255,0.08)' }}
                                            onClick={() => setGrade(option)}
                                        >
                                            {option === 'grade1' ? '1. ročník' : option === 'grade2' ? '2. ročník' : option === 'grade3' ? '3. ročník' : option === 'grade4' ? '4. ročník' : '5. ročník'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {mode === 'school' && !grade && (
                            <div style={{ color: '#facc15', fontSize: '0.85rem', textAlign: 'center' }}>
                                Vyber ročník, aby sme nastavili správnu obťažnosť.
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button type="button" className="btn w-full" style={{ background: '#334155' }} onClick={() => setIsCreating(false)}>Zrušiť</button>
                            <button
                                type="submit"
                                className="btn btn-primary w-full"
                                disabled={!newName.trim() || (mode === 'school' && !grade)}
                                style={(!newName.trim() || (mode === 'school' && !grade)) ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                            >
                                Vytvoriť
                            </button>
                        </div>
                    </form>
                ) : (
                    <button className="btn btn-primary w-full mt-4" onClick={() => setIsCreating(true)}>
                        <Plus size={20} className="mr-2" />
                        Nový profil
                    </button>
                )}
            </div>
            <a
                href="http://github.com/singerko/matematik"
                target="_blank"
                rel="noreferrer"
                className="btn"
                style={{
                    marginTop: '1rem',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255,255,255,0.12)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                }}
            >
                <Github size={18} className="mr-2" />
                GitHub projekt
            </a>
        </div>
    );
};

export default ProfileSelector;
