import type { P99 } from '../../types';

export function shouldApplyCompletedComponentActionResult(
  result: Pick<P99.ComponentActionResult, 'action'>,
  notify: boolean,
) {
  return result.action !== 'check_update' || notify;
}
