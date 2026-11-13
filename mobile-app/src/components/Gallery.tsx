/**
 * The vehicle's photos on a job: swipe through them, tap one to see it full
 * screen (swipe there too). With no photos it shows the stock picture of the
 * vehicle type, exactly as before.
 */
import React, { useRef, useState } from 'react';
import { FlatList, Image, Modal, StatusBar, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Pressable from './Pressable';
import T from './T';
import { colors, CategoryKey } from '../theme';
import { cat } from '../data/catalog';
import { fileSource } from '../api/client';

function Counter({ i, n, style }: { i: number; n: number; style?: object }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.72)' }, style]}>
      <T raw w="bold" size={12} color={colors.white}>
        {`${i + 1} / ${n}`}
      </T>
    </View>
  );
}

export function VehicleGallery({ photos, k, height }: { photos?: string[]; k: CategoryKey; height: number }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const list = (photos ?? []).filter((u) => !failed.has(u) && fileSource(u));
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [full, setFull] = useState(0);
  const pager = useRef<FlatList<string>>(null);
  const drop = (u: string) => setFailed((s) => new Set(s).add(u));

  if (!list.length) return <Image source={cat(k).photo} style={{ width: '100%', height: '100%' }} resizeMode="contain" />;

  return (
    <>
      <FlatList
        ref={pager}
        data={list}
        keyExtractor={(u) => u}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <Pressable onPress={() => { setFull(i); setOpen(i); }} accessibilityRole="imagebutton" accessibilityLabel={`Vehicle photo ${i + 1} of ${list.length}`}>
            <Image source={fileSource(item)!} onError={() => drop(item)} style={{ width, height }} resizeMode="cover" />
          </Pressable>
        )}
      />
      {list.length > 1 ? (
        <>
          <Counter i={index} n={list.length} style={{ right: 14, bottom: 12 }} />
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 18, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {list.map((u, i) => (
              <View key={u} style={{ width: i === index ? 18 : 8, height: 8, borderRadius: 4, backgroundColor: i === index ? colors.yellow : 'rgba(17,17,17,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }} />
            ))}
          </View>
        </>
      ) : null}

      {open !== null ? (
        <Modal visible animationType="fade" onRequestClose={() => setOpen(null)} statusBarTranslucent>
          <StatusBar barStyle="light-content" />
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <FlatList
              data={list}
              keyExtractor={(u) => u}
              horizontal
              pagingEnabled
              initialScrollIndex={open}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setFull(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => <Image source={fileSource(item)!} style={{ width, height: '100%' }} resizeMode="contain" />}
            />
            <Pressable onPress={() => setOpen(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={{ position: 'absolute', top: insets.top + 12, right: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <X size={22} color={colors.white} />
            </Pressable>
            {list.length > 1 ? <Counter i={full} n={list.length} style={{ alignSelf: 'center', bottom: insets.bottom + 24 }} /> : null}
          </View>
        </Modal>
      ) : null}
    </>
  );
}
