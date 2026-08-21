import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipSelect } from '@/components/chip-select';
import { EmptyState } from '@/components/empty-state';
import { MonthlyChart } from '@/components/monthly-chart';
import { StatBar } from '@/components/stat-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { KBO_TEAMS } from '@/constants/kbo';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/contexts/settings-context';
import { getBadges } from '@/db/badges';
import type { Badge } from '@/db/badges';
import {
  getAvailableYears,
  getBallparkStats,
  getCostStats,
  getMonthlyStats,
  getTeamStats,
  getTotalCount,
} from '@/db/stats';
import type { BallparkStat, CostStats, MonthlyStat, TeamStat } from '@/db/stats';
import { formatWon } from '@/db/types';

const ALL_YEARS = '전체';

type StatsData = {
  total: number;
  teamStats: TeamStat[];
  ballparkStats: BallparkStat[];
  monthlyStats: MonthlyStat[];
  costStats: CostStats;
  badges: Badge[];
};

export default function StatsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { myTeam, updateMyTeam } = useSettings();
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(ALL_YEARS);
  const [data, setData] = useState<StatsData | null>(null);
  const [changingTeam, setChangingTeam] = useState(false);
  const [pendingTeam, setPendingTeam] = useState<string | null>(null);

  const year = selectedYear === ALL_YEARS ? null : selectedYear;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        getAvailableYears(db),
        getTotalCount(db, year),
        getTeamStats(db, year),
        getBallparkStats(db, year),
        getMonthlyStats(db, year),
        getCostStats(db, year),
        getBadges(db),
      ]).then(([availableYears, total, teamStats, ballparkStats, monthlyStats, costStats, badges]) => {
        if (!active) return;
        setYears(availableYears);
        setData({ total, teamStats, ballparkStats, monthlyStats, costStats, badges });
      });
      return () => {
        active = false;
      };
    }, [db, year])
  );

  async function handleTeamConfirm() {
    if (!pendingTeam) return;
    await updateMyTeam(pendingTeam);
    setChangingTeam(false);
    setPendingTeam(null);
  }

  function handleTeamChangeStart() {
    setPendingTeam(myTeam);
    setChangingTeam(true);
  }

  function handleTeamChangeCancel() {
    setChangingTeam(false);
    setPendingTeam(null);
  }

  if (!data) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} />
      </ThemedView>
    );
  }

  if (data.total === 0 && selectedYear === ALL_YEARS) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title">통계</ThemedText>
          <EmptyState
            icon="chart-box-outline"
            message="아직 기록이 없습니다. 첫 직관을 기록해보세요."
            actionLabel="+ 기록 추가"
            onAction={() => router.push('/record/new')}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const maxBallparkCount = data.ballparkStats.length > 0
    ? Math.max(...data.ballparkStats.map((s) => s.count))
    : 1;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title">통계</ThemedText>

          {/* 연도 필터 */}
          {years.length > 1 && (
            <ChipSelect
              options={[ALL_YEARS, ...years]}
              value={selectedYear}
              onChange={setSelectedYear}
            />
          )}

          {/* 내 응원팀 */}
          <Section title="내 응원팀">
            {changingTeam ? (
              <>
                <ChipSelect
                  options={KBO_TEAMS}
                  value={pendingTeam}
                  onChange={setPendingTeam}
                />
                <View style={styles.teamChangeActions}>
                  <Pressable style={styles.flex1} onPress={handleTeamChangeCancel}>
                    <ThemedView type="backgroundElement" style={styles.teamButton}>
                      <ThemedText type="small" themeColor="textSecondary">취소</ThemedText>
                    </ThemedView>
                  </Pressable>
                  <Pressable style={styles.flex1} onPress={handleTeamConfirm} disabled={!pendingTeam}>
                    <ThemedView type="accent" style={styles.teamButton}>
                      <ThemedText type="small" themeColor="onAccent">확인</ThemedText>
                    </ThemedView>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.myTeamRow}>
                <ThemedText type="subtitle">{myTeam}</ThemedText>
                <Pressable onPress={handleTeamChangeStart}>
                  <ThemedView type="backgroundElement" style={styles.changeButton}>
                    <ThemedText type="small" themeColor="textSecondary">변경</ThemedText>
                  </ThemedView>
                </Pressable>
              </View>
            )}
          </Section>

          <Section title="총 직관 횟수">
            <ThemedText type="subtitle">{data.total}회</ThemedText>
          </Section>

          {data.teamStats.length > 0 && (
            <Section title="팀별 직관 승률">
              <View style={styles.list}>
                {data.teamStats.map((stat) => (
                  <StatBar
                    key={stat.opponent}
                    label={stat.opponent}
                    valueLabel={
                      stat.winRate != null
                        ? `${stat.wins}승 ${stat.losses}패 ${stat.draws}무 · ${Math.round(stat.winRate * 100)}%`
                        : `${stat.wins}승 ${stat.losses}패 ${stat.draws}무`
                    }
                    ratio={stat.winRate ?? 0}
                  />
                ))}
              </View>
            </Section>
          )}

          {data.ballparkStats.length > 0 && (
            <Section title="구장별 방문 횟수">
              <View style={styles.list}>
                {data.ballparkStats.map((stat) => (
                  <StatBar
                    key={stat.ballpark}
                    label={stat.ballpark}
                    valueLabel={`${stat.count}회`}
                    ratio={stat.count / maxBallparkCount}
                  />
                ))}
              </View>
            </Section>
          )}

          {data.monthlyStats.length > 1 && (
            <Section title="월별 직관 빈도">
              <MonthlyChart data={data.monthlyStats} />
            </Section>
          )}

          {data.costStats.recordsWithCost > 0 && (
            <Section title="직관 비용">
              <View style={styles.costGrid}>
                <CostStat label="총 지출" value={formatWon(data.costStats.total)} />
                <CostStat label="1회 평균" value={formatWon(data.costStats.average)} />
                {data.costStats.ticketTotal > 0 && (
                  <CostStat label="티켓" value={formatWon(data.costStats.ticketTotal)} />
                )}
                {data.costStats.transportTotal > 0 && (
                  <CostStat label="교통비" value={formatWon(data.costStats.transportTotal)} />
                )}
                {data.costStats.foodTotal > 0 && (
                  <CostStat label="식비" value={formatWon(data.costStats.foodTotal)} />
                )}
              </View>
            </Section>
          )}

          <Section title={`업적 (${data.badges.filter((b) => b.unlocked).length}/${data.badges.length})`}>
            <View style={styles.badgeGrid}>
              {data.badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </View>
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.badgeCard, !badge.unlocked && styles.badgeCardLocked]}>
      <ThemedText style={styles.badgeIcon}>{badge.unlocked ? badge.icon : '🔒'}</ThemedText>
      <ThemedText type="smallBold" themeColor={badge.unlocked ? 'text' : 'textSecondary'} style={styles.badgeTitle}>
        {badge.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.badgeDesc}>
        {badge.description}
      </ThemedText>
    </ThemedView>
  );
}

function CostStat({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.costCard}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {title}
      </ThemedText>
      {children}
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
    paddingTop: Spacing.six,
    gap: Spacing.three,
  },
  scrollContent: {
    gap: Spacing.five,
    paddingBottom: Spacing.six,
  },
  section: {
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
  myTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  changeButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  teamChangeActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  teamButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  flex1: {
    flex: 1,
  },
  costGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  costCard: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    gap: Spacing.half,
    minWidth: 100,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  badgeCard: {
    width: '47%',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
    alignItems: 'center',
  },
  badgeCardLocked: {
    opacity: 0.45,
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeTitle: {
    textAlign: 'center',
  },
  badgeDesc: {
    textAlign: 'center',
  },
});
