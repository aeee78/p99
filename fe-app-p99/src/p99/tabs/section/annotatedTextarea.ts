const ANNOTATED_TEXTAREA_STYLE_ID = 'fkp-annotated-textarea-style';

export function escapeHtml(value: unknown): string {
  return `${value || ''}`
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function ensureAnnotatedTextareaStyles(): void {
  if (
    typeof document === 'undefined' ||
    !document.head ||
    document.getElementById(ANNOTATED_TEXTAREA_STYLE_ID)
  ) {
    return;
  }

  document.head.insertAdjacentHTML(
    'beforeend',
    `<style id="${ANNOTATED_TEXTAREA_STYLE_ID}">
      .fkp-annotated-textarea {
        position: relative;
      }

      .fkp-annotated-textarea > textarea {
        position: relative;
        z-index: 1;
        background: transparent !important;
      }

      .fkp-annotated-textarea__overlay {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
        box-sizing: border-box;
        color: transparent;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: break-word;
      }

      .fkp-annotated-textarea__invalid {
        color: transparent;
        text-decoration-line: underline;
        text-decoration-style: wavy;
        text-decoration-color: var(--error-color-medium, #d44);
        text-decoration-thickness: 1.5px;
        text-underline-offset: 2px;
        text-decoration-skip-ink: none;
      }
    </style>`,
  );
}

export function applyTextareaInputAttributes(
  textarea: HTMLTextAreaElement,
): void {
  textarea.setAttribute('spellcheck', 'false');
  textarea.setAttribute('autocomplete', 'off');
  textarea.setAttribute('autocorrect', 'off');
  textarea.setAttribute('autocapitalize', 'off');
  textarea.setAttribute('data-gramm', 'false');
  textarea.setAttribute('data-gramm_editor', 'false');
  textarea.setAttribute('data-enable-grammarly', 'false');
  textarea.style.resize = 'vertical';
  textarea.style.maxWidth = '100%';
}

export function syncAnnotatedTextareaOverlay(
  textarea: HTMLTextAreaElement,
  wrapper: HTMLElement,
  overlay: HTMLElement,
): void {
  if (
    typeof window === 'undefined' ||
    !textarea ||
    !wrapper ||
    !overlay ||
    typeof window.getComputedStyle !== 'function'
  ) {
    return;
  }

  const style = window.getComputedStyle(textarea);

  wrapper.style.backgroundColor = style.backgroundColor;
  wrapper.style.borderRadius = style.borderRadius;

  overlay.style.font = style.font;
  overlay.style.lineHeight = style.lineHeight;
  overlay.style.letterSpacing = style.letterSpacing;
  overlay.style.paddingTop = style.paddingTop;
  overlay.style.paddingRight = style.paddingRight;
  overlay.style.paddingBottom = style.paddingBottom;
  overlay.style.paddingLeft = style.paddingLeft;
  overlay.style.borderTopWidth = style.borderTopWidth;
  overlay.style.borderRightWidth = style.borderRightWidth;
  overlay.style.borderBottomWidth = style.borderBottomWidth;
  overlay.style.borderLeftWidth = style.borderLeftWidth;
  overlay.style.borderStyle = 'solid';
  overlay.style.borderColor = 'transparent';
  overlay.style.textAlign = style.textAlign;
  overlay.style.direction = style.direction;
  overlay.style.tabSize = style.tabSize;
  overlay.style.textIndent = style.textIndent;
  overlay.style.textTransform = style.textTransform;
  overlay.style.boxSizing = style.boxSizing;
  overlay.style.scrollPaddingTop = style.scrollPaddingTop;

  overlay.scrollTop = textarea.scrollTop;
  overlay.scrollLeft = textarea.scrollLeft;
}

export interface Annotation {
  start: number;
  end: number;
  message?: string;
  messages?: string[];
}

export function createAnnotationKey(annotation: {
  start: number;
  end: number;
}): string {
  return `${annotation.start}:${annotation.end}`;
}

export function addAnnotationIssue(
  annotationMap: Map<
    string,
    { start: number; end: number; messages: string[] }
  >,
  annotation: { start: number; end: number },
  message: string,
): void {
  const key = createAnnotationKey(annotation);
  const existing = annotationMap.get(key);
  if (existing) {
    if (!existing.messages.includes(message)) {
      existing.messages.push(message);
    }
    return;
  }

  annotationMap.set(key, {
    start: annotation.start,
    end: annotation.end,
    messages: [message],
  });
}

export function finalizeAnnotations(
  annotationMap: Map<
    string,
    { start: number; end: number; messages: string[] }
  >,
): Annotation[] {
  return Array.from(annotationMap.values())
    .map((annotation) => ({
      start: annotation.start,
      end: annotation.end,
      message: annotation.messages.join('; '),
    }))
    .sort((left, right) => left.start - right.start || left.end - right.end);
}

export function renderAnnotatedTextareaOverlay(
  value: unknown,
  annotations?: Annotation[],
): string {
  const text = value ? `${value}` : '';
  const normalizedAnnotations = Array.isArray(annotations) ? annotations : [];

  if (!text.length) {
    return '&#8203;';
  }

  if (!normalizedAnnotations.length) {
    return `${escapeHtml(text)}${text.endsWith('\n') ? '\n ' : ''}`;
  }

  let cursor = 0;
  let html = '';

  normalizedAnnotations.forEach((annotation) => {
    if (
      annotation.start < cursor ||
      annotation.start >= annotation.end ||
      annotation.start < 0
    ) {
      return;
    }

    html += escapeHtml(text.slice(cursor, annotation.start));
    html += `<span class="fkp-annotated-textarea__invalid">${escapeHtml(
      text.slice(annotation.start, annotation.end),
    )}</span>`;
    cursor = annotation.end;
  });

  html += escapeHtml(text.slice(cursor));

  if (text.endsWith('\n')) {
    html += '\n ';
  }

  return html;
}

export interface TextareaAnalysisResult {
  valid: boolean;
  message?: string;
  annotations?: Annotation[];
}

export type TextareaAnalyzer = (value: string) => TextareaAnalysisResult;

export interface AnnotatedController {
  analyzer: TextareaAnalyzer;
  textarea: HTMLTextAreaElement;
  wrapper: HTMLElement;
  overlay: HTMLElement;
  update: () => void;
  resizeObserver?: ResizeObserver;
}

export function attachAnnotatedTextarea(
  textarea: HTMLTextAreaElement & {
    __p99AnnotatedTextareaController?: AnnotatedController;
  },
  analyzer: TextareaAnalyzer,
): void {
  if (!textarea || typeof analyzer !== 'function') {
    return;
  }

  ensureAnnotatedTextareaStyles();

  if (textarea.__p99AnnotatedTextareaController) {
    textarea.__p99AnnotatedTextareaController.analyzer = analyzer;
    textarea.__p99AnnotatedTextareaController.update();
    return;
  }

  const wrapper = textarea.parentNode as HTMLElement | null;
  if (!wrapper) {
    return;
  }

  wrapper.classList.add('fkp-annotated-textarea');

  const overlay = document.createElement('div');
  overlay.className = 'fkp-annotated-textarea__overlay';
  overlay.setAttribute('aria-hidden', 'true');
  wrapper.insertBefore(overlay, textarea.nextSibling);

  const controller: AnnotatedController = {
    analyzer,
    textarea,
    wrapper,
    overlay,
    update() {
      const analysis = this.analyzer(this.textarea.value);
      this.overlay.innerHTML = renderAnnotatedTextareaOverlay(
        this.textarea.value,
        analysis.annotations,
      );
      syncAnnotatedTextareaOverlay(this.textarea, this.wrapper, this.overlay);
    },
  };

  textarea.__p99AnnotatedTextareaController = controller;

  const updateAnnotatedTextarea = () => controller.update();
  textarea.addEventListener('input', updateAnnotatedTextarea);
  textarea.addEventListener('change', updateAnnotatedTextarea);
  textarea.addEventListener('scroll', updateAnnotatedTextarea, {
    passive: true,
  });
  textarea.addEventListener('keyup', updateAnnotatedTextarea);

  if (typeof ResizeObserver === 'function') {
    const resizeObserver = new ResizeObserver(() => controller.update());
    resizeObserver.observe(textarea);
    controller.resizeObserver = resizeObserver;
  }

  controller.update();
}

export function refreshAnnotatedTextareaValidation(
  option: any,
  section_id: string,
  textarea?:
    | (HTMLTextAreaElement & {
        __p99AnnotatedTextareaController?: AnnotatedController;
      })
    | null,
): void {
  if (option && typeof option.triggerValidation === 'function') {
    option.triggerValidation(section_id);
  }

  if (
    textarea &&
    textarea.__p99AnnotatedTextareaController &&
    typeof textarea.__p99AnnotatedTextareaController.update === 'function'
  ) {
    textarea.__p99AnnotatedTextareaController.update();
  }
}

export function configureTextareaOption(
  option: any,
  analyzer?: TextareaAnalyzer,
  remoteValidationAttacher?: (
    option: any,
    sectionId: string,
    textarea: HTMLTextAreaElement,
  ) => void,
): void {
  const originalRenderWidget = option.renderWidget;

  option.renderWidget = function (
    this: any,
    section_id: string,
    option_index: number,
    cfgvalue: unknown,
  ) {
    const node = originalRenderWidget.call(
      this,
      section_id,
      option_index,
      cfgvalue,
    );
    const textarea =
      node && typeof node.querySelector === 'function'
        ? (node.querySelector('textarea') as HTMLTextAreaElement | null)
        : (node as HTMLTextAreaElement | null);

    if (textarea) {
      applyTextareaInputAttributes(textarea);
      textarea.addEventListener('input', () => {
        node.dispatchEvent(new CustomEvent('widget-change', { bubbles: true }));
      });
      if (typeof analyzer === 'function') {
        attachAnnotatedTextarea(textarea, analyzer);
      }
      if (typeof remoteValidationAttacher === 'function') {
        remoteValidationAttacher(this, section_id, textarea);
      }
    }

    return node;
  };
}

export function getOptionTextarea(
  option: any,
  section_id: string,
): HTMLTextAreaElement | null {
  const field =
    typeof option.map?.findElement === 'function'
      ? option.map.findElement('data-field', option.cbid(section_id))
      : null;

  if (field && typeof field.querySelector === 'function') {
    return field.querySelector('textarea') as HTMLTextAreaElement | null;
  }

  const elem =
    typeof option.getUIElement === 'function'
      ? option.getUIElement(section_id)
      : null;
  const node = elem && elem.node ? elem.node : null;

  if (node && node.nodeName === 'TEXTAREA') {
    return node as HTMLTextAreaElement;
  }

  return node && typeof node.querySelector === 'function'
    ? (node.querySelector('textarea') as HTMLTextAreaElement | null)
    : null;
}
