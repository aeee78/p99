include $(TOPDIR)/rules.mk

PKG_NAME:=p99

P99_SOURCE_VERSION:=$(or $(P99_PACKAGE_VERSION),$(P99_VERSION))
P99_HAS_RELEASE_VERSION:=$(if $(filter dev,$(P99_SOURCE_VERSION)),,$(P99_SOURCE_VERSION))
P99_COMPILED_VERSION:=$(if $(P99_HAS_RELEASE_VERSION),$(P99_SOURCE_VERSION),$(or $(P99_SOURCE_VERSION),dev))
P99_RELEASE_VERSION_VALID:=$(if $(P99_HAS_RELEASE_VERSION),$(shell printf '%s\n' '$(P99_SOURCE_VERSION)' | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$$' && printf '1'),1)

ifeq ($(P99_RELEASE_VERSION_VALID),)
$(error P99_PACKAGE_VERSION and P99_VERSION must use x.y.z format)
endif

PKG_VERSION:=$(or $(P99_HAS_RELEASE_VERSION),0.0.0)
PKG_RELEASE:=

PKG_MAINTAINER:=aeee78 <235684779+aeee78@users.noreply.github.com>
PKG_LICENSE:=GPL-2.0-or-later

include $(INCLUDE_DIR)/package.mk

define Package/p99
	SECTION:=net
	CATEGORY:=Network
	DEPENDS:=+ca-bundle +kmod-inet-diag +kmod-netlink-diag +kmod-tun +curl +ucode +ucode-mod-fs +ucode-mod-uci +kmod-nft-tproxy +coreutils-base64 +bind-dig +nftables-json +kmod-nft-nat +ip-full
	CONFLICTS:=https-dns-proxy nextdns luci-app-passwall luci-app-passwall2
	TITLE:=P99 backend service
	URL:=https://github.com/aeee78/p99
	PKGARCH:=all
endef

define Package/p99/description
	Rule-based P99 backend with hybrid sing-box + zapret orchestration
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/p99/prerm
#!/usr/bin/ucode

if (getenv("IPKG_INSTROOT") == null || getenv("IPKG_INSTROOT") == "")
	system("/usr/bin/p99 package_prerm " + (ARGV[0] || "") + " >/dev/null 2>&1");

exit(0);
endef

define Package/p99/postinst
#!/bin/sh

[ -n "$${IPKG_INSTROOT}" ] && exit 0
P99_LIB=/usr/lib/p99 ucode -L /usr/lib/p99 /usr/lib/p99/config/migration.uc migrate || exit $$?
/usr/bin/p99 package_postinst
endef

define Package/p99/conffiles
/etc/config/p99
endef

define Package/p99/install
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/p99 $(1)/etc/init.d/p99

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/p99 $(1)/etc/config/p99

	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/p99 $(1)/usr/bin/p99

	$(INSTALL_DIR) $(1)/usr/lib/p99
	$(CP) ./files/usr/lib/. $(1)/usr/lib/p99/

	$(INSTALL_DIR) $(1)/usr/share/p99/defaults
	$(INSTALL_CONF) ./files/etc/config/p99 $(1)/usr/share/p99/defaults/p99

	sed -i -e 's/__COMPILED_VERSION_VARIABLE__/$(P99_COMPILED_VERSION)/g' $(1)/usr/lib/p99/core/constants.uc
endef

$(eval $(call BuildPackage,p99))
