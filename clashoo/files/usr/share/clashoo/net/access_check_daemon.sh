#!/bin/sh

set -eu

RUNDIR="/tmp/clashoo"
PID_FILE="${RUNDIR}/access_check_daemon.pid"
LOCK_DIR="${RUNDIR}/access_check_daemon.lock"
# 周期：默认 5-20s 随机（学 OpenClash），ACCESS_CHECK_INTERVAL 环境变量可固定覆盖
INTERVAL_FIXED="${ACCESS_CHECK_INTERVAL:-}"

mkdir -p "$RUNDIR"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
	exit 0
fi

cleanup() {
	rm -rf "$LOCK_DIR" "$PID_FILE"
}
trap cleanup EXIT INT TERM

echo "$$" >"$PID_FILE"

while :; do
	/usr/share/clashoo/net/access_check_cache.sh >/dev/null 2>&1 || true
	if [ -n "$INTERVAL_FIXED" ]; then
		sleep "$INTERVAL_FIXED"
	else
		# 5~20 秒随机，避免雪崩与单点抖动持续显示
		sleep "$(awk 'BEGIN{srand(); print int(5+rand()*16)}')"
	fi
done
