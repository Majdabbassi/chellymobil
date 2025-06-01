import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as messageService from '@/services/messageService';
import { getUserById } from '@/services/UserService';

interface Message {
  id: string;
  sender: 'user' | 'contact';
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
}

interface Contact {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  lastSeen: string;
  email?: string;
  telephone?: string;
  sexe?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  dateNaissance?: string;
  role?: string;
}

/** Transforme l'image stockée en base64 (camelCase ou snake_case)
 *  en uri utilisable par <Image />. Retourne undefined si rien. */
const getBase64Uri = (user?: any): string | undefined => {
  if (!user) return undefined;
  const raw = user.imageBase64 || user.image_base64;
  if (!raw) return undefined;
  return raw.startsWith('data:image') ? raw : `data:image/jpeg;base64,${raw}`;
};

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [contact, setContact] = useState<Contact | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showHeaderOptions, setShowHeaderOptions] = useState(false);
  const handleDeleteConversation = () => {
    Alert.alert(
      'Supprimer la discussion',
      'Es-tu sûr de vouloir supprimer cette conversation ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (!currentUser || !contact) return;
              await messageService.deleteConversation(currentUser.id, parseInt(contact.id));
              Alert.alert('Succès', 'Conversation supprimée.');
              router.back(); // Retourne à la liste
            } catch (error) {
              console.error('Erreur suppression conversation', error);
              Alert.alert('Erreur', 'Impossible de supprimer la conversation.');
            }
          }
        },
      ]
    );
  };
  
  // Fetch messages and user data
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
  
      try {
        // 1) Load current user
        const userData = await AsyncStorage.getItem('parent');
        if (!userData) {
          console.error('No user data found');
          setLoading(false);
          return;
        }
        
        const user = JSON.parse(userData);
        setCurrentUser(user);
        
        // 2) Get conversation history
        const contactId = id?.toString() ?? '';
        if (!contactId) {
          console.error('No contact ID provided');
          setLoading(false);
          return;
        }
        
        // Use user.id and contactId for the conversation
        const fetchedMessages = await messageService.getConversation(
          user.id.toString(),
          contactId
        );
  
        // 3) Format messages for FlatList
        const formatted = fetchedMessages.map((msg: any) => {
          const isUser = msg.sender.id.toString() === user.id.toString();
          const sender = isUser ? msg.sender : msg.sender;
  
          return {
            id: msg.id.toString(),
            sender: isUser ? 'user' : 'contact',
            text: msg.content,
            timestamp: msg.timestamp,
            status: msg.seen ? 'read' : 'delivered',
            senderName: `${sender.nom} ${sender.prenom}`,
            senderAvatar: getBase64Uri(sender) || 'https://randomuser.me/api/portraits/men/1.jpg',
            senderId: sender.id.toString(),
          };
        });
  
        setMessages(formatted);
  
        /* ------------------------------------------------------------------
           4) Define the contact displayed in the header
           ------------------------------------------------------------------*/
  
           if (fetchedMessages.length > 0) {
            const firstMsg = fetchedMessages[0];
            const contactRaw = firstMsg.sender.id.toString() === user.id.toString()
              ? firstMsg.receiver
              : firstMsg.sender;
          
            // Extraction correcte du rôle
            let contactRole = 'Non renseigné';
            if (contactRaw.roles && Array.isArray(contactRaw.roles) && contactRaw.roles.length > 0) {
              // ⚡ Correction ici :
              const firstRole = contactRaw.roles[0];
              contactRole = typeof firstRole === 'string' ? firstRole : firstRole.nom || firstRole.name || 'Non renseigné';
            }
          
            setContact({
              id: contactRaw.id.toString(),
              name: `${contactRaw.nom} ${contactRaw.prenom}`,
              avatar: getBase64Uri(contactRaw) || 'https://randomuser.me/api/portraits/men/1.jpg',
              online: false,
              lastSeen: '',
              email: contactRaw.email,
              telephone: contactRaw.telephone,
              role: contactRole,
            });
            console.log("📨 Contact récupéré depuis conversation:", contactRaw);
          
          } else {
            // No messages: new conversation → call getUserById
            const userInfo = await getUserById(parseInt(contactId));
            if (userInfo) {
              // Extraction correcte du rôle pour getUserById
              let contactRole = 'Non renseigné';
              if (userInfo.roles && Array.isArray(userInfo.roles) && userInfo.roles.length > 0) {
                // ⚡ Correction ici aussi :
                const firstRole = userInfo.roles[0];
                contactRole = typeof firstRole === 'string' ? firstRole : firstRole.nom || firstRole.name || 'Non renseigné';
              }
          
              setContact({
                id: userInfo.id.toString(),
                name: `${userInfo.nom} ${userInfo.prenom}`,
                avatar: getBase64Uri(userInfo) || 'https://randomuser.me/api/portraits/men/1.jpg',
                online: false,
                lastSeen: '',
                email: userInfo.email,
                telephone: userInfo.telephone,
                role: contactRole,
              });
              console.log("📨 Contact récupéré depuis getUserById:", userInfo);
            }
          }
          
      } catch (err) {
        console.error('Error loading conversation:', err);
        Alert.alert('Erreur', 'Impossible de charger la conversation');
      } finally {
        setLoading(false);
      }
    };
  
    fetchMessages();
  }, [id]);

  const sendMessage = async () => {
    if (newMessage.trim() === '' || !currentUser || !contact) return;
    
    setSending(true);
    
    // Optimistic update for UI responsiveness
    const tempMsgId = Date.now().toString();
    const newMsg: Message = {
      id: tempMsgId,
      sender: 'user',
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      status: 'sent',
      senderId: currentUser.id.toString(),
      senderName: `${currentUser.nom} ${currentUser.prenom}`,
      senderAvatar: getBase64Uri(currentUser) || 'https://randomuser.me/api/portraits/men/1.jpg'
    };
   
    setMessages([...messages, newMsg]);
    setNewMessage('');

    try {
      // Ensure we're sending IDs as numbers to match backend expectations
      const messageData = {
        sender: { id: parseInt(currentUser.id) },
        receiver: { id: parseInt(contact.id) },
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        seen: false
      };

      console.log("📤 Sending message data:", JSON.stringify(messageData));
      
      const response = await messageService.sendMessage(messageData);
      console.log("✅ Message sent successfully:", response);
      
      // Update the message with the actual ID from server
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === tempMsgId 
            ? {...msg, id: response.id.toString(), status: 'delivered'} 
            : msg
        )
      );
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      } else if (error.request) {
        console.error('Request made but no response:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      // Remove the optimistic message
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempMsgId));
      
      Alert.alert(
        'Erreur d\'envoi', 
        'Impossible d\'envoyer le message. Veuillez réessayer.'
      );
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
   
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return timestamp;
    }
   
    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
   
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' }) +
             ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderMessageItem = ({ item, index }: { item: Message, index: number }) => {
    const isUser = item.sender === 'user';
    const showAvatar = !isUser && (index === 0 || messages[index - 1].sender !== 'contact');
    const isPreviousSameSender = index > 0 && messages[index - 1].sender === item.sender;
    const isNextSameSender = index < messages.length - 1 && messages[index + 1].sender === item.sender;
   
    // Determine bubble corner style
    let bubbleStyle = isUser ? styles.userBubble : styles.contactBubble;
    if (!isPreviousSameSender && isNextSameSender) {
      bubbleStyle = {...bubbleStyle, ...(isUser ? styles.userFirstBubble : styles.contactFirstBubble)};
    } else if (isPreviousSameSender && !isNextSameSender) {
      bubbleStyle = {...bubbleStyle, ...(isUser ? styles.userLastBubble : styles.contactLastBubble)};
    } else if (!isPreviousSameSender && !isNextSameSender) {
      bubbleStyle = {...bubbleStyle, ...(isUser ? styles.userSingleBubble : styles.contactSingleBubble)};
    } else {
      bubbleStyle = {...bubbleStyle, ...(isUser ? styles.userMiddleBubble : styles.contactMiddleBubble)};
    }

    return (
      
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.contactRow]}>
        {showAvatar && contact && (
          <Image 
            source={{ uri: item.senderAvatar || contact.avatar }} 
            style={styles.avatar} 
          />
        )}
        {!showAvatar && !isUser && <View style={styles.avatarSpace} />}
        
        <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : {}]}>
          
          {/* Sender name */}
          {!isUser && (!isPreviousSameSender || index === 0) && (
            <Text style={styles.senderName}>
              {item.senderName}
            </Text>
          )}
    
          <View style={[styles.messageBubble, bubbleStyle]}>
            <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.contactMessageText]}>
              {item.text}
            </Text>
          </View>
          
          {(!isNextSameSender || index === messages.length - 1) && (
            <View style={[styles.timestampContainer, isUser ? styles.userTimestamp : styles.contactTimestamp]}>
              <Text style={styles.timestamp}>
                {formatTimestamp(item.timestamp)}
              </Text>
              {isUser && (
                <Ionicons name={item.status === 'read' ? "checkmark-done" : "checkmark"} size={14} color="#6B7280" style={styles.statusIcon} />
              )}
            </View>
          )}
        </View>
      </View>
    );
    
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
<TouchableOpacity style={styles.backButton} onPress={() => router.push('/messagess')}>
        <Ionicons name="chevron-back" size={24} color="#374151" />
      </TouchableOpacity>
     
      {contact && (
        <TouchableOpacity style={styles.contactInfo} onPress={() => {}}>
          <Image 
            source={{ uri: contact.avatar }} 
            style={styles.contactAvatar}
          />
          <View>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactStatus}>
              {contact.online ? 'En ligne' : 'Vu dernièrement à ' + contact.lastSeen}
            </Text>
          </View>
        </TouchableOpacity>
      )}
     
      <View style={styles.headerActions}>
        {/* Seul le bouton trois-points reste */}
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => setShowHeaderOptions(true)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#374151" />
        </TouchableOpacity>
      </View>
    </View>
  );
  

  const renderDay = (timestamp: string) => {
    if (!timestamp) return null;
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
   
    let dayText;
    if (date.toDateString() === today.toDateString()) {
      dayText = "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      dayText = "Hier";
    } else {
      dayText = date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
    }
   
    return (
      <View style={styles.dayContainer}>
        <Text style={styles.dayText}>{dayText}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
     
      {renderHeader()}
     
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Chargement des messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.flatListContent}
            ListHeaderComponent={() => messages.length > 0 ? renderDay(messages[0].timestamp) : null}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Aucun message. Commencez la conversation !</Text>
              </View>
            )}
            onContentSizeChange={() => {
              if (flatListRef.current && messages.length > 0) {
                flatListRef.current.scrollToEnd({ animated: false });
              }
            }}
            onLayout={() => {
              if (flatListRef.current && messages.length > 0) {
                flatListRef.current.scrollToEnd({ animated: false });
              }
            }}
          />
        )}
       
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add-circle-outline" size={24} color="#6B7280" />
          </TouchableOpacity>
         
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Message..."
              multiline
              maxLength={500}
              editable={!sending}
            />
            <TouchableOpacity style={styles.emojiButton}>
              <Ionicons name="happy-outline" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
         
          <TouchableOpacity
            style={[
              styles.sendButton, 
              newMessage.trim().length > 0 ? styles.sendButtonActive : {},
              sending ? styles.sendButtonDisabled : {}
            ]}
            onPress={sendMessage}
            disabled={newMessage.trim().length === 0 || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons 
                name="send" 
                size={18} 
                color={newMessage.trim().length > 0 ? "#FFFFFF" : "#9CA3AF"} 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modal for header options */}
      <Modal
        visible={showHeaderOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHeaderOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlayHeader}
          activeOpacity={1}
          onPressOut={() => setShowHeaderOptions(false)}
        >
          <View style={styles.headerOptionsModal}>
            <TouchableOpacity 
              style={styles.headerOptionItem}
              onPress={() => {
                setShowHeaderOptions(false); // fermer les options
                setShowProfileModal(true);   // ouvrir le modal profil
              }}
            >
              <Text style={styles.headerOptionText}>Voir le profil</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.headerOptionItem}
              onPress={() => {
                handleDeleteConversation();
                setShowHeaderOptions(false);
              }}
            >
              <Text style={[styles.headerOptionText, { color: '#dc2626' }]}>
                Supprimer la discussion
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.headerOptionItem}
              onPress={() => setShowHeaderOptions(false)}
            >
              <Text style={[styles.headerOptionText, { color: '#dc2626' }]}>
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Modal pour afficher le profil */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlayHeader}
          activeOpacity={1}
          onPressOut={() => setShowProfileModal(false)}
        >
          <View style={styles.profileModalContent}>
            {contact && (
              <>
                <Image 
                  source={{ uri: contact.avatar }} 
                  style={styles.profileAvatar}
                />
                <Text style={styles.profileName}>{contact.name}</Text>
                <Text style={styles.profileDetail}>ID : {contact.id}</Text>
                <Text style={styles.profileDetail}>Email : {contact.email || 'Non renseigné'}</Text>
                <Text style={styles.profileDetail}>Téléphone : {contact.telephone || 'Non renseigné'}</Text>
                <Text style={styles.profileDetail}>Rôle : {contact.role || 'Non renseigné'}</Text>

                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowProfileModal(false)}
                >
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Main structure section
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flatListContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
  },
  
  // Header section
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 6,
    borderRadius: 20,
  },
  contactInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactName: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111827',
  },
  contactStatus: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 20,
  },
  
  // Messages section
  messageRow: {
    flexDirection: 'row',
    marginBottom: 2,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  contactRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarSpace: {
    width: 36,
  },
  messageContainer: {
    maxWidth: '75%',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 1,
  },
  userBubble: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
  },
  contactBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  senderName: {
    fontSize: 12, 
    color: '#6B7280', 
    marginLeft: 8, 
    marginBottom: 2
  },
  
  // User bubble styles
  userFirstBubble: {
    borderTopRightRadius: 18,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
  },
  userMiddleBubble: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
    borderTopLeftRadius: 18,
  },
  userLastBubble: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderTopLeftRadius: 18,
  },
  userSingleBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  
  // Contact bubble styles
  contactFirstBubble: {
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
  },
  contactMiddleBubble: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
    borderTopRightRadius: 18,
  },
  contactLastBubble: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopRightRadius: 18,
  },
  contactSingleBubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  
  // Text styles
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  contactMessageText: {
    color: '#1F2937',
  },
  
  // Timestamps & indicators section
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  userTimestamp: {
    justifyContent: 'flex-end',
  },
  contactTimestamp: {
    justifyContent: 'flex-start',
  },
  timestamp: {
    fontSize: 10,
    color: '#6B7280',
  },
  statusIcon: {
    marginLeft: 2,
  },
  
  // Day divider section
  dayContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dayText: {
    fontSize: 12,
    color: '#4B5563',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '500',
  },
  
  // Input bar section
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  attachButton: {
    padding: 8,
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 8,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
    color: '#1F2937',
  },
  emojiButton: {
    padding: 4,
    alignSelf: 'flex-end',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  sendButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  
  // Modal styles
  modalOverlayHeader: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  headerOptionsModal: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginHorizontal: 20,
  },
  headerOptionItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  profileModalContent: {
    backgroundColor: 'white',
    margin: 30,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  
  profileDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  
});