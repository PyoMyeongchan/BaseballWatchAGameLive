import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deleteRecord, getRecord } from '@/db/records';
import { getGameResult } from '@/db/types';
import type { GameRecord, GameResult } from '@/db/types';

const RESULT_LABEL: Record<GameResult, string> = {
  WIN: '승',
  LOSS: '패',
  DRAW: '무',
};

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getRecord(db, Number(id)).then((row) => {
        if (!active) return;
        setRecord(row);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [db, id])
  );

  function handleDelete() {
    Alert.alert('기록 삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteRecord(db, Number(id));
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} />
      </ThemedView>
    );
  }

  if (!record) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="default" themeColor="textSecondary">
            기록을 찾을 수 없습니다.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const result = getGameResult(record);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {record.photoUris.length > 0 && (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {record.photoUris.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.photo} />
              ))}
            </ScrollView>
          )}

          <View style={styles.headerRow}>
            <ThemedText type="title">{record.opponent}</ThemedText>
            {result && (
              <ThemedText type="subtitle" themeColor={result.toLowerCase() as Lowercase<GameResult>}>
                {RESULT_LABEL[result]}
              </ThemedText>
            )}
          </View>

          {record.myScore != null && record.opponentScore != null && (
            <ThemedText type="default" themeColor="textSecondary">
              {record.myScore} : {record.opponentScore}
            </ThemedText>
          )}

          <InfoRow label="날짜" value={record.date} />
          <InfoRow
            label="구장"
            value={`${record.ballpark} · ${record.homeAway === 'HOME' ? '홈' : '원정'}`}
          />
          {record.seat && <InfoRow label="좌석" value={record.seat} />}
          {record.memo && <InfoRow label="메모" value={record.memo} />}

          <View style={styles.actions}>
            <Pressable style={styles.flex1} onPress={() => router.push(`/record/new?id=${record.id}`)}>
              <ThemedView type="backgroundElement" style={styles.actionButton}>
                <ThemedText type="link">수정</ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable style={styles.flex1} onPress={handleDelete}>
              <ThemedView type="backgroundElement" style={styles.actionButton}>
                <ThemedText type="link" themeColor="loss">
                  삭제
                </ThemedText>
              </ThemedView>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  photo: {
    width: 320,
    height: 240,
    borderRadius: Spacing.three,
    marginRight: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: {
    gap: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  flex1: {
    flex: 1,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
});
