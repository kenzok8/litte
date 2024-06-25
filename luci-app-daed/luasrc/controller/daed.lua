local sys  = require "luci.sys"
local http = require "luci.http"

module("luci.controller.daed", package.seeall)

function index()
	if not nixio.fs.access("/etc/config/daed") then
		return
	end

    local page = entry({"admin", "services", "daed"}, alias("admin", "services", "daed", "basic"), _("DAED"), -1)
    page.dependent = true
    page.acl_depends = { "luci-app-daed" }

	entry({"admin", "services", "daed", "basic"}, cbi("daed/basic"), _("Basic Setting"), 1).leaf = true
	entry({"admin", "services", "daed", "log"}, cbi("daed/log"), _("Logs"), 2).leaf = true
	entry({"admin", "services", "daed", "status"}, call("act_status")).leaf = true
    entry({"admin", "services", "daed", "get_log"}, call("get_log")).leaf = true
    entry({"admin", "services", "daed", "clear_log"}, call("clear_log")).leaf = true
end

function act_status()
	local e = {}
	e.running = sys.call("pgrep -x /usr/bin/daed >/dev/null") == 0
	http.prepare_content("application/json")
	http.write_json(e)
end

function get_log()
	http.write(sys.exec("cat /var/log/daed/daed.log"))
end

function clear_log()
	sys.call("true > /var/log/daed/daed.log")
end
