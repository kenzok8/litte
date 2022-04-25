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
sed -i 's/"nas"/"services"/g' luci-app-fileassistant/luasrc/controller/fileassistant.lua
sed -i 's/"NAS"/"Services"/g' luci-app-fileassistant/luasrc/controller/fileassistant.lua
sed -i 's/nas/services/g' luci-app-fileassistant/htdocs/luci-static/resources/fileassistant/fb.js
sed -i 's/NAS/Services/g' luci-app-fileassistant/htdocs/luci-static/resources/fileassistant/fb.js

bash diy/create_acl_for_luci.sh -a >/dev/null 2>&1
bash diy/convert_translation.sh -a >/dev/null 2>&1

rm -rf create_acl_for_luci.err & rm -rf create_acl_for_luci.ok
rm -rf create_acl_for_luci.warn

exit 0
