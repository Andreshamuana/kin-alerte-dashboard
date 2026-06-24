// js/main.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 KinAlerte Dashboard');
  Store.restore();
  UI.init();

  const success = DataService.init();
  if (success) {
    EventManager.init();
    Store.subscribe((state) => {
      UI.renderList();
      UI.renderMarkers();
      UI.updateCounters();
      UI.updateStats();
      UI.renderDrawer();
    });
    UI.renderList();
    UI.renderMarkers();
    UI.updateCounters();
    UI.updateStats();
    DataService.startRealTimeUpdates();
    console.log('✅ Dashboard prêt');
  }
});
