import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { GRADE_CONTENT } from '../lib/contentOverview';

interface Props {
    onBack: () => void;
}

const ContentOverview: React.FC<Props> = ({ onBack }) => (
    <div className="flex flex-col gap-4" style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '2rem' }}>
        <div className="glass card flex justify-between items-center">
            <button type="button" className="btn" onClick={onBack}>
                <ArrowLeft size={18} />
                <span style={{ marginLeft: '0.5rem' }}>Späť</span>
            </button>
            <div className="text-center">
                <div style={{ fontWeight: 800 }}>Obsah aplikácie</div>
                <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>pre rodiča alebo učiteľa</div>
            </div>
            <div style={{ width: '72px' }} />
        </div>

        {GRADE_CONTENT.map(grade => (
            <div key={grade.grade} className="glass card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{grade.label}</div>
                        <div style={{ color: '#cbd5e1', lineHeight: 1.45 }}>{grade.goal}</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    {grade.sections.map(section => (
                        <div key={section.title} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1rem' }}>
                            <div style={{ fontWeight: 800, marginBottom: '0.5rem' }}>{section.title}</div>
                            {section.items.map(item => (
                                <div key={item} style={{ color: '#cbd5e1', marginBottom: '0.35rem' }}>- {item}</div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

export default ContentOverview;
