// app/main/calendar.tsx
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type EventItem = { id: string; text: string };
type EventsByDate = Record<string, EventItem[]>;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helpers
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const keyForDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Build a 6x7 grid (weeks x days) for a given visible month */
function buildMonthMatrix(year: number, monthIndex: number) {
  // monthIndex is 0-11
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startDay = firstOfMonth.getDay(); // 0-6 (Sun-Sat)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // Previous month days to show
  const prevMonthDays = new Date(year, monthIndex, 0).getDate();

  const matrix: { date: Date; inMonth: boolean }[][] = [];
  let dayCounter = 1;
  let nextMonthDay = 1;

  for (let week = 0; week < 6; week++) {
    const row: { date: Date; inMonth: boolean }[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const cellIndex = week * 7 + dow;

      if (cellIndex < startDay) {
        // leading days from previous month
        const day = prevMonthDays - (startDay - cellIndex - 1);
        row.push({ date: new Date(year, monthIndex - 1, day), inMonth: false });
      } else if (dayCounter <= daysInMonth) {
        row.push({ date: new Date(year, monthIndex, dayCounter), inMonth: true });
        dayCounter++;
      } else {
        // trailing days from next month
        row.push({ date: new Date(year, monthIndex + 1, nextMonthDay), inMonth: false });
        nextMonthDay++;
      }
    }
    matrix.push(row);
  }

  return matrix;
}

export default function CalendarScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<EventsByDate>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEventText, setNewEventText] = useState('');

  const year = visibleMonth.getFullYear();
  const monthIndex = visibleMonth.getMonth();

  const matrix = useMemo(() => buildMonthMatrix(year, monthIndex), [year, monthIndex]);

  const selectedKey = keyForDate(selectedDate);
  const selectedEvents = events[selectedKey] || [];

  const monthLabel = visibleMonth.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const goPrevMonth = () => {
    setVisibleMonth(new Date(year, monthIndex - 1, 1));
  };

  const goNextMonth = () => {
    setVisibleMonth(new Date(year, monthIndex + 1, 1));
  };

  const goToday = () => {
    const t = new Date();
    setVisibleMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDate(t);
  };

  const openAddEvent = (forDate?: Date) => {
    if (forDate) setSelectedDate(forDate);
    setNewEventText('');
    setIsModalOpen(true);
  };

  const addEvent = () => {
    const trimmed = newEventText.trim();
    if (!trimmed) {
      Alert.alert('Empty event', 'Please enter some text for the event.');
      return;
    }
    const k = keyForDate(selectedDate);
    const item: EventItem = { id: `${Date.now()}`, text: trimmed };
    setEvents(prev => ({
      ...prev,
      [k]: prev[k] ? [item, ...prev[k]] : [item],
    }));
    setIsModalOpen(false);
  };

  const deleteEvent = (id: string) => {
    const k = keyForDate(selectedDate);
    setEvents(prev => {
      const list = prev[k] || [];
      const filtered = list.filter(e => e.id !== id);
      const next = { ...prev };
      if (filtered.length) next[k] = filtered;
      else delete next[k];
      return next;
    });
  };

  const hasEvents = (d: Date) => (events[keyForDate(d)] || []).length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header / Nav */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Calendar</Text>

        <TouchableOpacity style={styles.iconBtn} onPress={goToday}>
          <Text style={styles.todayBtnText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Month Switcher */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={goPrevMonth} style={styles.chevBtn}>
          <Ionicons name="chevron-back" size={22} color="#9333EA" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={goNextMonth} style={styles.chevBtn}>
          <Ionicons name="chevron-forward" size={22} color="#9333EA" />
        </TouchableOpacity>
      </View>

      {/* Weekday Header */}
      <View style={styles.weekdaysRow}>
        {WEEKDAYS.map(d => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      {/* Month Grid */}
      <View style={styles.grid}>
        {matrix.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map(({ date, inMonth }, di) => {
              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, selectedDate);
              const showDot = hasEvents(date);

              return (
                <TouchableOpacity
                  key={`${wi}-${di}`}
                  style={[
                    styles.cell,
                    !inMonth && styles.cellOutside,
                    isSelected && styles.cellSelected,
                  ]}
                  onPress={() => setSelectedDate(date)}
                  onLongPress={() => openAddEvent(date)}
                  delayLongPress={200}
                  activeOpacity={0.8}
                >
                  <View style={styles.cellInner}>
                    <Text
                      style={[
                        styles.cellText,
                        !inMonth && styles.cellTextOutside,
                        isSelected && styles.cellTextSelected,
                        isToday && !isSelected && styles.cellTextToday,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                    {showDot && <View style={styles.dot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Selected Day + Actions */}
      <View style={styles.selectedBar}>
        <Text style={styles.selectedLabel}>
          {selectedDate.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => openAddEvent()}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Event</Text>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      <ScrollView contentContainerStyle={styles.eventList}>
        {selectedEvents.length === 0 ? (
          <Text style={styles.emptyText}>No events yet. Tap “Add Event” or long-press a date.</Text>
        ) : (
          <FlatList
            data={selectedEvents}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.eventItem}>
                <Text style={styles.eventText}>{item.text}</Text>
                <TouchableOpacity onPress={() => deleteEvent(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color="#d11a2a" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Event</Text>
            <Text style={styles.modalDate}>
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <TextInput
              placeholder="What’s happening?"
              placeholderTextColor="#888"
              style={styles.input}
              value={newEventText}
              onChangeText={setNewEventText}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancel]} onPress={() => setIsModalOpen(false)}>
                <Text style={styles.modalBtnTextAlt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.save]} onPress={addEvent}>
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  iconBtn: { width: 60, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#333' },
  todayBtnText: { color: '#9333EA', fontWeight: '600' },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  chevBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(147,51,234,0.08)',
  },
  monthLabel: { fontSize: 18, fontWeight: '700', color: '#9333EA' },

  weekdaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1e9ff',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: '#7b6f8a',
    fontSize: 12,
    fontWeight: '600',
  },

  grid: { paddingHorizontal: 6, paddingTop: 8 },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  cell: {
    flex: 1,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  cellOutside: { opacity: 0.45 },
  cellSelected: { backgroundColor: 'rgba(147,51,234,0.14)' },

  cellInner: { alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 16, color: '#222' },
  cellTextOutside: { color: '#777' },
  cellTextSelected: { fontWeight: '700', color: '#5b21b6' },
  cellTextToday: { textDecorationLine: 'underline' },

  dot: {
    marginTop: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9333EA',
  },

  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    gap: 10,
  },
  selectedLabel: { flex: 1, fontWeight: '600', color: '#333' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#9333EA',
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700' },

  eventList: { padding: 14, paddingBottom: 24, gap: 8 },
  emptyText: { textAlign: 'center', color: '#666', paddingVertical: 24 },

  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf7ff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  eventText: { flex: 1, color: '#222' },
  deleteBtn: { padding: 6, borderRadius: 8, backgroundColor: '#fff' },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  modalDate: { color: '#666', marginBottom: 6 },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 10,
    textAlignVertical: 'top',
    color: '#111',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  cancel: { backgroundColor: '#eee' },
  save: { backgroundColor: '#9333EA' },
  modalBtnText: { color: '#fff', fontWeight: '700' },
  modalBtnTextAlt: { color: '#333', fontWeight: '700' },
});
