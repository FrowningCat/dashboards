import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius } from '@/constants/design';
import { Fonts } from '@/constants/theme';
import { sameDay, startOfDay } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n';

/**
 * Календарь выбора даты. Свой, а не системный: системный на iOS и Android
 * выглядит по-разному и тянет за собой зависимость ради одного экрана.
 *
 * Выбирается конец периода — та дата, от которой отсчитываются назад
 * семь, тридцать или девяносто дней.
 */
export function Calendar({ value, onPick }: { value: Date; onPick: (date: Date) => void }) {
  const { t } = useTranslation();
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));

  const months = t('monthNames').split(',');
  const weekdays = t('weekdayNames').split(',');
  const today = startOfDay(new Date());

  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  // Неделя начинается с понедельника, а getDay() считает от воскресенья.
  const offset = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const step = (delta: number) =>
    setView(new Date(view.getFullYear(), view.getMonth() + delta, 1));

  return (
    <View style={styles.calendar}>
      <View style={styles.calendarHead}>
        <Pressable onPress={() => step(-1)} hitSlop={8} style={styles.calendarArrow}>
          <Text style={styles.calendarArrowText}>‹</Text>
        </Pressable>
        <Text style={styles.calendarMonth}>
          {months[view.getMonth()]} {view.getFullYear()}
        </Text>
        <Pressable onPress={() => step(1)} hitSlop={8} style={styles.calendarArrow}>
          <Text style={styles.calendarArrowText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.calendarRow}>
        {weekdays.map((name) => (
          <Text key={name} style={styles.calendarWeekday}>
            {name}
          </Text>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.calendarRow}>
          {row.map((day, dayIndex) => {
            if (day === null) {
              return <View key={dayIndex} style={styles.calendarCell} />;
            }

            const date = new Date(view.getFullYear(), view.getMonth(), day);
            // Будущее выбирать нечем: данных за него ещё нет.
            const future = date.getTime() > today.getTime();
            const picked = sameDay(date, value);

            return (
              <Pressable
                key={dayIndex}
                disabled={future}
                onPress={() => onPick(date)}
                style={[styles.calendarCell, picked && styles.calendarCellPicked]}>
                <Text
                  style={[
                    styles.calendarDay,
                    future && styles.calendarDayFuture,
                    picked && styles.calendarDayPicked,
                  ]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: Radius.card,
    padding: 12,
  },
  calendarHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calendarArrow: {
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  calendarArrowText: {
    fontSize: 17,
    color: Palette.muted,
  },
  calendarMonth: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Palette.ink,
  },
  calendarRow: {
    flexDirection: 'row',
  },
  calendarWeekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    color: Palette.dim,
    paddingBottom: 4,
  },
  calendarCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarCellPicked: {
    backgroundColor: Palette.ink,
  },
  calendarDay: {
    fontFamily: Fonts.mono,
    fontSize: 12.5,
    color: Palette.ink,
  },
  calendarDayFuture: {
    color: Palette.dim,
  },
  calendarDayPicked: {
    color: Palette.paper,
    fontWeight: '600',
  },
});
