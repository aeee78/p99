import { P99 } from '../../types';
import { P99_UCI_PACKAGE } from '../../../constants';

export async function getConfigSections(): Promise<P99.ConfigSection[]> {
  return uci.load(P99_UCI_PACKAGE).then(() => uci.sections(P99_UCI_PACKAGE));
}
