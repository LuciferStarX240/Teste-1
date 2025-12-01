import { User, Role, Service, Sale, AppSettings, Log, Timesheet, Coupon } from "../types";
import { auth, db, storage } from "../firebaseConfig";
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
  getDoc,
  setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { DEFAULT_SETTINGS } from "../constants";

// --- COLLECTIONS ---
const USERS_COL = 'users';
const SERVICES_COL = 'services';
const SALES_COL = 'sales';
const LOGS_COL = 'logs';
const SETTINGS_COL = 'settings';
const TIMESHEETS_COL = 'timesheets';
const COUPONS_COL = 'coupons';

// --- HELPER FUNCTIONS ---

const mapDoc = <T>(doc: any): T => ({ id: doc.id, ...doc.data() });

const sendDiscordNotification = async (content: string, webhookUrl?: string) => {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
  } catch (e) {
    console.error("Failed to send Discord notification", e);
  }
};

export const AuthAPI = {
  login: async (email: string, password: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
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
    if (currentUser.role === Role.MECHANIC) {
      q = query(collection(db, SALES_COL), where("userId", "==", currentUser.id), orderBy("createdAt", "desc"));
    } else {
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
    const serviceRef = doc(db, SERVICES_COL, saleData.serviceId);
    const serviceSnap = await getDoc(serviceRef);
    if (!serviceSnap.exists()) throw new Error("Service not found");
    const service = serviceSnap.data() as Service;

    // Calculate total with discount
    const total = (service.price * saleData.quantity) * (1 - (saleData.discount || 0) / 100);

    const newSale = {
      ...saleData,
      serviceName: service.name,
      userName: user.username,
      total,
      createdAt: Date.now()
    };

    const docRef = await addDoc(collection(db, SALES_COL), newSale);
    
    const logDetails = `Vendeu ${newSale.quantity}x ${newSale.serviceName} (Total: R$${total})`;
    await DataAPI.logAction(user, 'CREATE_SALE', logDetails);

    // Trigger Webhook
    const settings = await DataAPI.getSettings();
    if (settings.webhookUrl) {
      await sendDiscordNotification(
        `💰 **Nova Venda**\n👤 **Mecânico:** ${user.username}\n🛠 **Serviço:** ${newSale.serviceName}\n🔢 **Qtd:** ${newSale.quantity}\n💵 **Total:** R$ ${total.toLocaleString()}`,
        settings.webhookUrl
      );
    }
  },

  // --- Users CRUD ---
  getUsers: async (): Promise<User[]> => {
    const q = query(collection(db, USERS_COL));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<User>(d));
  },

  addUser: async (userData: Omit<User, 'id'>, admin: User): Promise<void> => {
    await addDoc(collection(db, USERS_COL), userData);
    await DataAPI.logAction(admin, 'CREATE_USER', `Cadastrou perfil de ${userData.username}`);
    
    const settings = await DataAPI.getSettings();
    await sendDiscordNotification(`👷 **Novo Membro na Equipe**\nNome: ${userData.username}\nCargo: ${userData.role}`, settings.webhookUrl);
  },

  deleteUser: async (id: string, admin: User): Promise<void> => {
    await deleteDoc(doc(db, USERS_COL, id));
    await DataAPI.logAction(admin, 'DELETE_USER', `Removeu usuário ID ${id}`);
  },

  // --- Coupons CRUD ---
  getCoupons: async (): Promise<Coupon[]> => {
    const q = query(collection(db, COUPONS_COL));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<Coupon>(d));
  },

  getCouponByCode: async (code: string): Promise<Coupon | null> => {
    const q = query(collection(db, COUPONS_COL), where("code", "==", code), where("active", "==", true));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return mapDoc<Coupon>(snapshot.docs[0]);
  },

  addCoupon: async (coupon: Omit<Coupon, 'id'>, user: User): Promise<void> => {
    await addDoc(collection(db, COUPONS_COL), coupon);
    await DataAPI.logAction(user, 'CREATE_COUPON', `Criou cupom ${coupon.code}`);
  },

  toggleCoupon: async (id: string, active: boolean, user: User): Promise<void> => {
    await updateDoc(doc(db, COUPONS_COL, id), { active });
    await DataAPI.logAction(user, 'UPDATE_COUPON', `Alterou status do cupom ${id} para ${active}`);
  },

  deleteCoupon: async (id: string, user: User): Promise<void> => {
    await deleteDoc(doc(db, COUPONS_COL, id));
    await DataAPI.logAction(user, 'DELETE_COUPON', `Removeu cupom ${id}`);
  },

  // --- Settings & Storage ---
  getSettings: async (): Promise<AppSettings> => {
    const ref = doc(db, SETTINGS_COL, 'general');
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      return snapshot.data() as AppSettings;
    }
    return { ...DEFAULT_SETTINGS };
  },

  updateSettings: async (settings: AppSettings, user: User): Promise<void> => {
    const ref = doc(db, SETTINGS_COL, 'general');
    await setDoc(ref, settings);
    await DataAPI.logAction(user, 'UPDATE_SETTINGS', `Alterou configurações gerais`);
  },

  uploadLogo: async (file: File): Promise<string> => {
    const storageRef = ref(storage, `settings/logo_${Date.now()}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
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
    const q = query(
      collection(db, TIMESHEETS_COL), 
      where("userId", "==", user.id), 
      where("clockOut", "==", null)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return;

    await addDoc(collection(db, TIMESHEETS_COL), {
      userId: user.id,
      clockIn: Date.now(),
      clockOut: null
    });
    
    await DataAPI.logAction(user, 'CLOCK_IN', 'Iniciou turno');
    const settings = await DataAPI.getSettings();
    await sendDiscordNotification(`⏰ **Ponto Iniciado**\nUsuário: ${user.username}`, settings.webhookUrl);
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
      
      const settings = await DataAPI.getSettings();
      await sendDiscordNotification(`🛑 **Ponto Finalizado**\nUsuário: ${user.username}`, settings.webhookUrl);
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