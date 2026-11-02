/**
 * Chats, live over Socket.IO: new messages appear instantly on both phones,
 * with typing indicator, online / last-seen status and read ticks.
 * Sending goes through REST (the server checks the plan) and shows at once
 * (optimistic), then the server's copy replaces it.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import Pressable from '../components/Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Check, CheckCheck, Clock, Crown, MessageSquare, Phone, Send, ShieldCheck } from 'lucide-react-native';
import T from '../components/T';
import { AppBar, EmptyState } from '../components/ui';
import { PersonPhoto } from '../components/brand';
import { RowSkeleton } from '../components/Skeleton';
import { callNumber, openWhatsApp } from '../components/sheets';
import { colors, font } from '../theme';
import { quickReplies } from '../data/catalog';
import { useStore } from '../store/AppStore';
import { api } from '../api/client';
import { emitSocket, onSocket, onSocketStatus } from '../api/socket';
import { clock, timeAgo } from '../utils/format';

type Msg = { id: string; from: 'me' | 'them'; text: string; at: number; pending?: boolean; failed?: boolean };

function lastSeenText(online: boolean, at: number | null) {
  if (online) return 'Online';
  if (!at) return '';
  const ago = timeAgo(at);
  return ago === 'now' ? 'Last seen just now' : `Last seen ${ago} ago`;
}

/* ------------------------------------------------------------------ List */

export function ChatsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const store = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(store.connections.length > 0);
  const threads = store.connections;
  const pull = async () => {
    setRefreshing(true);
    await store.refresh().catch(() => {});
    setRefreshing(false);
  };
  useFocusEffect(
    useCallback(() => {
      store
        .refresh()
        .catch(() => {})
        .finally(() => setLoaded(true));
    }, []), // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: 14, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T w="extrabold" size={24} style={{ flex: 1 }}>
          {t('chat.title')}
        </T>
        {!store.live && loaded ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ActivityIndicator size="small" color={colors.muted} />
            <T size={12} color={colors.muted}>
              Connecting…
            </T>
          </View>
        ) : null}
      </View>
      {!loaded && !threads.length ? (
        <View style={{ padding: 18 }}>
          <RowSkeleton count={5} />
        </View>
      ) : threads.length ? (
        <FlatList
          data={threads}
          keyExtractor={(th) => th.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pull} colors={[colors.ink]} />}
          renderItem={({ item: th }) => (
            <Pressable
              onPress={() => navigation.navigate('ChatThread', { id: th.id, name: th.other.name })}
              style={({ pressed }) => ({ flexDirection: 'row', gap: 12, padding: 16, backgroundColor: pressed ? colors.surface2 : colors.white, borderBottomWidth: 1, borderBottomColor: colors.surface2 })}>
              <View>
                <PersonPhoto path={th.other.photo} name={th.other.name} size={52} radius={16} />
                {th.online ? <View style={{ position: 'absolute', right: -2, bottom: -2, width: 15, height: 15, borderRadius: 8, backgroundColor: colors.green, borderWidth: 2.5, borderColor: colors.white }} /> : null}
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <T w="bold" size={15} numberOfLines={1} style={{ flex: 1 }}>
                    {th.other.name}
                  </T>
                  <T size={12} color={th.unread ? colors.ink : colors.muted} w={th.unread ? 'bold' : 'regular'}>
                    {timeAgo(th.lastMessageAt)}
                  </T>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T size={13} color={th.unread ? colors.ink : colors.muted} w={th.unread ? 'bold' : 'regular'} numberOfLines={1} style={{ flex: 1 }}>
                    {th.lastMessage || th.jobTitle || 'Connected'}
                  </T>
                  {th.unread ? (
                    <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' }}>
                      <T w="extrabold" size={11}>
                        {th.unread}
                      </T>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <EmptyState icon={<MessageSquare size={30} color={colors.ink} />} title={t('chat.empty')} text={t('chat.emptyText')} />
      )}
    </View>
  );
}

/* ---------------------------------------------------------------- Thread */

const PAGE = 40;

export function ChatThreadScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const store = useStore();
  const id: string = route.params.id;
  const conn = store.connections.find((c) => c.id === id);
  const [msgs, setMsgs] = useState<Msg[]>([]); // newest first (inverted list)
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState('');
  const [blocked, setBlocked] = useState('');
  const [typing, setTyping] = useState(false);
  const [presence, setPresence] = useState<{ online: boolean; lastSeenAt: number | null }>({ online: conn?.online ?? false, lastSeenAt: conn?.lastSeenAt ?? null });
  const otherReadAt = conn?.otherReadAt ?? 0;
  const newest = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iAmTyping = useRef(false);
  const replies = store.role === 'owner' ? quickReplies.owner : quickReplies.driver;

  const add = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return;
    newest.current = Math.max(newest.current, ...incoming.map((m) => m.at));
    setMsgs((cur) => {
      const ids = new Set(cur.map((m) => m.id));
      const fresh = incoming.filter((m) => !ids.has(m.id));
      if (!fresh.length) return cur;
      // A server copy of my own message replaces its optimistic placeholder.
      const mineTexts = new Set(fresh.filter((m) => m.from === 'me').map((m) => m.text));
      const kept = cur.filter((m) => !(m.pending && mineTexts.has(m.text)));
      return [...fresh, ...kept].sort((a, b) => b.at - a.at);
    });
  }, []);

  // First page + mark as read.
  useEffect(() => {
    store.setActiveChat(id);
    api<{ messages: Msg[]; hasMore: boolean }>(`/connections/${id}/messages`, { query: { limit: PAGE } })
      .then((d) => {
        add(d.messages);
        setHasMore(d.hasMore);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    return () => store.setActiveChat(null);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live: new messages, typing, presence; catch up after a reconnect.
  useEffect(() => {
    const otherId = conn?.otherId;
    if (otherId) emitSocket('presence:get', { userId: otherId }, (p: { online: boolean; lastSeenAt: number | null }) => setPresence(p));
    const offs = [
      onSocket<{ connectionId: string; message: Msg }>('message:new', ({ connectionId, message }) => {
        if (connectionId !== id) return;
        add([message]);
        if (message.from === 'them') {
          setTyping(false);
          api(`/connections/${id}/read`, { method: 'POST' }).catch(() => {});
        }
      }),
      onSocket<{ connectionId: string; typing: boolean }>('chat:typing', (d) => {
        if (d.connectionId === id) setTyping(d.typing);
      }),
      onSocket<{ userId: string; online: boolean; lastSeenAt: number }>('presence', (p) => {
        if (p.userId === otherId) setPresence({ online: p.online, lastSeenAt: p.lastSeenAt });
      }),
      onSocketStatus((up) => {
        if (up && newest.current) api<{ messages: Msg[] }>(`/connections/${id}/messages`, { query: { after: newest.current } }).then((d) => add(d.messages)).catch(() => {});
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [id, conn?.otherId, add]);

  // The typing indicator clears itself if the other phone goes quiet.
  useEffect(() => {
    if (!typing) return;
    const tm = setTimeout(() => setTyping(false), 6000);
    return () => clearTimeout(tm);
  }, [typing]);

  const onType = (v: string) => {
    setText(v);
    if (!iAmTyping.current && v) {
      iAmTyping.current = true;
      emitSocket('chat:typing', { connectionId: id, typing: true });
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      iAmTyping.current = false;
      emitSocket('chat:typing', { connectionId: id, typing: false });
    }, 2500);
  };

  const loadOlder = async () => {
    if (!hasMore || loadingOlder || !msgs.length) return;
    setLoadingOlder(true);
    try {
      const oldest = msgs[msgs.length - 1].at;
      const d = await api<{ messages: Msg[]; hasMore: boolean }>(`/connections/${id}/messages`, { query: { before: oldest, limit: PAGE } });
      add(d.messages);
      setHasMore(d.hasMore);
    } catch {
      // try again on the next scroll
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async (s: string) => {
    const body = s.trim();
    if (!body) return;
    setText('');
    if (iAmTyping.current) {
      iAmTyping.current = false;
      emitSocket('chat:typing', { connectionId: id, typing: false });
    }
    const tmp: Msg = { id: `tmp${Date.now()}`, from: 'me', text: body, at: Date.now(), pending: true };
    setMsgs((m) => [tmp, ...m]);
    try {
      const d = await api<{ message: Msg }>(`/connections/${id}/messages`, { method: 'POST', body: { text: body } });
      setMsgs((m) => {
        const without = m.filter((x) => x.id !== tmp.id && x.id !== d.message.id);
        return [d.message, ...without].sort((a, b) => b.at - a.at);
      });
      newest.current = Math.max(newest.current, d.message.at);
      setBlocked('');
    } catch (e: any) {
      setMsgs((m) => m.filter((x) => x.id !== tmp.id));
      setText(body);
      setBlocked(e.code === 'PLAN_REQUIRED' ? 'Your plan has ended. Renew it to keep chatting.' : e.message);
    }
  };

  const status = typing ? 'typing…' : lastSeenText(presence.online, presence.lastSeenAt);
  const phone = conn?.other.phone;
  const data = useMemo(() => msgs, [msgs]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding">
      <AppBar
        title={route.params.name}
        subtitle={status || undefined}
        right={
          phone ? (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Pressable onPress={() => callNumber(phone)} accessibilityLabel="Call" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={19} color={colors.ink} fill={colors.ink} />
              </Pressable>
              <Pressable onPress={() => openWhatsApp(phone)} accessibilityLabel="WhatsApp" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.whatsapp, alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={19} color={colors.white} />
              </Pressable>
            </View>
          ) : undefined
        }
      />
      {!loaded ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : (
        <FlatList
          inverted
          data={data}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            loadingOlder ? (
              <ActivityIndicator color={colors.ink} style={{ marginBottom: 8 }} />
            ) : !hasMore ? (
              <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.neutralSoft, marginBottom: 8 }}>
                <ShieldCheck size={14} color={colors.ink2} />
                <T size={12} color={colors.ink2}>
                  Never pay anyone to get a job.
                </T>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => {
            const mine = item.from === 'me';
            const read = mine && !item.pending && otherReadAt >= item.at;
            return (
              <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: mine ? colors.yellow : colors.white, borderRadius: 16, borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4, paddingHorizontal: 14, paddingVertical: 10, borderWidth: mine ? 0 : 1, borderColor: colors.line }}>
                <T size={15} lh={21}>
                  {item.text}
                </T>
                <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 3 }}>
                  <T size={10} color={mine ? colors.yellowText : colors.muted}>
                    {clock(item.at)}
                  </T>
                  {mine ? item.pending ? <Clock size={12} color={colors.yellowText} /> : read ? <CheckCheck size={14} color={colors.green} strokeWidth={2.6} /> : <Check size={13} color={colors.yellowText} strokeWidth={2.6} /> : null}
                </View>
              </View>
            );
          }}
        />
      )}
      {blocked ? (
        <Pressable onPress={() => navigation.navigate('Plans')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.yellow50, borderTopWidth: 1, borderTopColor: colors.yellow200 }}>
          <Crown size={18} color={colors.ink} />
          <T w="semibold" size={13} style={{ flex: 1 }}>
            {blocked}
          </T>
        </Pressable>
      ) : null}
      <View style={{ backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: Math.max(insets.bottom, 8) }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingTop: 10 }} keyboardShouldPersistTaps="handled">
          {replies.map((r) => (
            <Pressable key={r} onPress={() => send(r)} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.line, justifyContent: 'center', backgroundColor: colors.bg }}>
              <T w="semibold" size={13}>
                {r}
              </T>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}>
          <TextInput
            value={text}
            onChangeText={onType}
            placeholder={t('chat.type')}
            placeholderTextColor={colors.faint}
            style={{ flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.bg, paddingHorizontal: 16, fontFamily: font.medium, fontSize: 15, color: colors.ink }}
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable onPress={() => send(text)} accessibilityLabel="Send" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: text.trim() ? colors.ink : colors.line, alignItems: 'center', justifyContent: 'center' }}>
            <Send size={19} color={text.trim() ? colors.yellow : colors.muted} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
