# MealLoop Security Specification (Payload-First TDD)

## 1. Data Invariants
1. **Role Integrity**: No user may self-assign `role: "admin"` during account creation or profile update. Only the bootstrapped admin (`aditya.0251mba359@dgu.ac.in` with `email_verified == true`) or an entry in `/admins/{uid}` holds Admin privileges.
2. **PII Isolation**: User profiles (`/users/{uid}`), saved addresses (`/addresses/{addressId}`), complaints (`/complaints/{complaintId}`), and notifications (`/notifications/{notificationId}`) are strictly readable only by the owning user or Admin—never via blanket signed-in reads.
3. **Provider Ownership**: A Food Provider may only create, update, or delete meals whose `providerId` exists and has `ownerId == request.auth.uid`, and may only manage orders/subscriptions where `providerOwnerId == request.auth.uid`.
4. **Order & Subscription Financial Integrity**: On creation, `userId` must equal `request.auth.uid`, `totalAmount` must be positive, and `paymentStatus` for `cod` must start as `'pending'`. Clients cannot unilaterally mark `paymentStatus: 'paid'` unless verified or updated by Admin.
5. **Terminal State Locking**: Orders reaching `'Delivered'` or `'Cancelled'` cannot transition back to active states by non-admins; only `containerStatus` updates are permitted after delivery.
6. **Temporal & ID Integrity**: All document IDs must match `^[a-zA-Z0-9_-]+$` (`<= 128` chars), and `createdAt` / `updatedAt` timestamps must match `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Admin Escalation**: `POST /users/attacker` with `{ role: "admin" }` -> `PERMISSION_DENIED`.
2. **Shadow Ghost Field Injection**: `POST /orders/ord1` with `{ ..., isFreeOverride: true }` -> `PERMISSION_DENIED`.
3. **Unverified Email Spoofing**: Request with `token.email == "aditya.0251mba359@dgu.ac.in"` and `email_verified == false` -> `PERMISSION_DENIED`.
4. **Cross-Tenant PII Read**: Student A calling `getDoc(/users/studentB)` or `getDoc(/addresses/addrB)` -> `PERMISSION_DENIED`.
5. **Blanket List Query Scraping**: Student A listing `/orders` without owner filter -> `PERMISSION_DENIED` unless filtered to `userId == request.auth.uid`.
6. **Provider Hijack**: Provider A creating a meal with `providerId: "provider_B"` -> `PERMISSION_DENIED` (`get(foodProviders/providerId).data.ownerId == uid` fails).
7. **Orphaned Order Creation**: Creating `/orders/ord1` referencing non-existent `mealId` or `providerId` -> `PERMISSION_DENIED`.
8. **Order Price/Owner Tampering**: Student updating `/orders/ord1` to change `totalAmount` or `status: "Delivered"` -> `PERMISSION_DENIED`.
9. **Terminal State Reversal**: Provider updating `/orders/ord1` from `status: "Delivered"` back to `"Preparing"` -> `PERMISSION_DENIED`.
10. **ID Poisoning**: Creating `/meals/invalid$$id_with_1500_chars...` -> `PERMISSION_DENIED`.
11. **Oversized Array / String Exhaustion**: Creating `/subscriptions/sub1` with `mealSlots` having 20 elements or `deliveryAddress` > 300 chars -> `PERMISSION_DENIED`.
12. **Timestamp Backdating**: Creating `/orders/ord1` with `createdAt: Timestamp(2020-01-01)` != `request.time` -> `PERMISSION_DENIED`.
