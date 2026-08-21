import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChipSelect } from '@/components/chip-select';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { KBO_TEAMS, TEAM_HOME_BALLPARK } from '@/constants/kbo';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/contexts/settings-context';
import { getRecord, insertRecord, updateRecord } from '@/db/records';
import type { HomeAway } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

const CUSTOM_OPTION = '기타(직접입력)';
const MAX_PHOTOS = 2;
const TEAM_SET: readonly string[] = KBO_TEAMS;
const COMPANION_OPTIONS = ['혼자', '친구', '가족', '연인', '직장동료', CUSTOM_OPTION] as const;

function toScoreOrNull(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export default function NewRecordScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = id != null;
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const { myTeam } = useSettings();

  const [loaded, setLoaded] = useState(!isEdit);
  const [date, setDate] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<string | null>(null);
  const [opponentCustom, setOpponentCustom] = useState('');
  const [homeAway, setHomeAway] = useState<HomeAway | null>(null);
  const [myScoreText, setMyScoreText] = useState('');
  const [opponentScoreText, setOpponentScoreText] = useState('');
  const [seat, setSeat] = useState('');
  const [memo, setMemo] = useState('');
  const [ticketText, setTicketText] = useState('');
  const [transportText, setTransportText] = useState('');
  const [foodText, setFoodText] = useState('');
  const [companion, setCompanion] = useState<string | null>(null);
  const [companionCustom, setCompanionCustom] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    getRecord(db, Number(id)).then((row) => {
      if (!active || !row) return;
      setDate(row.date);
      setOpponent(TEAM_SET.includes(row.opponent) ? row.opponent : CUSTOM_OPTION);
      if (!TEAM_SET.includes(row.opponent)) setOpponentCustom(row.opponent);
      setHomeAway(row.homeAway);
      setMyScoreText(row.myScore != null ? String(row.myScore) : '');
      setOpponentScoreText(row.opponentScore != null ? String(row.opponentScore) : '');
      setSeat(row.seat ?? '');
      setMemo(row.memo ?? '');
      setTicketText(row.ticketPrice != null ? String(row.ticketPrice) : '');
      setTransportText(row.transportCost != null ? String(row.transportCost) : '');
      setFoodText(row.foodCost != null ? String(row.foodCost) : '');
      setPhotoUris(row.photoUris);
      if (row.companion) {
        const isPreset = (COMPANION_OPTIONS as readonly string[]).includes(row.companion);
        setCompanion(isPreset ? row.companion : CUSTOM_OPTION);
        if (!isPreset) setCompanionCustom(row.companion);
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [db, id, isEdit]);

  const effectiveOpponent = opponent === CUSTOM_OPTION ? opponentCustom.trim() : opponent;

  async function handlePickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('사진 접근 권한이 필요합니다.');
      return;
    }
    const remaining = MAX_PHOTOS - photoUris.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.6,
    });
    if (result.canceled) return;
    setPhotoUris((prev) => [...prev, ...result.assets.map((asset) => asset.uri)].slice(0, MAX_PHOTOS));
  }

  function handleRemovePhoto(uri: string) {
    setPhotoUris((prev) => prev.filter((p) => p !== uri));
  }

  async function handleSave() {
    if (!date) return setError('날짜를 선택해주세요.');
    if (!effectiveOpponent) return setError('상대팀을 선택해주세요.');
    if (!homeAway) return setError('홈/원정 여부를 선택해주세요.');

    const ballpark =
      homeAway === 'HOME'
        ? (TEAM_HOME_BALLPARK[myTeam!] ?? '기타')
        : (TEAM_HOME_BALLPARK[effectiveOpponent] ?? '기타');

    setError(null);
    setSaving(true);
    try {
      const effectiveCompanion =
        companion === CUSTOM_OPTION ? companionCustom.trim() || null : companion;

      const input = {
        date,
        ballpark,
        opponent: effectiveOpponent,
        homeAway,
        myScore: toScoreOrNull(myScoreText),
        opponentScore: toScoreOrNull(opponentScoreText),
        seat: seat.trim() || null,
        memo: memo.trim() || null,
        photoUris,
        ticketPrice: toScoreOrNull(ticketText),
        transportCost: toScoreOrNull(transportText),
        foodCost: toScoreOrNull(foodText),
        companion: effectiveCompanion,
      };
      if (isEdit) {
        await updateRecord(db, Number(id), input);
      } else {
        await insertRecord(db, input);
      }
      router.back();
    } catch (e) {
      console.error('[저장 실패]', e);
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: isEdit ? '기록 수정' : '기록 추가' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Field label="날짜">
            <Calendar
              current={date ?? undefined}
              markedDates={date ? { [date]: { selected: true } } : undefined}
              onDayPress={(day: DateData) => setDate(day.dateString)}
              maxDate={new Date().toISOString().slice(0, 10)}
            />
          </Field>

          <Field label="상대팀">
            <ChipSelect options={[...KBO_TEAMS, CUSTOM_OPTION]} value={opponent} onChange={setOpponent} />
            {opponent === CUSTOM_OPTION && (
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="상대팀 이름 입력"
                placeholderTextColor={theme.textSecondary}
                value={opponentCustom}
                onChangeText={setOpponentCustom}
              />
            )}
          </Field>

          <Field label="홈/원정">
            <View style={styles.row}>
              {(['HOME', 'AWAY'] as const).map((option) => {
                const selected = option === homeAway;
                return (
                  <Pressable key={option} onPress={() => setHomeAway(option)} style={styles.flex1}>
                    <ThemedView
                      type={selected ? 'backgroundSelected' : 'backgroundElement'}
                      style={styles.toggleButton}>
                      <ThemedText themeColor={selected ? 'text' : 'textSecondary'}>
                        {option === 'HOME' ? '홈' : '원정'}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="스코어">
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="우리 팀"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                value={myScoreText}
                onChangeText={setMyScoreText}
              />
              <ThemedText type="subtitle">:</ThemedText>
              <TextInput
                style={[styles.input, styles.flex1, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="상대 팀"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                value={opponentScoreText}
                onChangeText={setOpponentScoreText}
              />
            </View>
          </Field>

          <Field label="좌석 위치">
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="예: 3루 응원석 12열"
              placeholderTextColor={theme.textSecondary}
              value={seat}
              onChangeText={setSeat}
            />
          </Field>

          <Field label="동행자">
            <ChipSelect options={COMPANION_OPTIONS} value={companion} onChange={setCompanion} />
            {companion === CUSTOM_OPTION && (
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="동행자 입력"
                placeholderTextColor={theme.textSecondary}
                value={companionCustom}
                onChangeText={setCompanionCustom}
              />
            )}
          </Field>

          <Field label={`사진 (${photoUris.length}/${MAX_PHOTOS})`}>
            <View style={styles.row}>
              {photoUris.map((uri) => (
                <View key={uri} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} />
                  <Pressable onPress={() => handleRemovePhoto(uri)} style={styles.photoRemove}>
                    <ThemedView type="loss" style={styles.photoRemoveInner}>
                      <MaterialCommunityIcons name="close" size={12} color={theme.onAccent} />
                    </ThemedView>
                  </Pressable>
                </View>
              ))}
              {photoUris.length < MAX_PHOTOS && (
                <Pressable onPress={handlePickPhotos}>
                  <ThemedView type="backgroundElement" style={styles.photoAdd}>
                    <MaterialCommunityIcons name="plus" size={24} color={theme.textSecondary} />
                  </ThemedView>
                </Pressable>
              )}
            </View>
          </Field>

          <Field label="비용 (선택)">
            <CostRow
              label="티켓"
              value={ticketText}
              onChangeText={setTicketText}
              theme={theme}
            />
            <CostRow
              label="교통비"
              value={transportText}
              onChangeText={setTransportText}
              theme={theme}
            />
            <CostRow
              label="식비"
              value={foodText}
              onChangeText={setFoodText}
              theme={theme}
            />
            {!!(ticketText || transportText || foodText) && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.costTotal}>
                합계{' '}
                {(
                  (toScoreOrNull(ticketText) ?? 0) +
                  (toScoreOrNull(transportText) ?? 0) +
                  (toScoreOrNull(foodText) ?? 0)
                ).toLocaleString('ko-KR')}원
              </ThemedText>
            )}
          </Field>

          <Field label="메모">
            <TextInput
              style={[styles.input, styles.memoInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              placeholder="직관 소감을 남겨보세요"
              placeholderTextColor={theme.textSecondary}
              value={memo}
              onChangeText={setMemo}
              multiline
            />
          </Field>

          {error && (
            <ThemedText type="small" themeColor="loss">
              {error}
            </ThemedText>
          )}

          <Pressable onPress={handleSave} disabled={saving}>
            <ThemedView type="accent" style={styles.saveButton}>
              <ThemedText type="link" themeColor="onAccent">
                {saving ? '저장 중...' : isEdit ? '수정 완료' : '저장'}
              </ThemedText>
            </ThemedView>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
  );
}

function CostRow({
  label,
  value,
  onChangeText,
  theme,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  theme: ReturnType<typeof import('@/hooks/use-theme').useTheme>;
}) {
  return (
    <View style={styles.costRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.costLabel}>
        {label}
      </ThemedText>
      <TextInput
        style={[styles.input, styles.costInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
        keyboardType="number-pad"
        value={value}
        onChangeText={onChangeText}
      />
      <ThemedText type="small" themeColor="textSecondary">원</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.five,
  },
  field: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex1: {
    flex: 1,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  memoInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
  },
  photoRemoveInner: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  costLabel: {
    width: 48,
  },
  costInput: {
    flex: 1,
    textAlign: 'right',
  },
  costTotal: {
    textAlign: 'right',
    marginTop: Spacing.one,
  },
});
