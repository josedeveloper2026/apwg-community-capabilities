import { hasLocalChanges } from '../lib/registry-store';
import { page } from '../lib/paths';

export function mountLocalBanner(root: HTMLElement): void {
  root.replaceChildren();
  if (!hasLocalChanges()) return;
  const wrap = document.createElement('div');
  wrap.className = 'wrap';
  const text = document.createElement('p');
  text.append('This browser has registry changes that are not in the published site. ');
  const link = document.createElement('a');
  link.href = `${page('add/')}#registry-file`;
  link.textContent = 'Export JSON to propose them in a pull request.';
  text.append(link);
  wrap.append(text);
  root.append(wrap);
}
