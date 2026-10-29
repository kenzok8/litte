// SPDX-License-Identifier: GPL-3.0-only

'use strict';
'require baseclass';
'require rpc';

const callStatus = rpc.declare({
	object: 'honk',
	method: 'status',
	expect: { '': {} }
});

const callCheck = rpc.declare({
	object: 'honk',
	method: 'check',
	expect: { '': {} }
});

const callInitialize = rpc.declare({
	object: 'honk',
	method: 'initialize',
	params: [ 'username', 'password' ],
	expect: { '': {} }
});

const callStart = rpc.declare({ object: 'honk', method: 'start', expect: { '': {} } });
const callStop = rpc.declare({ object: 'honk', method: 'stop', expect: { '': {} } });
const callRestart = rpc.declare({ object: 'honk', method: 'restart', expect: { '': {} } });

const callSettings = rpc.declare({
	object: 'honk',
	method: 'settings',
	params: [ 'lan_network', 'listen_port', 'boot_enabled', 'clash_api_enabled', 'clash_api_port', 'clash_api_secret' ],
	expect: { '': {} }
});

const callProbeSubscription = rpc.declare({
	object: 'honk',
	method: 'probe_subscription',
	params: [ 'url' ],
	expect: { '': {} }
});
const callAddSubscription = rpc.declare({
	object: 'honk',
	method: 'add_subscription',
	params: [ 'name', 'url' ],
	expect: { '': {} }
});
const callAddNodes = rpc.declare({
	object: 'honk',
	method: 'add_nodes',
	params: [ 'links' ],
	expect: { '': {} }
});
const callImportDae = rpc.declare({
	object: 'honk',
	method: 'import_dae',
	expect: { '': {} }
});
const callConfigRead = rpc.declare({ object: 'honk', method: 'config_read', expect: { '': {} } });
const callConfigDraftRead = rpc.declare({ object: 'honk', method: 'config_draft_read', expect: { '': {} } });
const callLanCandidates = rpc.declare({ object: 'honk', method: 'lan_candidates', expect: { '': {} } });
const callConfigValidate = rpc.declare({ object: 'honk', method: 'config_validate', params: [ 'content' ], expect: { '': {} } });
const callConfigSave = rpc.declare({ object: 'honk', method: 'config_save', params: [ 'content' ], expect: { '': {} } });
const callConfigApply = rpc.declare({ object: 'honk', method: 'config_apply', expect: { '': {} } });
const callConfigUseManaged = rpc.declare({ object: 'honk', method: 'config_use_managed', expect: { '': {} } });
const callRepair = rpc.declare({ object: 'honk', method: 'repair', expect: { '': {} } });
const callBackup = rpc.declare({ object: 'honk', method: 'backup', expect: { '': {} } });
const callRestore = rpc.declare({ object: 'honk', method: 'restore', expect: { '': {} } });
const callRestorePrepare = rpc.declare({ object: 'honk', method: 'restore_prepare', expect: { '': {} } });
const callReset = rpc.declare({ object: 'honk', method: 'reset', expect: { '': {} } });
const callJobStatus = rpc.declare({
	object: 'honk',
	method: 'job_status',
	params: [ 'job_id' ],
	expect: { '': {} }
});
const callLogs = rpc.declare({
	object: 'honk',
	method: 'logs',
	params: [ 'source', 'level', 'limit' ],
	expect: { '': {} }
});
const callUpdateCheck = rpc.declare({ object: 'honk', method: 'update_check', expect: { '': {} } });
const callUpdateApply = rpc.declare({ object: 'honk', method: 'update_apply', expect: { '': {} } });

let pageStylesInstalled = false;

function installStyles() {
	if (pageStylesInstalled || document.getElementById('honk-page-styles'))
		return;

	const stylesheet = document.createElement('link');
	stylesheet.id = 'honk-page-styles';
	stylesheet.rel = 'stylesheet';
	stylesheet.href = L.resource('view/honk/honk.css');
	document.head.appendChild(stylesheet);
	pageStylesInstalled = true;
}

/* A core bound to 0.0.0.0 (or ::) reports a wildcard authority. A browser
   cannot open that, but the router is still reachable at the host LuCI was
   loaded from, so substitute that instead of hiding the panel button. */
function wildcardHost(hostname) {
	const name = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase();
	return name === '0.0.0.0' || name === '::' || name === '';
}

function urlHost(hostname) {
	const name = String(hostname || '');
	return name.indexOf(':') >= 0 ? '[' + name.replace(/^\[|\]$/g, '') + ']' : name;
}

function localWebUi(status) {
	if (!status || !status.initialized || !status.running || !status.api_ready || !status.api_url)
		return null;

	try {
		const raw = String(status.api_url);
		const authority = raw.match(/^https?:\/\/([^/?#]+)/i);
		if (!authority || authority[1].indexOf('@') >= 0)
			return null;

		const portMatch = authority[1].match(/:(\d+)$/);
		const url = new URL(raw);
		const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
		const port = portMatch ? Number(portMatch[1]) : 0;
		if (!portMatch || !Number.isInteger(port) || port < 1 || port > 65535 ||
			url.protocol !== 'http:' && url.protocol !== 'https:' ||
			url.username || url.password || url.search || url.hash)
			return null;

		if (wildcardHost(hostname) && window.location.hostname)
			return url.protocol + '//' + urlHost(window.location.hostname) + ':' + port + '/ui/';

		const octets = hostname.split('.');
		let localIPv4 = false;
		if (octets.length === 4 && octets.every(function(part) { return /^\d{1,3}$/.test(part) && Number(part) <= 255; })) {
			const ip = octets.map(Number);
			localIPv4 = ip[0] === 10 || ip[0] === 127 || ip[0] === 192 && ip[1] === 168 ||
				ip[0] === 172 && ip[1] >= 16 && ip[1] <= 31 || ip[0] === 169 && ip[1] === 254;
		}
		const localIPv6 = hostname === '::1' || /^f[cd][0-9a-f:]*$/.test(hostname) || /^fe[89ab][0-9a-f:]*$/.test(hostname);
		if (!localIPv4 && !localIPv6)
			return null;

		return url.origin.replace(/\/$/, '') + '/ui/';
	}
	catch (e) {
		return null;
	}
}

function localClashUi(status, secret) {
	if (!status || !status.clash_api_enabled || !status.clash_api_ready || !status.clash_ui_ready)
		return null;
	const base = localWebUi(Object.assign({}, status, { api_url: status.clash_api_url, api_ready: true }));
	if (!base)
		return null;
	try {
		const url = new URL(status.clash_api_url);
		const host = wildcardHost(url.hostname)
			? String(window.location.hostname || '').replace(/^\[|\]$/g, '').toLowerCase()
			: url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
		const port = status.clash_api_port || url.port;
		const query = [
			'host=' + encodeURIComponent(host),
			'hostname=' + encodeURIComponent(host),
			'port=' + encodeURIComponent(port),
			'secret=' + encodeURIComponent(secret || '')
		].join('&');
		return base + '?' + query + '#/proxies';
	}
	catch (e) {
		return null;
	}
}

function tokenMessage(token) {
	const messages = {
		disabled: _('Honk is disabled.'),
		not_initialized: _('Complete initial setup before starting Honk.'),
		service_not_running: _('Honk is enabled but currently stopped.'),
		api_unavailable: _('Honk is running, but its management interface is not ready.'),
		operation_in_progress: _('Another Honk operation is in progress.'),
		stale_operation_lock: _('A previous operation did not finish cleanly.'),
		started: _('Honk started.'),
		already_running: _('Honk is already running.'),
		stopped: _('Honk stopped.'),
		restarted: _('Honk restarted.'),
		settings_saved: _('Settings saved and applied.'),
		initialized: _('Honk initialized.'),
		administrator_initialized: _('Honk initialized.'),
		system_config_healthy: _('System check passed.'),
		system_config_repaired: _('Repair completed.'),
		backup_created: _('Backup created.'),
		restored: _('Backup restored.'),
		data_reset: _('Honk data reset. The service is stopped.'),
		worker_lost: _('The maintenance worker stopped unexpectedly; check system recovery status before retrying.'),
		operation_failed: _('The maintenance operation failed.'),
		job_timeout: _('The maintenance operation timed out.'),
		maintenance_recovery_required: _('Recovery is required. Run system recovery before starting another maintenance operation.'),
		update_recovery_required: _('The signed update did not finish. Keep Honk stopped and reinstall a complete verified package set before retrying.'),
		rollback_tuple_unavailable: _('A compatible update is available, but a complete verified rollback package set is not available yet.'),
		trusted_feed_unavailable: _('No trusted update source is configured.'),
		manifest_incompatible: _('The signed update manifest does not match this device.'),
		signed_manifest_unavailable: _('The signed update manifest could not be fetched or verified.'),
		update_available: _('A compatible update is available.'),
		no_update: _('No compatible update is available.'),
		already_current: _('Honk is already up to date.'),
		update_apply_failed: _('The update could not be installed.'),
		update_check_failed: _('The signed update could not be verified for this device.'),
		signed_manifest_missing: _('Check for updates again to refresh the signed manifest.'),
		signed_manifest_expired: _('The signed manifest expired. Check for updates again.'),
		reset_failed: _('Reset failed; the previous service state was restored.'),
		reset_failed_rollback_failed: _('Reset failed and automatic recovery did not finish. Run system recovery before retrying.'),
		restore_failed_rollback_failed: _('Restore failed and automatic recovery did not finish. Run system recovery before retrying.'),
		logs_unavailable: _('Honk logs are unavailable.'),
		unsupported_core: _('This installed core does not support the requested import operation.'),
		invalid_request: _('The import request is incomplete or invalid.'),
		import_failed: _('The core could not prepare this import preview.'),
		share_links_too_large: _('Share links exceed the 16 KiB per request limit.'),
		share_links_invalid_or_conflicting: _('A share link is invalid or conflicts with an existing node. Review the input and try again.'),
		subscription_invalid: _('The subscription name or URL is invalid.'),
		subscription_invalid_or_conflicting: _('The subscription is invalid or its name already exists.'),
		subscription_no_nodes: _('The subscription returned no usable nodes. The configuration was not changed.'),
		subscription_added: _('Subscription saved with usable nodes.'),
		nodes_added: _('Nodes saved.'),
		reload_failed_rolled_back: _('Honk could not restart. The previous configuration and service were restored.'),
		reload_and_rollback_failed: _('Honk could not restart or restore the previous service. Check its status and backup.'),
		dae_imported: _('Configuration imported and Honk reloaded.'),
		config_missing: _('The configuration file is missing.'),
		config_write_failed: _('Could not write the configuration file.'),
		dae_too_large: _('The dae file exceeds the 2 MiB limit.'),
		dae_invalid_or_unsupported: _('The dae file contains invalid sections or unsupported includes.'),
		candidate_invalid: _('Honk could not load the proposed configuration.'),
		candidate_rejected: _('The imported configuration failed core validation.'),
		source_changed: _('Honk or Doona changed the configuration during this operation. Try again.'),
		preview_expired: _('The preview expired. Create a new preview.'),
		preview_corrupt: _('The saved preview is damaged. Create a new preview.'),
		dae_upload_unavailable: _('The dae upload is missing or unavailable. Upload the file again.'),
		dae_upload_invalid: _('The uploaded dae file is invalid.'),
		dae_upload_changed: _('The uploaded dae file changed. Upload it again.'),
		upload_failed: _('Honk could not prepare the upload location. Check the upload directory permissions and try again.'),
		upload_directory_unavailable: _('Honk could not prepare a private configuration upload directory.'),
		upload_target_unavailable: _('The temporary configuration upload is unavailable. Try again.'),
		config_too_large: _('The configuration file exceeds the 2 MiB limit.'),
		config_applied: _('Configuration applied and Honk is running.'),
		config_apply_failed_rolled_back: _('Honk could not start with this configuration. The previous file was restored.'),
		config_apply_rollback_failed_snapshot_retained: _('Startup failed and the automatic rollback did not finish. The snapshot was kept; run system recovery.'),
		config_changed_concurrently: _('The configuration changed during the operation. Nothing was applied.'),
		config_write_failed_snapshot_retained: _('Could not write the configuration. The snapshot was kept.'),
		service_stop_unconfirmed_snapshot_retained: _('Could not confirm that Honk stopped. The operation was aborted and the snapshot was kept.'),
		manual_mode_required: _('Manual mode is active. Restore managed mode before using the subscription tools.'),
		managed_edit_unavailable: _('Manual mode is active, so this tool cannot edit the configuration. Select Restore managed mode first.'),
		managed_switch_failed_rolled_back: _('Could not switch back to managed mode. The previous configuration was restored.'),
		managed_switch_rollback_failed_snapshot_retained: _('Switching back to managed mode failed and the rollback did not finish. The snapshot was kept.'),
		managed_snapshot_invalid: _('The saved managed configuration is not a valid regular file.'),
		config_draft_missing: _('There is no saved draft to apply.'),
		config_draft_invalid: _('The saved draft is not a valid regular file.'),
		managed_mode_restored: _('Managed mode restored.'),
		managed_snapshot_missing: _('There is no saved managed configuration to restore.'),
		lan_candidates_unavailable: _('Could not read the list of network interfaces.'),
		config_read_failed: _('Honk could not read the current configuration.'),
		config_request_invalid: _('The configuration request is empty or invalid.'),
		config_validation_failed: _('The configuration did not pass static validation.'),
		config_validation_unavailable: _('The core validator did not return a result.'),
		config_saved_pending_apply: _('Configuration saved. The running service is unchanged until you apply it.'),
		config_loaded: _('Configuration loaded.'),
		dae_loaded: _('Configuration file loaded into the editor.'),
		upload_ready: _('Upload location ready.'),
		upload_cleared: _('Temporary upload cleared.'),
		upload_unavailable: _('A private upload location could not be prepared.'),
		settings_write_failed: _('Could not save Honk settings.'),
		curl_missing: _('The curl command is missing. Install the curl package and try again.'),
		start_failed: _('Honk could not start.'),
		stop_failed: _('Honk could not stop.'),
		restart_failed: _('Honk could not restart.'),
		managed_service_unhealthy: _('The managed Honk service is not healthy.'),
		unmanaged_core_running: _('An unmanaged Honk core process is running.'),
		invalid_lan_network: _('The selected LAN network is invalid or unavailable.'),
		lan_network_unavailable: _('The selected LAN network is unavailable.'),
		listen_port_occupied: _('The listen port is already in use.'),
		clash_api_port_occupied: _('The Clash API port is already in use.'),
		invalid_clash_api_settings: _('Enter a different Clash API port and a secret of 6–128 letters, numbers, dots, underscores or hyphens.'),
		invalid_listen_port: _('The listen port is invalid.'),
		initialize_before_enabling_service: _('Complete initial setup before enabling Honk.'),
		system_config_unavailable: _('Honk system configuration is unavailable.'),
		package_config_unavailable: _('Honk configuration is unavailable.'),
		service_apply_failed_rolled_back: _('Settings could not be applied. The previous settings were restored.')
	};

	return messages[token] || null;
}

function statusIssue(token) {
	return tokenMessage(token) || _('Honk reported a system issue.');
}

function resultMessage(result, fallback) {
	return result && tokenMessage(result.message) || fallback;
}

function errorMessage(error, fallback) {
	return error && tokenMessage(error.message) || fallback;
}

function jobPhaseMessage(phase) {
	const messages = {
		queued: _('Waiting for the operation to start…'),
		checking_feed: _('Checking the signed update source…'),
		downloading: _('Downloading the signed package set…'),
		preparing: _('Preparing configuration apply…'),
		validating_candidate: _('Validating the candidate in an isolated runtime…'),
		stopping: _('Stopping Honk safely…'),
		applying: _('Applying the reviewed configuration…'),
		validating: _('Checking the updated configuration…'),
		starting: _('Restoring the previous service state…'),
		rolling_back: _('Restoring the previous configuration…'),
		committing: _('Finishing the transaction…'),
		recovery: _('Recovery is required before another operation.')
	};
	return messages[phase] || _('Applying configuration…');
}

function ensureOk(result) {
	if (!result || result.ok !== true)
		throw new Error(result && result.message ? result.message : _('The backend did not confirm the operation.'));

	return result;
}

function waitJob(jobId, onProgress) {
	if (!/^[0-9a-f]{32}$/.test(jobId || ''))
		return Promise.reject(new Error('invalid_job_id'));

	let attempts = 0;
	return new Promise(function(resolve, reject) {
		function poll() {
			callJobStatus(jobId).then(function(result) {
				if (!result || typeof result.state !== 'string')
					throw new Error('invalid_job_status');
				if (onProgress)
					onProgress(result);
				if (result.state === 'succeeded') {
					resolve(result);
					return;
				}
				if (result.state === 'failed' || result.state === 'rollback_required') {
					const error = new Error(result.state === 'rollback_required' ? 'maintenance_recovery_required' : result.message || 'operation_failed');
					error.recoveryRequired = result.state === 'rollback_required';
					reject(error);
					return;
				}
				if (result.state !== 'queued' && result.state !== 'running') {
					reject(new Error('invalid_job_status'));
					return;
				}
				if (++attempts >= 1800) {
					reject(new Error('job_timeout'));
					return;
				}
				setTimeout(poll, 1000);
			}).catch(reject);
		}
		poll();
	});
}

return baseclass.extend({
	status: callStatus,
	check: callCheck,
	initialize: callInitialize,
	start: callStart,
	stop: callStop,
	restart: callRestart,
	settings: callSettings,
	probeSubscription: callProbeSubscription,
	addSubscription: callAddSubscription,
	addNodes: callAddNodes,
	importDae: callImportDae,
	configRead: callConfigRead,
	configDraftRead: callConfigDraftRead,
	lanCandidates: callLanCandidates,
	configValidate: callConfigValidate,
	configSave: callConfigSave,
	configApply: callConfigApply,
	configUseManaged: callConfigUseManaged,
	repair: callRepair,
	backup: callBackup,
	restore: callRestore,
	restorePrepare: callRestorePrepare,
	reset: callReset,
	logs: callLogs,
	updateCheck: callUpdateCheck,
	updateApply: callUpdateApply,
	waitJob: waitJob,
	ensureOk: ensureOk,
	localWebUi: localWebUi,
	localClashUi: localClashUi,
	statusIssue: statusIssue,
	resultMessage: resultMessage,
	errorMessage: errorMessage,
	jobPhaseMessage: jobPhaseMessage,
	installStyles: installStyles
});
