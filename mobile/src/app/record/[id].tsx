import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/contexts/settings-context';
import { deleteRecord, getRecord } from '@/db/records';
import { formatWon, getGameResult, totalCost } from '@/db/types';
import type { GameRecord, GameResult } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

const RESULT_LABEL: Record<GameResult, string> = {
  WIN: '승',
  LOSS: '패',
  DRAW: '무',
};

const NOTCH = 20;

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const { myTeam } = useSettings();
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  function executeDelete() {
    setDeleting(true);
    deleteRecord(db, Number(id))
      .then(() => router.replace('/(tabs)'))
      .catch(() => {
        setDeleting(false);
        setConfirmDelete(false);
      });
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
  const cost = totalCost(record);
  const hasStub = !!(record.seat || record.companion || record.memo || cost > 0);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => setConfirmDelete(true)} hitSlop={12} disabled={deleting}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color={theme.loss} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          {/* 사진 */}
          {record.photoUris.length > 0 && (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {record.photoUris.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.photo} />
              ))}
            </ScrollView>
          )}

          {/* 티켓 카드 */}
          <View style={styles.ticketWrap}>
            {/* 헤더 — 팀 대결 */}
            <View style={[styles.ticketHeader, { backgroundColor: theme.accent }]}>
              <View style={styles.matchup}>
                <ThemedText style={[styles.teamName, { color: theme.onAccent, opacity: 0.75 }]} numberOfLines={1}>
                  {myTeam ?? '우리팀'}
                </ThemedText>
                <ThemedText style={[styles.vsText, { color: theme.onAccent }]}>VS</ThemedText>
                <ThemedText style={[styles.teamName, { color: theme.onAccent }]} numberOfLines={1}>
                  {record.opponent}
                </ThemedText>
              </View>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                  <ThemedText style={[styles.badgeText, { color: theme.onAccent }]}>
                    {record.homeAway === 'HOME' ? '홈' : '원정'}
                  </ThemedText>
                </View>
                {result && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                    <ThemedText style={[styles.badgeText, { color: theme.onAccent }]}>
                      {RESULT_LABEL[result]}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>

            {/* 본문 — 날짜·구장·스코어 */}
            <View style={[
              styles.ticketBody,
              { backgroundColor: theme.backgroundElement },
              !hasStub && styles.ticketBodyLast,
            ]}>
              <View style={styles.infoRow}>
                <InfoCell label="DATE" value={record.date} />
                <InfoCell label="VENUE" value={record.ballpark} />
              </View>
              {record.myScore != null && record.opponentScore != null && (
                <View style={styles.scoreRow}>
                  <ThemedText style={[styles.scoreNum, { color: theme.accent }]}>
                    {record.myScore}
                  </ThemedText>
                  <ThemedText style={styles.scoreSep} themeColor="textSecondary">:</ThemedText>
                  <ThemedText style={styles.scoreNum}>{record.opponentScore}</ThemedText>
                </View>
              )}
            </View>

            {/* 퍼포레이션 */}
            {hasStub && (
              <View style={[styles.perf, { backgroundColor: theme.backgroundElement }]}>
                <View style={[styles.notch, { left: -NOTCH / 2, backgroundColor: theme.background }]} />
                <View style={[styles.dashedLine, { borderColor: theme.backgroundSelected }]} />
                <View style={[styles.notch, { right: -NOTCH / 2, backgroundColor: theme.background }]} />
              </View>
            )}

            {/* 스텁 */}
            {hasStub && (
              <View style={[styles.stub, { backgroundColor: theme.backgroundElement }]}>
                {record.seat && <StubRow label="SEAT" value={record.seat} />}
                {record.companion && <StubRow label="WITH" value={record.companion} />}
                {cost > 0 && (
                  <StubRow
                    label="COST"
                    value={[
                      record.ticketPrice ? `티켓 ${formatWon(record.ticketPrice)}` : '',
                      record.transportCost ? `교통 ${formatWon(record.transportCost)}` : '',
                      record.foodCost ? `식비 ${formatWon(record.foodCost)}` : '',
                    ].filter(Boolean).join(' · ')}
                  />
                )}
                {record.memo && <StubRow label="MEMO" value={record.memo} />}
              </View>
            )}
          </View>

        </ScrollView>

        {/* 하단 버튼 */}
        {confirmDelete ? (
          <View style={styles.confirmActions}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.confirmLabel}>
              정말 삭제할까요?
            </ThemedText>
            <View style={styles.actionRow}>
              <Pressable style={styles.flex1} onPress={() => setConfirmDelete(false)} disabled={deleting}>
                <ThemedView type="backgroundElement" style={styles.actionBtn}>
                  <ThemedText type="link" themeColor="textSecondary">취소</ThemedText>
                </ThemedView>
              </Pressable>
              <Pressable style={styles.flex1} onPress={executeDelete} disabled={deleting}>
                <ThemedView type="loss" style={styles.actionBtn}>
                  <ThemedText type="link" themeColor="onAccent">
                    {deleting ? '삭제 중...' : '삭제 확인'}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => router.push(`/record/new?id=${record.id}`)}>
            <ThemedView type="backgroundElement" style={styles.actionBtn}>
              <ThemedText type="link">수정</ThemedText>
            </ThemedView>
          </Pressable>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <ThemedText style={styles.cellLabel} themeColor="textSecondary">{label}</ThemedText>
      <ThemedText style={styles.cellValue}>{value}</ThemedText>
    </View>
  );
}

function StubRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stubRow}>
      <ThemedText style={styles.stubLabel} themeColor="textSecondary">{label}</ThemedText>
      <ThemedText style={styles.stubValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  photo: {
    width: 320,
    height: 240,
    borderRadius: Spacing.three,
    marginRight: Spacing.two,
  },

  // 티켓 래퍼
  ticketWrap: {
    borderRadius: 16,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },

  // 헤더
  ticketHeader: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  matchup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  teamName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  vsText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    opacity: 0.55,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 본문
  ticketBody: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  ticketBodyLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  infoCell: {
    flex: 1,
    gap: 3,
  },
  cellLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  cellValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  scoreNum: {
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 64,
  },
  scoreSep: {
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 64,
  },

  // 퍼포레이션
  perf: {
    height: NOTCH,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notch: {
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    position: 'absolute',
    zIndex: 1,
  },
  dashedLine: {
    flex: 1,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    marginHorizontal: NOTCH / 2,
  },

  // 스텁
  stub: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    gap: Spacing.two,
  },
  stubRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  stubLabel: {
    width: 40,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingTop: 2,
  },
  stubValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },

  // 하단
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmActions: {
    gap: Spacing.one,
  },
  confirmLabel: {
    textAlign: 'center',
  },
  flex1: { flex: 1 },
  actionBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
});
