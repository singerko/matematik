import React from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { type TutorialCategory, type TutorialId, type TutorialAudience } from '../lib/types';

interface Props {
    grade: TutorialAudience;
    categories: TutorialCategory[];
    onBack: () => void;
    onOpenTutorial: (tutorialId: TutorialId) => void;
}

const gradeLabel = (grade: TutorialAudience) => {
    if (grade === 'grade1') return '1. ročník';
    if (grade === 'grade2') return '2. ročník';
    if (grade === 'grade3') return '3. ročník';
    if (grade === 'grade4') return '4. ročník';
    return '5. ročník';
};

const TutorialLibrary: React.FC<Props> = ({ grade, categories, onBack, onOpenTutorial }) => (
    <div className="flex flex-col gap-4" style={{ maxWidth: '760px', margin: '0 auto', paddingBottom: '2rem' }}>
        <div className="glass card flex justify-between items-center">
            <button type="button" className="btn" onClick={onBack}>
                <ArrowLeft size={18} />
                <span style={{ marginLeft: '0.5rem' }}>Späť</span>
            </button>
            <div className="text-center">
                <div style={{ fontWeight: 800 }}>Tutoriály</div>
                <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>{gradeLabel(grade)}</div>
            </div>
            <div style={{ width: '72px' }} />
        </div>

        {categories.length === 0 ? (
            <div className="glass card text-center" style={{ color: '#cbd5e1' }}>
                Pre tento ročník zatiaľ nie sú pripravené žiadne tutoriály.
            </div>
        ) : (
            categories.map(category => (
                <div key={category.id} className="glass card flex flex-col gap-3">
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{category.title}</div>
                    {category.items.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            className="btn"
                            style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                textAlign: 'left',
                                background: 'rgba(255,255,255,0.08)',
                                padding: '1rem',
                                color: '#f8fafc',
                                border: '1px solid rgba(148,163,184,0.22)',
                            }}
                            onClick={() => onOpenTutorial(item.id)}
                        >
                            <BookOpen size={18} color="#cbd5e1" />
                            <span style={{ marginLeft: '0.75rem' }}>
                                <span style={{ display: 'block', fontWeight: 800, color: '#f8fafc' }}>{item.title}</span>
                                <span style={{ display: 'block', color: '#cbd5e1', fontSize: '0.95rem' }}>{item.description}</span>
                            </span>
                        </button>
                    ))}
                </div>
            ))
        )}
    </div>
);

export default TutorialLibrary;
