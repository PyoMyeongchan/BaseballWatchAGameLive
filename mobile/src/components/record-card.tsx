import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getGameResult } from '@/db/types';
import type { GameRecord, GameResult } from '@/db/types';

const RESULT_LABEL: Record<GameResult, string> = {
  WIN: '승',
  LOSS: '패',
  DRAW: '무',
};

export function RecordCard({ record, onPress }: { record: GameRecord; onPress: () => void }) {
  const result = getGameResult(record);
  const thumbnail = record.photoUris[0];

  return (
    <Pressable onPress={onPress}>
      <ThemedView type="backgroundElement" style={styles.card}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <ThemedText type="subtitle" themeColor="textSecondary">
              ⚾
            </ThemedText>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold">{record.date}</ThemedText>
            {result && (
              <ThemedText type="smallBold" themeColor={result.toLowerCase() as Lowercase<GameResult>}>
                {RESULT_LABEL[result]}
              </ThemedText>
            )}
          </View>
          <ThemedText type="default">{record.opponent}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {record.ballpark} · {record.homeAway === 'HOME' ? '홈' : '원정'}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: Spacing.two,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: Spacing.half,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
