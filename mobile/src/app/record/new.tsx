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
import { KBO_BALLPARKS, KBO_TEAMS } from '@/constants/kbo';
import { Spacing } from '@/constants/theme';
import { getRecord, insertRecord, updateRecord } from '@/db/records';
import type { HomeAway } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

const CUSTOM_OPTION = '기타(직접입력)';
const MAX_PHOTOS = 2;
const BALLPARK_SET: readonly string[] = KBO_BALLPARKS;
const TEAM_SET: readonly string[] = KBO_TEAMS;

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

  const [loaded, setLoaded] = useState(!isEdit);
  const [date, setDate] = useState<string | null>(null);
  const [ballpark, setBallpark] = useState<string | null>(null);
  const [ballparkCustom, setBallparkCustom] = useState('');
  const [opponent, setOpponent] = useState<string | null>(null);
  const [opponentCustom, setOpponentCustom] = useState('');
  const [homeAway, setHomeAway] = useState<HomeAway | null>(null);
  const [myScoreText, setMyScoreText] = useState('');
  const [opponentScoreText, setOpponentScoreText] = useState('');
  const [seat, setSeat] = useState('');
  const [memo, setMemo] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    getRecord(db, Number(id)).then((row) => {
      if (!active || !row) return;
      setDate(row.date);
      setBallpark(BALLPARK_SET.includes(row.ballpark) ? row.ballpark : CUSTOM_OPTION);
      if (!BALLPARK_SET.includes(row.ballpark)) setBallparkCustom(row.ballpark);
      setOpponent(TEAM_SET.includes(row.opponent) ? row.opponent : CUSTOM_OPTION);
      if (!TEAM_SET.includes(row.opponent)) setOpponentCustom(row.opponent);
      setHomeAway(row.homeAway);
      setMyScoreText(row.myScore != null ? String(row.myScore) : '');
      setOpponentScoreText(row.opponentScore != null ? String(row.opponentScore) : '');
      setSeat(row.seat ?? '');
      setMemo(row.memo ?? '');
      setPhotoUris(row.photoUris);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [db, id, isEdit]);

  const effectiveBallpark = ballpark === CUSTOM_OPTION ? ballparkCustom.trim() : ballpark;
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
    if (!effectiveBallpark) return setError('구장을 선택해주세요.');
    if (!effectiveOpponent) return setError('상대팀을 선택해주세요.');
    if (!homeAway) return setError('홈/원정 여부를 선택해주세요.');

    setError(null);
    setSaving(true);
    try {
      const input = {
        date,
        ballpark: effectiveBallpark,
        opponent: effectiveOpponent,
        homeAway,
        myScore: toScoreOrNull(myScoreText),
        opponentScore: toScoreOrNull(opponentScoreText),
        seat: seat.trim() || null,
        memo: memo.trim() || null,
        photoUris,
      };
      if (isEdit) {
        await updateRecord(db, Number(id), input);
      } else {
        await insertRecord(db, input);
      }
      router.back();
    } catch {
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Field label="날짜">
            <Calendar
              current={date ?? undefined}
              markedDates={date ? { [date]: { selected: true } } : undefined}
              onDayPress={(day: DateData) => setDate(day.dateString)}
              maxDate={new Date().toISOString().slice(0, 10)}
            />
          </Field>

          <Field label="구장">
            <ChipSelect options={[...KBO_BALLPARKS, CUSTOM_OPTION]} value={ballpark} onChange={setBallpark} />
            {ballpark === CUSTOM_OPTION && (
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                placeholder="구장 이름 입력"
                placeholderTextColor={theme.textSecondary}
                value={ballparkCustom}
                onChangeText={setBallparkCustom}
              />
            )}
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
});
