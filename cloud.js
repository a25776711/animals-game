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
        return sdk.f.setDoc(userDoc(sdk), { profile: profile, serverTime: sdk.f.serverTimestamp() });
      });
    },
    chat: {
      getNick: function () {
        return init().then(function (sdk) {
          return sdk.f.getDoc(sdk.f.doc(sdk.db, 'chatUsers', current.uid)).then(function (snap) {
            return snap.exists() ? snap.data().name : null;
          });
        });
      },
      nickTaken: function (key) {
        return init().then(function (sdk) {
          return sdk.f.getDoc(sdk.f.doc(sdk.db, 'nicks', key)).then(function (snap) { return snap.exists(); });
        });
      },
      claimNick: function (name, key) {
        return init().then(function (sdk) {
          var batch = sdk.f.writeBatch(sdk.db);
          batch.set(sdk.f.doc(sdk.db, 'nicks', key), { uid: current.uid, name: name });
          batch.set(sdk.f.doc(sdk.db, 'chatUsers', current.uid), { name: name, key: key, lastAt: sdk.f.serverTimestamp() });
          return batch.commit();
        });
      },
      send: function (name, text) {
        return init().then(function (sdk) {
          var batch = sdk.f.writeBatch(sdk.db);
          batch.set(sdk.f.doc(sdk.f.collection(sdk.db, 'chat')), {
            uid: current.uid, name: name, text: text, t: sdk.f.serverTimestamp()
          });
          batch.update(sdk.f.doc(sdk.db, 'chatUsers', current.uid), { lastAt: sdk.f.serverTimestamp() });
          return batch.commit();
        });
      },
      watch: function (onMessages, onError) {
        var stop = null;
        var cancelled = false;
        init().then(function (sdk) {
          if (cancelled) return;
          var q = sdk.f.query(sdk.f.collection(sdk.db, 'chat'), sdk.f.orderBy('t', 'desc'), sdk.f.limit(50));
          stop = sdk.f.onSnapshot(q, function (snap) {
            var list = snap.docs.map(function (d) {
              var x = d.data({ serverTimestamps: 'estimate' });
              return { id: d.id, uid: x.uid, name: x.name, text: x.text, t: x.t && x.t.toMillis ? x.t.toMillis() : Date.now() };
            });
            onMessages(list.reverse());
          }, onError);
        }).catch(onError);
        return function () {
          cancelled = true;
          if (stop) stop();
        };
      }
    }
  };
})(window);
