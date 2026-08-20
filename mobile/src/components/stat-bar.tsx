import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type StatBarProps = {
  label: string;
  valueLabel: string;
  ratio: number; // 0..1
};

export function StatBar({ label, valueLabel, ratio }: StatBarProps) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <ThemedText type="small">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {valueLabel}
        </ThemedText>
      </View>
      <ThemedView type="backgroundElement" style={styles.track}>
        <ThemedView type="backgroundSelected" style={[styles.fill, { width: `${clamped * 100}%` }]} />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.one,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
