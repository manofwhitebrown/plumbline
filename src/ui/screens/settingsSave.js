// Settings: save tools. Export (copy and download), Import (paste, confirm), Reset (type RESET, confirm).
import { h } from '../dom.js';
import { exportSave, importSave, resetAll } from '../../core/save.js';
import { button } from '../components/button.js';
import * as shell from '../shell.js';
import { openFrame } from '../modalsWelcome.js';
import { log } from '../soft.js';

export const RESET_WORD = 'RESET';

// True when the typed text is the word RESET (spaces and capitals do not matter).
export function isResetWord(text) {
  return typeof text === 'string' && text.trim().toUpperCase() === RESET_WORD;
}

export function saveFileName(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return 'plumbline-save-' + d.toISOString().slice(0, 10) + '.txt';
}

// A quick check before we ask the player to confirm. importSave does the full check.
export function precheckCode(text) {
  const t = typeof text === 'string' ? text.replace(/\s+/g, '') : '';
  if (!t) return { ok: false, error: 'Paste your save code first.' };
  if (!t.startsWith('PL1.')) return { ok: false, error: 'That is not a Plumbline save code.' };
  return { ok: true, code: t };
}

// Copy text. Tries the modern way, then the old way. Resolves true or false. Never throws.
export async function copyText(text, root) {
  const value = String(text == null ? '' : text);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (e) { /* try the old way */ }
  try {
    if (typeof document === 'undefined') return false;
    const t = h('textarea', { class: 'sr', 'aria-hidden': 'true', tabindex: '-1' });
    t.value = value;
    (root || document.body).append(t);
    t.select();
    const ok = !!document.execCommand('copy');
    t.remove();
    return ok;
  } catch (e) { return false; }
}

// Save the text as a file. Returns true if the browser accepted it.
export function downloadText(text, name) {
  try {
    if (typeof document === 'undefined' || typeof Blob === 'undefined' || !URL.createObjectURL) return false;
    const url = URL.createObjectURL(new Blob([String(text)], { type: 'text/plain' }));
    const a = h('a', { href: url, download: name || saveFileName(), class: 'sr' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch (e) { return false; }
}

// After a reset or import the whole game starts again so every part reads the new save.
export function reloadApp() {
  setTimeout(() => {
    try { window.location.reload(); } catch (e) { /* tests and odd hosts */ }
  }, 450);
}

export function runImport(text) {
  const pre = precheckCode(text);
  if (!pre.ok) return pre;
  try {
    const res = importSave(pre.code);
    return res && typeof res === 'object' ? res : { ok: false, error: 'Something went wrong. Nothing was changed.' };
  } catch (e) {
    log.error('import failed', e);
    return { ok: false, error: 'Something went wrong. Nothing was changed.' };
  }
}

function confirmBox(title, text, actionLabel, onYes, noLabel) {
  return openFrame({
    title, kind: 'card',
    body: h('p', { class: 'sub', text }),
    actions: [{ label: actionLabel, kind: 'danger', onPress: onYes }, { label: noLabel || 'Cancel', kind: 'secondary' }],
  });
}

export function saveSection(scope) {
  // ----- export -----
  const codeBox = h('textarea', { class: 'input code-box', rows: '3', readonly: true, 'aria-label': 'Your save code', hidden: true });
  function currentCode() {
    const code = exportSave();
    if (!code) shell.toast('Could not make the save code.', 'error');
    return code;
  }
  const copyBtn = button({ label: 'Copy save', kind: 'secondary', onPress: async () => {
    const code = currentCode();
    if (!code) return;
    codeBox.value = code;
    if (await copyText(code)) shell.toast('Save code copied.', 'ok');
    else { codeBox.hidden = false; codeBox.select(); shell.toast('Press and hold the code to copy it.', 'warn'); }
  } }, scope);
  const dlBtn = button({ label: 'Download', kind: 'secondary', onPress: () => {
    const code = currentCode();
    if (!code) return;
    codeBox.value = code;
    if (downloadText(code, saveFileName())) shell.toast('Save file ready.', 'ok');
    else { codeBox.hidden = false; shell.toast('Download is not available. Copy the code instead.', 'warn'); }
  } }, scope);

  // ----- import -----
  const paste = h('textarea', { class: 'input code-box', rows: '3', placeholder: 'Paste your save code here', 'aria-label': 'Paste your save code', autocomplete: 'off', spellcheck: 'false' });
  const importMsg = h('p', { class: 'reason', role: 'alert' });
  const importBtn = button({ label: 'Import save', kind: 'secondary', onPress: () => {
    const pre = precheckCode(paste.value);
    importMsg.textContent = pre.ok ? '' : pre.error;
    if (!pre.ok) return;
    confirmBox('Replace your save?', 'This replaces the progress on this device with the pasted save. Export first if you want a backup.', 'Replace my save', () => {
      const res = runImport(pre.code);
      if (res.ok) { shell.toast('Save imported.', 'ok'); reloadApp(); }
      else { importMsg.textContent = res.error || 'That save code could not be read.'; shell.toast('Nothing was changed.', 'warn'); }
    }, 'Keep my save');
  } }, scope);

  // ----- reset -----
  const word = h('input', { class: 'input', type: 'text', placeholder: 'Type ' + RESET_WORD, 'aria-label': 'Type ' + RESET_WORD + ' to unlock Reset', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', maxlength: '12' });
  const resetBtn = button({ label: 'Reset everything', kind: 'danger', disabled: true, onPress: () => {
    if (!isResetWord(word.value)) return;
    confirmBox('Erase everything?', 'All Gold, Crew, Parts and records on this device will be gone. This cannot be undone.', 'Yes, erase it all', () => {
      try { resetAll(); } catch (e) { log.error('reset failed', e); shell.toast('Reset failed.', 'error'); return; }
      shell.toast('Everything was erased.', 'ok');
      reloadApp();
    }, 'Keep my save');
  } }, scope);
  const onWord = () => resetBtn.setState({ disabled: !isResetWord(word.value) });
  scope.on(word, 'input', onWord);

  return h('section', { class: 'card set-card', 'aria-label': 'Save' },
    h('h2', { class: 'title', text: 'Save' }),
    h('div', { class: 'stack' },
      h('p', { class: 'sub', text: 'Export keeps a backup of your progress.' }),
      h('div', { class: 'row wrap set-btns' }, copyBtn, dlBtn),
      codeBox),
    h('div', { class: 'stack' },
      h('p', { class: 'sub', text: 'Import a save you exported before.' }),
      paste, importMsg, importBtn),
    h('div', { class: 'stack' },
      h('p', { class: 'sub', text: 'Reset erases all progress on this device. Type ' + RESET_WORD + ' to unlock it.' }),
      word, resetBtn));
}
