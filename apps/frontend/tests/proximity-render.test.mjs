import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatPresenceReport } from '../src/services/proximity.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
// Isolated SSR fixtures, not camera or production API responses.
function loadTs(relative, overrides) {
  const filename = path.join(root, relative);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  }}).outputText;
  const exports = {};
  const localRequire = (name) => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith('@/')) return loadTs('src/' + name.slice(2) + '.ts', overrides);
    return require(name);
  };
  new Function('require', 'exports', output)(localRequire, exports);
  return exports;
}
function renderNotice(state) {
  const { ProximityNotice } = loadTs('src/components/shared/ProximityNotice.tsx', {
    '@/providers/WebSocketProvider': { useWebSocket: () => state },
  });
  return renderToStaticMarkup(React.createElement(ProximityNotice));
}

test('arrival notice announces its own timestamp, separate from later absence', () => {
  const arrivalAt = '2026-01-01T00:00:00Z';
  const absenceAt = '2026-01-01T00:01:00Z';
  const html = renderNotice({
    presence: { present: false, reportedAt: absenceAt },
    latestPresenceAlert: { title: 'มีคนเข้ามาใกล้ประตู', reportedAt: arrivalAt },
  });
  assert.match(html, /aria-live="polite"/);
  assert.ok(html.includes(formatPresenceReport(arrivalAt)));
  assert.ok(html.includes(formatPresenceReport(absenceAt)));
  assert.match(html, /รายงานว่าไม่พบคนเข้าใกล้/);
  assert.match(html, /ไม่ใช่สถานะคนอยู่ปัจจุบัน/);
});

test('initial report presents history, not a fresh arrival alert', () => {
  const html = renderNotice({
    presence: { present: true, reportedAt: '2026-01-01T00:00:00Z' },
    latestPresenceAlert: null,
  });
  assert.match(html, /การแจ้งเตือนบริเวณประตู/);
  assert.doesNotMatch(html, /มีคนเข้ามาใกล้ประตู/);
  assert.match(html, /รายงานว่ามีคนเข้าใกล้/);
});

test('CCTV SSR does not request camera images before a viewer mounts', () => {
  const { CctvMonitor } = loadTs('src/components/shared/CctvMonitor.tsx', {});
  const html = renderToStaticMarkup(React.createElement(CctvMonitor));
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /1080P|30 FPS|ENCRYPTION: ACTIVE/);
});

test('CCTV URL hydration does not disable the React effect state rule', () => {
  const source = fs.readFileSync(path.join(root, 'src/components/shared/CctvMonitor.tsx'), 'utf8');
  assert.doesNotMatch(source, /eslint-disable-next-line react-hooks\/set-state-in-effect/);
});

test('CCTV retains the original pooh badge colors without claiming recording', () => {
  const { CctvMonitor } = loadTs('src/components/shared/CctvMonitor.tsx', {});
  const html = renderToStaticMarkup(React.createElement(CctvMonitor));
  assert.ok(html.includes('bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'));
  assert.doesNotMatch(html, /\bREC\b/);
});
