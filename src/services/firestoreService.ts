import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import {
  AppNotification,
  BOOTSTRAPPED_ADMIN_EMAIL,
  Category,
  Complaint,
  ComplaintStatus,
  ContainerStatus,
  CURATED_MEAL_IMAGES,
  DEFAULT_PRICING_CONFIG,
  DietaryTag,
  FoodProvider,
  Meal,
  MealCategory,
  Order,
  OrderStatus,
  PlanType,
  PricingConfig,
  ProviderStatus,
  ProviderType,
  Review,
  SavedAddress,
  SCHEMA_LIMITS,
  Subscription,
  SubscriptionStatus,
  UserProfile,
  UserRole,
} from '../types/mealloop';

export function generateSafeId(prefix: string): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'doc';
  const rand = Math.random().toString(36).slice(2, 8);
  return `${cleanPrefix}_${Date.now()}_${rand}`.slice(0, SCHEMA_LIMITS.ID_MAX);
}

function clampStr(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function timestampToMs(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts !== null && 'toMillis' in ts && typeof (ts as { toMillis: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return Number((ts as { seconds: number }).seconds) * 1000;
  }
  return 0;
}

export function sortByCreatedDesc<T extends { createdAt?: unknown }>(items: T[]): T[] {
  return [...items].sort((a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt));
}

// --- Catalog Listeners (Public & Authenticated) ---

export function subscribePricingConfig(
  callback: (config: PricingConfig) => void
): Unsubscribe {
  const path = 'pricingConfig/default';
  return onSnapshot(
    doc(db, 'pricingConfig', 'default'),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as PricingConfig);
      } else {
        callback(DEFAULT_PRICING_CONFIG);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeCategories(
  isAdminUser: boolean,
  callback: (categories: Category[]) => void
): Unsubscribe {
  const path = 'categories';
  const q = isAdminUser
    ? query(collection(db, path))
    : query(collection(db, path), where('isActive', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Category);
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      callback(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeMeals(
  mode: 'public' | 'provider' | 'admin',
  ownerUid: string | null,
  callback: (meals: Meal[]) => void
): Unsubscribe {
  const path = 'meals';
  let q = query(collection(db, path), where('status', '==', 'active'));
  if (mode === 'provider' && ownerUid) {
    q = query(collection(db, path), where('providerOwnerId', '==', ownerUid));
  } else if (mode === 'admin') {
    q = query(collection(db, path));
  }

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Meal);
      callback(sortByCreatedDesc(list));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeProviders(
  mode: 'public' | 'provider' | 'admin',
  ownerUid: string | null,
  callback: (providers: FoodProvider[]) => void
): Unsubscribe {
  const path = 'foodProviders';
  let q = query(collection(db, path), where('status', '==', 'approved'));
  if (mode === 'provider' && ownerUid) {
    q = query(collection(db, path), where('ownerId', '==', ownerUid));
  } else if (mode === 'admin') {
    q = query(collection(db, path));
  }

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as FoodProvider);
      callback(sortByCreatedDesc(list));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeReviews(callback: (reviews: Review[]) => void): Unsubscribe {
  const path = 'reviews';
  const q = query(collection(db, path), where('rating', '>=', 1));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Review);
      callback(sortByCreatedDesc(list));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

// --- User-Scoped Listeners ---

export function subscribeOrders(
  roleMode: 'student' | 'provider' | 'admin',
  uid: string,
  callback: (orders: Order[]) => void
): Unsubscribe {
  const path = 'orders';
  let q = query(collection(db, path), where('userId', '==', uid));
  if (roleMode === 'provider') {
    q = query(collection(db, path), where('providerOwnerId', '==', uid));
  } else if (roleMode === 'admin') {
    q = query(collection(db, path));
  }

  return onSnapshot(
    q,
    (snap) => {
      callback(sortByCreatedDesc(snap.docs.map((d) => d.data() as Order)));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeSubscriptions(
  roleMode: 'student' | 'provider' | 'admin',
  uid: string,
  callback: (subs: Subscription[]) => void
): Unsubscribe {
  const path = 'subscriptions';
  let q = query(collection(db, path), where('userId', '==', uid));
  if (roleMode === 'provider') {
    q = query(collection(db, path), where('providerOwnerId', '==', uid));
  } else if (roleMode === 'admin') {
    q = query(collection(db, path));
  }

  return onSnapshot(
    q,
    (snap) => {
      callback(sortByCreatedDesc(snap.docs.map((d) => d.data() as Subscription)));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeAddresses(
  uid: string,
  callback: (addresses: SavedAddress[]) => void
): Unsubscribe {
  const path = 'addresses';
  const q = query(collection(db, path), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      callback(sortByCreatedDesc(snap.docs.map((d) => d.data() as SavedAddress)));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeNotifications(
  uid: string,
  callback: (items: AppNotification[]) => void
): Unsubscribe {
  const path = 'notifications';
  const q = query(collection(db, path), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      callback(sortByCreatedDesc(snap.docs.map((d) => d.data() as AppNotification)));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeComplaints(
  isAdminUser: boolean,
  uid: string,
  callback: (items: Complaint[]) => void
): Unsubscribe {
  const path = 'complaints';
  const q = isAdminUser
    ? query(collection(db, path))
    : query(collection(db, path), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      callback(sortByCreatedDesc(snap.docs.map((d) => d.data() as Complaint)));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeAllUsers(callback: (users: UserProfile[]) => void): Unsubscribe {
  const path = 'users';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      callback(sortByCreatedDesc(snap.docs.map((d) => d.data() as UserProfile)));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

// --- User & Profile Mutations ---

export async function updateUserProfile(
  uid: string,
  data: { displayName: string; phone: string; hostelOrPg: string; emailVerified: boolean }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: clampStr(data.displayName, SCHEMA_LIMITS.NAME_MAX) || 'Student',
      phone: clampStr(data.phone, SCHEMA_LIMITS.PHONE_MAX),
      hostelOrPg: clampStr(data.hostelOrPg, 160),
      emailVerified: data.emailVerified,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdateUserRole(uid: string, role: UserRole): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      role,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Address Mutations ---

export async function saveAddress(
  userId: string,
  input: {
    label: string;
    hostelOrPgName: string;
    roomNumber: string;
    landmark: string;
    phone: string;
    isDefault: boolean;
  }
): Promise<string> {
  const id = generateSafeId('addr');
  const path = `addresses/${id}`;
  try {
    await setDoc(doc(db, 'addresses', id), {
      id,
      userId,
      label: clampStr(input.label, 40) || 'Hostel',
      hostelOrPgName: clampStr(input.hostelOrPgName, SCHEMA_LIMITS.HOSTEL_MAX),
      roomNumber: clampStr(input.roomNumber, 40),
      landmark: clampStr(input.landmark, 160),
      phone: clampStr(input.phone, SCHEMA_LIMITS.PHONE_MAX),
      isDefault: Boolean(input.isDefault),
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeAddress(addressId: string): Promise<void> {
  const path = `addresses/${addressId}`;
  try {
    await deleteDoc(doc(db, 'addresses', addressId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Orders Mutations ---

export async function placeOrder(params: {
  userId: string;
  customerName: string;
  meal: Meal;
  quantity: number;
  deliveryAddress: string;
  notes: string;
}): Promise<string> {
  const id = generateSafeId('ord');
  const path = `orders/${id}`;
  const qty = Math.min(20, Math.max(1, Math.round(params.quantity)));
  const totalAmount = Number((params.meal.price * qty).toFixed(2));

  try {
    await setDoc(doc(db, 'orders', id), {
      id,
      userId: params.userId,
      customerName: clampStr(params.customerName, SCHEMA_LIMITS.NAME_MAX) || 'Student',
      providerId: params.meal.providerId,
      providerOwnerId: params.meal.providerOwnerId,
      providerName: clampStr(params.meal.providerName, 120),
      mealId: params.meal.id,
      mealTitle: clampStr(params.meal.title, SCHEMA_LIMITS.TITLE_MAX),
      mealCategory: params.meal.category,
      quantity: qty,
      unitPrice: params.meal.price,
      unitCost: params.meal.variableCost,
      totalAmount,
      deliveryAddress: clampStr(params.deliveryAddress, SCHEMA_LIMITS.ADDRESS_MAX),
      status: 'Order Placed',
      containerStatus: 'Issued',
      notes: clampStr(params.notes, SCHEMA_LIMITS.NOTES_MAX),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const notifId = generateSafeId('notif');
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: params.userId,
      title: 'Order Placed',
      message: `${params.meal.title} (x${qty}) placed with ${params.meal.providerName}. MealLoop Green container assigned.`,
      type: 'order',
      read: false,
      createdAt: serverTimestamp(),
    });

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateOrderContainerStatus(
  orderId: string,
  containerStatus: ContainerStatus
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      containerStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdateOrder(
  orderId: string,
  updates: { status?: OrderStatus; containerStatus?: ContainerStatus }
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Subscription Mutations ---

export async function createSubscription(params: {
  userId: string;
  customerName: string;
  provider: FoodProvider;
  planType: PlanType;
  mealPreference: DietaryTag;
  mealSlots: MealCategory[];
  durationDays: number;
  pricePerMeal: number;
  deliveryAddress: string;
  startDate: string;
}): Promise<string> {
  const id = generateSafeId('sub');
  const path = `subscriptions/${id}`;
  const mealsPerDay = Math.min(3, Math.max(1, params.mealSlots.length));
  const durationDays = Math.min(90, Math.max(1, params.durationDays));
  const totalMeals = mealsPerDay * durationDays;
  const totalAmount = Number((totalMeals * params.pricePerMeal).toFixed(2));

  try {
    await setDoc(doc(db, 'subscriptions', id), {
      id,
      userId: params.userId,
      customerName: clampStr(params.customerName, SCHEMA_LIMITS.NAME_MAX) || 'Student',
      providerId: params.provider.id,
      providerOwnerId: params.provider.ownerId,
      providerName: clampStr(params.provider.name, 120),
      planType: params.planType,
      mealPreference: params.mealPreference,
      mealSlots: params.mealSlots.slice(0, 3),
      mealsPerDay,
      durationDays,
      totalMeals,
      pricePerMeal: params.pricePerMeal,
      totalAmount,
      deliveryAddress: clampStr(params.deliveryAddress, SCHEMA_LIMITS.ADDRESS_MAX),
      startDate: clampStr(params.startDate, 40),
      status: 'Active',
      containersInUse: mealsPerDay,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const notifId = generateSafeId('notif');
    await setDoc(doc(db, 'notifications', notifId), {
      id: notifId,
      userId: params.userId,
      title: `${params.planType} Meal Plan Activated`,
      message: `${totalMeals} meals (${params.mealSlots.join(', ')}) starting ${params.startDate} with ${params.provider.name}.`,
      type: 'subscription',
      read: false,
      createdAt: serverTimestamp(),
    });

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateSubscriptionStatus(
  subId: string,
  status: SubscriptionStatus
): Promise<void> {
  const path = `subscriptions/${subId}`;
  try {
    await updateDoc(doc(db, 'subscriptions', subId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateSubscriptionContainers(
  subId: string,
  containersInUse: number
): Promise<void> {
  const path = `subscriptions/${subId}`;
  try {
    await updateDoc(doc(db, 'subscriptions', subId), {
      containersInUse: Math.max(0, Math.min(10, containersInUse)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Reviews & Complaints ---

export async function submitReview(params: {
  userId: string;
  userName: string;
  mealId: string;
  providerId: string;
  orderId: string;
  rating: number;
  comment: string;
}): Promise<void> {
  const id = generateSafeId('rev');
  const path = `reviews/${id}`;
  try {
    await setDoc(doc(db, 'reviews', id), {
      id,
      userId: params.userId,
      userName: clampStr(params.userName, SCHEMA_LIMITS.NAME_MAX) || 'Student',
      mealId: params.mealId,
      providerId: params.providerId,
      orderId: params.orderId,
      rating: Math.min(5, Math.max(1, Math.round(params.rating))),
      comment: clampStr(params.comment, SCHEMA_LIMITS.COMMENT_MAX),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitComplaint(params: {
  userId: string;
  userName: string;
  orderId: string;
  subject: string;
  description: string;
}): Promise<void> {
  const id = generateSafeId('cmp');
  const path = `complaints/${id}`;
  try {
    await setDoc(doc(db, 'complaints', id), {
      id,
      userId: params.userId,
      userName: clampStr(params.userName, SCHEMA_LIMITS.NAME_MAX) || 'Student',
      orderId: clampStr(params.orderId, 128),
      subject: clampStr(params.subject, SCHEMA_LIMITS.SUBJECT_MAX),
      description: clampStr(params.description, SCHEMA_LIMITS.DESC_MAX),
      status: 'Open',
      adminResponse: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function adminResolveComplaint(
  complaintId: string,
  status: ComplaintStatus,
  adminResponse: string
): Promise<void> {
  const path = `complaints/${complaintId}`;
  try {
    await updateDoc(doc(db, 'complaints', complaintId), {
      status,
      adminResponse: clampStr(adminResponse, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// --- Food Provider Operations ---

export async function registerFoodProvider(params: {
  ownerId: string;
  name: string;
  type: ProviderType;
  description: string;
  location: string;
}): Promise<string> {
  const id = generateSafeId('prov');
  const path = `foodProviders/${id}`;
  try {
    await setDoc(doc(db, 'foodProviders', id), {
      id,
      ownerId: params.ownerId,
      name: clampStr(params.name, 120),
      type: params.type,
      description: clampStr(params.description, 500),
      location: clampStr(params.location, 200),
      hygieneScore: 4.5,
      status: 'pending',
      isOpen: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateProviderDetails(
  providerId: string,
  updates: { name?: string; type?: ProviderType; description?: string; location?: string; isOpen?: boolean }
): Promise<void> {
  const path = `foodProviders/${providerId}`;
  try {
    const cleanUpdates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.name !== undefined) cleanUpdates.name = clampStr(updates.name, 120);
    if (updates.type !== undefined) cleanUpdates.type = updates.type;
    if (updates.description !== undefined) cleanUpdates.description = clampStr(updates.description, 500);
    if (updates.location !== undefined) cleanUpdates.location = clampStr(updates.location, 200);
    if (updates.isOpen !== undefined) cleanUpdates.isOpen = updates.isOpen;
    await updateDoc(doc(db, 'foodProviders', providerId), cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdateProviderStatus(
  providerId: string,
  status: ProviderStatus,
  hygieneScore?: number
): Promise<void> {
  const path = `foodProviders/${providerId}`;
  try {
    const payload: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (typeof hygieneScore === 'number') {
      payload.hygieneScore = Math.min(5, Math.max(0, hygieneScore));
    }
    await updateDoc(doc(db, 'foodProviders', providerId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function uploadMealImage(
  providerId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ url: string; usedStorage: boolean; warning?: string }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageRef = ref(storage, `meals/${providerId}/${Date.now()}_${safeName}`);

  try {
    const url = await new Promise<string>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file);
      const timeoutId = setTimeout(() => {
        task.cancel();
        reject(new Error('Storage upload timed out. Verify Firebase Storage bucket & rules are enabled in Firebase Console.'));
      }, 15000);

      task.on(
        'state_changed',
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress?.(pct);
        },
        (err) => {
          clearTimeout(timeoutId);
          reject(err);
        },
        async () => {
          clearTimeout(timeoutId);
          const downloadUrl = await getDownloadURL(task.snapshot.ref);
          resolve(downloadUrl);
        }
      );
    });
    return { url, usedStorage: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Firebase Storage upload unavailable.';
    return {
      url: '',
      usedStorage: false,
      warning: `Firebase Storage upload failed (${message}). Ensure Firebase Storage is activated in Firebase Console for project gen-lang-client-0445857787, or choose a curated kitchen photo / paste an image URL below.`,
    };
  }
}

export async function createMeal(params: {
  provider: FoodProvider;
  title: string;
  description: string;
  category: MealCategory;
  dietaryTag: DietaryTag;
  price: number;
  variableCost: number;
  imageUrl: string;
  calories: number;
  isTodaysSpecial: boolean;
}): Promise<string> {
  const id = generateSafeId('meal');
  const path = `meals/${id}`;
  try {
    await setDoc(doc(db, 'meals', id), {
      id,
      providerId: params.provider.id,
      providerOwnerId: params.provider.ownerId,
      providerName: clampStr(params.provider.name, 120),
      title: clampStr(params.title, SCHEMA_LIMITS.TITLE_MAX),
      description: clampStr(params.description, SCHEMA_LIMITS.DESC_MAX),
      category: params.category,
      dietaryTag: params.dietaryTag,
      price: Math.max(1, Number(params.price)),
      variableCost: Math.max(0, Number(params.variableCost)),
      imageUrl: clampStr(params.imageUrl, SCHEMA_LIMITS.IMAGE_URL_MAX),
      calories: Math.max(0, Math.round(params.calories)),
      isAvailable: true,
      isTodaysSpecial: Boolean(params.isTodaysSpecial),
      status: 'active',
      ratingAvg: 5.0,
      ratingCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateMeal(
  mealId: string,
  updates: Partial<
    Pick<
      Meal,
      | 'title'
      | 'description'
      | 'category'
      | 'dietaryTag'
      | 'price'
      | 'variableCost'
      | 'imageUrl'
      | 'calories'
      | 'isAvailable'
      | 'isTodaysSpecial'
      | 'status'
    >
  >
): Promise<void> {
  const path = `meals/${mealId}`;
  try {
    const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.title !== undefined) clean.title = clampStr(updates.title, SCHEMA_LIMITS.TITLE_MAX);
    if (updates.description !== undefined) clean.description = clampStr(updates.description, SCHEMA_LIMITS.DESC_MAX);
    if (updates.category !== undefined) clean.category = updates.category;
    if (updates.dietaryTag !== undefined) clean.dietaryTag = updates.dietaryTag;
    if (updates.price !== undefined) clean.price = Math.max(1, Number(updates.price));
    if (updates.variableCost !== undefined) clean.variableCost = Math.max(0, Number(updates.variableCost));
    if (updates.imageUrl !== undefined) clean.imageUrl = clampStr(updates.imageUrl, SCHEMA_LIMITS.IMAGE_URL_MAX);
    if (updates.calories !== undefined) clean.calories = Math.max(0, Math.round(updates.calories));
    if (updates.isAvailable !== undefined) clean.isAvailable = Boolean(updates.isAvailable);
    if (updates.isTodaysSpecial !== undefined) clean.isTodaysSpecial = Boolean(updates.isTodaysSpecial);
    if (updates.status !== undefined) clean.status = updates.status;
    await updateDoc(doc(db, 'meals', mealId), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMeal(mealId: string): Promise<void> {
  const path = `meals/${mealId}`;
  try {
    await deleteDoc(doc(db, 'meals', mealId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Admin Config & Catalog Management ---

export async function savePricingConfig(config: Omit<PricingConfig, 'id' | 'updatedAt'>): Promise<void> {
  const path = 'pricingConfig/default';
  try {
    await setDoc(doc(db, 'pricingConfig', 'default'), {
      id: 'default',
      defaultSellingPrice: Math.max(1, Number(config.defaultSellingPrice)),
      estimatedVariableCost: Math.max(0, Number(config.estimatedVariableCost)),
      monthlyFixedCost: Math.max(0, Number(config.monthlyFixedCost)),
      dailyPlanDiscountPct: Math.min(50, Math.max(0, Number(config.dailyPlanDiscountPct))),
      weeklyPlanDiscountPct: Math.min(50, Math.max(0, Number(config.weeklyPlanDiscountPct))),
      monthlyPlanDiscountPct: Math.min(50, Math.max(0, Number(config.monthlyPlanDiscountPct))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCategory(category: {
  id?: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}): Promise<void> {
  const id = category.id || generateSafeId('cat');
  const path = `categories/${id}`;
  const slug = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || 'cat';
  try {
    await setDoc(doc(db, 'categories', id), {
      id,
      name: clampStr(category.name, 60),
      slug,
      description: clampStr(category.description, 240),
      sortOrder: Math.max(0, Math.round(category.sortOrder)),
      isActive: Boolean(category.isActive),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Admin Initial Catalog Seeder (Stores real persistent docs in Firestore) ---

export async function seedStarterCatalog(adminUid: string, adminEmail: string): Promise<void> {
  if (adminEmail.toLowerCase() !== BOOTSTRAPPED_ADMIN_EMAIL) {
    // Also verify /admins/{uid} exists
    const adminSnap = await getDoc(doc(db, 'admins', adminUid));
    if (!adminSnap.exists()) {
      throw new Error('Only Admin can initialize the starter catalog.');
    }
  }

  const batch = writeBatch(db);

  // 1. Pricing Config (Exact Venture Plan numbers: ₹80 selling, ₹55 cost, ₹15,000 fixed)
  batch.set(doc(db, 'pricingConfig', 'default'), {
    id: 'default',
    defaultSellingPrice: 80,
    estimatedVariableCost: 55,
    monthlyFixedCost: 15000,
    dailyPlanDiscountPct: 0,
    weeklyPlanDiscountPct: 5,
    monthlyPlanDiscountPct: 12,
    updatedAt: serverTimestamp(),
  });

  // 2. Categories
  const starterCategories: Category[] = [
    {
      id: 'cat_breakfast',
      name: 'Breakfast',
      slug: 'breakfast',
      description: 'Hot morning parathas, poha, and chai delivered before 8:30 AM lectures.',
      sortOrder: 1,
      isActive: true,
    },
    {
      id: 'cat_lunch',
      name: 'Lunch',
      slug: 'lunch',
      description: 'Balanced student thalis & rice bowls delivered to DBS Campus & nearby PGs.',
      sortOrder: 2,
      isActive: true,
    },
    {
      id: 'cat_dinner',
      name: 'Dinner',
      slug: 'dinner',
      description: 'Homestyle evening meals in sanitized MealLoop Green stainless steel tiffins.',
      sortOrder: 3,
      isActive: true,
    },
  ];
  for (const cat of starterCategories) {
    batch.set(doc(db, 'categories', cat.id), cat);
  }

  // 3. Approved Local Messes & Tiffins in Dehradun (near DBS Global University, Miwala/Selaqui/Premnagar)
  const providers = [
    {
      id: 'prov_doon_homely',
      ownerId: adminUid,
      name: 'Doon Homely Tiffins',
      type: 'Tiffin Service' as ProviderType,
      description: 'Zero-maida homestyle North Indian meals prepared fresh daily for DBS hostelers.',
      location: 'Selaqui / Chakrata Road, 400m from DBS Gate',
      hygieneScore: 4.8,
      status: 'approved' as ProviderStatus,
      isOpen: true,
    },
    {
      id: 'prov_garhwali_mess',
      ownerId: adminUid,
      name: 'Garhwali Student Mess',
      type: 'Mess' as ProviderType,
      description: 'Affordable everyday dal-roti-sabzi mess partnered with MealLoop Green steel containers.',
      location: 'Premnagar PG Cluster, Dehradun',
      hygieneScore: 4.6,
      status: 'approved' as ProviderStatus,
      isOpen: true,
    },
    {
      id: 'prov_campus_bowl_kitchen',
      ownerId: adminUid,
      name: 'Campus Bowl Cloud Kitchen',
      type: 'Cloud Kitchen' as ProviderType,
      description: 'High-protein paneer, millet & brown rice bowls crafted for busy MBA & BBA students.',
      location: 'Miwala Road, Dehradun',
      hygieneScore: 4.9,
      status: 'approved' as ProviderStatus,
      isOpen: true,
    },
  ];

  for (const p of providers) {
    batch.set(doc(db, 'foodProviders', p.id), {
      ...p,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // 4. Curated Starter Meals at ₹80 venture price point
  const starterMeals = [
    {
      id: 'meal_indori_poha_paratha',
      providerId: 'prov_doon_homely',
      providerOwnerId: adminUid,
      providerName: 'Doon Homely Tiffins',
      title: 'Kanda Poha & Aloo Paratha Combo',
      description: 'Steamed poha with roasted peanuts, 1 stuffed aloo paratha with curd, mint chutney & ginger chai.',
      category: 'Breakfast' as MealCategory,
      dietaryTag: 'Homestyle' as DietaryTag,
      price: 75,
      variableCost: 50,
      imageUrl: CURATED_MEAL_IMAGES.breakfast,
      calories: 520,
      isAvailable: true,
      isTodaysSpecial: true,
      status: 'active',
      ratingAvg: 4.8,
      ratingCount: 18,
    },
    {
      id: 'meal_dbs_classic_thali',
      providerId: 'prov_doon_homely',
      providerOwnerId: adminUid,
      providerName: 'Doon Homely Tiffins',
      title: 'DBS Student Classic Veg Thali',
      description: 'Paneer butter masala, yellow dal tadka, 4 whole-wheat rotis, jeera rice & fresh kachumber salad in a steel bento.',
      category: 'Lunch' as MealCategory,
      dietaryTag: 'Veg' as DietaryTag,
      price: 80,
      variableCost: 55,
      imageUrl: CURATED_MEAL_IMAGES.hero,
      calories: 680,
      isAvailable: true,
      isTodaysSpecial: true,
      status: 'active',
      ratingAvg: 4.9,
      ratingCount: 42,
    },
    {
      id: 'meal_north_indian_thali',
      providerId: 'prov_garhwali_mess',
      providerOwnerId: adminUid,
      providerName: 'Garhwali Student Mess',
      title: 'Homestyle Dal Makhani & Paneer Thali',
      description: 'Slow-simmered dal makhani, paneer do pyaza, 3 phulkas, steamed basmati rice, boondi raita & pickle.',
      category: 'Lunch' as MealCategory,
      dietaryTag: 'Homestyle' as DietaryTag,
      price: 80,
      variableCost: 55,
      imageUrl: CURATED_MEAL_IMAGES.lunch,
      calories: 720,
      isAvailable: true,
      isTodaysSpecial: false,
      status: 'active',
      ratingAvg: 4.7,
      ratingCount: 29,
    },
    {
      id: 'meal_punjabi_rajma_chawal',
      providerId: 'prov_garhwali_mess',
      providerOwnerId: adminUid,
      providerName: 'Garhwali Student Mess',
      title: 'Dehradun Homestyle Rajma Chawal Box',
      description: 'Comforting red kidney bean curry with fragrant jeera rice, roasted papad, onion rings & green mint chutney.',
      category: 'Dinner' as MealCategory,
      dietaryTag: 'Veg' as DietaryTag,
      price: 80,
      variableCost: 55,
      imageUrl: CURATED_MEAL_IMAGES.dinner,
      calories: 640,
      isAvailable: true,
      isTodaysSpecial: true,
      status: 'active',
      ratingAvg: 4.8,
      ratingCount: 35,
    },
    {
      id: 'meal_paneer_protein_bowl',
      providerId: 'prov_campus_bowl_kitchen',
      providerOwnerId: adminUid,
      providerName: 'Campus Bowl Cloud Kitchen',
      title: 'Grilled Paneer Tikka & Brown Rice Bowl',
      description: '32g protein bowl with charred paneer tikka cubes, herbed brown rice, sautéed broccoli, sweet corn & mint yogurt.',
      category: 'Dinner' as MealCategory,
      dietaryTag: 'High Protein' as DietaryTag,
      price: 95,
      variableCost: 62,
      imageUrl: CURATED_MEAL_IMAGES.protein,
      calories: 590,
      isAvailable: true,
      isTodaysSpecial: false,
      status: 'active',
      ratingAvg: 4.9,
      ratingCount: 24,
    },
    {
      id: 'meal_jain_sattvik_lunch',
      providerId: 'prov_doon_homely',
      providerOwnerId: adminUid,
      providerName: 'Doon Homely Tiffins',
      title: 'No-Onion No-Garlic Jain Tiffin',
      description: 'Fresh moong dal tadka, seasonal mix-veg sabzi, 4 phulkas, steamed rice & cucumber raita.',
      category: 'Lunch' as MealCategory,
      dietaryTag: 'Jain Veg' as DietaryTag,
      price: 80,
      variableCost: 54,
      imageUrl: CURATED_MEAL_IMAGES.lunch,
      calories: 610,
      isAvailable: true,
      isTodaysSpecial: false,
      status: 'active',
      ratingAvg: 4.7,
      ratingCount: 14,
    },
  ];

  for (const m of starterMeals) {
    batch.set(doc(db, 'meals', m.id), {
      ...m,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch_seed_catalog');
  }
}
