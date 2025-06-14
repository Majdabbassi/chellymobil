import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { archiveConversation, deleteConversation, getAllMessages, markMessageAsSeen, searchMessages } from '@/services/messageService';
import { getAllUsers } from '@/services/UserService';

// Types pour l'application
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'contact';
  timestamp: Date;
  read: boolean;
  mediaType?: 'photo' | 'voice' | 'video';
}

interface ChatContact {
  id: string;
  name: string;
  avatar: any;
  lastMessage: ChatMessage;
  unreadCount: number;
  online: boolean;
  typing?: boolean;
  favorite?: boolean;
  archived?: boolean; // Added archived property
}
export interface Role {
  id?: number;
  nom: string;
  active?: boolean;
}
interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  image_base64?: string;
  roles: Role[] | string[];
  [key: string]: any; // To handle additional user attributes
}

const toImageUri = (val?: string) =>
  val ? (val.startsWith('data:image') ? val
                                      : `data:image/jpeg;base64,${val}`)
      : undefined;

const makeImageSource = (base64?: string) => {
  if (!base64) return null;

  const uri = base64.startsWith('data:image')
    ? base64
    : `data:image/jpeg;base64,${base64}`;

  return { uri };
};

const getRoleLabel = (roles?: (string | { nom: string })[]): string =>
  roles?.map((r) => typeof r === 'string' ? r : r.nom).join(', ') || '—';


const mapMessagesToChats = (
  messages: any[],
  currentUserId: number,
  allUsers: User[] // <- Ajout ici
): ChatContact[] => {
  const contactMap = new Map();

  messages.forEach(message => {
    if (!message || (!message.sender && !message.senderId)) {
      console.warn('⛔ Message ignoré : sender ou senderId manquant', message);
      return;
    }

    const isSender = message.senderId === currentUserId;
    const contactId = isSender ? message.receiverId : message.senderId;
    const contactName = isSender ? message.receiverNom : message.senderNom;

    // Trouver l'utilisateur associé au contact
    const user = allUsers.find(u => u.id.toString() === contactId.toString());
    const rawBase64 = user?.imageBase64;
    const contactAvatar = makeImageSource(rawBase64) || require('../../assets/images/confirmation.png');

    if (!contactMap.has(contactId)) {
      contactMap.set(contactId, {
        id: contactId,
        name: contactName,
        avatar: contactAvatar,
        messages: [],
        unreadCount: 0,
        online: Math.random() > 0.5,
        archived: false,
      });
    }

    const existingContact = contactMap.get(contactId);
    if (existingContact && existingContact.messages) {
      existingContact.messages.push(message);
      if (!isSender && !message.seen) {
        existingContact.unreadCount += 1;
      }
    }
  });

  return Array.from(contactMap.values()).map(contact => {
    const sortedMessages = contact.messages.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const lastMsg = sortedMessages[0];

    return {
      id: contact.id,
      name: contact.name,
      avatar: contact.avatar,
      lastMessage: {
        id: lastMsg.id,
        text: lastMsg.content,
        sender: lastMsg.senderId === currentUserId ? 'user' : 'contact',
        timestamp: new Date(lastMsg.timestamp),
        read: lastMsg.seen,
        mediaType: lastMsg.image ? 'photo' : undefined,
      },
      unreadCount: contact.unreadCount,
      online: contact.online,
      favorite: false,
      archived: contact.archived,
    };
  });
};


interface ScrollableFiltersProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

const ScrollableFilters = ({ activeFilter, setActiveFilter }: ScrollableFiltersProps) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 5 }}
    >
      {[
        { id: 'all', label: 'Tous' },
        { id: 'unread', label: 'Non lus' },
        { id: 'favorites', label: 'Favoris' },
        { id: 'groups', label: 'Groupes' },
        { id: 'coaches', label: 'Coachs' },
        { id: 'admins', label: 'Admins' },
        { id: 'archived', label: 'archivés' },

      ].map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.filterButton,
            activeFilter === item.id && styles.filterButtonActive
          ]}
          onPress={() => setActiveFilter(item.id)}
        >
          <Text 
            style={[
              styles.filterText,
              activeFilter === item.id && styles.filterTextActive
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// Composant principal
const MyMessenger = () => {
  const [selectMode, setSelectMode] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const [chats, setChats] = useState<ChatContact[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatContact[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const navigation = useNavigation();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null); // Added currentUserId state
  // juste après tes useState…
const toggleFavorite = (chatId: string) => {
  setChats(prev =>
    prev.map(c =>
      c.id === chatId ? { ...c, favorite: !c.favorite } : c
    )
  );
};

  // States for advanced filters
  const [searchTerm, setSearchTerm] = useState('');
  const [searchRole, setSearchRole] = useState<string | undefined>();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [groupOnly, setGroupOnly] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Chat actuellement sélectionné dans le menu '⋯'
  const [menuChat, setMenuChat] = useState<ChatContact | null>(null);
  // Pour savoir si la feuille d'action est ouverte
  const [showActionSheet, setShowActionSheet] = useState(false);
// Étape 1 : charger les utilisateurs

useEffect(() => {
  const fetchUsers = async () => {
    try {
      const users = await getAllUsers();
      const roleMap: Record<number, string> = {
        1: 'COACH',
        2: 'ADMIN',
        3: 'PARENT',
      };
      const normalized = users.map((u) => ({
        ...u,
        roles: u.roles.map((r: any) =>
          typeof r === 'object' && r.nom
            ? r
            : { id: r, nom: roleMap[r] ?? '—' }
        ),
      }));
      setAllUsers(normalized);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
    }
  };

  fetchUsers();
}, []);
// Étape 2 : charger les messages uniquement quand allUsers ET currentUserId sont prêts
useEffect(() => {
  const fetchMessages = async () => {
    if (!currentUserId || allUsers.length === 0) return;

    try {
      setIsLoading(true);
      const messages = await getAllMessages(currentUserId);
      const mapped = mapMessagesToChats(messages, currentUserId, allUsers);
      setChats(mapped);
      setFilteredChats(mapped);
    } catch (error) {
      console.error("Erreur chargement des messages :", error);
    } finally {
      setIsLoading(false);
    }
  };

  fetchMessages();
}, [allUsers, currentUserId]); // 🔁 attend les DEUX


  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const parentData = await AsyncStorage.getItem('parent');
        if (parentData) {
          const parent = JSON.parse(parentData);
          setCurrentUserId(parent.id); // Set currentUserId
          const messages = await getAllMessages(parent.id);
          
          const mappedChats = mapMessagesToChats(messages, parent.id, allUsers);
          setChats(mappedChats);
          setFilteredChats(mappedChats); // Initialize filtered chats with all chats
        }
      } catch (error) {
        console.error('Erreur chargement messages', error);
        Alert.alert('Erreur', 'Impossible de charger les messages');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchMessages();
  }, []);

  // Function to filter chats based on the selected criteria
  const getFilteredChats = () => {
    let result = [...chats];

    // ⚡ Ne pas afficher les conversations archivées sauf si filtre = "archived"
    if (activeFilter !== 'archived') {
      result = result.filter(chat => !chat.archived);
    }
    // 1. Filtrer par terme de recherche
    if (searchTerm) {
      result = result.filter(chat =>
        chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.lastMessage.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  
    // 2. Filtrer par rôle depuis les filtres avancés
    if (searchRole) {
      result = result.filter(chat => {
        const user = allUsers.find(u => u.id.toString() === chat.id.toString());
        return user?.roles?.some((r: Role) =>
          r.nom?.toLowerCase() === searchRole.toLowerCase()
        );
      });
    }
  
    // 3. Unread only
    if (unreadOnly) {
      result = result.filter(chat => chat.unreadCount > 0);
    }
  
    // 4. Groupes only
    if (groupOnly) {
      result = result.filter(chat => chat.isGroup === true);
    }
  
    // 5. Filtres de l'onglet supérieur
    if (activeFilter === 'unread') {
      result = result.filter(chat => chat.unreadCount > 0);
    } 
    else if (activeFilter === 'favorites') {
      result = result.filter(chat => chat.favorite);
    } 
    else if (activeFilter === 'coaches') {
      result = result.filter(chat => {
        const user = allUsers.find(u => u.id.toString() === chat.id.toString());
        return user?.roles?.some((r: Role) =>
          r.nom?.toLowerCase() === 'coach'
        );
      });
    } 

    else if (activeFilter === 'admins') {
      result = result.filter(chat => {
        const user = allUsers.find(u => u.id.toString() === chat.id.toString());
        return user?.roles?.some((r: Role) =>
          r.nom?.toLowerCase() === 'admin'
        );
      });
    }
    else if (activeFilter === 'archived') {
      result = result.filter(chat => chat.archived);
    }
    
  
    setFilteredChats(result);
  };
  
  
  // Effect to trigger filtering when search criteria or active filter changes
  useEffect(() => {
    getFilteredChats();
  }, [searchTerm, searchRole, unreadOnly, groupOnly, activeFilter, chats]);
  
  // Effect to update filtered chats when main search query changes
  useEffect(() => {
    if (searchQuery) {
      const filtered = chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    } else {
      getFilteredChats(); // Reapply other filters if search query is cleared
    }
  }, [searchQuery]);

  // Modifiez la barre de recherche pour inclure les filtres avancés
  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Feather name="search" size={18} color="#6b7280" style={styles.searchIcon} />
      <TextInput
        placeholder="Rechercher des messages..."
        placeholderTextColor="#6b7280"
        style={styles.searchInput}
        value={searchTerm}
        onChangeText={setSearchTerm}
      />
      
      {/* Bouton pour afficher les options de filtre avancé */}
      <TouchableOpacity 
        onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
        style={styles.filterToggleButton}
      >
        <Feather name="filter" size={18} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );
  
  // Composant pour les filtres avancés
  const AdvancedFilters = () => (
    <View style={styles.advancedFiltersContainer}>
      <Text style={styles.filterSectionTitle}>Filtrer par :</Text>
      
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterOption, unreadOnly && styles.filterOptionActive]}
          onPress={() => setUnreadOnly(!unreadOnly)}
        >
          <Text style={[styles.filterOptionText, unreadOnly && styles.filterOptionTextActive]}>
            Non lus
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterOption, groupOnly && styles.filterOptionActive]}
          onPress={() => setGroupOnly(!groupOnly)}
        >
          <Text style={[styles.filterOptionText, groupOnly && styles.filterOptionTextActive]}>
            Groupes
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterOption, searchRole === 'Coach' && styles.filterOptionActive]}
          onPress={() => setSearchRole(searchRole === 'Coach' ? undefined : 'Coach')}
        >
          <Text style={[styles.filterOptionText, searchRole === 'Coach' && styles.filterOptionTextActive]}>
            Coachs
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterOption, searchRole === 'Admin' && styles.filterOptionActive]}
          onPress={() => setSearchRole(searchRole === 'Admin' ? undefined : 'Admin')}
        >
          <Text style={[styles.filterOptionText, searchRole === 'Admin' && styles.filterOptionTextActive]}>
            Admins
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  const handleBulkMarkAsRead = async () => {
    try {
      if (!currentUserId) return;
  
      await Promise.all(
        selectedChats.map(chatId => {
          const chat = chats.find(c => c.id === chatId);
          if (chat && !chat.lastMessage.read) {
            return markMessageAsSeen(Number(chat.lastMessage.id), true);
          }
          return Promise.resolve(); // Si déjà lu, on skip
        })
      );
  
      setChats(prev =>
        prev.map(chat =>
          selectedChats.includes(chat.id)
            ? {
                ...chat,
                unreadCount: 0,
                lastMessage: {
                  ...chat.lastMessage,
                  read: true,
                },
              }
            : chat
        )
      );
      setSelectedChats([]);
      setSelectMode(false);
    } catch (error) {
      console.error('Erreur marquer comme lu en masse:', error);
    }
  };
  
  const handleBulkArchive = async () => {
    try {
      if (!currentUserId) return;
      await Promise.all(
        selectedChats.map(chatId =>
          archiveConversation(currentUserId, chatId, true)
        )
      );
      setChats(prev =>
        prev.map(chat =>
          selectedChats.includes(chat.id)
            ? { ...chat, archived: true }
            : chat
        )
      );
      setSelectedChats([]);
      setSelectMode(false);
    } catch (error) {
      console.error('Erreur archivage en masse:', error);
    }
  };
  
  const handleBulkDelete = async () => {
    try {
      if (!currentUserId) return;
      await Promise.all(
        selectedChats.map(chatId =>
          deleteConversation(currentUserId, Number(chatId))
        )
      );
      setChats(prev => prev.filter(chat => !selectedChats.includes(chat.id)));
      setSelectedChats([]);
      setSelectMode(false);
    } catch (error) {
      console.error('Erreur suppression en masse:', error);
    }
  };
  
  // Gérer la sélection d'une conversation
  const handleChatSelect = (chat: ChatContact) => {
    router.push({
      pathname: '/messages/[id]',
      params: { id: chat.id },
    });
    if (chat.unreadCount > 0) {
      const updatedChats = chats.map((c) =>
        c.id === chat.id ? { ...c, unreadCount: 0, lastMessage: { ...c.lastMessage, read: true } } : c
      );
      setChats(updatedChats);
    }
  };

  // Create a new chat - implementation that was missing
  const createNewChat = () => {
    setShowUserListModal(true);
  };

  // Formater l'heure pour l'affichage
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
  };

  // Marquer toutes les conversations comme lues
  const handleReadAll = () => {
    const updatedChats = chats.map((chat) => ({
      ...chat,
      unreadCount: 0,
      lastMessage: { ...chat.lastMessage, read: true },
    }));
    setChats(updatedChats);
    setMenuVisible(false);
  };

  // Sélectionner une conversation
  const handleSelectChat = (chatId: string) => {
    setSelectedChats((prevSelected) =>
      prevSelected.includes(chatId)
        ? prevSelected.filter((id) => id !== chatId)
        : [...prevSelected, chatId]
    );
  };

  // Rendu d'un élément de conversation
  const renderChatItem = ({ item }: { item: ChatContact }) => {
    const isSelected = selectedChats.includes(item.id);
  
    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          isSelected && styles.chatItemSelected, // Ajoute un fond différent si sélectionné
        ]}
        onPress={() => {
          if (selectMode) {
            handleSelectChat(item.id);
          } else {
            handleChatSelect(item);
          }
        }}
        onLongPress={() => handleSelectChat(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {/* Si en mode sélection, afficher carré/coché */}
          {selectMode ? (
            <Feather
              name={isSelected ? 'check-square' : 'square'}
              size={22}
              color={isSelected ? '#8b5cf6' : '#6b7280'}
              style={{ marginRight: 8 }}
            />
          ) : (
            <Image
              source={item.avatar}
              style={styles.avatar}
              resizeMode="cover"
              onError={(e) => {
                console.error("Erreur chargement image:", e.nativeEvent.error);
                setChats(prevChats => prevChats.map(chat => 
                  chat.id === item.id 
                    ? { ...chat, avatar: require('../../assets/images/confirmation.png') }
                    : chat
                ));
              }}
            />
          )}
          {item.online && !selectMode && <View style={styles.onlineIndicator} />}
        </View>
  
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[
              styles.chatName,
              item.favorite && styles.favoriteName,
              isSelected && styles.selectedName,
            ]}>
              {item.name}
            </Text>
  
            <View style={styles.headerRight}>
              <Text style={styles.chatTime}>{formatTime(item.lastMessage.timestamp)}</Text>
  
              {/* Étoile pour favori */}
              <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={{ padding: 4, marginLeft: 6 }}>
                <MaterialCommunityIcons
                  name={item.favorite ? 'star' : 'star-outline'}
                  size={20}
                  color={item.favorite ? '#8B5CF6' : '#6B7280'}
                />
              </TouchableOpacity>
  
              {/* Bouton menu 3 points */}
              {!selectMode && (
                <TouchableOpacity
                  onPress={() => {
                    setMenuChat(item);
                    setShowActionSheet(true);
                  }}
                  style={styles.moreButton}
                >
                  <Feather name="more-vertical" size={20} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>
  
          {/* Dernier message */}
          <View style={styles.messageContainer}>
            <Text
              numberOfLines={1}
              style={[
                styles.lastMessage,
                item.unreadCount > 0 && styles.unreadMessage,
              ]}
            >
              {item.lastMessage.text || 'Pas de message'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  

  // Afficher un indicateur de chargement pendant le chargement des données
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: '#8b5cf6' }}>Chargement des messages...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {menuChat && (
        <Modal
          animationType="slide"
          transparent
          visible={showActionSheet}
          onRequestClose={() => setShowActionSheet(false)}
        >
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPressOut={() => setShowActionSheet(false)}
          >
            <View style={styles.actionSheet}>
              {/* Titre */}
              <Text style={styles.sheetTitle}>{menuChat?.name}</Text>

              {/* 1. Marquer comme lu / non-lu */}
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={async () => {
                  if (!currentUserId || !menuChat) return;
                  const isRead = menuChat.lastMessage.read;
                  try {
                    await markMessageAsSeen(
                      Number(menuChat.lastMessage.id),
                      !isRead
                    );
                    setChats(prev =>
                      prev.map(c =>
                        c.id === menuChat.id
                          ? {
                              ...c,
                              unreadCount: isRead ? 1 : 0,
                              lastMessage: {
                                ...c.lastMessage,
                                read: !isRead
                              }
                            }
                          : c
                      )
                    );
                  } catch (err) {
                    console.error('Erreur mark-as-seen:', err);
                  }
                  setShowActionSheet(false);
                }}
              >
                <Feather
                  name={menuChat?.unreadCount ? 'eye' : 'eye-off'}
                  size={18}
                  color="#4b5563"
                  style={styles.sheetIcon}
                />
                <Text style={styles.sheetText}>
                  {menuChat?.unreadCount ? 'Marquer comme lu' : 'Marquer comme non lu'}
                </Text>
              </TouchableOpacity>

              {/* 2. Archiver / Désarchiver */}
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={async () => {
                  if (!currentUserId || !menuChat) return;
                  try {
                    await archiveConversation(
                      currentUserId,
                      menuChat.id,
                      !menuChat.archived
                    );
                    setChats(prev =>
                      prev.map(c =>
                        c.id === menuChat.id
                          ? { ...c, archived: !c.archived }
                          : c
                      )
                    );
                  } catch (err) {
                    console.error('Erreur archive-conversation:', err);
                  }
                  setShowActionSheet(false);
                }}
              >
                <Feather
                  name="archive"
                  size={18}
                  color="#4b5563"
                  style={styles.sheetIcon}
                />
                <Text style={styles.sheetText}>
                  {menuChat?.archived
                    ? 'Désarchiver la discussion'
                    : 'Archiver la discussion'}
                </Text>
              </TouchableOpacity>

              {/* 3. Supprimer */}
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => {
                  if (!currentUserId || !menuChat) return;
                  Alert.alert(
                    'Supprimer ?',
                    'Cette discussion et tous ses messages seront supprimés définitivement.',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Supprimer',
                        style: 'destructive',
                        onPress: async () => {
                          if (currentUserId == null || menuChat == null) return;
                        
                          const chatId = Number(menuChat.id);
                          console.log(`[ActionSheet] Début suppression — userId=${currentUserId}, chatId=${chatId}`);
                        
                          try {
                            const response = await deleteConversation(currentUserId, chatId);
                            console.log('[ActionSheet] deleteConversation a répondu :', response);
                        
                            setChats(prev => {
                              const updated = prev.filter(c => c.id !== menuChat.id);
                              console.log('[ActionSheet] Nouvel état de chats après suppression :', updated);
                              return updated;
                            });
                          } catch (err) {
                            console.error('[ActionSheet] Erreur lors de deleteConversation :', err);
                          } finally {
                            setShowActionSheet(false);
                            setMenuChat(null);
                            console.log('[ActionSheet] Fermeture du modal et reset menuChat');
                          }
                        }
                        
                        
                      }
                    ]
                  );
                }}
              >
                <Feather
                  name="trash-2"
                  size={18}
                  color="#dc2626"
                  style={styles.sheetIcon}
                />
                <Text style={[styles.sheetText, { color: '#dc2626' }]}>
                  Supprimer la discussion
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      
      {/* En-tête de l'application */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>   ChellyChat</Text>
          <View style={styles.headerButtons}>
         
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => setShowUserListModal(true)}
            >
              <Feather name="plus" size={22} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuVisible(!menuVisible)}
            >
              <Feather name="more-vertical" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
      
      </View>
      {menuVisible && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              onPress={() => {
                setMenuVisible(false);
                setSelectMode(true); // <- ici
                Alert.alert('Sélectionner des chats');
              }}
              style={styles.dropdownItem}
            >
              <Feather name="check-square" size={18} color="#8b5cf6" style={styles.dropdownIcon} />
              <Text style={styles.dropdownText}>Sélectionner des chats</Text>
            </TouchableOpacity>
            
      
          </View>
        )}
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          placeholder="Rechercher des messages..."
          placeholderTextColor="#6b7280"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Filtres */}
      <View style={styles.filterContainer}>
        <ScrollableFilters 
          activeFilter={activeFilter} 
          setActiveFilter={setActiveFilter} 
        />
      </View>
      
      {/* Filtres avancés (conditionnellement affichés) */}
      {showAdvancedFilters && <AdvancedFilters />}
      
      {/* Liste des conversations */}
      <FlatList
        data={filteredChats} // Use filtered chats instead of direct chats
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        style={styles.chatList}
        contentContainerStyle={filteredChats.length === 0 ? styles.emptyList : null}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Feather name="message-circle" size={60} color="#d1d5db" />
            <Text style={styles.emptyText}>Aucune conversation trouvée</Text>
            <TouchableOpacity 
              style={styles.newChatButton}
              onPress={createNewChat}
            >
              <Text style={styles.newChatButtonText}>Démarrer une conversation</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Modal pour sélectionner un utilisateur */}
      <Modal
        visible={showUserListModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserListModal(false)}
      >
        <View style={styles.modalOverlay}>
          {/* on passe height à 80% pour être sûr qu'il prenne tout */}
          <View style={[styles.modalContainer, { height: '80%' }]}>
            <Text style={styles.modalTitle}>Sélectionnez un utilisateur</Text>
            <FlatList
              data={allUsers}
              keyExtractor={(item) => item.id.toString()}
              // on force le FlatList à remplir son parent
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => {
                    setShowUserListModal(false);
              handleChatSelect({
                id: item.id.toString(),
                name: `${item.nom} ${item.prenom}`,
                avatar: item.imageBase64
                  ? { uri: item.imageBase64 }
                  : require('../../assets/images/confirmation.png'),
                lastMessage: {
                  id: 'new',
                  text: '',
                  sender: 'user',
                  timestamp: new Date(),
                  read: true,
                },
                unreadCount: 0,
                online: false,
              });
            }}
          >
            <Image
              source={
                item.imageBase64
                  ? { uri: item.imageBase64 }
                  : require('../../assets/images/confirmation.png')
              }
              style={styles.userAvatar}
            />
            <View>
              <Text style={styles.userName}>
                {item.nom} {item.prenom}
              </Text>
              <Text style={styles.userRole}>
  {getRoleLabel(item.roles)}
</Text>

            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        onPress={() => setShowUserListModal(false)}
        style={styles.closeButton}
      >
        <Text style={styles.closeButtonText}>Fermer</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>

{selectMode && selectedChats.length > 0 && (
  <View style={styles.bulkActionsContainer}>
    <TouchableOpacity
      style={[styles.bulkActionButton, { backgroundColor: '#8b5cf6' }]}
      onPress={handleBulkArchive}
    >
      <Text style={styles.bulkActionButtonText}>Archiver</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.bulkActionButton, { backgroundColor: '#22c55e' }]}
      onPress={handleBulkMarkAsRead} // <- Nouveau bouton
    >
      <Text style={styles.bulkActionButtonText}>Marquer comme lu</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.bulkActionButton, { backgroundColor: '#dc2626' }]}
      onPress={handleBulkDelete}
    >
      <Text style={styles.bulkActionButtonText}>Supprimer</Text>
    </TouchableOpacity>
  </View>
)}


      <TouchableOpacity
        style={styles.newDiscussionButton}
        onPress={() => setShowUserListModal(true)}
      >
        {/* même action que l'en-tête */}
        <Feather name="plus-circle" size={20} color="white" />
        <Text style={styles.newDiscussionButtonText}>Nouvelle discussion</Text>
      </TouchableOpacity>

 
      
      {/* Indicateur Home */}
      <View style={styles.homeIndicatorContainer}>
        <View style={styles.homeIndicator} />
      </View>
    </SafeAreaView>
    
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#8b5cf6',
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 15,
    position: 'relative',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
    padding: 6,
  },
  menuButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cameraButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 70,
    right: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
    zIndex: 9999,
    minWidth: 240,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '500',
  },
  searchContainer: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 25,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#1f2937',
    fontSize: 16,
  },
  filterContainer: {
    paddingVertical: 5,
    backgroundColor: '#f9fafb',
    marginBottom: 5,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 5,
  },
  filterButtonActive: {
    backgroundColor: '#8b5cf6',
    elevation: 3,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  filterText: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: 14,
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  chatList: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 15,
    marginBottom: 20,
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
  },
  
  newChatButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  newChatButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    borderWidth: 2,
    borderColor: '#f3f4f6',
    backgroundColor: '#e5e7eb',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: 'white',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  favoriteName: {
    color: '#8b5cf6',
  },
  selectedName: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
  favoriteIcon: {
    color: '#8b5cf6',
  },
  chatTime: {
    color: '#6b7280',
    fontSize: 13,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentIndicator: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '500',
    marginRight: 3,
  },
  messageIcon: {
    marginRight: 5,
  },
  lastMessage: {
    color: '#6b7280',
    fontSize: 14,
    flex: 1,
  },
  unreadMessage: {
    color: '#1f2937',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 80,
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#8b5cf6',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  homeIndicatorContainer: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 8,
    alignItems: 'center',
  },
  homeIndicator: {
    width: 100,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 2.5,
  },
  debugButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'center',
    marginVertical: 8,
  },
  debugButtonText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navItemActive: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  navText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  navTextActive: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  badgeContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#22c55e',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  newDiscussionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  newDiscussionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userRole: {
    fontSize: 12,
    color: '#6b7280',
  },
  closeButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  // Dans votre StyleSheet

advancedFiltersContainer: {
  backgroundColor: 'white',
  padding: 15,
  marginHorizontal: 15,
  borderRadius: 10,
  marginTop: 5,
  elevation: 2,
},

filterSectionTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#4b5563',
  marginBottom: 10,
},

filterRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 10,
},

filterOption: {
  paddingVertical: 8,
  paddingHorizontal: 15,
  borderRadius: 20,
  backgroundColor: '#f3f4f6',
},

filterOptionActive: {
  backgroundColor: '#8b5cf6',
},
sheetBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'flex-end',
},
actionSheet: {
  backgroundColor: '#fff',
  paddingVertical: 8,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  paddingBottom: 20,
},
sheetTitle: {
  textAlign: 'center',
  fontSize: 16,
  fontWeight: '600',
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#f3f4f6',
  color: '#111827',
},
sheetItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  paddingHorizontal: 22,
},
sheetIcon: { marginRight: 14 },
sheetText: { fontSize: 15, color: '#374151' },


filterOptionText: {
  color: '#4b5563',
  fontSize: 14,
},

filterOptionTextActive: {
  color: 'white',
},

filterToggleButton: {
  padding: 8,
  marginLeft: 5,
},
/* ------------------------------------------------------------------ */
/* 1. Ligne « ⋯ » dans chaque chat                                    */
/* ------------------------------------------------------------------ */
headerRight: {
  flexDirection: 'row',
  alignItems: 'center',
},
moreButton: {
  padding: 6,
  marginLeft: 4,
},

/* ------------------------------------------------------------------ */
/* 2. Bottom-sheet d’actions                                          */
/* ------------------------------------------------------------------ */
bulkActionsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  backgroundColor: '#fff',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderTopWidth: 1,
  borderTopColor: '#e5e7eb',
},

bulkActionButton: {
  flex: 1,
  marginHorizontal: 5,
  borderRadius: 25,
  paddingVertical: 12,
  justifyContent: 'center',
  alignItems: 'center',
},

bulkActionButtonText: {
  color: 'white',
  fontWeight: '600',
  fontSize: 15,
},

});

export default MyMessenger;