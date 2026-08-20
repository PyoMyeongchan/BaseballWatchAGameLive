import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { RecordCard } from '@/components/record-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { listRecords } from '@/db/records';
import type { GameRecord } from '@/db/types';

export default function HomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      listRecords(db).then((rows) => {
        if (!active) return;
        setRecords(rows);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [db])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <ThemedView style={styles.header}>
              <ThemedText type="title">직관 기록</ThemedText>
              <Link href="/record/new" asChild>
                <Pressable>
                  <ThemedView type="accent" style={styles.addButton}>
                    <ThemedText type="link" themeColor="onAccent">
                      + 기록 추가
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Link>
            </ThemedView>
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="notebook-outline"
                message="아직 기록이 없습니다. 첫 직관을 기록해보세요."
                actionLabel="+ 기록 추가"
                onAction={() => router.push('/record/new')}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <RecordCard record={item} onPress={() => router.push(`/record/${item.id}`)} />
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
  },
  listContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
});
