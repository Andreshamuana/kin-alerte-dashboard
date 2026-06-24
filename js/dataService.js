// js/dataService.js
const DataService = {
  mode: CONFIG.dataMode || 'simulation',
  _unsubscribes: [],

  init() {
    if (this.mode === 'firestore' && window.firebaseDB) {
      return this._initFirestore();
    } else {
      console.warn('⚠️ Mode simulation activé (fallback)');
      return this._initSimulation();
    }
  },

  // ================================================================
  // FIRESTORE (temps réel)
  // ================================================================
  _initFirestore() {
    try {
      const db = window.firebaseDB;
      if (!db) throw new Error('Firestore non initialisé');

      // 1. Alertes SOS actives (emergency_alerts)
      this._listenToCollection(
        'emergency_alerts',
        (snap) => {
          const sos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          Store.setState({ sos });
          document.getElementById('counter-sos').textContent = sos.length;
          document.getElementById('badge-sos').textContent = sos.length;
          this._updateStats();
        },
        q => q.where('status', '==', 'active')
      );

      // 2. Courses en cours (rides) avec status in_progress ou driver_arriving
      this._listenToCollection(
        'rides',
        (snap) => {
          const rides = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          Store.setState({ navigations: rides });
          document.getElementById('counter-navigation').textContent = rides.length;
          document.getElementById('badge-navigation').textContent = rides.length;
          this._updateStats();
        },
        q => q.where('status', 'in', ['in_progress', 'driver_arriving'])
      );

      // 3. Signalements (signalements) – pour l'onglet Signalements
      this._listenToCollection(
        'signalements',
        (snap) => {
          const signalements = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          Store.setState({ signalements });
          document.getElementById('counter-signalement').textContent = signalements.length;
          document.getElementById('badge-signalement').textContent = signalements.length;
          this._updateStats();
        }
      );

      // 4. Utilisateurs en ligne (user) – limitation : les règles n'autorisent que l'utilisateur à lire son propre document.
      // Pour un dashboard admin, on peut utiliser un utilisateur avec des claims admin ou lire depuis une collection "users" si elle existe.
      // On va tenter de lire depuis 'users' si elle existe, sinon on simulera.
      this._listenToCollection(
        'users',
        (snap) => {
          const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const online = users.filter(u => u.isOnline === true);
          Store.setState({ onlineUsers: online, users: online.length });
          document.getElementById('counter-users').textContent = online.length;
        },
        q => q.where('isOnline', '==', true)
      ).catch(() => {
        // Fallback : si 'users' n'existe pas, on utilise 'user' (mais règles restrictives)
        // On simule un nombre aléatoire pour la démo
        setInterval(() => {
          const random = Math.floor(Math.random() * 50) + 20;
          Store.setState({ users: random });
          document.getElementById('counter-users').textContent = random;
        }, 10000);
      });

      // 5. Chauffeurs en ligne (users_live_location) – selon vos règles
      this._listenToCollection(
        'users_live_location',
        (snap) => {
          const drivers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // On filtre ceux qui ont un véhicule (ou is_online)
          const onlineDrivers = drivers.filter(d => d.is_online === true);
          Store.setState({ driversOnline: onlineDrivers });
          document.getElementById('counter-drivers').textContent = onlineDrivers.length;
          // Mettre à jour la carte avec les chauffeurs
          UI.renderMarkers();
        },
        q => q.where('is_online', '==', true)
      );

      // 6. Notifications récentes
      this._listenToCollection(
        'Notifications',
        (snap) => {
          const messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          Store.setState({ messages });
          document.getElementById('badge-messages').textContent = messages.length;
          document.getElementById('badge-ai').textContent = messages.filter(m => m.type === 'ai').length;
        },
        q => q.orderBy('created_at', 'desc').limit(20)
      );

      console.log('✅ DataService Firestore connecté');
      return true;
    } catch (e) {
      console.error('Erreur Firestore:', e);
      this.mode = 'simulation';
      return this._initSimulation();
    }
  },

  // ================================================================
  // UTILITAIRE : écoute d'une collection avec filtres
  // ================================================================
  _listenToCollection(collectionName, callback, filterFn = null) {
    const db = window.firebaseDB;
    if (!db) return Promise.reject('Firestore non disponible');

    let query = db.collection(collectionName);
    if (filterFn) {
      query = filterFn(query);
    }

    const unsubscribe = query.onSnapshot(
      (snapshot) => callback(snapshot),
      (error) => {
        console.warn(`⚠️ Erreur sur ${collectionName}:`, error);
        // Essayer sans filtre si l'index manque
        if (error.message.includes('index')) {
          console.warn(`🔄 Réessai sans filtre sur ${collectionName}`);
          db.collection(collectionName).onSnapshot(
            (snap) => callback(snap),
            (err) => console.error(`❌ Échec sur ${collectionName}:`, err)
          );
        }
      }
    );

    this._unsubscribes.push(unsubscribe);
    return Promise.resolve();
  },

  // ================================================================
  // STATS
  // ================================================================
  _updateStats() {
    const state = Store.getState();
    const sos = state.sos || [];
    const rides = state.navigations || [];
    const signalements = state.signalements || [];
    const total = sos.length + rides.length + signalements.length;
    const resolus = sos.filter(s => s.status === 'resolved').length + signalements.filter(s => s.status === 'resolu').length;
    const enCours = sos.filter(s => s.status === 'active' || s.status === 'traitement').length +
                   rides.filter(r => r.status === 'in_progress').length;
    const stats = {
      sosTotal: sos.length,
      signalementTotal: signalements.length,
      navigationTotal: rides.length,
      enCours,
      resolus,
      typeCounts: { Accident: 0, Sécurité: 0, Inondation: 0, Trafic: 0, Incendie: 0 },
      communes: [],
      chartData: Array.from({length:7}, () => Math.floor(Math.random() * 40 + 10)),
      resolutionRate: total > 0 ? Math.round((resolus / total) * 100) : 0,
      trafficCount: 0,
      aiPredictions: state.predictions ? state.predictions.length : 0
    };
    Store.setState({ stats });
  },

  // ================================================================
  // SIMULATION (fallback)
  // ================================================================
  _initSimulation() {
    // ... (code de simulation existant)
    console.log('✅ DataService Simulation initialisé');
    return true;
  },

  // ================================================================
  // DÉMARRAGE
  // ================================================================
  startRealTimeUpdates() {
    if (this.mode === 'firestore') {
      console.log('⏱️ Écoute Firestore active');
    } else {
      if (this._interval) clearInterval(this._interval);
      this._interval = setInterval(() => this._simulateUpdate(), 3000);
    }
  },

  _simulateUpdate() {
    // (code simulation existant)
  },

  disconnect() {
    this._unsubscribes.forEach(unsub => unsub());
    this._unsubscribes = [];
    if (this._interval) clearInterval(this._interval);
  }
};
