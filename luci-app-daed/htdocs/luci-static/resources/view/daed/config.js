// SPDX-License-Identifier: Apache-2.0

'use strict';
'require form';
'require fs';
'require poll';
'require uci';
'require ui';
'require view';
'require view.daed.backend as backend';

const CSS = [
	'.dd-wrap{padding:6px 0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif}',
	'.dd-card{border:1px solid rgba(0,0,0,.06);border-radius:10px;padding:14px 16px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.03);background:rgba(255,255,255,.02)}',
	'.dd-card-title{font-size:12px;font-weight:600;opacity:.55;margin:0 0 10px;letter-spacing:.3px;text-transform:uppercase}',
	'.dd-status-row{display:flex;align-items:center;flex-wrap:wrap;gap:14px;margin-bottom:10px}',
	'.dd-status-row .dd-grow{flex:1 1 auto}',
	'.dd-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 12px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.3px;border:1px solid transparent;line-height:1.3}',
	'.dd-badge-run{color:#3da66a;border-color:rgba(61,166,106,.5)}',
	'.dd-badge-stop{color:#d96d6d;border-color:rgba(217,109,109,.55)}',
	'.dd-badge-dot{width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block}',
	'.dd-meta{font-size:12px;opacity:.7;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace}',
	'.dd-meta-label{opacity:.55;margin-right:4px}',
	'.dd-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}',
	'.dd-actions .cbi-button{font-size:12px;padding:6px 14px;border-radius:6px}',
	'.dd-actions a.cbi-button{display:inline-flex;align-items:center;gap:4px}',
	'.dd-switch{position:relative;width:46px;height:24px;border:0;border-radius:999px;background:rgba(128,128,128,.28);padding:0;cursor:pointer;transition:background .18s ease,opacity .18s ease;flex-shrink:0}',
	'.dd-switch .dd-switch-knob{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.96);box-shadow:0 1px 4px rgba(0,0,0,.2);transition:transform .18s ease}',
	'.dd-switch.is-on{background:rgba(74,160,101,.65)}',
	'.dd-switch.is-on .dd-switch-knob{transform:translateX(22px)}',
	'.dd-switch:disabled{opacity:.45;cursor:not-allowed}',
	'.dd-switch-label{font-size:11px;font-weight:600;opacity:.62;letter-spacing:.3px}',
	'.dd-switch-wrap{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}',
	'.dd-backend-card{padding:12px 16px}',
	'.dd-backend-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}',
	'.dd-backend-label{min-width:112px;font-size:13px;font-weight:600;opacity:.72}',
	'.dd-backend-segment{display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:8px;background:rgba(128,128,128,.10)}',
	'.dd-backend-btn{display:inline-flex;align-items:center;gap:7px;min-width:86px;height:26px;padding:0 10px;border:0;border-right:0;border-radius:6px;background:transparent;color:inherit;font-size:11px;font-weight:500;opacity:.65;cursor:pointer;transition:background .18s ease,color .18s ease,opacity .18s ease}',
	'.dd-backend-btn:last-child{border-right:0}',
	'.dd-backend-btn:hover{background:rgba(128,128,128,.10)}',
	'.dd-backend-btn.is-active{background:linear-gradient(#3886a1,#2f7288);color:#fff;opacity:1;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.12)}',
	'.dd-backend-btn:disabled{opacity:.55;cursor:not-allowed}',
	'.dd-backend-state{font-size:11px;font-weight:500;opacity:.70;margin-left:2px}',
	'.dd-backend-btn.is-active .dd-backend-state{opacity:.85}',
	'.dd-backend-help{margin:8px 0 0 124px;font-size:12px;line-height:1.45;opacity:.66}',
	'@media (max-width:640px){.dd-backend-label{min-width:0;width:100%}.dd-backend-segment{width:100%}.dd-backend-btn{flex:1;min-width:0}.dd-backend-help{margin-left:0}}',
	'.dd-editor{width:100%;min-height:460px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:12px;line-height:1.5;box-sizing:border-box;resize:vertical}',
	'.dd-editor-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
	'body.dark .dd-card,html[data-theme="dark"] .dd-card,html[data-bs-theme="dark"] .dd-card{border-color:rgba(255,255,255,.08);background:rgba(255,255,255,.02)}'
].join('');

function notifyAction(action, res) {
	if (res && res.code !== 0)
		ui.addNotification(null, E('p', _('Action "%s" failed: %s').format(action, res.stderr || res.stdout || ('exit ' + res.code))), 'danger');
	else
		ui.addNotification(null, E('p', _('Action "%s" succeeded.').format(action)), 'info');
}

function execInit(be, action) {
	return fs.exec(be.initd, [action]).then(function(res) {
		notifyAction(action, res);
	}).catch(function(e) {
		ui.addNotification(null, E('p', _('Action "%s" error: %s').format(action, e)), 'danger');
	});
}

function rejectIfOtherRunning(be, running) {
	const other = be.name === 'dae' ? 'daed' : 'dae';
	if (!running || !running[other])
		return Promise.resolve();

	return Promise.reject(new Error(_('%s is already running. Stop %s before starting %s because both backends share the same eBPF/cgroup attachment.').format(other, other, be.name)));
}

function toggleService(be, turnOn, running) {
	const enabled = turnOn ? '1' : '0';
	const action = turnOn ? 'start' : 'stop';

	return rejectIfOtherRunning(be, running)
		.then(function() { return fs.exec('/sbin/uci', ['set', be.uci + '.config.enabled=' + enabled]); })
		.then(function() { return fs.exec('/sbin/uci', ['commit', be.uci]); })
		.then(function() {
			if (turnOn)
				return fs.exec(be.initd, ['enable']);
			return fs.exec(be.initd, ['disable']);
		})
		.then(function() {
			if (turnOn && be.useNetns)
				return fs.exec('/sbin/ip', ['netns', 'del', 'daens']).catch(function() {});
		})
		.then(function() { return fs.exec(be.initd, [action]); })
		.then(function(res) { notifyAction(action, res); })
		.catch(function(e) {
			ui.addNotification(null, E('p', _('Toggle failed: %s').format(e.message || e)), 'danger');
		});
}

function renderBackendSwitcher(ctx) {
	if (!ctx.installed.dae && !ctx.installed.daed)
		return null;

	const wrap = E('div', { 'class': 'dd-card dd-backend-card' }, [
		E('h4', { 'class': 'dd-card-title' }, _('Backend')),
		E('div', { 'class': 'dd-backend-row' }, [
			E('span', { 'class': 'dd-backend-label' }, _('Active backend')),
			E('div', { 'class': 'dd-backend-segment' })
		])
	]);
	const segment = wrap.querySelector('.dd-backend-segment');
	const hint = E('div', { 'class': 'dd-backend-help' }, _('Switching backend stops the current service first. Click start when you want the new backend to run.'));
	let busy = false;

	const showHint = function(msg) {
		hint.textContent = msg;
	};

	const stopIfRunning = function(running) {
		const stops = [];

		['dae', 'daed'].forEach(function(name) {
			if (running && running[name])
				stops.push(fs.exec(backend.BACKENDS[name].initd, ['stop']).catch(function() {}));
		});

		if (stops.length)
			showHint(_('Stopping current backend…'));

		return Promise.all(stops);
	};

	['daed', 'dae'].forEach(function(name) {
		const active = ctx.name === name;
		const installed = !!ctx.installed[name];
		const btn = E('button', {
			'class': 'dd-backend-btn' + (active ? ' is-active' : ''),
			'type': 'button',
			'disabled': null,
			'title': installed ? _('Switch to %s').format(name) : _('%s is not installed').format(name)
		}, [
			E('span', {}, name),
			E('span', { 'class': 'dd-backend-state' }, active ? _('Active') : (installed ? '' : _('Not installed')))
		]);
		btn.addEventListener('click', function(ev) {
			ev.preventDefault();
			if (busy || active)
				return;
			if (!installed) {
				showHint(_('%s is not installed. Install it first, then switch backend.').format(name));
				return;
			}

			busy = true;
			Array.prototype.forEach.call(segment.querySelectorAll('button'), function(b) { b.disabled = true; });
			showHint(_('Switching to %s…').format(name));

			backend.detectRunning()
				.then(stopIfRunning)
				.then(function() { return backend.setActiveBackend(name); })
				.then(function() {
					showHint(_('Switched to %s. Click start when you want it to run.').format(name));
					ui.addNotification(null, E('p', _('Backend switched to %s. Click start to run it.').format(name)), 'info');
					setTimeout(function() { window.location.reload(); }, 650);
				})
				.catch(function(e) {
					busy = false;
					Array.prototype.forEach.call(segment.querySelectorAll('button'), function(b) { b.disabled = false; });
					showHint(_('Switch failed.'));
					ui.addNotification(null, E('p', _('Failed to switch backend: %s').format(e.message || e)), 'danger');
				});
		});
		segment.appendChild(btn);
	});

	wrap.appendChild(hint);
	return wrap;
}

function renderStatusCard(ctx, listenAddr) {
	const be = ctx.backend;
	const body = E('div', { 'id': 'dd-status-body' }, E('em', {}, _('Collecting data…')));
	const card = E('div', { 'class': 'dd-card' }, [
		E('h4', { 'class': 'dd-card-title' }, _('Service Status')),
		body
	]);

	const render = function(state, running) {
		while (body.firstChild) body.removeChild(body.firstChild);

		const badge = state.running
			? E('span', { 'class': 'dd-badge dd-badge-run' }, [ E('span', { 'class': 'dd-badge-dot' }), _('RUNNING') ])
			: E('span', { 'class': 'dd-badge dd-badge-stop' }, [ E('span', { 'class': 'dd-badge-dot' }), _('STOPPED') ]);

		const meta = [
			E('span', { 'class': 'dd-meta' }, [ E('span', { 'class': 'dd-meta-label' }, _('Backend')), be.name ])
		];

		if (state.running && state.pid)
			meta.push(E('span', { 'class': 'dd-meta' }, [ E('span', { 'class': 'dd-meta-label' }, 'PID'), state.pid ]));
		if (be.hasWebUI)
			meta.push(E('span', { 'class': 'dd-meta' }, [ E('span', { 'class': 'dd-meta-label' }, _('Listen')), listenAddr || be.defaultListen ]));

		const sw = E('button', { 'class': 'dd-switch' + (state.running ? ' is-on' : ''), 'type': 'button', 'aria-label': _('Toggle service') }, [
			E('span', { 'class': 'dd-switch-knob' })
		]);
		sw.addEventListener('click', function(ev) {
			ev.preventDefault();
			sw.disabled = true;
			toggleService(be, !state.running, running).finally(function() { sw.disabled = false; });
		});

		const row = E('div', { 'class': 'dd-status-row' }, [ badge ].concat(meta).concat([
			E('span', { 'class': 'dd-grow' }),
			E('span', { 'class': 'dd-switch-wrap' }, [
				E('span', { 'class': 'dd-switch-label' }, state.running ? 'ON' : 'OFF'),
				sw
			])
		]));
		body.appendChild(row);

		const actions = [];
		if (be.hasWebUI && state.running) {
			const port = (listenAddr || be.defaultListen).split(':').slice(-1)[0];
			actions.push(E('a', {
				'class': 'cbi-button cbi-button-action',
				'href': 'http://%s:%s'.format(window.location.hostname, port),
				'target': '_blank',
				'rel': 'noreferrer noopener'
			}, _('Open WebUI')));
		}
		if (state.running) {
			const restart = E('button', { 'class': 'cbi-button cbi-button-positive' }, _('Restart'));
			restart.addEventListener('click', function(ev) {
				ev.preventDefault();
				restart.disabled = true;
				execInit(be, 'restart').finally(function() { restart.disabled = false; });
			});
			actions.push(restart);
		}
		if (be.name === 'dae') {
			const hot = E('button', { 'class': 'cbi-button cbi-button-action' }, _('Hot Reload'));
			hot.addEventListener('click', function(ev) {
				ev.preventDefault();
				hot.disabled = true;
				execInit(be, 'hot_reload').finally(function() { hot.disabled = false; });
			});
			actions.push(hot);
		}
		if (actions.length)
			body.appendChild(E('div', { 'class': 'dd-actions' }, actions));
	};

	const refresh = function() {
		return Promise.all([
			backend.serviceStatus(be.name),
			backend.detectRunning()
		]).then(function(r) {
			render(r[0], r[1]);
		});
	};

	poll.add(refresh);
	refresh();
	return card;
}

function renderDaedSettings() {
	let m, s, o;
	m = new form.Map('daed', _('daed'),
		_('A modern dashboard for dae. Subscriptions, nodes, routing and DNS are managed in the daed WebUI.'));

	s = m.section(form.NamedSection, 'config', 'daed');
	s.addremove = false;

	o = s.option(form.Value, 'listen_addr', _('Listen Address'),
		_('Host:port that the daed WebUI and GraphQL API listen on.'));
	o.datatype = 'ipaddrport(1)';
	o.default = '0.0.0.0:2023';
	o.rmempty = false;

	o = s.option(form.Value, 'log_maxsize', _('Max Log Size (MB)'),
		_('Rotate the log file once it grows past this many megabytes.'));
	o.datatype = 'uinteger';
	o.default = '5';

	o = s.option(form.Value, 'log_maxbackups', _('Max Log Backups'),
		_('Number of rotated log files to keep.'));
	o.datatype = 'uinteger';
	o.default = '1';

	return m.render();
}

function renderDaeSettings() {
	let m, s, o;
	m = new form.Map('dae', _('dae'), _('eBPF-based Linux high-performance transparent proxy solution.'));

	s = m.section(form.NamedSection, 'config', 'dae');
	s.addremove = false;

	o = s.option(form.Value, 'config_file', _('Configuration File'));
	o.default = '/etc/dae/config.dae';
	o.rmempty = false;
	o.readonly = true;

	o = s.option(form.Value, 'log_maxsize', _('Max Log Size (MB)'),
		_('Rotate the log file once it grows past this many megabytes.'));
	o.datatype = 'uinteger';
	o.default = '1';

	o = s.option(form.Value, 'log_maxbackups', _('Max Log Backups'),
		_('Number of rotated log files to keep.'));
	o.datatype = 'uinteger';
	o.default = '1';

	return m.render();
}

function renderDaeEditor() {
	const textarea = E('textarea', { 'class': 'dd-editor', 'spellcheck': 'false' }, '');
	const save = E('button', { 'class': 'cbi-button cbi-button-positive' }, _('Save and Hot Reload'));
	const init = E('button', { 'class': 'cbi-button cbi-button-action' }, _('Initialize from example'));

	function loadConfig() {
		return fs.read_direct(backend.BACKENDS.dae.config, 'text').then(function(content) {
			textarea.value = content || '';
		}).catch(function(e) {
			textarea.value = '';
			ui.addNotification(null, E('p', _('dae config file does not exist yet. Use the example as initial content if needed.')), 'warning');
		});
	}

	save.addEventListener('click', function(ev) {
		ev.preventDefault();
		save.disabled = true;
		fs.write(backend.BACKENDS.dae.config, textarea.value, 384)
			.then(function() { return fs.exec(backend.BACKENDS.dae.initd, ['hot_reload']); })
			.then(function(res) { notifyAction('hot_reload', res); })
			.catch(function(e) { ui.addNotification(null, E('p', _('Failed to save dae config: %s').format(e)), 'danger'); })
			.finally(function() { save.disabled = false; });
	});

	init.addEventListener('click', function(ev) {
		ev.preventDefault();
		init.disabled = true;
		fs.read_direct(backend.BACKENDS.dae.example, 'text')
			.then(function(content) {
				textarea.value = content || '';
				return fs.write(backend.BACKENDS.dae.config, textarea.value, 384);
			})
			.then(function() { ui.addNotification(null, E('p', _('Example configuration copied.')), 'info'); })
			.catch(function(e) { ui.addNotification(null, E('p', _('Failed to initialize config: %s').format(e)), 'danger'); })
			.finally(function() { init.disabled = false; });
	});

	loadConfig();

	return E('div', { 'class': 'dd-card' }, [
		E('h4', { 'class': 'dd-card-title' }, _('dae Configuration')),
		textarea,
		E('div', { 'class': 'dd-editor-actions' }, [ save, init ])
	]);
}

return view.extend({
	load: function() {
		return backend.detectBackend().then(function(ctx) {
			return uci.load(ctx.backend.uci).catch(function() {}).then(function() {
				return ctx;
			});
		});
	},

	render: function(ctx) {
		const listenAddr = uci.get('daed', 'config', 'listen_addr') || backend.BACKENDS.daed.defaultListen;
		const children = [
			E('style', {}, CSS),
			renderStatusCard(ctx, listenAddr),
			renderBackendSwitcher(ctx)
		].filter(function(node) { return !!node; });

		if (!ctx.installed[ctx.name]) {
			children.push(E('div', { 'class': 'dd-card dd-warning' }, _('Selected backend is not installed. Install dae or daed from the package feed first.')));
		} else if (ctx.name === 'dae') {
			children.push(renderDaeEditor());
			children.push(renderDaeSettings());
		} else {
			children.push(renderDaedSettings());
		}

		return Promise.all(children.map(function(child) {
			return child && child.then ? child : Promise.resolve(child);
		})).then(function(nodes) {
			return E('div', { 'class': 'dd-wrap' }, nodes);
		});
	}
});
