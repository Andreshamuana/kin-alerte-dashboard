
// Exemple dans handleAction
case 'resolve': {
  const item = state.sos.find(s => s.id === id);
  if (item && window.firebaseDB) {
    window.firebaseDB.ref(`emergency_alerts/${id}`).update({ status: 'resolved', resolved_at: firebase.database.ServerValue.TIMESTAMP });
    UI.showToast('✅ Alerte résolue', 'success');
  }
  break;
}
