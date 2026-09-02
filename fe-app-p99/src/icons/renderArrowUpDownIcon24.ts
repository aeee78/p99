import { svgEl } from '../helpers';

export function renderArrowUpDownIcon24() {
  const NS = 'http://www.w3.org/2000/svg';
  return svgEl(
    'svg',
    {
      xmlns: NS,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      class: 'lucide lucide-arrow-up-down',
    },
    [
      svgEl('path', { d: 'm21 16-4 4-4-4' }),
      svgEl('path', { d: 'M17 20V4' }),
      svgEl('path', { d: 'm3 8 4-4 4 4' }),
      svgEl('path', { d: 'M7 4v16' }),
    ],
  );
}
