/**
 * Full-screen city picker: every city the admin manages (300+), searchable,
 * plus "Other" to type a missing city. A typed city is saved on the server and
 * appears in everyone's list from then on.
 */
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, MapPin, Plus, Search, X } from 'lucide-react-native';
import Pressable from './Pressable';
import T from './T';
import { Button, KeyboardSafe } from './ui';
import { colors, font } from '../theme';
import { cities } from '../data/catalog';
import { api } from '../api/client';

type Props = {
  visible: boolean;
  title: string;
  /** Selected cities (one for single mode). */
  value: string[];
  multiple?: boolean;
  /** Extra options shown on top, e.g. "Anywhere in India". */
  extra?: string[];
  onClose: () => void;
  onChange: (value: string[]) => void;
};

export function CityPicker({ visible, title, value, multiple, extra = [], onClose, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [other, setOther] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState<string[]>(value);

  React.useEffect(() => {
    if (visible) {
      setPicked(value);
      setQ('');
      setOther(false);
      setNewCity('');
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all = [...extra, ...cities];
    if (!s) return all;
    // Starts-with first, then contains.
    const starts = all.filter((c) => c.toLowerCase().startsWith(s));
    const contains = all.filter((c) => !c.toLowerCase().startsWith(s) && c.toLowerCase().includes(s));
    return [...starts, ...contains];
  }, [q, extra, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (c: string) => {
    if (!multiple) {
      onChange([c]);
      onClose();
      return;
    }
    // "Anywhere" excludes specific cities and the other way round.
    setPicked((p) => {
      if (extra.includes(c)) return p.includes(c) ? [] : [c];
      const base = p.filter((x) => !extra.includes(x));
      return base.includes(c) ? base.filter((x) => x !== c) : [...base, c];
    });
  };

  const saveOther = async () => {
    const name = newCity.trim();
    if (name.length < 2) return;
    setSaving(true);
    try {
      const r = await api<{ city: string }>('/cities', { method: 'POST', body: { name } });
      if (!cities.some((c) => c.toLowerCase() === r.city.toLowerCase())) cities.push(r.city);
      setOther(false);
      setNewCity('');
      choose(r.city);
    } catch (e: any) {
      Alert.alert('City', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Never mount a hidden <Modal>: on Android (Fabric) an unopened Modal left the
  // screen's native views out of sync, so later steps drew stale content.
  if (!visible) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardSafe style={{ backgroundColor: colors.bg }}>
        <View style={{ paddingTop: insets.top + 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 52 }}>
            <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={8} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <X size={22} color={colors.ink} />
            </Pressable>
            <T w="extrabold" size={18} style={{ flex: 1 }}>
              {title}
            </T>
          </View>
          <View style={{ marginHorizontal: 16, marginBottom: 12, height: 50, borderRadius: 14, backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 }}>
            <Search size={20} color={colors.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search city"
              placeholderTextColor={colors.faint}
              autoCorrect={false}
              style={{ flex: 1, fontFamily: font.medium, fontSize: 16, color: colors.ink, paddingVertical: 0 }}
            />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel="Clear search">
                <X size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <FlatList
          data={list}
          keyExtractor={(c) => c}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          ListHeaderComponent={
            other ? (
              <View style={{ margin: 16, padding: 14, borderRadius: 16, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.ink, gap: 12 }}>
                <T w="bold" size={15}>
                  Type your city name
                </T>
                <TextInput
                  value={newCity}
                  onChangeText={setNewCity}
                  placeholder="e.g. Sangamner"
                  placeholderTextColor={colors.faint}
                  autoFocus
                  style={{ height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.lineStrong, paddingHorizontal: 12, fontFamily: font.medium, fontSize: 16, color: colors.ink }}
                  onSubmitEditing={saveOther}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button title="Cancel" variant="ghost" size="md" onPress={() => setOther(false)} style={{ flex: 1 }} />
                  <Button title="Add city" size="md" loading={saving} disabled={newCity.trim().length < 2} onPress={saveOther} style={{ flex: 1.3 }} />
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  setOther(true);
                  setNewCity(q.trim());
                }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, height: 58, backgroundColor: pressed ? colors.surface2 : colors.yellow50, borderBottomWidth: 1, borderBottomColor: colors.line })}>
                <Plus size={20} color={colors.ink} />
                <T w="bold" size={16} style={{ flex: 1 }}>
                  Other (my city is not listed)
                </T>
              </Pressable>
            )
          }
          ListEmptyComponent={
            <T size={14} color={colors.muted} center style={{ margin: 24 }}>
              No city found. Tap “Other” to add it.
            </T>
          }
          renderItem={({ item: c }) => {
            const on = picked.includes(c);
            return (
              <Pressable
                onPress={() => choose(c)}
                accessibilityRole={multiple ? 'checkbox' : 'radio'}
                accessibilityState={{ checked: on }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, height: 56, backgroundColor: pressed ? colors.surface2 : on ? colors.yellow50 : colors.white, borderBottomWidth: 1, borderBottomColor: colors.surface2 })}>
                <MapPin size={18} color={extra.includes(c) ? colors.ink : colors.muted} />
                <T w={on ? 'extrabold' : 'semibold'} size={16} style={{ flex: 1 }}>
                  {c}
                </T>
                {on ? <Check size={20} color={colors.ink} strokeWidth={3} /> : null}
              </Pressable>
            );
          }}
        />

        {multiple ? (
          <View style={{ padding: 16, paddingBottom: Math.max(insets.bottom, 12) + 4, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line }}>
            <Button
              title={picked.length ? `Done · ${picked.length} selected` : 'Done'}
              disabled={!picked.length}
              onPress={() => {
                onChange(picked);
                onClose();
              }}
            />
          </View>
        ) : null}
      </KeyboardSafe>
    </Modal>
  );
}

/** A tappable field that shows the chosen city and opens the picker. */
export function CityField({ value, placeholder, onPress }: { value?: string; placeholder: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ height: 60, borderRadius: 16, borderWidth: value ? 2 : 1, borderColor: value ? colors.ink : colors.lineStrong, backgroundColor: value ? colors.yellow50 : colors.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, opacity: pressed ? 0.9 : 1 })}>
      <MapPin size={20} color={colors.ink} />
      <T w={value ? 'extrabold' : 'semibold'} size={17} color={value ? colors.ink : colors.muted} style={{ flex: 1 }}>
        {value || placeholder}
      </T>
      <Search size={18} color={colors.muted} />
    </Pressable>
  );
}
