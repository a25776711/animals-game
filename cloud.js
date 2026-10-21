(function (root) {
  'use strict';

  var cfg = root.FIREBASE_CONFIG;
  var enabled = !!(cfg && cfg.apiKey && cfg.projectId);
  var BASE = 'https://www.gstatic.com/firebasejs/10.14.1/';

  var ready = null;
  var listeners = [];
  var current = null;

  function init() {
    if (!enabled) return Promise.reject(new Error('cloud-disabled'));
    if (!ready) {
      ready = Promise.all([
        import(BASE + 'firebase-app.js'),
        import(BASE + 'firebase-auth.js'),
        import(BASE + 'firebase-firestore.js')
      ]).then(function (m) {
        var app = m[0].initializeApp(cfg);
        var sdk = { auth: m[1].getAuth(app), db: m[2].getFirestore(app), a: m[1], f: m[2] };
        sdk.a.onAuthStateChanged(sdk.auth, function (u) {
          current = u ? { uid: u.uid, name: u.displayName || u.email || '玩家' } : null;
          listeners.forEach(function (fn) { fn(current); });
        });
        return sdk;
      });
      ready.catch(function () { ready = null; });
    }
    return ready;
  }

  function userDoc(sdk) {
    return sdk.f.doc(sdk.db, 'users', current.uid);
  }

  root.Cloud = {
    enabled: enabled,
    onAuth: function (fn) {
      listeners.push(fn);
      init().catch(function () {});
    },
    signIn: function () {
      return init().then(function (sdk) {
        return sdk.a.signInWithPopup(sdk.auth, new sdk.a.GoogleAuthProvider());
      });
    },
    signOut: function () {
      return init().then(function (sdk) { return sdk.a.signOut(sdk.auth); });
    },
    loadProfile: function () {
      return init().then(function (sdk) {
        return sdk.f.getDoc(userDoc(sdk)).then(function (snap) {
          return snap.exists() ? snap.data().profile : null;
        });
      });
    },
    saveProfile: function (profile) {
      return init().then(function (sdk) {
        return sdk.f.setDoc(userDoc(sdk), { profile: profile });
      });
    }
  };
})(window);
