#!/bin/bash
# --------------------------------------------------------
# Script for creating ACL file for each LuCI APP
sed -i \
-e 's?include \.\./\.\./\(lang\|devel\)?include $(TOPDIR)/feeds/packages/\1?' \
-e 's?2. Clash For OpenWRT?3. Applications?' \
-e 's?\.\./\.\./luci.mk?$(TOPDIR)/feeds/luci/luci.mk?' \
*/Makefile

sed -i 's/luci-lib-ipkg/luci-base/g' luci-app-store/Makefile
sed -i 's?include \.\./\.\./\(lang\|devel\)?include $(TOPDIR)/feeds/packages/\1?' brook/Makefile
sed -i -e 's/nas/system/g' -e 's/NAS/System/g' $(grep -rl 'nas\|NAS' luci-app-fileassistant)
sed -i 's/pkg_web_version:=.*/pkg_web_version:=$pkg_version/' alist/Makefile

bash diy/create_acl_for_luci.sh -a >/dev/null 2>&1
bash diy/convert_translation.sh -a >/dev/null 2>&1

rm -rf create_acl_for_luci.err & rm -rf create_acl_for_luci.ok
rm -rf create_acl_for_luci.warn

exit 0
