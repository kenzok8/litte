include $(TOPDIR)/rules.mk

PKG_NAME:=sagernet-core
PKG_VERSION:=5.0.16
PKG_RELEASE:=1

PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.gz
PKG_SOURCE_URL:=https://codeload.github.com/SagerNet/v2ray-core/tar.gz/v$(PKG_VERSION)?
PKG_HASH:=1ebdde5eb499d842662bb8613efae50f1805ef225adb2ebca8b07344a9c8e429

PKG_LICENSE:=GPL-3.0-or-later
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=Tianling Shen <cnsztl@immortalwrt.org>

PKG_BUILD_DEPENDS:=golang/host
PKG_BUILD_PARALLEL:=1
PKG_USE_MIPS16:=0
PKG_BUILD_FLAGS:=no-mips16

GO_PKG:=github.com/v2fly/v2ray-core/v5
GO_PKG_BUILD_PKG:=$(GO_PKG)/main
GO_PKG_LDFLAGS_X:= \
	$(GO_PKG).build=OpenWrt \
	$(GO_PKG).version=$(PKG_VERSION)

include $(INCLUDE_DIR)/package.mk
include $(TOPDIR)/feeds/packages/lang/golang/golang-package.mk

define Package/sagernet/template
  TITLE:=An enhanced v2ray edition for SagerNet
  SECTION:=net
  CATEGORY:=Network
  URL:=https://sagernet.org
endef

define Package/sagernet-core
  $(call Package/sagernet/template)
  DEPENDS:=$(GO_ARCH_DEPENDS) +ca-bundle
  CONFLICTS:=v2ray-core xray-core
endef

define Package/sagernet-example
  $(call Package/sagernet/template)
  TITLE+= (example configs)
  DEPENDS:=sagernet-core
  CONFLICTS:=v2ray-example
  PKGARCH:=all
endef

define Package/sagernet-extra
  $(call Package/sagernet/template)
  TITLE+= (extra resources)
  DEPENDS:=sagernet-core
  CONFLICTS:=v2ray-extra
  PKGARCH:=all
endef

define Package/sagernet/description
  Project V is a set of network tools that help you to build your own computer network.
  It secures your network connections and thus protects your privacy.
endef

define Package/sagernet-core/description
  $(call Package/sagernet/description)

  This is a v2ray-core fork for SagerNet.
endef

define Package/sagernet-example/description
  $(call Package/sagernet/description)

  This includes example configuration files for sagernet-core.
endef

define Package/sagernet-extra/description
  $(call Package/sagernet/description)

  This includes extra resources for sagernet-core.
endef

define Package/sagernet-core/conffiles
/etc/config/v2ray
/etc/v2ray/
endef

LIBCORE_NAME:=LibSagerNetCore
LIBCORE_DATE:=2023-04-25
LIBCORE_VERSION:=1fce969ea5d102145fc36f480fffdec87598ae54
LIBCORE_FILE:=$(LIBCORE_NAME)-$(LIBCORE_DATE)-$(call version_abbrev,$(LIBCORE_VERSION)).tar.xz
define Download/libcore
	PROTO:=git
	URL:=https://github.com/SagerNet/LibSagerNetCore.git
	VERSION:=$(LIBCORE_VERSION)
	FILE:=$(LIBCORE_FILE)
	SUBDIR:=$(LIBCORE_NAME)
	MIRROR_HASH:=ab44e8c9cc48c1405cc4f8825b1484609f1c6847d25c84948fe0bab8371c3e9c
endef

define Build/Prepare
	$(call Build/Prepare/Default)

	xzcat $(DL_DIR)/$(LIBCORE_FILE) | tar -C $(PKG_BUILD_DIR) $(TAR_OPTIONS)
	$(CP) $(PKG_BUILD_DIR)/$(LIBCORE_NAME)/{obfs,ssr}.go \
		$(PKG_BUILD_DIR)/proxy/shadowsocks/plugin/self/
	$(SED) '/plugin\/self/d' -e 's/self.ParsePluginOptions/ParsePluginOptions/g' \
		$(PKG_BUILD_DIR)/proxy/shadowsocks/plugin/self/obfs.go
	$(SED) 's/package libcore/package self/g' \
		$(PKG_BUILD_DIR)/proxy/shadowsocks/plugin/self/{obfs,ssr}.go
endef

define Package/sagernet-core/install
	$(call GoPackage/Package/Install/Bin,$(PKG_INSTALL_DIR))
	$(INSTALL_DIR) $(1)/usr/bin/
	$(INSTALL_BIN) $(PKG_INSTALL_DIR)/usr/bin/main $(1)/usr/bin/v2ray
	$(LN) v2ray $(1)/usr/bin/xray

	$(INSTALL_DIR) $(1)/etc/v2ray/
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/release/config/config.json $(1)/etc/v2ray/

	$(INSTALL_DIR) $(1)/etc/config/
	$(INSTALL_CONF) $(CURDIR)/files/v2ray.conf $(1)/etc/config/v2ray
	$(INSTALL_DIR) $(1)/etc/init.d/
	$(INSTALL_BIN) $(CURDIR)/files/v2ray.init $(1)/etc/init.d/v2ray
endef

define Package/sagernet-example/install
	$(INSTALL_DIR) $(1)/etc/v2ray/
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/release/config/vpoint_socks_vmess.json $(1)/etc/v2ray/
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/release/config/vpoint_vmess_freedom.json $(1)/etc/v2ray/
endef

define Package/sagernet-extra/install
	$(INSTALL_DIR) $(1)/usr/share/v2ray/
	$(CP) $(PKG_BUILD_DIR)/release/extra/* $(1)/usr/share/v2ray/
endef

$(eval $(call Download,libcore))
$(eval $(call BuildPackage,sagernet-core))
$(eval $(call BuildPackage,sagernet-example))
$(eval $(call BuildPackage,sagernet-extra))
