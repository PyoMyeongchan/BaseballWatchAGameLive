import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import type { DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { RecordCard } from '@/components/record-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { listRecords } from '@/db/records';
import { getGameResult } from '@/db/types';
import type { GameRecord } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

type ViewMode = 'list' | 'calendar';
type SortMode = '최신순' | '오래된순' | '결과순' | '구장별';
const SORT_OPTIONS: readonly SortMode[] = ['최신순', '오래된순', '결과순', '구장별'];

function buildMarkedDates(
  records: GameRecord[],
  selectedDate: string | null,
  theme: ReturnType<typeof useTheme>
) {
  type DotEntry = { key: string; color: string };
  const map: Record<string, { dots: DotEntry[]; selected?: boolean; selectedColor?: string }> = {};

  for (const record of records) {
    const result = getGameResult(record);
    const dotKey = result ?? 'unscored';
    const dotColor =
      result === 'WIN'
        ? theme.win
        : result === 'LOSS'
          ? theme.loss
          : result === 'DRAW'
            ? theme.draw
            : theme.textSecondary;

    if (!map[record.date]) map[record.date] = { dots: [] };
    if (!map[record.date].dots.find((d) => d.key === dotKey)) {
      map[record.date].dots.push({ key: dotKey, color: dotColor });
    }
  }

  if (selectedDate) {
    if (!map[selectedDate]) map[selectedDate] = { dots: [] };
    map[selectedDate] = { ...map[selectedDate], selected: true, selectedColor: theme.accent };
  }

  return map;
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('최신순');

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

  const markedDates = useMemo(
    () => buildMarkedDates(records, selectedDate, theme),
    [records, selectedDate, theme]
  );

  const displayedRecords = useMemo(() => {
    let filtered = records;

    if (viewMode === 'calendar' && selectedDate) {
      filtered = filtered.filter((r) => r.date === selectedDate);
    }

    const q = searchText.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (r) =>
          r.opponent.toLowerCase().includes(q) ||
          r.ballpark.toLowerCase().includes(q) ||
          (r.memo?.toLowerCase().includes(q) ?? false) ||
          (r.seat?.toLowerCase().includes(q) ?? false)
      );
    }

    const resultOrder = (r: GameRecord) => {
      const result = getGameResult(r);
      if (result === 'WIN') return 0;
      if (result === 'DRAW') return 1;
      if (result === 'LOSS') return 2;
      return 3;
    };

    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === '오래된순') return a.date.localeCompare(b.date) || a.id - b.id;
      if (sortMode === '결과순') return resultOrder(a) - resultOrder(b) || b.date.localeCompare(a.date);
      if (sortMode === '구장별') return a.ballpark.localeCompare(b.ballpark, 'ko') || b.date.localeCompare(a.date);
      return b.date.localeCompare(a.date) || b.id - a.id; // 최신순 (default)
    });

    return sorted;
  }, [records, viewMode, selectedDate, searchText, sortMode]);

  const calendarTheme = useMemo(
    () => ({
      calendarBackground: theme.backgroundElement,
      textSectionTitleColor: theme.textSecondary,
      selectedDayBackgroundColor: theme.accent,
      selectedDayTextColor: theme.onAccent,
      todayTextColor: theme.accent,
      dayTextColor: theme.text,
      textDisabledColor: theme.textSecondary,
      arrowColor: theme.accent,
      monthTextColor: theme.text,
    }),
    [theme]
  );

  const isFiltered = searchText.trim().length > 0 || (viewMode === 'calendar' && !!selectedDate);

  function handleDayPress(day: DateData) {
    setSelectedDate((prev) => (prev === day.dateString ? null : day.dateString));
  }

  function handleSwitchToList() {
    setViewMode('list');
    setSelectedDate(null);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        {/* 고정 헤더 — 스크롤해도 항상 보임 */}
        <ThemedView style={styles.header}>
          <ThemedView style={styles.headerTop}>
            <ThemedText type="title">직관 기록</ThemedText>
            <Link href="/record/new" asChild>
              <Pressable>
                <ThemedView type="accent" style={styles.addButton}>
                  <ThemedText type="link" themeColor="onAccent">+ 기록 추가</ThemedText>
                </ThemedView>
              </Pressable>
            </Link>
          </ThemedView>

          <View style={styles.toggleRow}>
            <Pressable onPress={handleSwitchToList}>
              <ThemedView
                type={viewMode === 'list' ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.toggleButton}
              >
                <ThemedText type="small">리스트</ThemedText>
              </ThemedView>
            </Pressable>
            <Pressable onPress={() => setViewMode('calendar')}>
              <ThemedView
                type={viewMode === 'calendar' ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.toggleButton}
              >
                <ThemedText type="small">캘린더</ThemedText>
              </ThemedView>
            </Pressable>
          </View>

          {viewMode === 'list' && (
            <View style={styles.sortRow}>
              {SORT_OPTIONS.map((option) => (
                <Pressable key={option} onPress={() => setSortMode(option)}>
                  <ThemedView
                    type={sortMode === option ? 'backgroundSelected' : 'backgroundElement'}
                    style={styles.sortChip}
                  >
                    <ThemedText type="small" themeColor={sortMode === option ? 'text' : 'textSecondary'}>
                      {option}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </View>
          )}

          <ThemedView type="backgroundElement" style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={18} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="팀, 구장, 메모 검색"
              placeholderTextColor={theme.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => setSearchText('')} hitSlop={8}>
                <MaterialCommunityIcons name="close-circle" size={16} color={theme.textSecondary} />
              </Pressable>
            )}
          </ThemedView>
        </ThemedView>

        {/* 캘린더 — 캘린더 모드일 때만 표시 */}
        {viewMode === 'calendar' && (
          <Calendar
            markingType="multi-dot"
            markedDates={markedDates}
            onDayPress={handleDayPress}
            theme={calendarTheme}
            style={styles.calendar}
          />
        )}

        {viewMode === 'calendar' && selectedDate && (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.dateLabel}>
            {selectedDate} 기록
          </ThemedText>
        )}

        {/* 기록 리스트 */}
        <FlatList
          data={displayedRecords}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !loading ? (
              records.length === 0 ? (
                <EmptyState
                  icon="notebook-outline"
                  message="아직 기록이 없습니다. 첫 직관을 기록해보세요."
                  actionLabel="+ 기록 추가"
                  onAction={() => router.push('/record/new')}
                />
              ) : isFiltered ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyFilterText}>
                  검색 결과가 없습니다.
                </ThemedText>
              ) : null
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
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  addButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  toggleButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  sortRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  sortChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  calendar: {
    borderRadius: Spacing.two,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  dateLabel: {
    marginBottom: Spacing.one,
  },
  listContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  emptyFilterText: {
    textAlign: 'center',
    marginTop: Spacing.three,
  },
});
