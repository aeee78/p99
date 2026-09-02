include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-p99

P99_SOURCE_VERSION:=$(or $(P99_PACKAGE_VERSION),$(P99_VERSION))
P99_HAS_RELEASE_VERSION:=$(if $(filter dev,$(P99_SOURCE_VERSION)),,$(P99_SOURCE_VERSION))
P99_COMPILED_VERSION:=$(if $(P99_HAS_RELEASE_VERSION),$(P99_SOURCE_VERSION),$(or $(P99_SOURCE_VERSION),dev))
P99_RELEASE_VERSION_VALID:=$(if $(P99_HAS_RELEASE_VERSION),$(shell printf '%s\n' '$(P99_SOURCE_VERSION)' | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$$' && printf '1'),1)

ifeq ($(P99_RELEASE_VERSION_VALID),)
$(error P99_PACKAGE_VERSION and P99_VERSION must use x.y.z format)
endif

PKG_VERSION:=$(or $(P99_HAS_RELEASE_VERSION),0.0.0)
PKG_RELEASE:=
PKG_PO_VERSION:=$(PKG_VERSION)

LUCI_TITLE:=LuCI P99 app
LUCI_DEPENDS:=+luci-base +p99
LUCI_PKGARCH:=all
LUCI_LANG.ru:=Русский (Russian)
LUCI_LANG.en:=English
LUCI_MAINTAINER:=aeee78 <235684779+aeee78@users.noreply.github.com>
LUCI_DESCRIPTION:=Rule-based P99 LuCI app with hybrid sing-box + zapret orchestration
LUCI_MINIFY_JS:=0

PKG_LICENSE:=GPL-2.0-or-later
LUCI_LANGUAGES:=en ru

define Build/Prepare/$(PKG_NAME)
	sed -i -e 's/__COMPILED_VERSION_VARIABLE__/$(P99_COMPILED_VERSION)/g' $(PKG_BUILD_DIR)/htdocs/luci-static/resources/view/p99/main.js
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
