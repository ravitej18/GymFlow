const LOCAL_KEY = "gymflow.local.v1";

const COLLECTIONS = [
  "members",
  "trainers",
  "membership_plans",
  "payments",
  "attendance",
  "trainer_attendance",
  "workout_templates",
  "workout_assignments",
  "workout_sessions",
  "progress_records",
  "reminders",
  "users",
  "membership_pauses",
  "exercise_library",
  "workout_logs",
  "workout_schedules",
  "badges"
];

export async function createServices(config = window.GYM_CONFIG || {}) {
  const firebaseConfig = normalizeFirebaseConfig(config);
  if (isFirebaseConfigured(firebaseConfig)) {
    try {
      return await createFirebaseServices(firebaseConfig);
    } catch (error) {
      console.warn("Firebase unavailable. Falling back to local storage.", error);
    }
  }

  return createLocalServices(config);
}

function normalizeFirebaseConfig(config = {}) {
  const nested = config.firebase || {};
  return {
    apiKey: nested.apiKey || config.apiKey,
    authDomain: nested.authDomain || config.authDomain,
    projectId: nested.projectId || config.projectId,
    storageBucket: nested.storageBucket || config.storageBucket,
    messagingSenderId: nested.messagingSenderId || config.messagingSenderId,
    appId: nested.appId || config.appId,
    measurementId: nested.measurementId || config.measurementId
  };
}

function isFirebaseConfigured(firebaseConfig = {}) {
  const isForcedLocal = Boolean(
    window.GYM_CONFIG?.forceLocal ||
    (typeof location !== "undefined" && new URLSearchParams(location.search).has("local"))
  );
  if (isForcedLocal) return false;

  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      !firebaseConfig.apiKey.includes("YOUR_") &&
      !firebaseConfig.projectId.includes("YOUR_")
  );
}

async function createFirebaseServices(firebaseConfig) {
  const [{ initializeApp }, authApi, firestoreApi] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
  ]);

  const app = initializeApp(firebaseConfig);
  const auth = authApi.getAuth(app);

  const db = firestoreApi.getFirestore(app);

  // Enable IndexedDB offline persistence silently
  if (typeof firestoreApi.enableIndexedDbPersistence === "function") {
    firestoreApi.enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === "failed-precondition") {
        console.warn("Firestore offline persistence failed: Multiple tabs open.");
      } else if (err.code === "unimplemented") {
        console.warn("Firestore offline persistence unsupported by browser.");
      }
    });
  }

  let profile = null;
  let listeners = [];
  let authResolved = false; // becomes true once Firebase reports its first auth state

  authApi.onAuthStateChanged(auth, async (user) => {
    try {
      profile = user ? await loadFirebaseProfile(db, firestoreApi, user.uid) : null;
    } catch (error) {
      // Auth succeeded but Firestore is unreachable. Don't throw uncaught — keep a
      // minimal profile from the auth user so the app can show its error screen.
      console.error("Could not load profile from Firestore.", error);
      // Don't assume "owner" — a member must never briefly see owner UI on a
      // transient Firestore read failure. Preserve any role we already had.
      profile = user
        ? { id: user.uid, uid: user.uid, name: user.displayName || user.email, email: user.email, role: profile?.role || "member" }
        : null;
    }
    authResolved = true;
    listeners.forEach((listener) => listener(profile));
  });

  async function requireProfile() {
    const user = auth.currentUser;
    if (!user) throw new Error("You must be signed in.");
    if (!profile) profile = await loadFirebaseProfile(db, firestoreApi, user.uid);
    return profile;
  }

  const authService = {
    onAuthChange(callback) {
        listeners.push(callback);
        // Only replay the current state if Firebase has already resolved it.
        // Before that, stay silent so the app shows its boot splash (not the
        // login screen) while the persisted session is being restored.
        if (authResolved) callback(profile);
        return () => {
          listeners = listeners.filter((listener) => listener !== callback);
        };
      },
      async registerOwner({ gymName, name, email, password }) {
        const trimmedGymName = String(gymName || "").trim();
        if (!trimmedGymName) throw new Error("Enter a gym name.");
        let gymKey = trimmedGymName.toLowerCase().replace(/[^a-z0-9]/g, "-");

        const publicGymSnap = await firestoreApi.getDoc(firestoreApi.doc(db, "public_gyms", gymKey));
        if (publicGymSnap.exists()) {
          gymKey = `${gymKey}-${Date.now().toString(36)}`;
        }

        let credential;
        try {
          credential = await authApi.createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
          throw friendlyAuthError(error);
        }
        const gymId = credential.user.uid;
        const now = timestamp();
        const gymCode = await reserveGymCode(db, firestoreApi, gymName, gymId);
        const userProfile = {
          id: credential.user.uid,
          uid: credential.user.uid,
          gymId,
          gymName,
          gymCode,
          name,
          email,
          role: "owner",
          createdAt: now,
          updatedAt: now
        };

        await authApi.updateProfile(credential.user, { displayName: name });
        await firestoreApi.setDoc(firestoreApi.doc(db, "public_gyms", gymKey), {
          gymId,
          gymName: trimmedGymName
        });
        await firestoreApi.setDoc(firestoreApi.doc(db, "users", credential.user.uid), userProfile);
        await firestoreApi.setDoc(firestoreApi.doc(db, "gym_settings", gymId), {
          id: gymId,
          gymId,
          gymName,
          gymCode,
          ownerName: name,
          contactEmail: email,
          currency: "INR",
          createdAt: now,
          updatedAt: now
        });
        await seedDefaultPlansFirebase(db, firestoreApi, gymId);
        await seedDefaultBadgesFirebase(db, firestoreApi, gymId);
        profile = userProfile;
        listeners.forEach((listener) => listener(profile));
        return profile;
      },
      async registerMember({ gymName: _ignored, name, email, password, gymCode }) {
        // Resolve the code FIRST so a bad code never creates an orphan auth user.
        const code = String(gymCode || "").trim().toUpperCase();
        if (!code) throw new Error("Enter your gym code.");
        const codeSnap = await firestoreApi.getDoc(firestoreApi.doc(db, "gym_codes", code));
        if (!codeSnap.exists()) {
          throw new Error("That gym code is not valid. Check with your gym.");
        }
        const { gymId, gymName } = codeSnap.data();

        let credential;
        try {
          credential = await authApi.createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
          throw friendlyAuthError(error);
        }
        const uid = credential.user.uid;
        const now = timestamp();
        const userProfile = {
          id: uid,
          uid,
          gymId, // the joined gym, NOT the member's own uid
          gymName,
          name,
          email,
          role: "member",
          gymCodeUsed: code, // read by the users-create rule to validate the join
          createdAt: now,
          updatedAt: now
        };

        await authApi.updateProfile(credential.user, { displayName: name });
        // User doc MUST exist before the roster doc (the members-create rule reads it).
        await firestoreApi.setDoc(firestoreApi.doc(db, "users", uid), userProfile);
        const membersRef = firestoreApi.collection(db, "members");
        const q1 = firestoreApi.query(membersRef, firestoreApi.where("gymId", "==", gymId), firestoreApi.where("email", "==", email));
        let memberSnap = await firestoreApi.getDocs(q1);
        if (memberSnap.empty && email.toLowerCase() !== email) {
          const q2 = firestoreApi.query(membersRef, firestoreApi.where("gymId", "==", gymId), firestoreApi.where("email", "==", email.toLowerCase()));
          memberSnap = await firestoreApi.getDocs(q2);
        }

        if (!memberSnap.empty) {
          const memberDoc = memberSnap.docs[0];
          await firestoreApi.setDoc(memberDoc.ref, {
            uid,
            updatedAt: now
          }, { merge: true });
        } else {
          const memberId = createId("member");
          await firestoreApi.setDoc(firestoreApi.doc(db, "members", memberId), {
            id: memberId,
            gymId,
            uid,
            fullName: name,
            email,
            status: "Pending",
            joinDate: now.slice(0, 10),
            createdAt: now,
            updatedAt: now
          });
        }
        profile = userProfile;
        listeners.forEach((listener) => listener(profile));
        return profile;
      },
      async registerTrainer({ name, email, password, gymCode }) {
        // Mirrors registerMember: resolve the code FIRST so a bad code never
        // creates an orphan auth user.
        const code = String(gymCode || "").trim().toUpperCase();
        if (!code) throw new Error("Enter your gym code.");
        const codeSnap = await firestoreApi.getDoc(firestoreApi.doc(db, "gym_codes", code));
        if (!codeSnap.exists()) {
          throw new Error("That gym code is not valid. Check with your gym.");
        }
        const { gymId, gymName } = codeSnap.data();

        let credential;
        try {
          credential = await authApi.createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
          throw friendlyAuthError(error);
        }
        const uid = credential.user.uid;
        const now = timestamp();
        const userProfile = {
          id: uid,
          uid,
          gymId, // the joined gym, NOT the trainer's own uid
          gymName,
          name,
          email,
          role: "trainer",
          gymCodeUsed: code, // read by the users-create rule to validate the join
          createdAt: now,
          updatedAt: now
        };

        await authApi.updateProfile(credential.user, { displayName: name });
        // User doc MUST exist before the roster doc (the trainers-create rule reads it).
        await firestoreApi.setDoc(firestoreApi.doc(db, "users", uid), userProfile);
        const trainersRef = firestoreApi.collection(db, "trainers");
        const q1 = firestoreApi.query(trainersRef, firestoreApi.where("gymId", "==", gymId), firestoreApi.where("email", "==", email));
        let trainerSnap = await firestoreApi.getDocs(q1);
        if (trainerSnap.empty && email.toLowerCase() !== email) {
          const q2 = firestoreApi.query(trainersRef, firestoreApi.where("gymId", "==", gymId), firestoreApi.where("email", "==", email.toLowerCase()));
          trainerSnap = await firestoreApi.getDocs(q2);
        }

        if (!trainerSnap.empty) {
          const trainerDoc = trainerSnap.docs[0];
          await firestoreApi.setDoc(trainerDoc.ref, {
            uid,
            updatedAt: now
          }, { merge: true });
        } else {
          const trainerId = createId("trainer");
          await firestoreApi.setDoc(firestoreApi.doc(db, "trainers", trainerId), {
            id: trainerId,
            gymId,
            uid,
            name, // trainers key off `name`, not `fullName`
            email,
            status: "Pending",
            createdAt: now,
            updatedAt: now
          });
        }
        profile = userProfile;
        listeners.forEach((listener) => listener(profile));
        return profile;
      },
      async login(email, password) {
        let username = String(email || "").trim();
        const digitsOnly = username.replace(/\D/g, "");
        if (digitsOnly.length >= 10 && !username.includes("@")) {
          username = `${digitsOnly.slice(-10)}@gymflow.app`;
        }
        try {
          await authApi.signInWithEmailAndPassword(auth, username, password);
        } catch (error) {
          throw friendlyAuthError(error);
        }
      },
      async logout() {
        await authApi.signOut(auth);
      },
      async resetWorkspaceData() {
        localStorage.clear();
        sessionStorage.clear();
        if (auth.currentUser) {
          try {
            await authApi.signOut(auth);
          } catch (e) {
            console.warn("SignOut error during reset:", e);
          }
        }
        profile = null;
        listeners.forEach((listener) => listener(null));
      },
      async resetPassword(email) {
        let username = String(email || "").trim();
        const digitsOnly = username.replace(/\D/g, "");
        if (digitsOnly.length >= 10 && !username.includes("@")) {
          username = `${digitsOnly.slice(-10)}@gymflow.app`;
        }
        try {
          await authApi.sendPasswordResetEmail(auth, username);
        } catch (error) {
          throw friendlyAuthError(error);
        }
      },
      async useDemo() {
        throw new Error("Demo mode is only available before Firebase is configured.");
      },
      async deleteGym(password) {
        const user = auth.currentUser;
        if (!user) throw new Error("You must be signed in.");
        if (!profile || profile.role !== "owner") {
          throw new Error("Only the gym owner can delete the gym.");
        }
        if (!password) throw new Error("Password is required to delete gym.");

        try {
          const credential = authApi.EmailAuthProvider.credential(user.email, password);
          await authApi.reauthenticateWithCredential(user, credential);
        } catch (error) {
          throw new Error("Incorrect password. Gym deletion cancelled.");
        }

        const gymId = profile.gymId;

        for (const colName of COLLECTIONS) {
          try {
            const colRef = firestoreApi.collection(db, colName);
            const q = firestoreApi.query(colRef, firestoreApi.where("gymId", "==", gymId));
            const snap = await firestoreApi.getDocs(q);
            const deletePromises = snap.docs.map((doc) => firestoreApi.deleteDoc(doc.ref));
            await Promise.all(deletePromises);
          } catch (e) {
            console.warn(`Error purging collection ${colName}:`, e);
          }
        }

        try {
          await firestoreApi.deleteDoc(firestoreApi.doc(db, "gym_settings", gymId));
        } catch (e) {}

        try {
          const pubQ = firestoreApi.query(firestoreApi.collection(db, "public_gyms"), firestoreApi.where("gymId", "==", gymId));
          const pubSnap = await firestoreApi.getDocs(pubQ);
          await Promise.all(pubSnap.docs.map((d) => firestoreApi.deleteDoc(d.ref)));
        } catch (e) {}

        try {
          const codeQ = firestoreApi.query(firestoreApi.collection(db, "gym_codes"), firestoreApi.where("gymId", "==", gymId));
          const codeSnap = await firestoreApi.getDocs(codeQ);
          await Promise.all(codeSnap.docs.map((d) => firestoreApi.deleteDoc(d.ref)));
        } catch (e) {}

        try {
          await authApi.deleteUser(user);
        } catch (e) {
          await authApi.signOut(auth);
        }

        profile = null;
        listeners.forEach((listener) => listener(null));
        return true;
      },
      async updateProfile(updates) {
        const userProfile = await requireProfile();
        const next = {
          ...userProfile,
          ...updates,
          updatedAt: timestamp()
        };
        await firestoreApi.setDoc(firestoreApi.doc(db, "users", userProfile.uid), next, { merge: true });
        
        // Also update corresponding collections
        if (userProfile.role === "member") {
          const membersRef = firestoreApi.collection(db, "members");
          const q = firestoreApi.query(membersRef, firestoreApi.where("uid", "==", userProfile.uid));
          const snap = await firestoreApi.getDocs(q);
          if (!snap.empty) {
            const memberDoc = snap.docs[0];
            await firestoreApi.setDoc(memberDoc.ref, { 
              fullName: next.name, 
              avatarUrl: next.avatarUrl || "",
              updatedAt: timestamp()
            }, { merge: true });
          }
        } else if (userProfile.role === "trainer") {
          const trainersRef = firestoreApi.collection(db, "trainers");
          const q = firestoreApi.query(trainersRef, firestoreApi.where("uid", "==", userProfile.uid));
          const snap = await firestoreApi.getDocs(q);
          if (!snap.empty) {
            const trainerDoc = snap.docs[0];
            await firestoreApi.setDoc(trainerDoc.ref, { 
              name: next.name, 
              avatarUrl: next.avatarUrl || "",
              updatedAt: timestamp()
            }, { merge: true });
          }
        }
        
        profile = next;
        listeners.forEach((listener) => listener(profile));
        return profile;
      },
      getProfile() {
        return profile;
      }
    };

    const dataService = {
      async list(collectionName) {
        const userProfile = await requireProfile();
        if (!userProfile?.gymId) return [];
        const constraints = [firestoreApi.where("gymId", "==", userProfile.gymId)];

        // Scope member requests for personal collections
        if (userProfile.role === "member") {
          const userScopedCols = ["workout_logs", "workout_assignments", "progress_records", "payments", "workout_sessions"];
          if (userScopedCols.includes(collectionName)) {
            constraints.push(firestoreApi.where("uid", "==", userProfile.uid));
          }
        }

        const queryRef = firestoreApi.query(
          firestoreApi.collection(db, collectionName),
          ...constraints
        );
        const snapshot = await firestoreApi.getDocs(queryRef);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort(byUpdatedAt);
      },
      async save(collectionName, docData) {
        const userProfile = await requireProfile();
        const now = timestamp();
        const id = docData.id || createId(collectionName);
        const next = {
          ...docData,
          id,
          gymId: userProfile.gymId,
          updatedAt: now,
          createdAt: docData.createdAt || now
        };
        await firestoreApi.setDoc(firestoreApi.doc(db, collectionName, id), next, { merge: true });
        return next;
      },
      async remove(collectionName, id) {
        await requireProfile();
        await firestoreApi.deleteDoc(firestoreApi.doc(db, collectionName, id));
      },
      async getSettings() {
        const userProfile = await requireProfile();
        // Per-gym settings doc (id == gymId).
        const snapshot = await firestoreApi.getDoc(firestoreApi.doc(db, "gym_settings", userProfile.gymId));
        if (snapshot.exists()) {
          return { id: snapshot.id, ...snapshot.data() };
        }
        // Best-effort legacy fallback: the old shared "profile" doc (only valid if
        // it actually belongs to this gym). First Save migrates to the new id.
        try {
          const legacy = await firestoreApi.getDoc(firestoreApi.doc(db, "gym_settings", "profile"));
          if (legacy.exists() && legacy.data().gymId === userProfile.gymId) {
            return { id: userProfile.gymId, ...legacy.data() };
          }
        } catch (error) {
          /* legacy doc may be unreadable under new rules — ignore */
        }
        return {
          id: userProfile.gymId,
          gymId: userProfile.gymId,
          gymName: userProfile.gymName,
          gymCode: userProfile.gymCode || ""
        };
      },
      async saveSettings(settings) {
        const userProfile = await requireProfile();
        const next = {
          ...settings,
          id: userProfile.gymId,
          gymId: userProfile.gymId,
          updatedAt: timestamp()
        };
        await firestoreApi.setDoc(firestoreApi.doc(db, "gym_settings", userProfile.gymId), next, { merge: true });
        return next;
      },
      async exportData() {
        const settings = await this.getSettings();
        const payload = { settings, collections: {} };
        for (const collectionName of COLLECTIONS) {
          payload.collections[collectionName] = await this.list(collectionName);
        }
        return payload;
      },
      async importData() {
        throw new Error("Import is available in local demo mode. Use Firebase console exports for production.");
      },
      async deleteGym(password) {
        return authService.deleteGym(password);
      }
    };

  return {
    mode: "firebase",
    auth: authService,
    data: dataService
  };
}

async function loadFirebaseProfile(db, api, uid) {
  const snapshot = await api.getDoc(api.doc(db, "users", uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

async function seedDefaultPlansFirebase(db, api, gymId) {
  const plans = defaultPlans(gymId);
  await Promise.all(plans.map((plan) => api.setDoc(api.doc(db, "membership_plans", plan.id), plan)));
}

function createLocalServices(config) {
  let state = loadState(config);
  let listeners = [];

  function saveState() {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
  }

  function currentProfile() {
    return state.users.find((user) => user.id === state.sessionUserId) || null;
  }

  function emitAuth() {
    const profile = currentProfile();
    listeners.forEach((listener) => listener(sanitizeUser(profile)));
  }

  function ensureCollection(collectionName) {
    state.collections[collectionName] ||= [];
    return state.collections[collectionName];
  }

  const authService = {
    onAuthChange(callback) {
        listeners.push(callback);
        callback(sanitizeUser(currentProfile()));
        return () => {
          listeners = listeners.filter((listener) => listener !== callback);
        };
      },
      async registerOwner({ gymName, name, email, password }) {
        const normalizedEmail = email.trim().toLowerCase();
        if (state.users.some((user) => user.email === normalizedEmail)) {
          throw new Error("An account with this email already exists. Please log in instead.");
        }

        const trimmedGymName = String(gymName || "").trim();
        if (!trimmedGymName) throw new Error("Enter a gym name.");
        const gymExists = Object.values(state.gymCodes || {}).some(
          g => String(g.gymName).trim().toLowerCase() === trimmedGymName.toLowerCase()
        ) || (state.settings && String(state.settings.gymName).trim().toLowerCase() === trimmedGymName.toLowerCase());

        if (gymExists) {
          throw new Error("A gym with this name already exists. Please log in to your gym.");
        }

        const now = timestamp();
        const gymId = createId("gym");
        const uid = createId("uid");
        const gymCode = reserveLocalGymCode(state, gymName, gymId);
        const user = {
          id: createId("user"),
          uid,
          gymId,
          gymName,
          gymCode,
          name,
          email: normalizedEmail,
          role: "owner",
          password,
          createdAt: now,
          updatedAt: now
        };

        state.users.push(user);
        state.sessionUserId = user.id;
        state.settings = {
          id: gymId,
          gymId,
          gymName,
          gymCode,
          ownerName: name,
          contactEmail: normalizedEmail,
          phone: "",
          address: "",
          currency: "INR",
          createdAt: now,
          updatedAt: now
        };
        state.collections.membership_plans = defaultPlans(gymId);
        saveState();
        emitAuth();
        return sanitizeUser(user);
      },
      async registerMember({ name, email, password, gymCode }) {
        const normalizedEmail = email.trim().toLowerCase();
        if (state.users.some((user) => user.email === normalizedEmail)) {
          throw new Error("An account with this email already exists. Please log in instead.");
        }
        const code = String(gymCode || "").trim().toUpperCase();
        const target = state.gymCodes?.[code];
        if (!target) throw new Error("That gym code is not valid. Check with your gym.");

        const now = timestamp();
        const uid = createId("uid");
        const user = {
          id: createId("user"),
          uid,
          gymId: target.gymId,
          gymName: target.gymName,
          name,
          email: normalizedEmail,
          role: "member",
          gymCodeUsed: code,
          password,
          createdAt: now,
          updatedAt: now
        };
        state.users.push(user);
        state.sessionUserId = user.id;

        const members = (state.collections.members ||= []);
        const existing = members.find(m => m.gymId === target.gymId && m.email?.trim().toLowerCase() === normalizedEmail);
        if (existing) {
          existing.uid = uid;
          existing.updatedAt = now;
        } else {
          members.push({
            id: createId("member"),
            gymId: target.gymId,
            uid,
            fullName: name,
            email: normalizedEmail,
            status: "Pending",
            joinDate: now.slice(0, 10),
            createdAt: now,
            updatedAt: now
          });
        }
        saveState();
        emitAuth();
        return sanitizeUser(user);
      },
      async registerTrainer({ name, email, password, gymCode }) {
        const normalizedEmail = email.trim().toLowerCase();
        if (state.users.some((user) => user.email === normalizedEmail)) {
          throw new Error("An account with this email already exists. Please log in instead.");
        }
        const code = String(gymCode || "").trim().toUpperCase();
        const target = state.gymCodes?.[code];
        if (!target) throw new Error("That gym code is not valid. Check with your gym.");

        const now = timestamp();
        const uid = createId("uid");
        const user = {
          id: createId("user"),
          uid,
          gymId: target.gymId,
          gymName: target.gymName,
          name,
          email: normalizedEmail,
          role: "trainer",
          gymCodeUsed: code,
          password,
          createdAt: now,
          updatedAt: now
        };
        state.users.push(user);
        state.sessionUserId = user.id;

        const trainers = (state.collections.trainers ||= []);
        const existing = trainers.find(t => t.gymId === target.gymId && t.email?.trim().toLowerCase() === normalizedEmail);
        if (existing) {
          existing.uid = uid;
          existing.updatedAt = now;
        } else {
          trainers.push({
            id: createId("trainer"),
            gymId: target.gymId,
            uid,
            name,
            email: normalizedEmail,
            status: "Pending",
            createdAt: now,
            updatedAt: now
          });
        }
        saveState();
        emitAuth();
        return sanitizeUser(user);
      },
      async login(email, password) {
        let username = String(email || "").trim();
        const digitsOnly = username.replace(/\D/g, "");
        if (digitsOnly.length >= 10 && !username.includes("@")) {
          username = `${digitsOnly.slice(-10)}@gymflow.app`;
        }
        const normalizedEmail = username.trim().toLowerCase();
        const user = state.users.find((candidate) => candidate.email === normalizedEmail && candidate.password === password);
        if (!user) {
          throw new Error("This browser is running in demo mode, so Firebase accounts cannot sign in here. Check that gym.config.js is deployed with Firebase config.");
        }
        state.sessionUserId = user.id;
        saveState();
        emitAuth();
        return sanitizeUser(user);
      },
      async logout() {
        state.sessionUserId = null;
        saveState();
        emitAuth();
      },
      async resetWorkspaceData() {
        localStorage.clear();
        sessionStorage.clear();
        state = loadState(config);
        emitAuth();
      },
      async resetPassword(email) {
        let username = String(email || "").trim();
        const digitsOnly = username.replace(/\D/g, "");
        if (digitsOnly.length >= 10 && !username.includes("@")) {
          username = `${digitsOnly.slice(-10)}@gymflow.app`;
        }
        const exists = state.users.some((user) => user.email === username.trim().toLowerCase());
        if (!exists) throw new Error("No local account was found for that email.");
        return true;
      },
      async useDemo() {
        if (!state.users.some((user) => user.email === "owner@gymflow.local")) {
          state = createSeedState(config);
        }
        const demo = state.users.find((user) => user.email === "owner@gymflow.local");
        state.sessionUserId = demo.id;
        saveState();
        emitAuth();
        return sanitizeUser(demo);
      },
      async deleteGym(password) {
        const user = currentProfile();
        if (!user || user.role !== "owner") {
          throw new Error("Only the gym owner can delete the gym.");
        }
        if (!password) throw new Error("Password is required to delete gym.");

        const fullUser = state.users.find((u) => u.id === user.id);
        if (fullUser?.password && fullUser.password !== password) {
          throw new Error("Incorrect password. Gym deletion cancelled.");
        }

        const gymId = user.gymId;

        // Hard delete all users in state belonging to gym
        state.users = (state.users || []).filter((u) => u.gymId !== gymId);

        // Hard delete all collections belonging to gym
        COLLECTIONS.forEach((col) => {
          if (Array.isArray(state.collections[col])) {
            state.collections[col] = state.collections[col].filter((item) => item.gymId !== gymId);
          }
        });

        // Delete gym code mapping
        if (state.gymCodes) {
          Object.keys(state.gymCodes).forEach((code) => {
            if (state.gymCodes[code]?.gymId === gymId) {
              delete state.gymCodes[code];
            }
          });
        }

        // Reset settings
        if (state.settings?.gymId === gymId) {
          state.settings = null;
        }

        state.sessionUserId = null;
        saveState();
        emitAuth();
        return true;
      },
      async updateProfile(updates) {
        const userProfile = currentProfile();
        if (!userProfile) throw new Error("You must be signed in.");
        const next = {
          ...userProfile,
          ...updates,
          updatedAt: timestamp()
        };
        const index = state.users.findIndex((u) => u.id === userProfile.id);
        if (index >= 0) {
          state.users[index] = next;
        }
        
        // Update collections
        if (userProfile.role === "member") {
          const list = state.collections.members || [];
          const idx = list.findIndex((m) => m.uid === userProfile.uid);
          if (idx >= 0) {
            list[idx] = { ...list[idx], fullName: next.name, avatarUrl: next.avatarUrl || "", updatedAt: timestamp() };
          }
        } else if (userProfile.role === "trainer") {
          const list = state.collections.trainers || [];
          const idx = list.findIndex((t) => t.uid === userProfile.uid);
          if (idx >= 0) {
            list[idx] = { ...list[idx], name: next.name, avatarUrl: next.avatarUrl || "", updatedAt: timestamp() };
          }
        }
        
        saveState();
        emitAuth();
        return next;
      },
      getProfile() {
        const profile = currentProfile();
        return profile ? sanitizeUser(profile) : null;
      }
    };

    const dataService = {
      async list(collectionName) {
        return [...ensureCollection(collectionName)].sort(byUpdatedAt);
      },
      async save(collectionName, docData) {
        const profile = currentProfile();
        if (!profile) throw new Error("You must be signed in.");

        const collection = ensureCollection(collectionName);
        const now = timestamp();
        const id = docData.id || createId(collectionName);
        const existingIndex = collection.findIndex((item) => item.id === id);
        const next = {
          ...docData,
          id,
          gymId: profile.gymId,
          updatedAt: now,
          createdAt: docData.createdAt || now
        };

        if (existingIndex >= 0) {
          collection[existingIndex] = { ...collection[existingIndex], ...next };
        } else {
          collection.push(next);
        }
        saveState();
        return next;
      },
      async remove(collectionName, id) {
        const collection = ensureCollection(collectionName);
        state.collections[collectionName] = collection.filter((item) => item.id !== id);
        saveState();
      },
      async getSettings() {
        return state.settings;
      },
      async saveSettings(settings) {
        state.settings = { ...state.settings, ...settings, updatedAt: timestamp() };
        saveState();
        return state.settings;
      },
      async exportData() {
        return {
          exportedAt: timestamp(),
          settings: state.settings,
          users: state.users.map(sanitizeUser),
          collections: state.collections
        };
      },
      async importData(payload) {
        if (!payload || !payload.collections || !payload.settings) {
          throw new Error("The selected file is not a GymFlow export.");
        }
        state.settings = payload.settings;
        state.collections = payload.collections;
        saveState();
      },
      async deleteGym(password) {
        return authService.deleteGym(password);
      }
    };

  return {
    mode: "local",
    auth: authService,
    data: dataService
  };
}

function loadState(config) {
  const saved = localStorage.getItem(LOCAL_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      parsed.collections ||= {};
      parsed.gymCodes ||= {};
      COLLECTIONS.forEach((collection) => {
        parsed.collections[collection] ||= [];
      });
      return parsed;
    } catch (error) {
      console.warn("Unable to read local GymFlow state.", error);
    }
  }

  return createEmptyState(config);
}

function createEmptyState(config) {
  const gymId = "local-gym";
  const collections = {};
  COLLECTIONS.forEach((collection) => {
    collections[collection] = [];
  });

  return {
    version: 1,
    sessionUserId: null,
    gymCodes: {},
    settings: {
      id: gymId,
      gymId,
      gymName: config.appName || "GymFlow",
      ownerName: "",
      contactEmail: "",
      currency: "INR",
      phone: "",
      address: ""
    },
    users: [],
    collections
  };
}

// Local-mode gym code reservation (mirrors reserveGymCode for firebase).
function reserveLocalGymCode(state, gymName, gymId) {
  state.gymCodes ||= {};
  let code = makeGymCode(gymName);
  let guard = 0;
  while (state.gymCodes[code] && guard < 20) {
    code = makeGymCode(gymName);
    guard += 1;
  }
  state.gymCodes[code] = { code, gymId, gymName };
  return code;
}

function createSeedState(config) {
  const now = timestamp();
  const gymId = "demo-gym";
  const gymCode = "DEMO-1000";
  const owner = {
    id: "demo-owner",
    uid: "demo-owner",
    gymId,
    gymName: "GymFlow Demo Club",
    gymCode,
    name: "Demo Owner",
    email: "owner@gymflow.local",
    password: "demo1234",
    role: "owner",
    createdAt: now,
    updatedAt: now
  };

  const member1User = {
    id: "demo-member-ravi",
    uid: "uid-ravi-kumar",
    gymId,
    gymName: "GymFlow Demo Club",
    gymCode,
    name: "Ravi Kumar",
    email: "ravi@example.com",
    role: "member",
    password: "password123",
    createdAt: now,
    updatedAt: now
  };

  const member2User = {
    id: "demo-member-neha",
    uid: "uid-neha-singh",
    gymId,
    gymName: "GymFlow Demo Club",
    gymCode,
    name: "Neha Singh",
    email: "neha@example.com",
    role: "member",
    password: "password123",
    createdAt: now,
    updatedAt: now
  };

  const collections = {};
  COLLECTIONS.forEach((collection) => {
    collections[collection] = [];
  });

  collections.membership_plans = defaultPlans(gymId);
  collections.badges = defaultBadges(gymId);
  collections.trainers = [
    doc("trainer", gymId, { name: "Rahul Mehta", mobile: "+91 90000 10001", email: "rahul@example.com", specialization: "Strength", experience: "5 years" }),
    doc("trainer", gymId, { name: "Anika Rao", mobile: "+91 90000 10002", email: "anika@example.com", specialization: "Weight loss", experience: "4 years" })
  ];
  collections.members = [
    doc("member", gymId, {
      fullName: "Ravi Kumar",
      mobile: "+91 98765 43210",
      email: "ravi@example.com",
      uid: "uid-ravi-kumar",
      gender: "Male",
      joinDate: today(-35),
      planId: collections.membership_plans[0].id,
      startDate: today(-25),
      endDate: today(5),
      assignedTrainer: collections.trainers[0].id,
      status: "Active"
    }),
    doc("member", gymId, {
      fullName: "Neha Singh",
      mobile: "+91 98765 43211",
      email: "neha@example.com",
      uid: "uid-neha-singh",
      gender: "Female",
      joinDate: today(-80),
      planId: collections.membership_plans[1].id,
      startDate: today(-75),
      endDate: today(15),
      assignedTrainer: collections.trainers[1].id,
      status: "Active"
    }),
    doc("member", gymId, {
      fullName: "Arjun Das",
      mobile: "+91 98765 43212",
      email: "arjun@example.com",
      gender: "Male",
      joinDate: today(-140),
      planId: collections.membership_plans[0].id,
      startDate: today(-65),
      endDate: today(-3),
      assignedTrainer: collections.trainers[0].id,
      status: "Expired"
    })
  ];
  collections.payments = [
    doc("payment", gymId, {
      memberId: collections.members[0].id,
      amount: 1500,
      date: today(-25),
      method: "UPI",
      planId: collections.membership_plans[0].id,
      collectedBy: "Demo Owner",
      status: "Paid"
    }),
    doc("payment", gymId, {
      memberId: collections.members[1].id,
      amount: 3999,
      date: today(-75),
      method: "Card",
      planId: collections.membership_plans[1].id,
      collectedBy: "Demo Owner",
      status: "Paid"
    })
  ];
  collections.attendance = [
    doc("attendance", gymId, { memberId: collections.members[0].id, date: today(0), time: "07:45", trainerId: collections.trainers[0].id }),
    doc("attendance", gymId, { memberId: collections.members[1].id, date: today(-1), time: "18:10", trainerId: collections.trainers[1].id })
  ];
  collections.reminders = [];

  return {
    version: 1,
    sessionUserId: owner.id,
    gymCodes: { [gymCode]: { code: gymCode, gymId, gymName: "GymFlow Demo Club" } },
    settings: {
      id: gymId,
      gymId,
      gymName: "GymFlow Demo Club",
      gymCode,
      ownerName: owner.name,
      contactEmail: owner.email,
      currency: "INR",
      phone: "+91 90000 00000",
      address: "Main Road, Hyderabad",
      createdAt: now,
      updatedAt: now
    },
    users: [owner, member1User, member2User],
    collections
  };
}

function defaultPlans(gymId) {
  return [
    doc("plan", gymId, {
      planName: "Monthly Membership",
      durationDays: 30,
      price: 1999,
      description: "Gym access during standard operating hours",
      benefits: "Full equipment access (cardio, strength, functional), 1 welcome session with trainer, Locker facility access"
    }),
    doc("plan", gymId, {
      planName: "3 Months Membership",
      durationDays: 90,
      price: 5399,
      description: "Special timings (10:00 AM - 11:30 AM) with semi-private group attention",
      benefits: "Training for family or friends (3-4 members), Semi-private group attention & coaching, Full equipment & locker access"
    }),
    doc("plan", gymId, {
      planName: "6 Months Membership",
      durationDays: 180,
      price: 9599,
      description: "Customized workouts based on individual health type",
      benefits: "Group timings (3 days a week), Dedicated tracking and performance testing, Close alignment with Coach Shaik Arshad"
    }),
    doc("plan", gymId, {
      planName: "Annual Membership",
      durationDays: 395,
      price: 16799,
      description: "13 months total access",
      benefits: "Save over ₹7,000/year, Ability to pause membership for up to 20 days, Customized fitness assessment"
    })
  ];
}

function doc(prefix, gymId, data) {
  const now = timestamp();
  return {
    id: createId(prefix),
    gymId,
    createdAt: now,
    updatedAt: now,
    ...data
  };
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function byUpdatedAt(a, b) {
  return String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
}

function createId(prefix) {
  const random = crypto?.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

// Turn raw Firebase Auth errors into human-friendly messages.
function friendlyAuthError(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/invalid-login-credentials": "Incorrect email or password.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/user-not-found": "No account found with that email.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/email-already-in-use": "An account with this email already exists. Please log in instead.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/missing-password": "Please enter your password.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/operation-not-allowed": "Email/password sign-in isn't enabled in Firebase Console. Go to Firebase Console > Authentication > Sign-in method.",
    "auth/configuration-not-found": "Firebase Authentication is not enabled yet. Open Firebase Console > Authentication and click 'Get Started'."
  };
  if (String(error?.message || "").includes("CONFIGURATION_NOT_FOUND")) {
    return new Error("Firebase Authentication is not enabled yet. Open Firebase Console > Authentication and click 'Get Started'.");
  }
  if (map[code]) return new Error(map[code]);
  // Strip the noisy "Firebase: ... (auth/...)." wrapper if we don't have a mapping.
  const clean = String(error?.message || "Something went wrong. Please try again.")
    .replace(/^Firebase:\s*/i, "")
    .replace(/\s*\(auth\/[^)]+\)\.?$/i, "");
  return new Error(clean || "Something went wrong. Please try again.");
}

// Short, shareable, phone-friendly gym code: PREFIX-NNNN (e.g. GRIP-4821).
function makeGymCode(gymName) {
  const prefix = String(gymName || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "GYM";
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${suffix}`;
}

// Reserve a unique gym code by writing the public gym_codes/{CODE} lookup doc.
// Read-then-create loop; the 9000-suffix space makes collisions rare for the
// expected number of gyms. Returns the reserved code.
async function reserveGymCode(db, api, gymName, gymId) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = makeGymCode(gymName);
    const ref = api.doc(db, "gym_codes", code);
    const existing = await api.getDoc(ref);
    if (existing.exists()) continue;
    await api.setDoc(ref, { code, gymId, gymName, createdAt: timestamp() });
    return code;
  }
  // Extremely unlikely fallback: append part of the gymId for uniqueness.
  const code = `${makeGymCode(gymName)}${gymId.slice(0, 2).toUpperCase()}`;
  await api.setDoc(api.doc(db, "gym_codes", code), { code, gymId, gymName, createdAt: timestamp() });
  return code;
}

function timestamp() {
  return new Date().toISOString();
}

function today(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function defaultBadges(gymId) {
  return [
    doc("badge", gymId, {
      id: "streak-starter",
      name: "Streak Starter",
      description: "Unlocked a 3-day consecutive workouts streak",
      icon: "local_fire_department",
      type: "streak",
      threshold: 3
    }),
    doc("badge", gymId, {
      id: "unstoppable",
      name: "Unstoppable",
      description: "Unlocked a 7-day consecutive workouts streak",
      icon: "whatshot",
      type: "streak",
      threshold: 7
    }),
    doc("badge", gymId, {
      id: "consistency-50",
      name: "Consistency King",
      description: "Completed 50 workouts in total",
      icon: "military_tech",
      type: "workout_count",
      threshold: 50
    }),
    doc("badge", gymId, {
      id: "consistency-100",
      name: "Iron Addict",
      description: "Completed 100 workouts in total",
      icon: "workspace_premium",
      type: "workout_count",
      threshold: 100
    }),
    doc("badge", gymId, {
      id: "consistency-250",
      name: "Century Club",
      description: "Completed 250 workouts in total",
      icon: "stars",
      type: "workout_count",
      threshold: 250
    }),
    doc("badge", gymId, {
      id: "pr-hitter",
      name: "Limit Breaker",
      description: "Unlocked by hitting your first Personal Record (PR)",
      icon: "fitness_center",
      type: "pr",
      threshold: 1
    }),
    doc("badge", gymId, {
      id: "heavy-lifter",
      name: "Heavy Lifter",
      description: "Unlocked by logging a set weight over 100kg/220lbs",
      icon: "sports_gymnastics",
      type: "pr_weight",
      threshold: 100
    })
  ];
}

async function seedDefaultBadgesFirebase(db, api, gymId) {
  const badges = defaultBadges(gymId);
  await Promise.all(badges.map((badge) => api.setDoc(api.doc(db, "badges", badge.id), badge)));
}
