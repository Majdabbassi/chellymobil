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
      if (selectedType) {
        data = data.filter(n =>
          selectedType === 'admin'
            ? !n.type // si type est null ou undefined
            : n.type === selectedType
        );
      }    }
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
    case 'message': 
      return { 
        backgroundColor: 'linear-gradient(135deg, #667EEA, #764BA2)',
        backgroundColor: '#667EEA', // fallback
      };
    case 'information': 
      return { 
        backgroundColor: '#10B981',
      };
    case 'payment': 
      return { 
        backgroundColor: '#F59E0B',
      };
    default: 
      return { 
        backgroundColor: '#8B5CF6',
      };
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
        <Picker.Item label="🛠️ Administratives" value="admin" />
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
    backgroundColor: '#F8FAFC',
    paddingTop: 50,
  },
  
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  menuIcon: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  
  pickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  
  pickerWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  
  picker: {
    height: 50,
    color: '#374151',
  },
  
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  
  unseenCard: {
    borderLeftColor: '#8B5CF6',
    backgroundColor: '#FEFBFF',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.15,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  
  cardText: {
    flex: 1,
    marginRight: 12,
  },
  
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 24,
  },
  
  bold: {
    fontWeight: '700',
    color: '#111827',
  },
  
  badgeRow: {
    marginBottom: 8,
  },
  
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  
  message: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 12,
  },
  
  timestamp: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  
  newBadge: {
    color: '#8B5CF6',
    fontWeight: '700',
    fontSize: 12,
  },
  
  empty: {
    textAlign: 'center',
    fontSize: 18,
    color: '#9CA3AF',
    marginTop: 60,
    fontWeight: '600',
  },
});
