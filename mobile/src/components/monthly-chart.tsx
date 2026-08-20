import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { MonthlyStat } from '@/db/stats';

const CHART_HEIGHT = 64;

export function MonthlyChart({ data }: { data: MonthlyStat[] }) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <View style={styles.row}>
      {data.map((item) => (
        <View key={item.month} style={styles.column}>
          <View style={styles.barTrack}>
            <ThemedView
              type="backgroundSelected"
              style={[styles.bar, { height: (item.count / maxCount) * CHART_HEIGHT }]}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.monthLabel}>
            {item.month.slice(5)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  column: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  barTrack: {
    height: CHART_HEIGHT,
    width: 16,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 2,
  },
  monthLabel: {
    fontSize: 10,
  },
});
