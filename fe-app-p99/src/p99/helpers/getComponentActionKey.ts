import type { StoreType } from '../services/store.service';
import type { P99 } from '../types';

export type UpdatesActionKey = keyof StoreType['updatesActions'];

const componentActionKeyMap: Record<string, UpdatesActionKey> = {
  'p99:check_update': 'p99Check',
  'p99:install': 'p99Install',
  'sing_box:check_update': 'singBoxCheck',
  'sing_box:install': 'singBoxInstall',
  'sing_box:install_extended': 'singBoxInstallExtended',
  'sing_box:install_extended_compressed': 'singBoxInstallExtendedCompressed',
  'sing_box:install_tiny': 'singBoxInstallTiny',
  'sing_box:install_stable': 'singBoxInstallStable',
  'zapret:check_update': 'zapretCheck',
  'zapret:install': 'zapretInstall',
  'zapret:remove': 'zapretRemove',
  'zapret2:check_update': 'zapret2Check',
  'zapret2:install': 'zapret2Install',
  'zapret2:remove': 'zapret2Remove',
  'byedpi:check_update': 'byedpiCheck',
  'byedpi:install': 'byedpiInstall',
  'byedpi:remove': 'byedpiRemove',
  'zapret_manager:install': 'zapretManagerInstall',
  'zapret_manager:remove': 'zapretManagerRemove',
};

export function getComponentActionKey(
  component: P99.ComponentName,
  action: P99.ComponentAction,
): UpdatesActionKey | undefined {
  return componentActionKeyMap[`${component}:${action}`];
}
