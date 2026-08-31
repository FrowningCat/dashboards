import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Значки нижней панели.
 *
 * Раньше здесь стояли типографские символы из системного шрифта. У них два
 * изъяна: на Android и iOS они рисуются по-разному, а отсутствующий в шрифте
 * знак превращается в пустой прямоугольник. Своя отрисовка снимает и то и другое.
 *
 * Все построены в одной сетке 24×24 с одинаковой толщиной линии, иначе
 * в ряду один значок казался бы жирнее соседей.
 */

const SIZE = 22;
const STROKE = 1.7;

type Props = {
  color: string;
};

function Frame({ color, children }: Props & { children: React.ReactNode }) {
  return (
    <Svg
      width={SIZE}
      height={SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round">
      {children}
    </Svg>
  );
}

/**
 * Ширины полос намеренно разные: равномерная решётка читается как решётка,
 * а штрихкодом её делает именно неравномерность. Числа — не случайные,
 * а чередование трёх толщин, как в настоящем коде.
 *
 * Полосы залитые, а не обведённые: на девятнадцати пикселях контур
 * толщиной 1.7 съел бы просветы между ними.
 */
const BARS: readonly { x: number; width: number }[] = [
  { x: 3, width: 1.6 },
  { x: 5.6, width: 1 },
  { x: 7.9, width: 2.6 },
  { x: 11.7, width: 1 },
  { x: 14, width: 1.8 },
  { x: 17.2, width: 1 },
  { x: 19.5, width: 2.2 },
];

export function ArticleIcon({ color }: Props) {
  return (
    <Frame color={color}>
      {BARS.map((bar) => (
        <Rect
          key={bar.x}
          x={bar.x}
          y={5}
          width={bar.width}
          height={14}
          rx={bar.width / 2.6}
          fill={color}
          stroke="none"
        />
      ))}
    </Frame>
  );
}

export function HistoryIcon({ color }: Props) {
  return (
    <Frame color={color}>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 6.5V12l4 2.5" />
    </Frame>
  );
}

export function AdsIcon({ color }: Props) {
  return (
    <Frame color={color}>
      <Path d="M3 4.5h18l-7 8.5v6.5l-4 1.5v-8z" />
    </Frame>
  );
}

export function MoreIcon({ color }: Props) {
  return (
    <Frame color={color}>
      <Path d="M4 7h16M4 12h16M4 17h16" />
    </Frame>
  );
}
