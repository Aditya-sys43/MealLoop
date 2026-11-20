export type UserRole = 'student' | 'provider' | 'admin';

export type MealCategory = 'Breakfast' | 'Lunch' | 'Dinner';
export type DietaryTag = 'Veg' | 'High Protein' | 'Jain Veg' | 'Homestyle';
export type ProviderType = 'Mess' | 'Tiffin Service' | 'Cloud Kitchen';
export type ProviderStatus = 'pending' | 'approved' | 'rejected';

export type OrderStatus =
  | 'Order Placed'
  | 'Order Accepted'
  | 'Preparing'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type ContainerStatus =
  | 'Issued'
  | 'With Student'
  | 'Return Scheduled'
  | 'Returned';

export type PlanType = 'Daily' | 'Weekly' | 'Monthly';
export type SubscriptionStatus = 'Active' | 'Paused' | 'Cancelled' | 'Completed';
export type ComplaintStatus = 'Open' | 'In Review' | 'Resolved';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'aditya.0251mba359@dgu.ac.in';

export const SCHEMA_LIMITS = {
  ID_MAX: 128,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  NAME_MAX: 100,
  EMAIL_MAX: 200,
  PHONE_MAX: 20,
  ADDRESS_MAX: 300,
  HOSTEL_MAX: 140,
  TITLE_MAX: 120,
  DESC_MAX: 600,
  NOTES_MAX: 300,
  COMMENT_MAX: 400,
  SUBJECT_MAX: 120,
  IMAGE_URL_MAX: 2000,
} as const;

export const CURATED_MEAL_IMAGES = {
  hero: '/src/assets/images/hero_mealloop_tiffin_1795190257042.jpg',
  breakfast: '/src/assets/images/meal_breakfast_poha_1795190256229.jpg',
  lunch: '/src/assets/images/meal_lunch_thali_1795190255646.jpg',
  dinner: '/src/assets/images/meal_dinner_rajma_1795190256215.jpg',
  protein: '/src/assets/images/meal_protein_bowl_1795190265445.jpg',
  greenContainers: '/src/assets/images/green_reusable_containers_1795190255223.jpg',
} as const;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  hostelOrPg: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface FoodProvider {
  id: string;
  ownerId: string;
  name: string;
  type: ProviderType;
  description: string;
  location: string;
  hygieneScore: number;
  status: ProviderStatus;
  isOpen: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Meal {
  id: string;
  providerId: string;
  providerOwnerId: string;
  providerName: string;
  title: string;
  description: string;
  category: MealCategory;
  dietaryTag: DietaryTag;
  price: number;
  variableCost: number;
  imageUrl: string;
  calories: number;
  isAvailable: boolean;
  isTodaysSpecial: boolean;
  status: 'active' | 'archived';
  ratingAvg: number;
  ratingCount: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface PricingConfig {
  id: string;
  defaultSellingPrice: number;
  estimatedVariableCost: number;
  monthlyFixedCost: number;
  dailyPlanDiscountPct: number;
  weeklyPlanDiscountPct: number;
  monthlyPlanDiscountPct: number;
  updatedAt: unknown;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  id: 'default',
  defaultSellingPrice: 80,
  estimatedVariableCost: 55,
  monthlyFixedCost: 15000,
  dailyPlanDiscountPct: 0,
  weeklyPlanDiscountPct: 5,
  monthlyPlanDiscountPct: 12,
  updatedAt: null,
};

export interface SavedAddress {
  id: string;
  userId: string;
  label: string;
  hostelOrPgName: string;
  roomNumber: string;
  landmark: string;
  phone: string;
  isDefault: boolean;
  createdAt: unknown;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  providerId: string;
  providerOwnerId: string;
  providerName: string;
  mealId: string;
  mealTitle: string;
  mealCategory: MealCategory;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalAmount: number;
  deliveryAddress: string;
  status: OrderStatus;
  containerStatus: ContainerStatus;
  notes: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Subscription {
  id: string;
  userId: string;
  customerName: string;
  providerId: string;
  providerOwnerId: string;
  providerName: string;
  planType: PlanType;
  mealPreference: DietaryTag;
  mealSlots: MealCategory[];
  mealsPerDay: number;
  durationDays: number;
  totalMeals: number;
  pricePerMeal: number;
  totalAmount: number;
  deliveryAddress: string;
  startDate: string;
  status: SubscriptionStatus;
  containersInUse: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  mealId: string;
  providerId: string;
  orderId: string;
  rating: number;
  comment: string;
  createdAt: unknown;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'subscription' | 'green' | 'system';
  read: boolean;
  createdAt: unknown;
}

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  orderId: string;
  subject: string;
  description: string;
  status: ComplaintStatus;
  adminResponse: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface CartItem {
  meal: Meal;
  quantity: number;
}
