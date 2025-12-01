import { User, Role, Service, Sale, AppSettings, Log, Timesheet } from "../types";
import { auth, db } from "../firebaseConfig";
import { 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  getDoc,
  setDoc
} from "firebase/firestore";
import { DEFAULT_SETTINGS } from "../constants";

// --- COLLECTIONS ---
const USERS_COL = 'users';
const SERVICES_COL = 'services';
const SALES_COL = 'sales';
const LOGS_COL = 'logs';
const SETTINGS_COL = 'settings';
const TIMESHEETS_COL = 'timesheets';

// --- HELPER FUNCTIONS ---

// Map Firestore doc to Type with ID
const mapDoc = <T>(doc: any): T => ({ id: doc.id, ...doc.data() });

export const AuthAPI = {
  login: async (email: string, password: string): Promise<User> => {
    // 1. Authenticate with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // 2. Fetch extra user details (Role, Avatar) from Firestore 'users' collection
    const userDocRef = doc(db, USERS_COL, uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      return {
        id: uid,
        email: userCredential.user.email || '',
        username: userData.username || 'User',
        role: userData.role || Role.MECHANIC,
        avatarUrl: userData.avatarUrl
      };
    } else {
      // Fallback if user exists in Auth but not in Firestore (should not happen in prod)
      return {
        id: uid,
        email: userCredential.user.email || '',
        username: 'Unknown',
        role: Role.MECHANIC,
        avatarUrl: 'https://picsum.photos/200'
      };
    }
  },
  
  logout: async () => {
    await signOut(auth);
  },

  // Helper to get current user profile from Firestore based on Auth UID
  getCurrentProfile: async (uid: string): Promise<User | null> => {
    try {
      const userDocRef = doc(db, USERS_COL, uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        return { 
          id: uid, 
          email: auth.currentUser?.email || '', 
          username: data.username, 
          role: data.role, 
          avatarUrl: data.avatarUrl 
        };
      }
      return null;
    } catch (e) {
      console.error("Error fetching profile", e);
      return null;
    }
  }
};

export const DataAPI = {
  // --- Services CRUD ---
  getServices: async (): Promise<Service[]> => {
    const q = query(collection(db, SERVICES_COL));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<Service>(d));
  },
  
  addService: async (service: Omit<Service, 'id'>, user: User): Promise<void> => {
    await addDoc(collection(db, SERVICES_COL), service);
    await DataAPI.logAction(user, 'CREATE_SERVICE', `Criou serviço ${service.name}`);
  },

  updateService: async (id: string, data: Partial<Service>, user: User): Promise<void> => {
    const ref = doc(db, SERVICES_COL, id);
    await updateDoc(ref, data);
    await DataAPI.logAction(user, 'UPDATE_SERVICE', `Atualizou serviço ID ${id}`);
  },

  deleteService: async (id: string, user: User): Promise<void> => {
    await deleteDoc(doc(db, SERVICES_COL, id));
    await DataAPI.logAction(user, 'DELETE_SERVICE', `Removeu serviço ID ${id}`);
  },

  // --- Sales CRUD ---
  getSales: async (currentUser: User): Promise<Sale[]> => {
    let q;
    // Security/Business Rule: Mechanic sees only their own sales
    if (currentUser.role === Role.MECHANIC) {
      q = query(collection(db, SALES_COL), where("userId", "==", currentUser.id), orderBy("createdAt", "desc"));
    } else {
      // Manager/Owner sees all
      q = query(collection(db, SALES_COL), orderBy("createdAt", "desc"));
    }
    
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => mapDoc<Sale>(d));
    } catch (e) {
      console.error("Error fetching sales. Check Firestore Indexes.", e);
      return [];
    }
  },

  addSale: async (saleData: Omit<Sale, 'id' | 'createdAt' | 'total'>, user: User): Promise<void> => {
    // 1. Get Service to calculate total
    const serviceRef = doc(db, SERVICES_COL, saleData.serviceId);
    const serviceSnap = await getDoc(serviceRef);
    
    if (!serviceSnap.exists()) throw new Error("Service not found");
    const service = serviceSnap.data() as Service;

    const total = (service.price * saleData.quantity) * (1 - (saleData.discount || 0) / 100);

    const newSale = {
      ...saleData,
      serviceName: service.name, // Denormalization
      userName: user.username,   // Denormalization
      total,
      createdAt: Date.now() // Using number timestamp for simplicity with existing Types
    };

    await addDoc(collection(db, SALES_COL), newSale);
    await DataAPI.logAction(user, 'CREATE_SALE', `Vendeu ${newSale.quantity}x ${newSale.serviceName}`);

    // Trigger Webhook if exists
    const settings = await DataAPI.getSettings();
    if (settings.webhookUrl) {
      // In a real app, do this via Cloud Functions to avoid CORS issues
      // For this demo, we just log it
      console.log("Triggering Webhook:", settings.webhookUrl);
    }
  },

  // --- Users CRUD ---
  getUsers: async (): Promise<User[]> => {
    const q = query(collection(db, USERS_COL));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<User>(d));
  },

  addUser: async (userData: Omit<User, 'id'>, admin: User): Promise<void> => {
    // Note: In a client-side only app, we can't create Auth Users without logging out the admin.
    // For this ERP demo, we will create the Firestore Profile.
    // The actual Auth User must be created manually in Firebase Console or via a separate Admin App.
    
    // We generate a placeholder ID or use an ID provided if we were syncing with Auth
    await addDoc(collection(db, USERS_COL), userData);
    await DataAPI.logAction(admin, 'CREATE_USER', `Cadastrou perfil de ${userData.username}`);
  },

  deleteUser: async (id: string, admin: User): Promise<void> => {
    await deleteDoc(doc(db, USERS_COL, id));
    await DataAPI.logAction(admin, 'DELETE_USER', `Removeu usuário ID ${id}`);
  },

  // --- Settings ---
  getSettings: async (): Promise<AppSettings> => {
    // We assume there is a doc called 'general' in settings collection
    const ref = doc(db, SETTINGS_COL, 'general');
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      return snapshot.data() as AppSettings;
    }
    return { ...DEFAULT_SETTINGS };
  },

  updateSettings: async (settings: AppSettings, user: User): Promise<void> => {
    const ref = doc(db, SETTINGS_COL, 'general');
    await setDoc(ref, settings); // setDoc creates if not exists
    await DataAPI.logAction(user, 'UPDATE_SETTINGS', `Alterou configurações gerais`);
  },

  // --- Logs ---
  logAction: async (user: User, action: string, details: string) => {
    const newLog: Omit<Log, 'id'> = {
      action,
      performedBy: user.username,
      details,
      createdAt: Date.now()
    };
    await addDoc(collection(db, LOGS_COL), newLog);
  },

  getLogs: async (): Promise<Log[]> => {
    const q = query(collection(db, LOGS_COL), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<Log>(d));
  },

  // --- Timesheets ---
  clockIn: async (user: User): Promise<void> => {
    // Check if already open
    const q = query(
      collection(db, TIMESHEETS_COL), 
      where("userId", "==", user.id), 
      where("clockOut", "==", null) // Assuming null or missing means open
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) return; // Already clocked in

    await addDoc(collection(db, TIMESHEETS_COL), {
      userId: user.id,
      clockIn: Date.now(),
      clockOut: null
    });
    await DataAPI.logAction(user, 'CLOCK_IN', 'Iniciou turno');
  },

  clockOut: async (user: User): Promise<void> => {
    const q = query(
      collection(db, TIMESHEETS_COL), 
      where("userId", "==", user.id), 
      where("clockOut", "==", null)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, { clockOut: Date.now() });
      await DataAPI.logAction(user, 'CLOCK_OUT', 'Finalizou turno');
    }
  },

  getStatus: async (userId: string): Promise<'working' | 'offline'> => {
    const q = query(
      collection(db, TIMESHEETS_COL), 
      where("userId", "==", userId), 
      where("clockOut", "==", null)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty ? 'working' : 'offline';
  }
};