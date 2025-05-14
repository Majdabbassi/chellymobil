// NotificationsScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '@/services/api';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from 'expo-router';

export interface NotificationDTO {
  id: number;
  title: string;
  message: string;
  timestamp: string;
  type?: string;
  seen?: boolean;
  auteur?: string;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [filtered, setFiltered] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const [selectedType, setSelectedType] = useState<string>('');
  const [seenFilter, setSeenFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications/me');
        const sorted = res.data.sort(
        (a: NotificationDTO, b: NotificationDTO) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setNotifications(sorted);
        setFiltered(sorted);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [selectedType, seenFilter, searchQuery, notifications]);

  const markAsSeen = async (id: number) => {
  try {
    await API.put(`/notifications/${id}/seen`);
    const updated = notifications.map(n =>
      n.id === id ? { ...n, seen: true } : n
    );
    // Optional: keep most recent + unseen at top
    const sorted = updated.sort((a, b) => {
      if (a.seen === b.seen) {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      return a.seen ? 1 : -1; // unseen comes first
    });

    setNotifications(sorted);
  } catch (e) {
    console.error('❌ Failed to mark as seen:', e);
  }
};


  const filterNotifications = () => {
    let data = [...notifications];

    if (selectedType) {
      data = data.filter(n => n.type === selectedType);
    }
    if (seenFilter === 'seen') {
      data = data.filter(n => n.seen);
    } else if (seenFilter === 'unseen') {
      data = data.filter(n => !n.seen);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q)
      );
    }
    setFiltered(data);
  };

  const renderItem = ({ item }: { item: NotificationDTO }) => (
  <TouchableOpacity
    onPress={() => {
      if (!item.seen) markAsSeen(item.id);
    }}
  >
    <View style={[styles.card, !item.seen && styles.unseenCard]}>
      <View style={styles.cardContent}>
        <View style={styles.cardText}>
          <Text style={[styles.title, !item.seen && styles.bold]}>{item.title}</Text>
          <View style={styles.badgeRow}>
            <Text style={[styles.badge, getBadgeStyle(item.type)]}>
              {item.type?.toUpperCase() || 'ADMIN'}
            </Text>
          </View>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleString('fr-FR')}
            {!item.seen && <Text style={styles.newBadge}>  • Nouveau</Text>}
          </Text>
        </View>
        <TouchableOpacity onPress={() => deleteNotification(item.id)}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
);


  const getBadgeStyle = (type?: string) => {
    switch (type) {
      case 'message': return { backgroundColor: '#3B82F6' };
      case 'information': return { backgroundColor: '#10B981' };
      case 'payment': return { backgroundColor: '#EF4444' };
      default: return { backgroundColor: '#111827' };
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await API.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error('❌ Failed to delete notification', e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
            <Ionicons name="menu" size={24} color="#6D28D9" style={styles.menuIcon} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>       📢 Notifications</Text>
      </View>


      {/* Filters */}
      <View style={styles.filtersContainer}>
  {/* Row 1: Search Bar */}
  <TextInput
    style={styles.searchInput}
    placeholder="🔎 Rechercher..."
    value={searchQuery}
    onChangeText={setSearchQuery}
  />

  {/* Row 2: Pickers */}
  <View style={styles.pickerRow}>
    <View style={styles.pickerWrapper}>
      <Picker
        selectedValue={selectedType}
        onValueChange={setSelectedType}
        style={styles.picker}
        dropdownIconColor="#6D28D9"
      >
        <Picker.Item label="📂 Tous les types" value="" />
        <Picker.Item label="✉️ Messages" value="message" />
        <Picker.Item label="ℹ️ Informations" value="information" />
        <Picker.Item label="💳 Paiements" value="payment" />
      </Picker>
    </View>

    <View style={styles.pickerWrapper}>
      <Picker
        selectedValue={seenFilter}
        onValueChange={setSeenFilter}
        style={styles.picker}
        dropdownIconColor="#6D28D9"
      >
        <Picker.Item label="👁 Tous" value="" />
        <Picker.Item label="✅ Vus" value="seen" />
        <Picker.Item label="🆕 Non vus" value="unseen" />
      </Picker>
    </View>
  </View>
</View>



      {/* Loading */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} size="large" color="#6D28D9" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              fetchNotifications();
            }} />
          }
          ListEmptyComponent={<Text style={styles.empty}>Aucune notification trouvée</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7FF',
    padding: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#4B0082',
  },
 
  filters: {
  paddingHorizontal: 16,
  paddingBottom: 16,
  gap: 12,
},
row: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 10,
},
  input: {
  flex: 1,
  height: 44,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 12,
  paddingHorizontal: 12,
  fontSize: 16,
  backgroundColor: '#fff',
},
  refreshBtn: {
    flexDirection: 'row',
    backgroundColor: '#6D28D9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  refreshText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#6D28D9',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },

  unseenCard: {
  backgroundColor: '#F0F4FF',
  borderLeftWidth: 4,
  borderLeftColor: '#6D28D9',
},
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  newBadge: {
    backgroundColor: '#FACC15',
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 11,
  },
  message: {
    fontSize: 14,
    color: '#374151',
  },
  timestamp: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#9CA3AF',
    fontSize: 15,
  },
pickerContainer: {
  flex: 1,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 12,
  backgroundColor: '#fff',
  paddingHorizontal: 8, // 🔧 make space inside
  justifyContent: 'center',
  height: 44,
  marginBottom: 30,
},
filtersContainer: {
  paddingHorizontal: 16,
  marginTop: 12,
  marginBottom: 15,
},

searchInput: {
  backgroundColor: '#fff',
  borderRadius: 12,
  paddingHorizontal: 14,
  height: 44,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  marginBottom: 10,
  fontSize: 15,
},

pickerRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 10,
},

pickerWrapper: {
  flex: 1,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 12,
  backgroundColor: '#fff',
  height: 44,
  justifyContent: 'center',
},

picker: {
  width: '100%',
  height: 44,
  fontSize: 14,
},
headerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 16,
  backgroundColor: '#F9F7FF',
},
menuIcon: {
  marginRight: 12,
},



});
