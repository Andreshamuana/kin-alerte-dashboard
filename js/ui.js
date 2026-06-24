// js/ui.js
// ============================================================
// UI – Gestion du rendu et des interactions visuelles
// ============================================================

const UI = {
  map: null,
  markers: {},
  riskLayers: [],
  trafficLayers: [],
  heatLayer: null,
  chart: null,
  _lastFocused: null,

  // ============================================================
  // INITIALISATION
  // ============================================================
  init() {
    this.initMap();
    this.initChart();
    // Horloge
    setInterval(() => {
      const clock = document.getElementById('clock');
      if (clock) {
        clock.textContent = new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    }, 1000);
    console.log('✅ UI initialisée');
  },

  // ============================================================
  // CARTE
  // ============================================================
  initMap() {
    try {
      if (typeof L === 'undefined') {
        document.getElementById('map').innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);flex-direction:column;gap:10px;font-size:14px;">
            <span style="font-size:28px;">🗺️</span>
            <span>Carte non disponible</span>
          </div>`;
        return;
      }
      this.map = L.map('map', {
        center: [-4.3276, 15.3136],
        zoom: 12,
        zoomControl: true,
        fadeAnimation: true,
        zoomAnimation: true
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(this.map);
      // Ajustement après le chargement
      setTimeout(() => this.map?.invalidateSize(), 500);
      console.log('🗺️ Carte initialisée');
    } catch (error) {
      console.error('Erreur initMap:', error);
    }
  },

  // ============================================================
  // GRAPHIQUE ECHARTS
  // ============================================================
  initChart() {
    try {
      const container = document.getElementById('trend-chart');
      if (!container) return;
      this.chart = echarts.init(container, 'dark');
      const option = {
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(17,24,39,0.9)',
          borderColor: '#2D3548',
          textStyle: { color: '#F1F5F9' },
          formatter: (params) => {
            const date = new Date(params[0].axisValue);
            return `<b>${date.toLocaleDateString()}</b><br/>🚨 SOS: ${params[0].value}<br/>⚠️ Signalements: ${params[1].value}`;
          }
        },
        legend: {
          data: ['SOS', 'Signalements'],
          textStyle: { color: '#94A3B8', fontSize: 10 },
          itemWidth: 14,
          itemHeight: 10,
          right: 10,
          top: 0
        },
        grid: { left: 0, right: 0, bottom: 0, top: 30, containLabel: true },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: this._getLast7Days(),
          axisLine: { lineStyle: { color: '#2D3548' } },
          axisLabel: { color: '#64748B', fontSize: 9 }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: 'rgba(45,53,72,0.3)' } },
          axisLabel: { color: '#64748B', fontSize: 9 },
          min: 0
        },
        series: [
          {
            name: 'SOS',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { color: '#EF4444', width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0,0,0,1, [
                { offset: 0, color: 'rgba(239,68,68,0.3)' },
                { offset: 1, color: 'rgba(239,68,68,0)' }
              ])
            },
            data: [12,15,8,22,18,10,6]
          },
          {
            name: 'Signalements',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 4,
            lineStyle: { color: '#F97316', width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0,0,0,1, [
                { offset: 0, color: 'rgba(249,115,22,0.3)' },
                { offset: 1, color: 'rgba(249,115,22,0)' }
              ])
            },
            data: [25,30,22,35,28,20,15]
          }
        ]
      };
      this.chart.setOption(option);
      window.addEventListener('resize', () => this.chart?.resize());
      console.log('📊 Chart initialisé');
    } catch (error) {
      console.error('Erreur initChart:', error);
    }
  },

  _getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0,3));
    }
    return days;
  },

  updateChart(sosData, sigData) {
    if (this.chart) {
      this.chart.setOption({
        series: [
          { data: sosData || [12,15,8,22,18,10,6] },
          { data: sigData || [25,30,22,35,28,20,15] }
        ]
      });
    }
  },

  // ============================================================
  // MARQUEURS DE LA CARTE
  // ============================================================
  createMarker(type, data) {
    try {
      const icons = { sos: '🆘', signalement: '⚠️', navigation: '🧭' };
      const isAI = data.prediction && data.prediction > 70;
      const icon = L.divIcon({
        className: 'custom-marker-container',
        html: `<div class="custom-marker ${type} ${isAI ? 'ai' : ''}" style="${type === 'signalement' ? 'transform:rotate(45deg);' : ''}">
                <span class="marker-icon" style="${type === 'signalement' ? 'transform:rotate(-45deg);display:block;' : ''}">${icons[type] || ''}</span>
                ${isAI ? '<span style="position:absolute;top:-6px;right:-6px;font-size:8px;background:rgba(139,92,246,0.9);border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">!</span>' : ''}
              </div>`,
        iconSize: [30,30],
        iconAnchor: [15,15]
      });

      // Récupérer les coordonnées (différentes selon le type)
      let lat = data.lat || data.location?._latitude || 0;
      let lng = data.lng || data.location?._longitude || 0;
      if (!lat && data.location && typeof data.location === 'object') {
        lat = data.location._latitude || 0;
        lng = data.location._longitude || 0;
      }

      const marker = L.marker([lat, lng], { icon, title: `${type} - ${data.commune || ''}` });

      let popupContent = `<div style="font-family:'Inter',sans-serif;font-size:11px;max-width:220px;"><strong>${type === 'sos' ? '🆘 SOS' : type === 'signalement' ? '⚠️ Signalement' : '🧭 Navigation'}</strong><br>`;
      if (type === 'sos') {
        popupContent += `<b>${Utils.escapeHTML(data.userId || data.user || 'Inconnu')}</b><br>📍 ${Utils.escapeHTML(data.commune || '')}<br>${data.message ? `<i>"${Utils.escapeHTML(data.message)}"</i><br>` : ''}<span class="flux-badge ${Utils.getStatusBadge(data.status)}">${Utils.getStatusText(data.status)}</span>`;
        if (data.phone) popupContent += `<br>📞 ${data.phone}`;
      } else if (type === 'signalement') {
        popupContent += `<b>${Utils.escapeHTML(data.title || '')}</b><br>📍 ${Utils.escapeHTML(data.commune || '')}<br>${data.verified ? '✅ Vérifié' : '⏳ En attente'}<br>👍 ${data.votes || 0} votes`;
      } else {
        popupContent += `<b>${Utils.escapeHTML(data.driverId || data.user || '')}</b><br>🎯 ${Utils.escapeHTML(data.dropoff_address || data.destination || '')}<br>⏱️ ETA ${data.eta || data.eta_trip || 0} min`;
      }
      popupContent += `</div>`;
      marker.bindPopup(popupContent);

      marker.on('click', () => {
        Store.setState({ drawerData: { ...data, type }, drawerOpen: true });
      });

      marker.on('add', () => {
        const el = marker.getElement();
        if (el) {
          el.setAttribute('tabindex', '0');
          el.setAttribute('role', 'button');
          el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              Store.setState({ drawerData: { ...data, type }, drawerOpen: true });
            }
          });
        }
      });

      return marker;
    } catch (error) {
      console.error('Erreur createMarker:', error);
      return null;
    }
  },

  renderMarkers() {
    try {
      if (!this.map) return;
      const state = Store.getState();
      const { mapFilters } = state;

      // Nettoyer les anciens marqueurs
      Object.values(this.markers).forEach(m => {
        if (m && this.map.hasLayer(m)) this.map.removeLayer(m);
      });
      this.markers = {};

      const allItems = [];

      // SOS
      if (mapFilters.sos) {
        state.sos.forEach(s => allItems.push({ ...s, type: 'sos' }));
      }
      // Signalements
      if (mapFilters.signalement) {
        let items = state.signalements;
        if (state.activeFilters.length > 0) {
          items = items.filter(s => state.activeFilters.includes(s.type));
        }
        items.forEach(s => allItems.push({ ...s, type: 'signalement' }));
      }
      // Navigations (courses)
      if (mapFilters.navigation) {
        state.navigations.forEach(n => allItems.push({ ...n, type: 'navigation' }));
      }
      // IA predictions (on les ajoute comme marqueurs spéciaux)
      if (mapFilters.ai) {
        state.predictions.forEach(p => {
          allItems.push({
            id: `ai-${Utils.generateId()}`,
            type: 'ai',
            user: `IA: ${p.name}`,
            commune: p.name,
            lat: -4.3276 + (Math.random() - 0.5) * 0.08,
            lng: 15.3136 + (Math.random() - 0.5) * 0.08,
            status: p.risk === 'high' ? 'urgent' : 'en-attente',
            message: `Risque ${p.risk} (${p.score}%)`,
            prediction: p.score,
            verified: true
          });
        });
      }

      allItems.forEach(item => {
        const marker = this.createMarker(item.type === 'ai' ? 'sos' : item.type, item);
        if (marker) {
          marker.addTo(this.map);
          this.markers[item.id] = marker;
        }
      });

      // Couches supplémentaires
      this.renderRiskZones(state);
      this.renderTraffic(state);
      this.renderHeatmap(state);

    } catch (error) {
      console.error('Erreur renderMarkers:', error);
    }
  },

  renderRiskZones(state) {
    // Nettoyer
    this.riskLayers.forEach(l => {
      if (l && this.map.hasLayer(l)) this.map.removeLayer(l);
    });
    this.riskLayers = [];

    if (!state.mapFilters.risk) return;
    const zones = state.riskZones || [];
    zones.forEach(zone => {
      const color = zone.level === 'high' ? '#EF4444' : zone.level === 'medium' ? '#F59E0B' : '#3B82F6';
      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 2,
        opacity: 0.7,
        className: 'risk-zone-layer'
      });
      const popupContent = `<div style="font-family:'Inter',sans-serif;font-size:11px;">
        <b>${Utils.escapeHTML(zone.name)}</b><br>
        Niveau: ${zone.level === 'high' ? '🔴 Élevé' : zone.level === 'medium' ? '🟠 Moyen' : '🟢 Faible'}<br>
        Rayon: ${zone.radius}m<br>
        🧠 IA: ${zone.prediction}% de risque
      </div>`;
      circle.bindPopup(popupContent);
      circle.addTo(this.map);
      this.riskLayers.push(circle);
    });
  },

  renderTraffic(state) {
    this.trafficLayers.forEach(l => {
      if (l && this.map.hasLayer(l)) this.map.removeLayer(l);
    });
    this.trafficLayers = [];

    if (!state.mapFilters.traffic) return;
    const traffic = state.traffic || [];
    traffic.forEach(t => {
      const color = t.level === 'heavy' ? '#EF4444' : t.level === 'medium' ? '#F59E0B' : '#10B981';
      const polyline = L.polyline([
        [t.from.lat, t.from.lng],
        [t.to.lat, t.to.lng]
      ], {
        color,
        weight: t.level === 'heavy' ? 5 : 3,
        opacity: 0.8,
        dashArray: t.level === 'heavy' ? '6, 4' : null,
        className: 'traffic-line-layer'
      });
      const speedText = t.level === 'heavy' ? '🚗 Lent' : t.level === 'medium' ? '🚗 Normal' : '🚗 Fluide';
      const popupContent = `<div style="font-family:'Inter',sans-serif;font-size:11px;">
        <b>${Utils.escapeHTML(t.name)}</b><br>
        ${speedText} · ${t.speed} km/h<br>
        Congestion: ${t.congestion}%
      </div>`;
      polyline.bindPopup(popupContent);
      polyline.addTo(this.map);
      this.trafficLayers.push(polyline);
    });
  },

  renderHeatmap(state) {
    try {
      if (this.heatLayer && this.map.hasLayer(this.heatLayer)) {
        this.map.removeLayer(this.heatLayer);
        this.heatLayer = null;
      }
      if (!state.mapFilters.heat) return;
      const data = state.heatmapData || [];
      if (data.length === 0 || typeof L.heatLayer === 'undefined') return;
      const heatData = data.map(p => [p.lat, p.lng, p.intensity / 100]);
      this.heatLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: { 0.0: '#00ff00', 0.3: '#ffff00', 0.6: '#ff8800', 1.0: '#ff0000' },
        minOpacity: 0.2
      });
      this.heatLayer.addTo(this.map);
    } catch (error) {
      console.error('Erreur renderHeatmap:', error);
    }
  },

  // ============================================================
  // LISTE DES FLUX (ONGLE)
  // ============================================================
  renderList() {
    try {
      const state = Store.getState();
      const { activeTab, searchQuery, activeFilters, statusFilter } = state;
      const container = document.getElementById('list-container');

      // Onglet Paramètres : on cache la liste et on affiche le panneau
      if (activeTab === 'settings') {
        document.getElementById('search-container').style.display = 'none';
        document.getElementById('filters-container').style.display = 'none';
        document.getElementById('status-filters').style.display = 'none';
        document.getElementById('ai-prediction').style.display = 'none';
        document.getElementById('settings-panel').classList.add('active');
        container.style.display = 'none';
        return;
      } else {
        document.getElementById('search-container').style.display = 'block';
        document.getElementById('filters-container').style.display = (activeTab === 'signalement') ? 'flex' : 'none';
        document.getElementById('status-filters').style.display = (activeTab === 'sos' || activeTab === 'signalement') ? 'flex' : 'none';
        document.getElementById('ai-prediction').style.display = 'block';
        document.getElementById('settings-panel').classList.remove('active');
        container.style.display = 'block';
      }

      if (state.loading) {
        container.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><span>Chargement...</span></div>`;
        return;
      }

      let items = [];
      let type = '';
      let icon = '';
      let iconClass = '';

      switch (activeTab) {
        case 'sos':
          items = state.sos;
          type = 'sos';
          icon = '🆘';
          iconClass = 'sos';
          break;
        case 'signalement':
          items = state.signalements;
          type = 'signalement';
          icon = '⚠️';
          iconClass = 'signalement';
          break;
        case 'navigation':
          items = state.navigations;
          type = 'navigation';
          icon = '🧭';
          iconClass = 'navigation';
          break;
        case 'messages':
          items = state.messages || [];
          type = 'message';
          icon = '💬';
          iconClass = 'message';
          break;
        case 'ai':
          items = state.predictions || [];
          type = 'ai';
          icon = '🧠';
          iconClass = 'ai';
          break;
        default:
          items = [];
      }

      // Recherche
      if (searchQuery) {
        const q = Utils.normalizeString(searchQuery);
        items = items.filter(item => {
          const text = `${item.user || ''} ${item.title || ''} ${item.commune || ''} ${item.rue || ''} ${item.destination || ''} ${item.message || ''} ${item.name || ''}`;
          return Utils.normalizeString(text).includes(q);
        });
      }

      // Filtres de type (signalements)
      if (activeTab === 'signalement' && activeFilters.length > 0) {
        items = items.filter(item => activeFilters.includes(item.type));
      }

      // Filtre de statut
      if (statusFilter !== 'all' && activeTab !== 'messages' && activeTab !== 'navigation' && activeTab !== 'ai') {
        items = items.filter(item => item.status === statusFilter || (statusFilter === 'resolu' && item.resolved));
      }

      if (items.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div>Aucun résultat</div></div>`;
        return;
      }

      container.innerHTML = items.map(item => {
        const timeAgo = Utils.getTimeAgo(item.time || item.created_at || item.timestamp);
        const priority = item.status === 'urgent' ? 'priority-high' :
                         item.status === 'traitement' ? 'priority-medium' : 'priority-low';

        // Extraire les coordonnées pour l'affichage
        const location = item.location || item.pickup_location || {};
        const lat = location._latitude || item.lat || 0;
        const lng = location._longitude || item.lng || 0;

        let html = `
          <div class="flux-card ${priority}" data-id="${Utils.escapeHTML(item.id)}" data-type="${type}" tabindex="0" role="button">
            <div class="status-indicator ${Utils.getStatusBadge(item.status || 'en-attente')}">${Utils.getStatusText(item.status || 'en-attente')}</div>
            <div class="flux-header">
              <div class="flux-icon ${iconClass}">${icon}</div>
              <div class="flux-content">
                <div class="flux-title">
                  ${Utils.escapeHTML(item.user || item.title || item.name || 'Anonyme')}
                  ${item.verified ? '<span class="verified-badge">✓</span>' : ''}
                  ${item.prediction ? `<span style="font-size:8px;color:var(--accent-violet);">🧠 ${item.prediction}%</span>` : ''}
                </div>
                <div class="flux-location">📍 ${Utils.escapeHTML(item.commune || '')}${item.rue ? ` - ${Utils.escapeHTML(item.rue)}` : ''}${item.destination ? ` → ${Utils.escapeHTML(item.destination)}` : ''}${item.dropoff_address ? ` → ${Utils.escapeHTML(item.dropoff_address)}` : ''}${item.name ? ` - ${item.risk}` : ''}</div>
        `;

        if (item.message || item.body) {
          html += `<div class="flux-message">💬 ${Utils.escapeHTML(item.message || item.body)}</div>`;
        }

        html += `
                <div class="flux-meta">
                  <span class="flux-time">⏱️ ${timeAgo}</span>
                  ${item.status ? `<span class="flux-badge ${Utils.getStatusBadge(item.status)}">${Utils.getStatusText(item.status)}</span>` : ''}
                  ${item.verified ? '<span class="flux-badge verified">✓ Vérifié</span>' : ''}
                  ${item.votes ? `<span style="font-size:9px;color:var(--text-tertiary);">👍 ${item.votes}</span>` : ''}
                  ${item.eta ? `<span style="font-size:9px;color:var(--accent-navigation);">⏱️ ETA ${item.eta}min</span>` : ''}
                  ${item.eta_trip ? `<span style="font-size:9px;color:var(--accent-navigation);">⏱️ ETA ${item.eta_trip}min</span>` : ''}
                  ${item.progress ? `<span style="font-size:9px;color:var(--accent-success);">📊 ${item.progress}%</span>` : ''}
                  ${item.score ? `<span style="font-size:9px;color:var(--accent-violet);">🧠 ${item.score}%</span>` : ''}
                </div>
              </div>
            </div>
        `;

        // Actions selon le type
        if (type === 'sos') {
          html += `
            <div class="flux-actions">
              ${item.status !== 'traitement' && item.status !== 'resolu' ?
                `<button class="flux-btn primary" data-action="handle" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-clock"></i></button>` : ''}
              ${!item.resolved ?
                `<button class="flux-btn success" data-action="resolve" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-check"></i></button>` : ''}
              <button class="flux-btn warning" data-action="call" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-phone"></i></button>
              <button class="flux-btn" data-action="message" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-comment"></i></button>
              ${item.prediction ? `<button class="flux-btn" style="border-color:var(--accent-violet);color:var(--accent-violet);" data-action="ai-detail" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-brain"></i></button>` : ''}
            </div>
          `;
        } else if (type === 'signalement') {
          html += `
            <div class="flux-actions">
              ${!item.verified ?
                `<button class="flux-btn primary" data-action="verify" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-check-circle"></i></button>` : ''}
              <button class="flux-btn" data-action="detail" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-info-circle"></i></button>
            </div>
          `;
        } else if (type === 'navigation') {
          html += `
            <div class="flux-actions">
              <button class="flux-btn primary" data-action="track" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-location-dot"></i></button>
              <button class="flux-btn" data-action="route-detail" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-route"></i></button>
            </div>
          `;
        } else if (type === 'message') {
          html += `
            <div class="flux-actions">
              <button class="flux-btn primary" data-action="reply" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-reply"></i></button>
              <button class="flux-btn" data-action="mark-read" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-envelope-open"></i></button>
            </div>
          `;
        } else if (type === 'ai') {
          html += `
            <div class="flux-actions">
              <button class="flux-btn" style="border-color:var(--accent-violet);color:var(--accent-violet);" data-action="ai-detail" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-brain"></i> Détails</button>
              <button class="flux-btn primary" data-action="ai-alert" data-id="${Utils.escapeHTML(item.id)}"><i class="fas fa-bell"></i> Alerter</button>
            </div>
          `;
        }

        html += `</div>`;
        return html;
      }).join('');
    } catch (error) {
      console.error('Erreur renderList:', error);
      document.getElementById('list-container').innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div>Erreur de chargement</div></div>`;
    }
  },

  // ============================================================
  // COMPTEURS ET STATISTIQUES
  // ============================================================
  updateCounters() {
    try {
      const state = Store.getState();
      document.getElementById('counter-sos').textContent = state.sos.length;
      document.getElementById('counter-signalement').textContent = state.signalements.length;
      document.getElementById('counter-navigation').textContent = state.navigations.length;
      document.getElementById('counter-users').textContent = state.users || 0;
      document.getElementById('counter-drivers').textContent = (state.driversOnline || []).length;
      document.getElementById('counter-ai').textContent = state.stats?.aiPredictions || 0;

      document.getElementById('badge-sos').textContent = state.sos.length;
      document.getElementById('badge-signalement').textContent = state.signalements.length;
      document.getElementById('badge-navigation').textContent = state.navigations.length;
      document.getElementById('badge-messages').textContent = (state.messages || []).length;
      document.getElementById('badge-ai').textContent = state.stats?.aiPredictions || 0;

      const stats = state.stats || {};
      document.getElementById('stat-sos').innerHTML = `${stats.sosTotal || 0} <span class="stat-delta up">${stats.sosTotal > 0 ? '+0' : '0'}</span>`;
      document.getElementById('stat-signalement').innerHTML = `${stats.signalementTotal || 0} <span class="stat-delta up">+0</span>`;
      document.getElementById('stat-en-cours').innerHTML = `${stats.enCours || 0} <span class="stat-delta up">+0</span>`;
      document.getElementById('stat-resolus').innerHTML = `${stats.resolus || 0} <span class="stat-delta up">+0</span>`;
      document.getElementById('resolution-value').textContent = `${stats.resolutionRate || 0}%`;

      // Prédiction IA
      const aiPrediction = document.getElementById('ai-prediction');
      if (state.predictions && state.predictions.length > 0) {
        const top = state.predictions[0];
        aiPrediction.innerHTML = `
          <span class="ai-icon">🧠</span>
          <span class="ai-text">Prédiction: Risque ${top.risk} à ${top.name}</span>
          <span class="ai-score">${top.score}%</span>
        `;
      }

      // Trends (simulés)
      const trends = ['sos', 'signalement', 'navigation', 'users', 'traffic'];
      trends.forEach(t => {
        const el = document.getElementById(`trend-${t}`);
        if (el) {
          const change = Math.floor(Math.random() * 20 - 10);
          const isUp = change > 0;
          el.textContent = `${isUp ? '↑' : '↓'} ${Math.abs(change)}%`;
          el.className = `counter-trend ${isUp ? 'up' : 'down'}`;
        }
      });

      // Notifications
      const notifCount = state.notifications?.filter(n => !n.read).length || 0;
      document.getElementById('notification-badge').textContent = notifCount;

    } catch (error) {
      console.error('Erreur updateCounters:', error);
    }
  },

  updateStats() {
    try {
      const state = Store.getState();
      const stats = state.stats || {};

      // Incidents par type
      const typeCounts = stats.typeCounts || {};
      const maxType = Math.max(...Object.values(typeCounts), 1);
      Object.entries(typeCounts).forEach(([type, count]) => {
        const el = document.getElementById(`type-${type.toLowerCase()}`);
        if (el) el.textContent = count;
        const bars = document.querySelectorAll('.incident-bar');
        bars.forEach(bar => {
          const label = bar.querySelector('.incident-label');
          if (label && label.textContent === type) {
            const fill = bar.querySelector('.incident-fill');
            if (fill) fill.style.width = `${(count / maxType) * 100}%`;
          }
        });
      });

      // Communes
      const communesContainer = document.getElementById('top-communes');
      const communes = stats.communes || [];
      if (communes.length === 0) {
        communesContainer.innerHTML = '<div style="text-align:center;color:var(--text-tertiary);padding:4px;font-size:9px;">Aucune</div>';
      } else {
        communesContainer.innerHTML = communes.map(c =>
          `<div class="commune-item"><span class="commune-name">${Utils.escapeHTML(c.name)}</span><span class="commune-count">${c.count}</span></div>`
        ).join('');
      }

      // Graphique 7 jours
      const chartData = stats.chartData || [0,0,0,0,0,0,0];
      const maxData = Math.max(...chartData, 1);
      const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      const graphBars = document.getElementById('graph-bars');
      const graphLabels = document.getElementById('graph-labels');
      if (graphBars) {
        graphBars.innerHTML = chartData.map((val, i) =>
          `<div class="graph-bar ${i === 6 ? 'today' : ''}" style="height:${(val / maxData) * 100}%;"></div>`
        ).join('');
      }
      if (graphLabels) {
        graphLabels.innerHTML = days.map(d => `<div class="graph-label">${d}</div>`).join('');
      }

      // Messages récents
      const messagesContainer = document.getElementById('recent-messages');
      const msgs = state.messages || [];
      if (msgs.length === 0) {
        messagesContainer.innerHTML = '<div style="text-align:center;color:var(--text-tertiary);padding:4px;font-size:9px;">Aucun message</div>';
      } else {
        messagesContainer.innerHTML = msgs.slice(0, 6).map(m =>
          `<div class="message-item" data-id="${Utils.escapeHTML(m.id)}" style="cursor:pointer;">
            <div class="message-avatar">${Utils.escapeHTML((m.user || 'U')[0])}</div>
            <div class="message-content">
              <div class="message-user">${Utils.escapeHTML(m.user || 'Anonyme')}</div>
              <div class="message-text">${Utils.escapeHTML(m.message || m.body || '')}</div>
              <div class="message-time">${Utils.getTimeAgo(m.time || m.created_at)}</div>
            </div>
          </div>`
        ).join('');
      }

      // Mettre à jour le chart
      this.updateChart(chartData, chartData.map(v => v + Math.floor(Math.random() * 10)));

    } catch (error) {
      console.error('Erreur updateStats:', error);
    }
  },

  // ============================================================
  // DRAWER
  // ============================================================
  renderDrawer() {
    try {
      const state = Store.getState();
      const { drawerData, drawerOpen } = state;
      const drawer = document.getElementById('drawer');
      const overlay = document.getElementById('drawer-overlay');
      const content = document.getElementById('drawer-content');
      const title = document.getElementById('drawer-title');

      if (!drawerOpen || !drawerData) {
        drawer.classList.remove('active');
        overlay.classList.remove('active');
        return;
      }

      drawer.classList.add('active');
      overlay.classList.add('active');

      const { type, ...data } = drawerData;
      const displayName = data.user || data.title || data.name || 'Détails';
      const iconMap = { 'sos': '🆘', 'signalement': '⚠️', 'navigation': '🧭', 'message': '💬', 'ai': '🧠' };
      title.innerHTML = `${iconMap[type] || '📌'} ${Utils.escapeHTML(displayName)}`;

      let html = '';

      if (type === 'sos') {
        html = `
          <div class="drawer-section">
            <div class="drawer-section-title">Informations Utilisateur</div>
            <div class="drawer-grid">
              <div class="drawer-field"><span class="drawer-field-label">Nom</span><span class="drawer-field-value">${Utils.escapeHTML(data.user || data.userId || 'Inconnu')}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Téléphone</span><span class="drawer-field-value">${Utils.escapeHTML(data.phone || '')}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Mode</span><span class="drawer-field-value">${Utils.escapeHTML(data.mode || '')}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Statut</span><span class="drawer-field-value"><span class="flux-badge ${Utils.getStatusBadge(data.status)}">${Utils.getStatusText(data.status)}</span></span></div>
              ${data.prediction ? `<div class="drawer-field full"><span class="drawer-field-label">Prédiction IA</span><span class="drawer-field-value" style="color:var(--accent-violet);">🧠 ${data.prediction}% risque</span></div>` : ''}
            </div>
          </div>

          <div class="drawer-section">
            <div class="drawer-section-title">Localisation</div>
            <div class="drawer-grid">
              <div class="drawer-field"><span class="drawer-field-label">Commune</span><span class="drawer-field-value">${Utils.escapeHTML(data.commune || '')}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Rue</span><span class="drawer-field-value">${Utils.escapeHTML(data.rue || '')}</span></div>
              <div class="drawer-field full"><span class="drawer-field-label">Coordonnées</span><span class="drawer-field-value">${(data.lat || data.location?._latitude || 0).toFixed(4)}, ${(data.lng || data.location?._longitude || 0).toFixed(4)}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Précision</span><span class="drawer-field-value">${data.gpsPrecision || 'N/A'}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Heure</span><span class="drawer-field-value">${new Date(data.time || data.created_at).toLocaleString('fr-FR')}</span></div>
            </div>
          </div>

          ${data.message ? `
            <div class="drawer-section">
              <div class="drawer-section-title">Message</div>
              <div class="drawer-message">${Utils.escapeHTML(data.message)}</div>
            </div>
          ` : ''}

          <div class="drawer-section">
            <div class="drawer-section-title">Historique</div>
            ${(data.history || []).map(h =>
              `<div style="font-size:10px;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid var(--border-color);">
                ${Utils.escapeHTML(h.action)} · ${Utils.getTimeAgo(h.time)}
              </div>`
            ).join('') || 'Aucun historique'}
          </div>

          <div class="drawer-actions">
            ${data.status !== 'traitement' && data.status !== 'resolu' ?
              `<button class="drawer-btn primary" data-action="handle" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-clock"></i> En cours</button>` : ''}
            ${!data.resolved ?
              `<button class="drawer-btn success" data-action="resolve" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-check"></i> Résoudre</button>` : ''}
            <button class="drawer-btn warning" data-action="call" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-phone"></i> Appeler</button>
            <button class="drawer-btn" data-action="message" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-comment"></i> Message</button>
            ${data.prediction ? `<button class="drawer-btn" style="border-color:var(--accent-violet);color:var(--accent-violet);" data-action="ai-detail" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-brain"></i> IA</button>` : ''}
          </div>

          <div class="drawer-chat-area">
            <div style="font-size:9px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;">
              <i class="fas fa-comment"></i> Discussion
            </div>
            <div class="drawer-chat-messages" id="drawer-chat-messages">
              <div style="text-align:center;color:var(--text-tertiary);font-size:9px;padding:4px;">Aucun message</div>
            </div>
            <div class="drawer-chat-input-group">
              <input type="text" class="drawer-chat-input" id="drawer-chat-input" placeholder="Écrire un message..." />
              <button class="drawer-chat-send" id="drawer-chat-send" data-user="${Utils.escapeHTML(data.user || data.userId || 'Utilisateur')}"><i class="fas fa-paper-plane"></i></button>
            </div>
          </div>
        `;
      } else if (type === 'signalement') {
        html = `
          <div class="drawer-section">
            <div class="drawer-section-title">Détails du Signalement</div>
            <div class="drawer-grid">
              <div class="drawer-field"><span class="drawer-field-label">Type</span><span class="drawer-field-value"><span class="flux-badge ${data.type?.toLowerCase()}">${data.type}</span></span></div>
              <div class="drawer-field"><span class="drawer-field-label">Titre</span><span class="drawer-field-value">${Utils.escapeHTML(data.title)}</span></div>
              <div class="drawer-field full"><span class="drawer-field-label">Message</span><span class="drawer-field-value">${Utils.escapeHTML(data.message)}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Votes</span><span class="drawer-field-value">👍 ${data.votes}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Vérifié</span><span class="drawer-field-value">${data.verified ? '✅ Oui' : '❌ Non'}</span></div>
            </div>
          </div>

          <div class="drawer-section">
            <div class="drawer-section-title">Localisation</div>
            <div class="drawer-grid">
              <div class="drawer-field"><span class="drawer-field-label">Commune</span><span class="drawer-field-value">${Utils.escapeHTML(data.commune)}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Rue</span><span class="drawer-field-value">${Utils.escapeHTML(data.rue)}</span></div>
              <div class="drawer-field full"><span class="drawer-field-label">Coordonnées</span><span class="drawer-field-value">${(data.lat || data.location?._latitude || 0).toFixed(4)}, ${(data.lng || data.location?._longitude || 0).toFixed(4)}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Heure</span><span class="drawer-field-value">${new Date(data.time || data.created_at).toLocaleString('fr-FR')}</span></div>
            </div>
          </div>

          <div class="drawer-actions">
            ${!data.verified ? `<button class="drawer-btn primary" data-action="verify" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-check-circle"></i> Vérifier</button>` : ''}
            <button class="drawer-btn success" data-action="resolve" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-check"></i> Résoudre</button>
            <button class="drawer-btn" data-action="detail" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-info-circle"></i> Détails</button>
          </div>
        `;
      } else if (type === 'navigation') {
        html = `
          <div class="drawer-section">
            <div class="drawer-section-title">Informations Course</div>
            <div class="drawer-grid">
              <div class="drawer-field"><span class="drawer-field-label">Conducteur</span><span class="drawer-field-value">${Utils.escapeHTML(data.driverId || data.user || '')}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Client</span><span class="drawer-field-value">${Utils.escapeHTML(data.userId || '')}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Mode</span><span class="drawer-field-value">${Utils.escapeHTML(data.vehicle_type || data.mode || '')}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Progression</span><span class="drawer-field-value">${data.progress || 0}%</span></div>
            </div>
          </div>

          <div class="drawer-section">
            <div class="drawer-section-title">Itinéraire</div>
            <div class="drawer-grid">
              <div class="drawer-field"><span class="drawer-field-label">Départ</span><span class="drawer-field-value">${Utils.escapeHTML(data.pickup_address || data.commune)}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Destination</span><span class="drawer-field-value">${Utils.escapeHTML(data.dropoff_address || data.destination)}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">ETA</span><span class="drawer-field-value">${data.eta || data.eta_trip || 0} minutes</span></div>
              <div class="drawer-field full"><span class="drawer-field-label">Zones évitées</span><span class="drawer-field-value">${data.zonesEvitees?.length > 0 ? Utils.escapeHTML(data.zonesEvitees.join(', ')) : 'Aucune'}</span></div>
              <div class="drawer-field full"><span class="drawer-field-label">Position</span><span class="drawer-field-value">${(data.lat || data.location?._latitude || 0).toFixed(4)}, ${(data.lng || data.location?._longitude || 0).toFixed(4)}</span></div>
            </div>
          </div>

          <div class="drawer-actions">
            <button class="drawer-btn primary" data-action="track" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-location-dot"></i> Suivre</button>
            <button class="drawer-btn" data-action="route-detail" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-route"></i> Itinéraire</button>
            <button class="drawer-btn warning" data-action="call" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-phone"></i> Appeler</button>
          </div>
        `;
      } else if (type === 'message') {
        html = `
          <div class="drawer-section">
            <div class="drawer-section-title">Message</div>
            <div class="drawer-grid">
              <div class="drawer-field"><span class="drawer-field-label">De</span><span class="drawer-field-value">${Utils.escapeHTML(data.user || 'Anonyme')}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Heure</span><span class="drawer-field-value">${new Date(data.time || data.created_at).toLocaleString('fr-FR')}</span></div>
              <div class="drawer-field full"><span class="drawer-field-label">Message</span><span class="drawer-field-value" style="font-weight:400;text-align:left;word-break:break-word;max-width:100%;">${Utils.escapeHTML(data.message || data.body)}</span></div>
              ${data.type ? `<div class="drawer-field"><span class="drawer-field-label">Type</span><span class="drawer-field-value">${Utils.escapeHTML(data.type)}</span></div>` : ''}
            </div>
          </div>

          <div class="drawer-actions">
            <button class="drawer-btn primary" data-action="reply" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-reply"></i> Répondre</button>
            <button class="drawer-btn success" data-action="mark-read" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-envelope-open"></i> Marquer lu</button>
            <button class="drawer-btn warning" data-action="call" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-phone"></i> Appeler</button>
          </div>

          <div class="drawer-chat-area">
            <div style="font-size:9px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;">
              <i class="fas fa-reply"></i> Répondre à ${Utils.escapeHTML(data.user || 'l\'utilisateur')}
            </div>
            <div class="drawer-chat-input-group">
              <input type="text" class="drawer-chat-input" id="drawer-chat-input" placeholder="Votre réponse..." />
              <button class="drawer-chat-send" id="drawer-chat-send" data-user="${Utils.escapeHTML(data.user || 'Utilisateur')}"><i class="fas fa-paper-plane"></i></button>
            </div>
          </div>
        `;
      } else if (type === 'ai') {
        html = `
          <div class="drawer-section">
            <div class="drawer-section-title">Prédiction IA</div>
            <div class="drawer-grid">
              <div class="drawer-field"><span class="drawer-field-label">Zone</span><span class="drawer-field-value">${Utils.escapeHTML(data.name || data.commune)}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Risque</span><span class="drawer-field-value" style="color:${data.risk === 'high' ? 'var(--accent-sos)' : data.risk === 'medium' ? 'var(--accent-warning)' : 'var(--accent-success)'};">${data.risk}</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Score</span><span class="drawer-field-value" style="color:var(--accent-violet);">${data.score || data.prediction}%</span></div>
              <div class="drawer-field"><span class="drawer-field-label">Incidents</span><span class="drawer-field-value">${data.count || 0}</span></div>
            </div>
          </div>

          <div class="drawer-section">
            <div class="drawer-section-title">Analyse</div>
            <div class="drawer-message">
              ${data.risk === 'high' ? '🔴 Zone à risque élevé. Intervention recommandée.' :
                data.risk === 'medium' ? '🟠 Zone à risque modéré. Surveillance accrue.' :
                '🟢 Zone à risque faible. Surveillance normale.'}
              <br><br>
              ${data.sos ? `🚨 ${data.sos} SOS signalés` : ''}
              ${data.signalements ? `⚠️ ${data.signalements} signalements` : ''}
            </div>
          </div>

          <div class="drawer-actions">
            <button class="drawer-btn primary" data-action="ai-alert" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-bell"></i> Alerter</button>
            <button class="drawer-btn warning" data-action="ai-detail" data-id="${Utils.escapeHTML(data.id)}"><i class="fas fa-chart-line"></i> Détails</button>
          </div>
        `;
      }

      content.innerHTML = html;

      // ==== CHAT LISTENERS ====
      const chatInput = document.getElementById('drawer-chat-input');
      const chatSend = document.getElementById('drawer-chat-send');

      if (chatInput && chatSend) {
        const sendMessage = () => {
          const message = chatInput.value.trim();
          const user = chatSend.dataset.user || 'Utilisateur';
          if (!message) return;

          const chatMessages = document.getElementById('drawer-chat-messages');
          if (chatMessages) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'drawer-chat-msg';
            msgDiv.innerHTML = `<span class="msg-user" style="color:var(--accent-success);">Vous</span> : ${Utils.escapeHTML(message)} <span class="msg-time">maintenant</span>`;
            chatMessages.appendChild(msgDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }

          Store.addMessage({
            id: `msg-${Utils.generateId()}`,
            user: user,
            message: message,
            time: new Date().toISOString(),
            read: true,
            type: 'response'
          });

          this.showToast(`✅ Réponse envoyée à ${user}`, 'success');
          chatInput.value = '';
          setTimeout(() => this.updateStats(), 300);
        };

        chatSend.addEventListener('click', sendMessage);
        chatInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
          }
        });
      }

      setTimeout(() => document.getElementById('drawer-close')?.focus(), 100);
    } catch (error) {
      console.error('Erreur renderDrawer:', error);
    }
  },

  // ============================================================
  // TOASTS
  // ============================================================
  showToast(message, type = 'info') {
    try {
      const container = document.getElementById('toast-container');
      const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `
        <div class="toast-icon">${icons[type] || 'ℹ'}</div>
        <div class="toast-message">${Utils.escapeHTML(message)}</div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
      `;
      toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'slideIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
      });
      container.appendChild(toast);
      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.animation = 'slideIn 0.3s reverse';
          setTimeout(() => toast.remove(), 300);
        }
      }, 4000);
    } catch (error) {
      console.warn('Erreur toast:', error);
    }
  },

  // ============================================================
  // NETTOYAGE
  // ============================================================
  cleanup() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
    DataService.disconnect();
  }
};
