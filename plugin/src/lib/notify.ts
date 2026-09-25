import { spawn } from 'node:child_process';

/**
 * Desktop notification, best effort and always fire-and-forget. The channel is
 * useful without it, so a missing notifier or a locked-down machine must never
 * surface as an error.
 */
export function notifyDesktop(title: string, body: string): void {
  try {
    switch (process.platform) {
      case 'win32': return windowsToast(title, body);
      case 'darwin': return macNotification(title, body);
      default: return linuxNotification(title, body);
    }
  } catch {
    // Intentionally silent.
  }
}

function detach(command: string, args: string[]): void {
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.on('error', () => undefined);
  child.unref();
}

function windowsToast(title: string, body: string): void {
  // WinRT toasts need a registered AppUserModelID; PowerShell's own is always
  // present, which avoids shipping or installing anything.
  const appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe';
  const script = `
$ErrorActionPreference='SilentlyContinue'
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] > $null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$texts = $template.GetElementsByTagName('text')
$texts.Item(0).AppendChild($template.CreateTextNode(${psLiteral(title)})) > $null
$texts.Item(1).AppendChild($template.CreateTextNode(${psLiteral(body)})) > $null
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier(${psLiteral(appId)}).Show($toast)
`.trim();

  detach('powershell', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script]);
}

function macNotification(title: string, body: string): void {
  detach('osascript', ['-e', `display notification ${osaLiteral(body)} with title ${osaLiteral(title)}`]);
}

function linuxNotification(title: string, body: string): void {
  detach('notify-send', [title, body]);
}

/** Single-quoted PowerShell string; doubling the quote is the only escape. */
function psLiteral(value: string): string {
  return `'${value.replace(/'/g, "''").replace(/[\r\n]+/g, ' ')}'`;
}

function osaLiteral(value: string): string {
  return `"${value.replace(/["\\]/g, '\\$&').replace(/[\r\n]+/g, ' ')}"`;
}
