
// js/firebase.js
if (typeof firebase !== 'undefined' && CONFIG.firebase.apiKey !== "VOTRE_API_KEY") {
  firebase.initializeApp(CONFIG.firebase);
  window.firebaseDB = firebase.database();
  console.log('🔥 Firebase initialisé');
} else {
  console.warn('⚠️ Firebase non configuré ou SDK manquant');
  window.firebaseDB = null;
}
