export function elemento<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classe?: string,
  ...filhos: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  el.append(...filhos);
  return el;
}

export function achar<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não existe na página`);
  return el as T;
}
