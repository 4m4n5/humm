import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { AwardCategory, Nomination } from '@/types';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNominationsStore } from '@/lib/stores/nominationsStore';
import { nominationsCol } from '@/lib/firestore/nominations';
import { awardCategoryDescription, findAwardCategoryRow } from '@/lib/awardCategoryConfig';
import { canEditNomination } from '@/lib/nominationEditPolicy';
import { theme } from '@/constants/theme';
import { usePartnerName } from '@/lib/usePartnerName';
import { scrollContentStandard } from '@/constants/screenLayout';

type Nominee = 'me' | 'partner' | 'both';

type EditState =
  | { kind: 'new' }
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'forbidden' }
  | { kind: 'edit'; nomination: Nomination };

function nomineeKeyFromNomineeId(
  nomineeId: string | 'both',
  myUid: string,
  partnerUid: string,
): Nominee {
  if (nomineeId === 'both') return 'both';
  if (nomineeId === myUid) return 'me';
  return 'partner';
}

export default function NominateScreen() {
  const { category: rawCategory, nominationId: rawNominationId } = useLocalSearchParams<{
    category: string;
    nominationId?: string;
  }>();
  const { profile } = useAuthStore();
  const { ceremony, couple, addNomination, updateNomination } = useNominationsStore();
  const partnerName = usePartnerName();

  const awardRows = couple?.awardCategories ?? [];
  const category = awardRows.some((r) => r.id === rawCategory)
    ? (rawCategory as AwardCategory)
    : undefined;
  const catRow = category ? findAwardCategoryRow(awardRows, category) : undefined;
  const catMeta = catRow
    ? { label: catRow.label, emoji: catRow.emoji, description: awardCategoryDescription(category!) }
    : null;

  const [editState, setEditState] = useState<EditState>({ kind: 'new' });
  const [nominee, setNominee] = useState<Nominee>('partner');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (
      !rawNominationId ||
      !category ||
      !profile?.coupleId ||
      !profile?.uid ||
      !profile?.partnerId ||
      !ceremony?.id ||
      !couple
    ) {
      setEditState({ kind: 'new' });
      return;
    }

    let cancelled = false;
    setEditState({ kind: 'loading' });

    (async () => {
      try {
        const snap = await getDoc(doc(nominationsCol(), rawNominationId));
        if (cancelled) return;
        if (!snap.exists()) {
          setEditState({ kind: 'missing' });
          return;
        }
        const n = snap.data() as Nomination;
        if (
          n.category !== category ||
          n.coupleId !== profile.coupleId ||
          n.ceremonyId !== ceremony.id
        ) {
          setEditState({ kind: 'missing' });
          return;
        }
        if (!canEditNomination(n, profile.uid, couple, ceremony)) {
          setEditState({ kind: 'forbidden' });
          return;
        }
        setNominee(
          nomineeKeyFromNomineeId(n.nomineeId, profile.uid, profile.partnerId as string),
        );
        setTitle(n.title);
        setDescription(n.description ?? '');
        setEditState({ kind: 'edit', nomination: n });
      } catch {
        if (!cancelled) setEditState({ kind: 'missing' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    rawNominationId,
    category,
    profile?.coupleId,
    profile?.uid,
    profile?.partnerId,
    ceremony?.id,
    couple,
  ]);

  if (!category || !catMeta) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg px-8">
        <Text className="text-center text-hum-muted">this category isn’t on your list</Text>
        <Button label="go back" onPress={() => router.back()} className="mt-6" />
      </SafeAreaView>
    );
  }

  if (catRow && !catRow.enabled) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg px-8">
        <Text className="mb-2 text-center text-[15px] font-medium text-hum-text">{catMeta.label}</Text>
        <Text className="text-center text-hum-muted">
          This category is paused. Re-enable it under award categories to add or edit stories here.
        </Text>
        <Button
          label="award categories"
          onPress={() => router.replace('/awards/manage-categories')}
          className="mt-6"
        />
        <Button label="go back" onPress={() => router.back()} variant="secondary" className="mt-3" />
      </SafeAreaView>
    );
  }

  if (!profile?.coupleId || !profile.partnerId) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg px-8">
        <Text className="text-center text-[14px] text-hum-muted">link your partner first</Text>
        <Button label="go back" onPress={() => router.back()} className="mt-6" />
      </SafeAreaView>
    );
  }

  if (!ceremony?.id) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-hum-bg px-6">
        <LoadingState />
        <Button label="go back" onPress={() => router.back()} className="mt-4" />
      </SafeAreaView>
    );
  }

  if (rawNominationId && editState.kind === 'loading') {
    return (
      <SafeAreaView className="flex-1 justify-center bg-hum-bg px-6">
        <LoadingState />
        <Button label="go back" onPress={() => router.back()} className="mt-4" />
      </SafeAreaView>
    );
  }

  if (rawNominationId && editState.kind === 'missing') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg px-8">
        <Text className="text-center text-[14px] text-hum-muted">gone or wrong category</Text>
        <Button label="go back" onPress={() => router.back()} className="mt-6" />
      </SafeAreaView>
    );
  }

  if (rawNominationId && editState.kind === 'forbidden') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-hum-bg px-8">
        <Text className="text-center text-[14px] text-hum-muted">can’t edit · theirs or wrong phase</Text>
        <Button label="go back" onPress={() => router.back()} className="mt-6" />
      </SafeAreaView>
    );
  }

  const isEdit = editState.kind === 'edit';

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('need a title', 'a few words help you find it later');
      return;
    }
    if (!profile?.coupleId || !profile.partnerId || !ceremony?.id || !category) return;
    const cat: AwardCategory = category;
    const nomineeId: string | 'both' =
      nominee === 'both' ? 'both' : nominee === 'me' ? profile.uid : profile.partnerId;

    setSaving(true);
    try {
      if (isEdit) {
        await updateNomination({
          id: editState.nomination.id,
          title,
          description,
          nomineeId,
        });
      } else {
        await addNomination({
          coupleId: profile.coupleId,
          ceremonyId: ceremony.id,
          category: cat,
          nomineeId,
          submittedBy: profile.uid,
          title,
          description,
        });
      }
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('couldn’t save', 'check connection, try again');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-hum-bg">
      <ScreenHeader title={isEdit ? 'edit nomination' : 'new nomination'} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={scrollContentStandard}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-y-3">
          <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">nominee</Text>
          <View className="flex-row flex-wrap gap-2">
            {(
              [
                { key: 'me' as const, label: 'me' },
                { key: 'partner' as const, label: partnerName },
                { key: 'both' as const, label: 'both of us' },
              ] as const
            ).map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setNominee(key)}
                className={`rounded-full border px-4 py-2.5 ${
                  nominee === key
                    ? 'border-hum-primary/25 bg-hum-primary'
                    : 'border-hum-border/18 bg-hum-card/60'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: nominee === key }}
                accessibilityLabel={`Nominee ${label}`}
                activeOpacity={0.88}
              >
                <Text
                  className={`text-[13px] font-medium tracking-wide ${
                    nominee === key ? 'text-hum-ink' : 'text-hum-muted'
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input label="title" placeholder="what happened" value={title} onChangeText={setTitle} />

        <View className="gap-y-2">
          <Text className="text-[10px] font-medium uppercase tracking-[0.18em] text-hum-dim">story</Text>
          <TextInput
            className="min-h-[120px] rounded-[20px] border border-hum-border/18 bg-hum-surface/65 px-4 py-3.5 text-[14px] font-light leading-[22px] text-hum-text"
            placeholder="the moment"
            placeholderTextColor={theme.dim}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        <Button label="save" onPress={handleSubmit} loading={saving} size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
}
