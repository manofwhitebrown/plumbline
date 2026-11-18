// Cheats: tools. These do not change the game, so they do not mark the save as cheated.
import { bus } from '../core/bus.js';
import { log } from '../core/log.js';
import { exportSave } from '../core/save.js';

let fpsOn = false;

export const TOOLS = [
  { id: 'tool_fps', group: 'Tools', label: 'Show FPS and particle count', tool: true, isOn: () => fpsOn,
    run: () => { fpsOn = !fpsOn; bus.emit('cheats:debug', { fps: fpsOn }); return fpsOn ? 'FPS counter is on' : 'FPS counter is off'; } },
  { id: 'tool_log', group: 'Tools', label: 'Print the last 50 log lines', tool: true,
    run: () => { const lines = log.recent().slice(-50); return { text: `${lines.length} log lines ready`, data: lines }; } },
  { id: 'tool_export', group: 'Tools', label: 'Export save', tool: true,
    run: () => { const code = exportSave(); return { text: 'Save code ready to copy', data: code }; } },
  // Reset everything is handled by the runner (double confirm). See index.js.
  { id: 'reset_all', group: 'Tools', label: 'Reset everything', danger: true, confirm: true, run: null },
];
