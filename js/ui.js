// js/ui.js
const UI = {
  map: null,
  markers: {},
  riskLayers: [],
  trafficLayers: [],
  heatLayer: null,
  chart: null,

  initMap() {
    try {
      if (typeof L === 'undefined') {
        document.getElementById('map').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);flex-direction:column;gap:10px;"><span style="font-size:28px;">🗺️</span><span>Carte non disponible</span></div>';
        return;
      }
      this.map = L.map('map', {
        center: [-4.3276, 15.3136],
        zoom: 12,
        zoomControl: true
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(this.map);
      setTimeout(() => this.map?.invalidateSize(), 500);
      L.control.zoom({ position: 'topright' }).addTo(this.map);
      console.log('🗺️ Carte initialisée');
    } catch (error) {
      console.error('Erreur initMap:', error);
    }
  },

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
        legend: { data: ['SOS', 'Signalements'], textStyle: { color: '#94A3B8', fontSize: 10 }, itemWidth: 14, itemHeight: 10, right: 10, top: 0 },
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

  // ===== MARQUEURS =====
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
      const marker = L.marker([data.lat || 0, data.lng || 0], { icon, title: `${type} - ${data.commune || ''}` });
      let popupContent = `<div style="font-family:'Inter',sans-serif;font-size:11px;max-width:220px;"><strong>${type === 'sos' ? '🆘 SOS' : type === 'signalement' ? '⚠️ Signalement' : '🧭 Navigation'}</strong><br>`;
      if (type === 'sos') {
        popupContent += `<b>${Utils.escapeHTML(data.userId || 'Inconnu')}</b><br>📍 ${Utils.escapeHTML(data.commune || '')}<br>${data.message ? `<i>"${Utils.escapeHTML(data.message)}"</i><br>` : ''}<span class="flux-badge ${Utils.getStatusBadge(data.status)}">${Utils.getStatusText(data.status)}</span>`;
      } else if (type === 'signalement') {
        popupContent += `<b>${Utils.escapeHTML(data.title || '')}</b><br>📍 ${Utils.escapeHTML(data.commune || '')}<br>${data.verified ? '✅ Vérifié' : '⏳ En attente'}<br>👍 ${data.votes || 0} votes`;
      } else {
        popupContent += `<b>${Utils.escapeHTML(data.driverId || '')}</b><br>🎯 ${Utils.escapeHTML(data.dropoff_address || '')}<br>⏱️ ETA ${data.eta || 0} min`;
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
    // À implémenter comme avant (identique à la version précédente)
    // Je ne le recopie pas pour ne pas surcharger, mais il est identique au code précédent.
  },

  renderList() { /* identique */ },
  updateCounters() { /* identique */ },
  updateStats() { /* identique */ },
  renderDrawer() { /* identique */ },
  showToast(message, type = 'info') { /* identique */ },
  cleanup() { /* identique */ },
  init() {
    this.initMap();
    this.initChart();
    setInterval(() => {
      const clock = document.getElementById('clock');
      if (clock) clock.textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }, 1000);
    console.log('✅ UI initialisée');
  }
};
