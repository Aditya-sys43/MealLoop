/**
 * MealLoop Firestore Security Rules — Dirty Dozen Adversarial Verification Matrix
 * Documents expected PERMISSION_DENIED outcomes against DRAFT_firestore.rules / firestore.rules
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  payloadSummary: Record<string, unknown>;
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Self-Admin Escalation on User Registration',
    collectionPath: '/users/attacker_uid',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { uid: 'attacker_uid', role: 'admin', email: 'attacker@example.com' },
  },
  {
    id: 2,
    name: 'Shadow Ghost Field Injection on Order',
    collectionPath: '/orders/order_ghost',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { id: 'order_ghost', userId: 'student1', isFreeOverride: true },
  },
  {
    id: 3,
    name: 'Unverified Admin Email Spoof Attack',
    collectionPath: '/pricingConfig/default',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { email: 'aditya.0251mba359@dgu.ac.in', email_verified: false, defaultSellingPrice: 1 },
  },
  {
    id: 4,
    name: 'Cross-Tenant PII Read on User Profile',
    collectionPath: '/users/victim_student',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { callerUid: 'other_student' },
  },
  {
    id: 5,
    name: 'Blanket List Query Scraping on Orders',
    collectionPath: '/orders',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { callerUid: 'other_student', filter: 'none' },
  },
  {
    id: 6,
    name: 'Provider Hijack Creating Meal for Another Kitchen',
    collectionPath: '/meals/meal_hijack',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { providerId: 'provider_B', providerOwnerId: 'attacker_provider' },
  },
  {
    id: 7,
    name: 'Orphaned Order Referencing Non-Existent Meal',
    collectionPath: '/orders/order_orphan',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { mealId: 'non_existent_meal', providerId: 'provider_1' },
  },
  {
    id: 8,
    name: 'Student Price Tampering on Existing Order',
    collectionPath: '/orders/order_1',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { totalAmount: 1, status: 'Delivered' },
  },
  {
    id: 9,
    name: 'Terminal State Reversal After Delivery',
    collectionPath: '/orders/order_delivered',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { previousStatus: 'Delivered', newStatus: 'Preparing' },
  },
  {
    id: 10,
    name: 'ID Poisoning via Invalid Characters',
    collectionPath: '/meals/invalid$$id!!',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { id: 'invalid$$id!!' },
  },
  {
    id: 11,
    name: 'Oversized MealSlots Array on Subscription',
    collectionPath: '/subscriptions/sub_overflow',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { mealSlots: ['Breakfast', 'Lunch', 'Dinner', 'Extra1', 'Extra2'] },
  },
  {
    id: 12,
    name: 'Timestamp Backdating on Order Creation',
    collectionPath: '/orders/order_backdate',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    payloadSummary: { createdAt: '2020-01-01T00:00:00Z' },
  },
];
