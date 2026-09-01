/**
 * Числовые форматы экранов. Раньше эти функции жили копиями в «Артикуле»
 * и «Истории»; с появлением третьего потребителя копии начали расходиться,
 * поэтому переехали сюда.
 */

import type { Language } from '@/lib/i18n';

/**
 * Разряды через неразрывный пробел, как в макете: 50 575, а не 50575.
 * Пробел именно неразрывный — обычный позволил бы переносу разорвать число
 * на «50» в конце строки и «575» в начале следующей.
 */
export function grouped(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function money(value: number): string {
  return `${grouped(value)} ₽`;
}

/**
 * Дробное число. В русском разделитель — запятая, в китайском точка.
 *
 * Знак не выводится: минус должен быть типографским «−», а не дефисом из
 * toFixed, и ставит его вызывающий вместе с плюсом. Значение берётся
 * по модулю.
 */
export function decimal(value: number, digits: number, language: Language): string {
  const [whole, fraction] = Math.abs(value).toFixed(digits).split('.');
  const head = grouped(Number(whole));
  return fraction ? `${head}${language === 'ru' ? ',' : '.'}${fraction}` : head;
}
