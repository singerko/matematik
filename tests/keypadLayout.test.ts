import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gameSessionSource = readFileSync('src/components/GameSession.tsx', 'utf8');

test('game keypad does not render blank placeholder keys', () => {
    assert.doesNotMatch(gameSessionSource, /key.*blank/i);
    assert.doesNotMatch(gameSessionSource, /opacity:\s*0\.2/);
    assert.doesNotMatch(gameSessionSource, /\?\s*''\s*:\s*['"`]-['"`]/);
});

test('step keypads keep a full action row without gaps', () => {
    assert.match(gameSessionSource, /handleInput\('DEL'\)[\s\S]*handleInput\('0'\)[\s\S]*setLargeMulActiveField/);
    assert.match(gameSessionSource, /handleInput\('DEL'\)[\s\S]*handleInput\('0'\)[\s\S]*setIndianActiveField/);
    assert.match(gameSessionSource, /keypad-submit col-span-3/);
});
