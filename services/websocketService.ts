import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

type Callback = (msg: any) => void;

class WebSocketService {
  private static instance: WebSocketService;
  private stompClient: Client | null = null;
  private connected = false;
  private userId: string | null = null;
  private sendQueue: { destination: string; payload: any }[] = [];
  private subscriptions: Map<string, StompSubscription> = new Map();

  private constructor() {
    console.log('🛠 WebSocketService initialized (React Native)');
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public setUserId(userId: string | number) {
    this.userId = userId.toString();
  }

  public connect(): Promise<void> {
    if (this.connected) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.stompClient = new Client({
        webSocketFactory: () => new SockJS('http://localhost:8080/ws/websocket'),
        connectHeaders: { userId: this.userId ?? '' },
        reconnectDelay: 5000,
        debug: (str) => console.log('[🧩 STOMP DEBUG]', str),

        onConnect: (frame) => {
          console.log('✅ Connected to STOMP:', frame.headers);
          this.connected = true;
          this.flushQueue();
          resolve();
        },

        onStompError: (frame) => {
          console.error('❌ STOMP error:', frame);
          reject();
        },

        onWebSocketError: (evt) => {
          console.error('❌ WebSocket error:', evt);
          reject();
        },

        onDisconnect: () => {
          this.connected = false;
          console.warn('⚠️ STOMP Disconnected');
        }
      });

      this.stompClient.activate();
    });
  }

  public subscribe(topic: string, callback: Callback): void {
    if (!this.stompClient || !this.connected) {
      console.warn(`⚠️ STOMP not connected. Cannot subscribe to ${topic}`);
      return;
    }

    if (this.subscriptions.has(topic)) {
      console.warn(`⚠️ Already subscribed to ${topic}`);
      return;
    }

    const sub = this.stompClient.subscribe(topic, (message: IMessage) => {
      const parsed = JSON.parse(message.body);
      console.log(`📥 Received on ${topic}:`, parsed);
      callback(parsed);
    });

    this.subscriptions.set(topic, sub);
    console.log(`🔔 Subscribed to ${topic}`);
  }

  public subscribeToUserQueue(callback: Callback): void {
    const topic = '/user/queue/messages';

    if (!this.stompClient || !this.connected) return;
    if (this.subscriptions.has(topic)) {
      console.warn(`⚠️ Already subscribed to ${topic}`);
      return;
    }

    const sub = this.stompClient.subscribe(topic, (message: IMessage) => {
      const parsed = JSON.parse(message.body);
      console.log('📥 Received message:', parsed);
      callback(parsed);
    });

    this.subscriptions.set(topic, sub);
    console.log(`🔔 Subscribed to ${topic}`);
  }

  // MODIFICATION: Nouvelle méthode pour s'abonner à un room
  public joinRoom(roomId: string, callback: Callback): void {
    if (!this.stompClient || !this.connected) {
      console.warn(`⚠️ STOMP not connected. Cannot join room ${roomId}`);
      return;
    }

    const topic = `/topic/room/${roomId}`;
    
    // Vérifier si on est déjà abonné
    if (this.subscriptions.has(topic)) {
      console.warn(`⚠️ Already subscribed to room ${roomId}`);
      return;
    }

    const sub = this.stompClient.subscribe(topic, (message: IMessage) => {
      try {
        const parsed = JSON.parse(message.body);
        console.log(`📩 Room ${roomId} message:`, parsed);
        callback(parsed);
      } catch (error) {
        console.error('❌ Error parsing room message:', error);
      }
    });

    this.subscriptions.set(topic, sub);
    console.log(`🏠 Joined room: ${roomId}`);
  }

  // MODIFICATION: Nouvelle méthode pour quitter un room spécifique
  public leaveRoom(roomId: string): void {
    const topic = `/topic/room/${roomId}`;
    const subscription = this.subscriptions.get(topic);
    
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(topic);
      console.log(`🚪 Left room: ${roomId}`);
    }
  }

  // MODIFICATION: Nouvelle méthode pour quitter tous les rooms
  public leaveAllRooms(): void {
    const roomTopics = Array.from(this.subscriptions.keys()).filter(topic => 
      topic.startsWith('/topic/room/')
    );
    
    roomTopics.forEach(topic => {
      const subscription = this.subscriptions.get(topic);
      if (subscription) {
        subscription.unsubscribe();
        this.subscriptions.delete(topic);
      }
    });
    
    console.log(`🚪 Left ${roomTopics.length} rooms`);
  }

  public sendMessage(destination: string, payload: any): void {
    if (!this.connected || !this.stompClient) {
      console.warn('⏳ STOMP not connected. Queuing message...', payload);
      this.sendQueue.push({ destination, payload });
      return;
    }

    this.stompClient.publish({
      destination,
      body: JSON.stringify(payload),
      headers: { userId: this.userId ?? '' }
    });

    console.log(`📤 Message sent to ${destination}`, payload);
  }

  public sendMessageToRoom(roomId: string, messageDto: { senderId: number; content: string }): void {
    const destination = `/app/room/${roomId}/send`;
    this.sendMessage(destination, messageDto);
  }

  private flushQueue(): void {
    while (this.sendQueue.length > 0) {
      const { destination, payload } = this.sendQueue.shift()!;
      this.sendMessage(destination, payload);
    }
  }

  public disconnect(): void {
    if (this.stompClient && this.stompClient.active) {
      console.log('🚪 Disconnecting WebSocket...');
      this.subscriptions.forEach((sub) => sub.unsubscribe());
      this.subscriptions.clear();
      this.stompClient.deactivate();
      this.connected = false;
    }
  }

  // AJOUT: Méthode pour obtenir le statut de connexion
  public isConnected(): boolean {
    return this.connected;
  }

  // AJOUT: Méthode pour obtenir les abonnements actifs
  public getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

export default WebSocketService.getInstance();