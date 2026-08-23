const config = window.WFA_FIREBASE_CONFIG;
    if (config && config.apiKey && config.authDomain) {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js');
      const { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } = await import('https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js');
      const auth = getAuth(initializeApp(config));
      window.registerWfaAuth({
        signIn: async (email, password, remember) => { await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence); return signInWithEmailAndPassword(auth, email, password); },
        reset: (email) => sendPasswordResetEmail(auth, email),
        signOut: () => signOut(auth),
        onChange: (callback) => onAuthStateChanged(auth, callback)
      });
    }
