// js/store.js
const Store = {
  state: {
    sos: [],
    signalements: [],
    navigations: [],
    messages: [],
    driversOnline: [],
    onlineUsers: [],
    users: 0,
    activeTab: 'sos',
    searchQuery: '',
    activeFilters: [],
    statusFilter: 'all',
    mapFilters: { sos: true, signalement: true, navigation: true, risk: false, traffic: false, heat: false, ai: false },
    drawerData: null,
    drawerOpen: false,
    loading: true,
    predictions: [],
    stats: {
      sosTotal: 0,
      signalementTotal: 0,
      navigationTotal: 0,
      enCours: 0,
      resolus: 0,
      typeCounts: { Accident: 0, Sécurité: 0, Inondation: 0, Trafic: 0, Incendie: 0 },
      communes: [],
      chartData: [0,0,0,0,0,0,0],
      resolutionRate: 0,
      trafficCount: 0,
      aiPredictions: 0
    },
    riskZones: [],
    traffic: [],
    heatmapData: [],
    notifications: [],
    settings: {
      username: 'Opérateur Central',
      email: 'operateur@kin-alerte.com',
      role: 'supervisor',
      notifEmail: true,
      notifPush: true,
      notifSMS: false,
      slackWebhook: '',
      theme: 'dark',
      fontSize: 'medium',
      mapType: 'osm',
      mapRiskDefault: true
    }
  },
  listeners: [],

  subscribe(fn) {
    this.listeners.push(fn);
    fn(this.state);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  },

  notify() {
    this.listeners.forEach(fn => { try { fn(this.state); } catch(e) { console.error(e); } });
  },

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
    try { sessionStorage.setItem('kin-alerte-state', JSON.stringify(this.state)); } catch(e) {}
  },

  getState() { return this.state; },

  updateItem(collection, id, updates) {
    const items = this.state[collection] || [];
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return;
    const updated = [...items];
    updated[index] = { ...updated[index], ...updates };
    this.setState({ [collection]: updated });
  },

  addItem(collection, item) {
    const items = this.state[collection] || [];
    this.setState({ [collection]: [...items, item] });
  },

  removeItem(collection, id) {
    const items = this.state[collection] || [];
    this.setState({ [collection]: items.filter(item => item.id !== id) });
  },

  addMessage(message) {
    const messages = this.state.messages || [];
    this.setState({ messages: [message, ...messages].slice(0, 100) });
    const chatHistory = this.state.chatHistory || {};
    const userId = message.user || 'unknown';
    if (!chatHistory[userId]) chatHistory[userId] = [];
    chatHistory[userId].push(message);
    this.setState({ chatHistory });
  },

  addNotification(notification) {
    const notifications = this.state.notifications || [];
    this.setState({ notifications: [notification, ...notifications] });
    const badge = document.getElementById('notification-badge');
    if (badge) badge.textContent = notifications.filter(n => !n.read).length;
  },

  restore() {
    try {
      const saved = sessionStorage.getItem('kin-alerte-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = { ...this.state, ...parsed };
        this.notify();
        return true;
      }
    } catch(e) {}
    return false;
  }
};
