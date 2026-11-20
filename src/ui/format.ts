/**
 * Чистые функции форматирования HUD. Значения приходят из публичного снимка,
 * поэтому подписи останутся верными после изменения баланса и числа дронов.
 */
const plural = new Intl.PluralRules('ru');
export function counted(n: number, one: string, few: string, many: string): string {
  const form = plural.select(n);
  return n + ' ' + (form === 'one' ? one : form === 'few' ? few : many);
}
export function timecode(s: number): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return two(Math.floor(s / 60)) + ':' + two(s % 60);
}
