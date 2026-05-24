// SPDX-License-Identifier: Apache-2.0

'use strict';
'require fs';
'require poll';
'require ui';
'require view';
'require view.daed.backend as backend';

const MAX_LINES = 5000;

const CSS = [
	'.dd-log-wrap{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}',
	'.dd-log-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(0,0,0,.06);border-radius:10px 10px 0 0;background:rgba(128,128,128,.04)}',
	'.dd-log-toolbar label{display:inline-flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;margin:0}',
	'.dd-log-toolbar input[type="checkbox"]{margin:0}',
	'.dd-log-toolbar input[type="text"]{font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid rgba(0,0,0,.12);background:transparent;color:inherit;min-width:160px}',
	'.dd-log-toolbar .dd-log-btn{font-size:12px;padding:4px 12px;border-radius:6px;border:1px solid rgba(0,0,0,.12);background:transparent;color:inherit;cursor:pointer}',
	'.dd-log-toolbar .dd-log-btn:hover{background:rgba(128,128,128,.1)}',
	'.dd-log-toolbar .dd-log-meta{margin-left:auto;font-size:11px;opacity:.55;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}',
	'.dd-log-pane{height:60vh;min-height:360px;overflow:auto;padding:10px 12px;border:1px solid rgba(0,0,0,.06);border-top:0;border-radius:0 0 10px 10px;background:#1a1d21;color:#d8dde6;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-all}',
	'.dd-log-pane .dd-line{padding:0 4px;border-radius:2px}',
	'.dd-log-pane .dd-line.dd-info{color:#9aa5b1}',
	'.dd-log-pane .dd-line.dd-warn{color:#e0b34a}',
	'.dd-log-pane .dd-line.dd-error{color:#e07070}',
	'.dd-log-pane .dd-line.dd-debug{color:#7a8290;opacity:.7}',
	'.dd-log-pane .dd-line.dd-hidden{display:none}',
	'.dd-log-pane .dd-empty{opacity:.5;font-style:italic}',
	'body.dark .dd-log-toolbar,html[data-theme="dark"] .dd-log-toolbar,html[data-bs-theme="dark"] .dd-log-toolbar{border-color:rgba(255,255,255,.1)}',
	'body.dark .dd-log-pane,html[data-theme="dark"] .dd-log-pane,html[data-bs-theme="dark"] .dd-log-pane{border-color:rgba(255,255,255,.1)}'
].join('');

function detectLevel(line) {
	// daed/dae logs use lvl=info / [INFO] / level=warning style
	const m = line.match(/\b(DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|PANIC)\b/i);
	if (!m) return '';
	const lvl = m[1].toUpperCase();
	if (lvl === 'DEBUG') return 'dd-debug';
	if (lvl === 'INFO') return 'dd-info';
	if (lvl.startsWith('WARN')) return 'dd-warn';
	return 'dd-error';
}

return view.extend({
	load: function() {
		return backend.detectBackend();
	},

	render(ctx) {
		const self = this;
		const LOG_PATH = ctx.backend.log;
		const state = {
			lastContent: '',
			lastSize: -1,
			paused: false,
			autoScroll: true,
			filter: '',
			userScrolled: false
		};

		const pane = E('div', { 'class': 'dd-log-pane', 'id': 'dd-log-pane' }, [
			E('div', { 'class': 'dd-empty' }, _('Loading…'))
		]);

		// detect manual scroll → auto-pause auto-scroll
		pane.addEventListener('scroll', function() {
			const atBottom = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 4;
			state.userScrolled = !atBottom;
		});

		const meta = E('span', { 'class': 'dd-log-meta' }, '');

		const cbAuto = E('input', { 'type': 'checkbox', 'checked': 'checked' });
		cbAuto.addEventListener('change', function() {
			state.autoScroll = cbAuto.checked;
			if (state.autoScroll) {
				pane.scrollTop = pane.scrollHeight;
				state.userScrolled = false;
			}
		});

		const cbPause = E('input', { 'type': 'checkbox' });
		cbPause.addEventListener('change', function() {
			state.paused = cbPause.checked;
		});

		const inFilter = E('input', { 'type': 'text', 'placeholder': 'Filter (substring)' });
		inFilter.addEventListener('input', function() {
			state.filter = inFilter.value.toLowerCase();
			applyFilter();
		});

		const btnClear = E('button', { 'class': 'dd-log-btn' }, 'Clear View');
		btnClear.addEventListener('click', function() {
			while (pane.firstChild) pane.removeChild(pane.firstChild);
			state.lastContent = '';
		});

		const btnDownload = E('button', { 'class': 'dd-log-btn' }, 'Download');
		btnDownload.addEventListener('click', function() {
			const blob = new Blob([state.lastContent || ''], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = ctx.name + '-' + (new Date()).toISOString().replace(/[:.]/g, '-') + '.log';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		});

		const btnTruncate = E('button', { 'class': 'dd-log-btn' }, 'Clear File');
		btnTruncate.addEventListener('click', function() {
			if (!confirm(_('Truncate %s log on the router? This cannot be undone.').format(ctx.name)))
				return;
			fs.write(LOG_PATH, '').then(function() {
				ui.addNotification(null, E('p', _('Log file cleared.')), 'info');
				state.lastContent = '';
				state.lastSize = 0;
			}).catch(function(e) {
				ui.addNotification(null, E('p', _('Failed to clear log: %s').format(e)), 'danger');
			});
		});

		function applyFilter() {
			const f = state.filter;
			pane.querySelectorAll('.dd-line').forEach(function(el) {
				if (!f || el.textContent.toLowerCase().indexOf(f) !== -1)
					el.classList.remove('dd-hidden');
				else
					el.classList.add('dd-hidden');
			});
		}

		function appendLines(text) {
			const lines = text.split('\n');
			const frag = document.createDocumentFragment();
			for (let i = 0; i < lines.length; i++) {
				const ln = lines[i];
				if (!ln) continue;
				const cls = detectLevel(ln);
				const el = E('div', { 'class': 'dd-line ' + cls }, ln);
				if (state.filter && ln.toLowerCase().indexOf(state.filter) === -1)
					el.classList.add('dd-hidden');
				frag.appendChild(el);
			}
			// drop empty-state placeholder if present
			const empty = pane.querySelector('.dd-empty');
			if (empty) pane.removeChild(empty);
			pane.appendChild(frag);

			// cap rendered rows
			const overflow = pane.children.length - MAX_LINES;
			if (overflow > 0) {
				for (let i = 0; i < overflow; i++) pane.removeChild(pane.firstChild);
			}
		}

		function renderEmpty(msg) {
			while (pane.firstChild) pane.removeChild(pane.firstChild);
			pane.appendChild(E('div', { 'class': 'dd-empty' }, msg));
		}

		function tick() {
			if (state.paused) return Promise.resolve();

			return fs.stat(LOG_PATH).then(function(st) {
				const size = st.size || 0;
				if (size === state.lastSize) {
					meta.textContent = '%d bytes · live'.format(size);
					return;
				}

				// File rotated/truncated → full reload
				const rotated = size < state.lastSize;
				return fs.read_direct(LOG_PATH, 'text').then(function(content) {
					content = content || '';
					let delta;
					if (rotated || state.lastContent === '') {
						// full replace
						while (pane.firstChild) pane.removeChild(pane.firstChild);
						delta = content;
					} else if (content.indexOf(state.lastContent) === 0) {
						// pure append
						delta = content.slice(state.lastContent.length);
					} else {
						// content changed mid-stream → full replace
						while (pane.firstChild) pane.removeChild(pane.firstChild);
						delta = content;
					}

					if (delta) appendLines(delta);
					state.lastContent = content;
					state.lastSize = size;
					meta.textContent = '%d bytes · live'.format(size);

					if (state.autoScroll && !state.userScrolled)
						pane.scrollTop = pane.scrollHeight;
				});
			}).catch(function(e) {
				const msg = String(e);
				if (msg.indexOf('NotFoundError') !== -1 || msg.indexOf('No such') !== -1)
					renderEmpty(_('Log file does not exist yet.'));
				else
					renderEmpty(_('Error reading log: %s').format(msg));
				state.lastSize = -1;
				state.lastContent = '';
				meta.textContent = '';
			});
		}

		poll.add(tick);
		tick();

		const toolbar = E('div', { 'class': 'dd-log-toolbar' }, [
			E('label', {}, [ cbAuto, ' Auto-scroll' ]),
			E('label', {}, [ cbPause, ' Pause' ]),
			inFilter,
			btnClear,
			btnDownload,
			btnTruncate,
			meta
		]);

		return E('div', { 'class': 'dd-log-wrap' }, [
			E('style', {}, CSS),
			E('h2', {}, [ 'Log' ]),
			toolbar,
			pane
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
