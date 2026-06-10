import React from 'react';

interface SingerLandLogoProps {
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SingerLandLogo: React.FC<SingerLandLogoProps> = ({ subtitle, size = 'md' }) => {
  const fontSizes = {
    sm: { brand: '1.4rem', sub: '0.55rem' },
    md: { brand: '1.8rem', sub: '0.65rem' },
    lg: { brand: '2.6rem', sub: '0.85rem' },
  };

  const fs = fontSizes[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: fs.brand,
            color: 'var(--brand-singer)',
            letterSpacing: '-0.02em',
          }}
        >
          Singer
        </span>
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 400,
            fontSize: fs.brand,
            color: 'var(--brand-land)',
            letterSpacing: '-0.02em',
          }}
        >
          Land
        </span>
      </div>
      {subtitle && (
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: fs.sub,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            marginTop: '1px',
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
};
