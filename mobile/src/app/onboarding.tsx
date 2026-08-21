import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipSelect } from '@/components/chip-select';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { KBO_TEAMS } from '@/constants/kbo';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/contexts/settings-context';

export default function OnboardingScreen() {
  const router = useRouter();
  const { updateMyTeam } = useSettings();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selectedTeam) return;
    await updateMyTeam(selectedTeam);
    router.replace('/(tabs)');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle" style={styles.emoji}>⚾</ThemedText>
          <ThemedText type="subtitle">내 응원팀을 선택해주세요</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            홈/원정에 따라 구장이 자동으로 설정됩니다
          </ThemedText>

          <ChipSelect
            options={KBO_TEAMS}
            value={selectedTeam}
            onChange={setSelectedTeam}
          />

          <Pressable onPress={handleConfirm} disabled={!selectedTeam}>
            <ThemedView
              type={selectedTeam ? 'accent' : 'backgroundElement'}
              style={styles.confirmButton}
            >
              <ThemedText type="link" themeColor={selectedTeam ? 'onAccent' : 'textSecondary'}>
                시작하기
              </ThemedText>
            </ThemedView>
          </Pressable>
        </ScrollView>
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
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  emoji: {
    fontSize: 48,
  },
  confirmButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
});
