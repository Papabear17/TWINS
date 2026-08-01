// Firebase initialization and shared state bridge for TWINS.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js';
import { getDatabase, ref, get, set, onValue } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDSSVuGi1waCaxOvkyN0e24tvqgY2jaOe4',
  authDomain: 'twins-91e66.firebaseapp.com',
  databaseURL: 'https://twins-91e66-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'twins-91e66',
  storageBucket: 'twins-91e66.firebasestorage.app',
  messagingSenderId: '527265031048',
  appId: '1:527265031048:web:d12ea9f2f1c9156ef4103d',
  measurementId: 'G-N0ZNBS6CK2'
};

const SHARED_STATE_PATH = 'twinsData_v3';

const firebaseApp = initializeApp(firebaseConfig);
const firebaseDb = getDatabase(firebaseApp);

window.firebaseApp = firebaseApp;
window.firebaseDb = firebaseDb;
window.twinsFirebase = {
  enabled: true,
  app: firebaseApp,
  db: firebaseDb,
  sharedStatePath: SHARED_STATE_PATH,
  async loadSharedState() {
    const snapshot = await get(ref(firebaseDb, SHARED_STATE_PATH));
    return snapshot.exists() ? snapshot.val() : null;
  },
  async saveSharedState(state) {
    await set(ref(firebaseDb, SHARED_STATE_PATH), state);
    return state;
  },
  subscribeSharedState(callback, onError) {
    return onValue(
      ref(firebaseDb, SHARED_STATE_PATH),
      (snapshot) => callback(snapshot.exists() ? snapshot.val() : null),
      (error) => {
        if (typeof onError === 'function') onError(error);
      }
    );
  }
};
window.twinsFirebaseReady = Promise.resolve(window.twinsFirebase);

// Dispatch event agar non-module scripts tahu Firebase sudah siap
window.dispatchEvent(new CustomEvent('twinsFirebaseReady', { detail: window.twinsFirebase }));

isSupported().then((supported) => {
  if (supported) {
    const analytics = getAnalytics(firebaseApp);
    window.firebaseAnalytics = analytics;
    console.log('Firebase Analytics initialized');
  } else {
    console.log('Firebase Analytics not supported in this browser');
  }
}).catch((error) => {
  console.warn('Firebase initialization failed', error);
});
