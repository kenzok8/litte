
include $(TOPDIR)/rules.mk

PKG_NAME:=upx-static
PKG_VERSION:=4.2.2
PKG_RELEASE:=1

PKG_FILE:=upx-$(PKG_VERSION)-$(PKG_ARCH)_linux.tar.xz
PKG_URL:=https://github.com/upx/upx/releases/download/v$(PKG_VERSION)/

ifeq ($(ARCH),amd64)
  PKG_HASH:=915c8e844f835de03b9cc311ff185aedec79d757aee9d7133a528b9e89c463bb
else ifeq ($(ARCH),i386)
  PKG_HASH:=2a9a48665ae2d8d9a79765d6f4795e0422a81bd3eb2c7833ee43467d32cce6ad
else ifeq ($(ARCH),mipsel)
  PKG_HASH:=0ed797fe0d3a2f501b12567b686dd2288fdf79789105855d984e70241f52786e
else ifeq ($(ARCH),mips)	
  PKG_HASH:=893e24f4f54ae7dda50f7978941a8b15d1e270f67e55a4bd4e80b03ab969ae11
else ifeq ($(ARCH),armeb)
  PKG_HASH:=72396b07a4d4711d74cb56818343e617e8855f20c7d22d3c46b560cddb99d054
else ifeq ($(ARCH),arm)	
  PKG_HASH:=3eeba6fb60237d1bfb3e30089ce17fc0ec87cb60d6d6d8fc40f536819bf52d53
else ifeq ($(ARCH),arm64)
  PKG_HASH:=e67f7e873b3a01879863518e716204b3a18cf36c575f53e59439d140b1179b6b
else ifeq ($(ARCH),powerp)
  PKG_HASH:=ce58ad536537a8987377392ebd35af17fab5a0943fffbeb499f22b8df323a36b
else ifeq ($(ARCH),powerpc64le)
  PKG_HASH:=9fcac101e78592db2a3b21baf7db707f736c3576832f1e03c71f482a1ae4d64c
else
  PKG_HASH:=dummy
endif

PKG_BUILD_DIR:=$(BUILD_DIR)/upx-$(PKG_VERSION)-$(PKG_ARCH)_linux.tar.xz

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
    SUBMENU:=Compression
	SECTION:=utils
	CATEGORY:=Utilities
	TITLE:=UPX - The Ultimate Packer for eXecutables
	URL:=https://upx.github.io
	DEPENDS:=@(armeb||arm||i386||mips||mipsel||x86_64) @!(TARGET_x86_geode||TARGET_x86_legacy)
endef

define Package/$(PKG_NAME)/description
UPX - The Ultimate Packer for eXecutables
endef

define Build/Prepare
	if [ ! -f $(DL_DIR)/$(PKG_FILE) ] ; then \
		wget -q $(PKG_URL) -O $(DL_DIR)/$(PKG_FILE); \
	fi
	rm -rf $(PKG_BUILD_DIR)
	mkdir -p $(PKG_BUILD_DIR)
	xz -d -c $(DL_DIR)/$(PKG_FILE) | tar -x -C $(PKG_BUILD_DIR)
endef

define Build/Compile
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/upx-$(PKG_VERSION)-$(PKG_ARCH)_linux/upx $(1)/bin/upx
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
