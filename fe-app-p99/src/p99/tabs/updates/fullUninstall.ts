import { executeShellCommand } from '../../../helpers';
import { renderXIcon24 } from '../../../icons';
import { renderButton } from '../../../partials';

let removing = false;

function confirmRemoval() {
  if (removing) return;
  const progress = E('p', { role: 'status' });
  const cancel = renderButton({
    text: _('Cancel'),
    onClick: () => ui.hideModal(),
  });
  const confirm = renderButton({
    text: _('Remove permanently'),
    classNames: ['cbi-button-negative'],
    onClick: () => {
      removing = true;
      confirm.disabled = true;
      cancel.disabled = true;
      progress.textContent = _('Removing P99…');
      void (async () => {
        try {
          const response = await executeShellCommand({
            command: '/usr/bin/p99',
            args: ['full_uninstall'],
            timeout: 15000,
          });
          const result = JSON.parse(response.stdout || '{}');
          if (
            response.code ||
            !result.success ||
            !/^\/p99-uninstall\.[A-Za-z0-9]+\.json$/.test(
              result.status_url || '',
            )
          ) {
            throw new Error(
              _(
                'Could not start removal. Another component action may be running.',
              ),
            );
          }
          const deadline = Date.now() + 180000;
          while (Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            let status: { state?: string; phase?: string };
            try {
              const reply = await fetch(result.status_url, {
                cache: 'no-store',
              });
              if (!reply.ok) continue;
              status = await reply.json();
            } catch {
              continue;
            }
            if (status.state === 'complete') {
              progress.textContent = _(
                'P99 and sing-box have been removed. Original repositories have been restored.',
              );
              cancel.textContent = _('Open LuCI');
              cancel.disabled = false;
              cancel.onclick = () => window.location.assign('/cgi-bin/luci/');
              return;
            }
            if (status.state === 'failed') {
              throw new Error(
                status.phase === 'preflight'
                  ? _(
                      'Original repositories could not be restored. Removal was cancelled before deleting packages.',
                    )
                  : _(
                      'Removal did not finish. See the removal log in /tmp/p99-uninstall.*/output.log.',
                    ),
              );
            }
          }
          throw new Error(
            _(
              'Could not confirm completion. Check the removal log before retrying.',
            ),
          );
        } catch (error) {
          progress.textContent =
            error instanceof Error ? error.message : String(error);
          cancel.disabled = false;
          // Do not blindly repeat an operation whose RPC response was lost.
          cancel.onclick = () => window.location.assign('/cgi-bin/luci/');
          cancel.textContent = _('Open LuCI');
        }
      })();
    },
  });
  ui.showModal(
    _('Full removal'),
    E('div', {}, [
      E(
        'p',
        {},
        _(
          'Remove P99, sing-box, their settings and cache, and restore the original device repositories?',
        ),
      ),
      E(
        'p',
        {},
        _(
          'This permanently deletes saved sections and subscriptions. Other components remain installed.',
        ),
      ),
      progress,
      E('div', { class: 'right' }, [cancel, confirm]),
    ]),
  );
}

export function renderFullUninstall(disabled: boolean) {
  return E('div', { class: 'fkp_updates-page__component' }, [
    E('div', { class: 'fkp_updates-page__component__header' }, [
      E(
        'b',
        { class: 'fkp_updates-page__component__title' },
        _('Full removal'),
      ),
    ]),
    E(
      'p',
      {},
      _(
        'Remove P99 and sing-box with their settings and restore the original device repositories.',
      ),
    ),
    renderButton({
      text: _('Remove P99 completely'),
      icon: renderXIcon24,
      classNames: ['cbi-button-negative'],
      disabled: disabled || removing,
      onClick: confirmRemoval,
    }),
  ]);
}
