import { GlobalStyles } from '../styles';

const P99_GLOBAL_STYLES_ID = 'p99-global-styles';

export function injectGlobalStyles() {
  if (document.getElementById(P99_GLOBAL_STYLES_ID)) {
    return;
  }

  document.head.insertAdjacentHTML(
    'beforeend',
    `
        <style id="${P99_GLOBAL_STYLES_ID}">
          ${GlobalStyles}
        </style>
    `,
  );
}
