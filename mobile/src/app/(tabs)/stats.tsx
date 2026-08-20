import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { MonthlyChart } from '@/components/monthly-chart';
import { StatBar } from '@/components/stat-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getBallparkStats, getMonthlyStats, getTeamStats, getTotalCount } from '@/db/stats';
import type { BallparkStat, MonthlyStat, TeamStat } from '@/db/stats';

type StatsData = {
  total: number;
  teamStats: TeamStat[];
  ballparkStats: BallparkStat[];
  monthlyStats: MonthlyStat[];
};

export default function StatsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [data, setData] = useState<StatsData | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getTotalCount(db), getTeamStats(db), getBallparkStats(db), getMonthlyStats(db)]).then(
        ([total, teamStats, ballparkStats, monthlyStats]) => {
          if (!active) return;
          setData({ total, teamStats, ballparkStats, monthlyStats });
        }
      );
      return () => {
        active = false;
      };
    }, [db])
  );

  if (!data) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} />
      </ThemedView>
    );
  }

  if (data.total === 0) {
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

  const maxBallparkCount = Math.max(...data.ballparkStats.map((s) => s.count));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title">통계</ThemedText>

          <Section title="총 직관 횟수">
            <ThemedText type="subtitle">{data.total}회</ThemedText>
          </Section>

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

          {data.monthlyStats.length > 1 && (
            <Section title="월별 직관 빈도">
              <MonthlyChart data={data.monthlyStats} />
            </Section>
          )}
        </ScrollView>
      </SafeAreaView>
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
});
