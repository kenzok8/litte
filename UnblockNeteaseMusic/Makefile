# SPDX-Identifier-License: GPL-3.0-only
#
# Copyright (C) 2024 ImmortalWrt.org

include $(TOPDIR)/rules.mk

PKG_NAME:=UnblockNeteaseMusic
PKG_VERSION:=0.27.6
PKG_RELEASE:=1

PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.gz
PKG_SOURCE_URL:=https://codeload.github.com/UnblockNeteaseMusic/server/tar.gz/v${PKG_VERSION}?
PKG_HASH:=951d74e5950a6579922adacb44507e6d8f0fb323363051e73478d26fc1b92fac

PKG_LICENSE:=LGPL-3.0-only
PKG_LICENSE_FILE:=LICENSE
PKG_MAINTAINER:=Tianling Shen <cnsztl@immortalwrt.org>

include $(INCLUDE_DIR)/package.mk

define Package/UnblockNeteaseMusic
  SECTION:=multimedia
  CATEGORY:=Multimedia
  TITLE:=Revive Netease Cloud Music (NodeJS)
  URL:=https://github.com/nondanee/UnblockNeteaseMusic
  DEPENDS:=+node
  PKGARCH:=all
endef

define Package/UnblockNeteaseMusic/install
	$(INSTALL_DIR) $(1)/usr/share/UnblockNeteaseMusic
	$(CP) $(PKG_BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)/* $(1)/usr/share/UnblockNeteaseMusic
endef

$(eval $(call BuildPackage,UnblockNeteaseMusic))
