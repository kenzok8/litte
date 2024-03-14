# SPDX-License-Identifier: GPL-2.0-only
#
# Copyright (C) 2017-2020 Yousong Zhou <yszhou4tech@gmail.com>
# Copyright (C) 2018 Lean <coolsnowwolf@gmail.com>
# Copyright (C) 2021 ImmortalWrt.org

include $(TOPDIR)/rules.mk

PKG_NAME:=shadowsocksr-libev
PKG_VERSION:=2.5.6
PKG_RELEASE:=11

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/shadowsocksrr/shadowsocksr-libev
PKG_SOURCE_DATE:=2019-12-29
PKG_SOURCE_VERSION:=6728f456437cfe13553bf34be23ae11ca5dd7e7b
PKG_MIRROR_HASH:=20028a084984d12e75f3012a18804a24f375e1a7c87fc29c68c0898994a4fe62

PKG_LICENSE:=GPL-3.0
PKG_LICENSE_FILES:=LICENSE

PKG_FIXUP:=autoreconf
PKG_USE_MIPS16:=0
PKG_BUILD_FLAGS:=no-mips16
PKG_BUILD_PARALLEL:=1
PKG_INSTALL:=1

include $(INCLUDE_DIR)/package.mk

define Package/shadowsocksr-libev/Default
  define Package/shadowsocksr-libev-ssr-$(1)
    SECTION:=net
    CATEGORY:=Network
    SUBMENU:=Web Servers/Proxies
    TITLE:=shadowsocksr-libev ssr-$(1)
    URL:=https://github.com/shadowsocksrr/shadowsocksr-libev
    DEPENDS:=+libev +libsodium +libopenssl +libpthread +libpcre +libudns +zlib +libopenssl-legacy
  endef

  define Package/shadowsocksr-libev-ssr-$(1)/install
	$$(INSTALL_DIR) $$(1)/usr/bin
	$$(INSTALL_BIN) $$(PKG_INSTALL_DIR)/usr/bin/ss-$(1) $$(1)/usr/bin/ssr-$(1)
  endef
endef

SHADOWSOCKSR_COMPONENTS:=check local nat redir server
define shadowsocksr-libev/templates
  $(foreach component,$(SHADOWSOCKSR_COMPONENTS),
    $(call Package/shadowsocksr-libev/Default,$(component))
  )
endef
$(eval $(call shadowsocksr-libev/templates))

CONFIGURE_ARGS += \
	--disable-documentation \
	--disable-ssp \
	--disable-assert \
	--enable-system-shared-lib

TARGET_CFLAGS += -flto
TARGET_LDFLAGS += -Wl,--gc-sections,--as-needed

ifeq ($(CONFIG_GCC_VERSION_12),y)
	TARGET_CFLAGS += -Wno-error=use-after-free
endif

ifeq ($(CONFIG_GCC_VERSION_13),y)
	TARGET_CFLAGS += -Wno-error=use-after-free
endif

$(foreach component,$(SHADOWSOCKSR_COMPONENTS), \
  $(eval $(call BuildPackage,shadowsocksr-libev-ssr-$(component))) \
)
