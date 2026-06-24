// js/firebase.js
if (typeof firebase !== 'undefined' && CONFIG.firebase.apiKey) {
  firebase.initializeApp(CONFIG.firebase);
  window.firebaseDB = firebase.firestore();
  console.log('🔥 Firestore initialisé');
} else {
  console.warn('⚠️ Firebase non configuré');
  window.firebaseDB = null;
}
