import React from 'react';
import { type TutorialLongDivisionState } from '../../lib/types';

interface Props {
    state: TutorialLongDivisionState;
}

const COL_WIDTH = '1.7rem';
const CELL_HEIGHT = '1.9rem';

const LongDivisionTutorialView: React.FC<Props> = ({ state }) => {
    const data = state.problem;
    const digits = data.dividend.toString().split('');
    const numDigits = digits.length;
    const totalCols = numDigits + 1;

    const completedQuotient = data.steps
        .slice(0, state.revealedSteps)
        .map(s => s.quotientDigit)
        .join('');
    const showPlaceholder = state.revealedSteps < numDigits && !state.finalHighlight;

    type Row =
        | { kind: 'cells'; cells: (string | null)[]; color?: string }
        | { kind: 'border'; startCol: number; endCol: number };

    const rows: Row[] = [];

    const dividendCells: (string | null)[] = Array.from({ length: totalCols }, () => null);
    digits.forEach((d, i) => { dividendCells[1 + i] = d; });
    rows.push({ kind: 'cells', cells: dividendCells });

    for (let i = 0; i < state.revealedSteps; i++) {
        const step = data.steps[i];
        const product = step.quotientDigit * data.divisor;
        const productStr = product.toString();
        const partialEndCol = 1 + i;
        const productStartCol = partialEndCol - productStr.length + 1;
        const isCurrent = i === state.activeStepIndex;
        const productHighlight = isCurrent && state.highlightField === 'product';
        const remainderHighlight = isCurrent && state.highlightField === 'remainder';

        const minusCells: (string | null)[] = Array.from({ length: totalCols }, () => null);
        minusCells[productStartCol - 1] = '−';
        for (let j = 0; j < productStr.length; j++) {
            minusCells[productStartCol + j] = productStr[j];
        }
        rows.push({
            kind: 'cells',
            cells: minusCells,
            color: productHighlight ? '#facc15' : '#cbd5e1',
        });

        rows.push({ kind: 'border', startCol: productStartCol, endCol: partialEndCol + 1 });

        const remainderCells: (string | null)[] = Array.from({ length: totalCols }, () => null);
        const remainderStr = step.remainder.toString();
        const remainderStartCol = partialEndCol - remainderStr.length + 1;
        for (let j = 0; j < remainderStr.length; j++) {
            remainderCells[remainderStartCol + j] = remainderStr[j];
        }
        if (i + 1 < numDigits) {
            remainderCells[1 + i + 1] = digits[i + 1];
        }
        rows.push({
            kind: 'cells',
            cells: remainderCells,
            color: remainderHighlight ? '#f97316' : '#93c5fd',
        });
    }

    return (
        <div className="text-center">
            <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', lineHeight: 1.2 }}>
                <span style={{ color: state.finalHighlight ? '#22c55e' : 'white' }}>
                    {data.dividend} : {data.divisor} = {completedQuotient}
                </span>
                {showPlaceholder && <span style={{ color: '#93c5fd' }}>?</span>}
                {state.finalHighlight && data.remainder !== 0 && (
                    <span style={{ color: '#22c55e' }}> (zvyšok {data.remainder})</span>
                )}
            </div>
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', fontFamily: 'monospace' }}>
                {rows.map((row, rowIdx) => (
                    <div key={rowIdx} style={{ display: 'flex' }}>
                        {Array.from({ length: totalCols }).map((_, colIdx) => {
                            if (row.kind === 'border') {
                                const inside = colIdx >= row.startCol && colIdx < row.endCol;
                                return (
                                    <div
                                        key={colIdx}
                                        style={{
                                            width: COL_WIDTH,
                                            height: '0.35rem',
                                            borderTop: inside ? '2px solid white' : undefined,
                                        }}
                                    />
                                );
                            }
                            return (
                                <div
                                    key={colIdx}
                                    style={{
                                        width: COL_WIDTH,
                                        height: CELL_HEIGHT,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.4rem',
                                        fontWeight: 800,
                                        color: row.color ?? 'white',
                                    }}
                                >
                                    {row.cells[colIdx] ?? ''}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LongDivisionTutorialView;
