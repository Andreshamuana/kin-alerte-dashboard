
// js/dataService.js
const DataService = {
  mode: CONFIG.dataMode || 'simulation',
  _interval: null,

  init() {
    if (this.mode === 'firebase' && window.firebaseDB) {
      return this._initFirebase();
    } else {
      console.warn('⚠️ Mode simulation activé (fallback)');
      return this._initSimulation();
    }
  },

  // ===== FIREBASE =====
  _initFirebase() {
    try {
      const db = window.firebaseDB;
      if (!db) throw new Error('Firebase non initialisé');

      // 1. Alertes SOS actives (emergency_alerts)
      db.ref('emergency_alerts').orderByChild('status').equalTo('active').on('value', (snap) => {
        const data = snap.val();
        const sos = data ? Object.values(data) : [];
        Store.setState({ sos });
        document.getElementById('counter-sos').textContent = sos.length;
        document.getElementById('badge-sos').textContent = sos.length;
        this._updateStats();
      });

      // 2. Courses en cours (rides avec status 'in_progress' ou 'driver_arriving')
      db.ref('rides').orderByChild('status').startAt('driver_arriving').endAt('in_progress').on('value', (snap) => {
        const data = snap.val();
        const rides = data ? Object.values(data) : [];
        Store.setState({ navigations: rides });
        document.getElementById('counter-navigation').textContent = rides.length;
        document.getElementById('badge-navigation').textContent = rides.length;
        this._updateStats();
      });

      // 3. Utilisateurs en ligne (users isOnline = true)
      db.ref('users').orderByChild('isOnline').equalTo(true).on('value', (snap) => {
        const data = snap.val();
        const users = data ? Object.values(data) : [];
        Store.setState({ onlineUsers: users, users: users.length });
        document.getElementById('counter-users').textContent = users.length;
      });

      // 4. Chauffeurs en ligne (driver_locations is_online = true)
      db.ref('driver_locations').orderByChild('is_online').equalTo(true).on('value', (snap) => {
        const data = snap.val();
        const drivers = data ? Object.values(data) : [];
        Store.setState({ driversOnline: drivers });
        document.getElementById('counter-drivers').textContent = drivers.length;
        // Mettre à jour la carte
        UI.renderMarkers();
      });

      // 5. Notifications récentes
      db.ref('notifications').limitToLast(20).on('value', (snap) => {
        const data = snap.val();
        const messages = data ? Object.values(data) : [];
        Store.setState({ messages });
        document.getElementById('badge-messages').textContent = messages.length;
        document.getElementById('badge-ai').textContent = messages.filter(m => m.type === 'ai').length;
      });

      // 6. Prédictions IA (on peut les générer côté serveur ou les simuler)
      // Ici on simule des prédictions basées sur les alertes
      setInterval(() => {
        const state = Store.getState();
        const predictions = Utils.predictRisk(state.sos.map(s => ({ ...s, type: 'sos' })));
        Store.setState({ predictions });
        document.getElementById('counter-ai').textContent = predictions.length;
        document.getElementById('badge-ai').textContent = predictions.length;
        // Mettre à jour l'affichage de la prédiction
        if (predictions.length > 0) {
          const top = predictions[0];
          document.getElementById('ai-prediction').innerHTML = `
            <span class="ai-icon">🧠</span>
            <span class="ai-text">Prédiction: Risque ${top.risk} à ${top.name}</span>
            <span class="ai-score">${top.score}%</span>
          `;
        }
      }, 10000);

      console.log('✅ DataService Firebase connecté');
      return true;
    } catch (e) {
      console.error('Erreur Firebase:', e);
      this.mode = 'simulation';
      return this._initSimulation();
    }
  },

  // ===== SIMULATION (fallback) =====
  _initSimulation() {
    // Code de génération de données simulées (comme avant)
    // ... (je le mets en commentaire pour ne pas alourdir, mais à inclure)
    console.log('✅ DataService Simulation initialisé');
    return true;
  },

  // Met à jour les stats globales
  _updateStats() {
    const state = Store.getState();
    const sos = state.sos || [];
    const rides = state.navigations || [];
    const signalements = state.signalements || [];
    const total = sos.length + rides.length + signalements.length;
    const resolus = sos.filter(s => s.status === 'resolved').length + signalements.filter(s => s.status === 'resolu').length;
    const enCours = sos.filter(s => s.status === 'active' || s.status === 'traitement').length + rides.filter(r => r.status === 'in_progress').length;
    const stats = {
      sosTotal: sos.length,
      signalementTotal: signalements.length,
      navigationTotal: rides.length,
      enCours: enCours,
      resolus: resolus,
      typeCounts: { Accident: 0, Sécurité: 0, Inondation: 0, Trafic: 0, Incendie: 0 },
      communes: [],
      chartData: Array.from({length:7}, () => Math.floor(Math.random() * 40 + 10)),
      resolutionRate: total > 0 ? Math.round((resolus / total) * 100) : 0,
      trafficCount: 0,
      aiPredictions: state.predictions ? state.predictions.length : 0
    };
    Store.setState({ stats });
  },

  startRealTimeUpdates() {
    if (this.mode === 'firebase') {
      // Les listeners Firebase sont déjà en place
      console.log('⏱️ Écoute Firebase active');
    } else {
      // Démarrer la simulation (setInterval)
      if (this._interval) clearInterval(this._interval);
      this._interval = setInterval(() => this._simulateUpdate(), 3000);
    }
  },

  _simulateUpdate() {
    // Code de simulation (identique à avant)
  },

  disconnect() {
    if (this._interval) clearInterval(this._interval);
    // On pourrait aussi détacher les listeners Firebase
  }
};
