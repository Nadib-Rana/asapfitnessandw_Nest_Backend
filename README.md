This project is a high-performance **Health & Fitness SaaS Ecosystem** that combines a structured Learning Management System (LMS) with an integrated e-commerce store. It is designed to drive user retention through a **Gamified Progression Model** and a "Path to Mastery" approach.

The platform's visual identity is built on a **Glassmorphism** aesthetic—utilizing deep charcoal tones, vibrant orange accents, and semi-transparent frosted UI elements to create a professional, energetic, and premium user experience.

---

## 1. Core Functional Pillars

### **A. Sequential Training & LMS**

- **Restricted Access:** Users cannot view workout content without an active program enrollment.
- **1-Month Validation:** Access to a program is strictly valid for **30 days**. After this period, the enrollment expires, and the user must re-enroll to continue, encouraging consistent training.
- **Linear Lock System:** To ensure proper training form and discipline, the next class in a series remains locked until the current video is **100% completed**.
- **Real-time Progress:** The system tracks individual video progress percentages, allowing students to pause and resume workouts seamlessly.

### **B. Gamification & XP System**

- **Difficulty Multipliers:** A standalone `Difficulty` system (Beginner, Intermediate, Advanced) determines the XP (Experience Points) yield for each class.
- **Leveling Rewards:** Upon finishing a video, the system calculates earned XP based on the difficulty multiplier. This updates the user’s global **Level** and reflects on their dashboard via circular progress charts.

### **C. E-commerce & Supplement Shop**

- **Dynamic Storefront:** A full grid-view catalog for supplements and fitness gear with category-based filtering.
- **Dual-Pricing Logic:** The system supports both `RegularPrice` and `DiscountPrice`, allowing for marketing banners and "Sale" badges.
- **Persistent Cart:** A global "Add to Cart" state that manages items via a slide-out drawer, accessible from anywhere in the app.

---

## 2. Order & Payment Workflow (COD)

Because the project operates on a **COD** or **online** payment(stripe) model, the workflow is built for manual fulfillment:

- **Mobile Verification:** Orders require a verified phone number to minimize "ghost" or fake orders.
- **Status Lifecycle:** Orders are initially placed as `UNPAID` with a `PLACED` status.
- **Fulfillment:** Once the delivery agent collects the physical cash, the administrator updates the order to `PAID` and `DELIVERED`, completing the transaction.

---

## 3. Technical Architecture

- **Backend:** A robust **Nest.js** environment using **Prisma ORM** to manage the complex relational database.
- **Database (PostgreSQL):** A structured schema that links Users to Enrollments, Programs to Classes, and Products to Orders.

---

## 4. User Journey Summary

1.  **Onboarding:** User registers and verifies their identity via **OTP**.
2.  **Enrollment:** User chooses a program, granting them a **30-day active window**.
3.  **Training:** User completes video classes one by one, unlocking the next only after 100% completion.
4.  **Reward:** User earns XP and levels up their profile.
5.  **Shopping:** User orders supplements via **COD** or online payment to support their physical training.

This platform is more than just a workout app; it is a complete digital coach and retail partner that strictly rewards consistency and provides the physical tools for success.

Database :

```dbml
// =============================================
// HEALTH & FITNESS SAAS - COMPLETE PRODUCTION DBML
// Final Architecture: LMS + E-commerce + Square Pay
// Optimized for NestJS + Prisma + PostgreSQL
// =============================================

// --- AUTH & USER MANAGEMENT ---
Table users {
  id uuid [pk]
  full_name varchar(255)
  email varchar(255) [unique]
  phone_number varchar(20) [unique]
  phone_verified boolean [default: false]
  gender varchar(20)
  birth_date date
  password_hash varchar(255)
  avatar_url varchar(500)
  is_verified boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table otp_verifications {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  code varchar(6)
  purpose varchar(50) // REGISTRATION, PASSWORD_RESET
  expires_at timestamp
  created_at timestamp [default: `now()`]
}

// --- FITNESS & LMS MODULE (Open Access) ---
Table programs {
  id uuid [pk]
  title varchar(255)
  description text
  thumbnail_url varchar(500)
  total_classes integer [default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table classes {
  id uuid [pk]
  program_id uuid [ref: > programs.id]
  class_order integer
  title varchar(255)
  subtitle varchar(255)
  video_url varchar(500)
  thumb_image varchar(500)
  instructor_name varchar(100)
  duration_seconds integer
  equipment varchar[]
  achievements varchar[] // Milestone markers (Non-XP)
  created_at timestamp [default: `now()`]
}

Table enrollments {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  program_id uuid [ref: > programs.id]
  status varchar(20) [default: 'ACTIVE'] // ACTIVE, EXPIRED, COMPLETED
  overall_progress_percent integer [default: 0]
  last_accessed_class_id uuid [ref: > classes.id, null] // For UI "Continue Watching"
  enrolled_at timestamp [default: `now()`]
  expires_at timestamp

  indexes {
    (user_id, program_id) [unique]
  }
}

Table class_progress {
  id uuid [pk]
  enrollment_id uuid [ref: > enrollments.id]
  class_id uuid [ref: > classes.id]
  last_watched_seconds integer [default: 0] // Resume from specific second
  progress_percent integer [default: 0]
  is_completed boolean [default: false]
  last_watched_at timestamp [default: `now()`]

  indexes {
    (enrollment_id, class_id) [unique]
  }
}

// --- E-COMMERCE (SHOP) MODULE ---
Table categories {
  id uuid [pk]
  name varchar(100) [unique]
  created_at timestamp [default: `now()`]
}

Table products {
  id uuid [pk]
  category_id uuid [ref: > categories.id]
  title varchar(255)
  description text
  regular_price decimal(10,2)
  discount_price decimal(10,2) [null]
  stock_quantity integer [default: 0] // Decremented only after successful payment
  image_url varchar(500)
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
}

// Selection tracking before checkout
Table add_to_cart {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  product_id uuid [ref: > products.id]
  quantity integer [default: 1]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]

  indexes {
    (user_id, product_id) [unique]
  }
}

// --- SECURE ORDER & SQUARE PAYMENT ---
Table orders {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  total_amount decimal(10,2) [not null]
  shipping_fee decimal(10,2) [default: 0.00]
  shipping_address text [not null]
  phone_number varchar(20) [not null]
  payment_method varchar(20) [not null] // "COD" or "SQUARE"

  // Square Gateway Details
  square_order_id varchar(100) [null]
  square_transaction_id varchar(100) [null]
  square_location_id varchar(50) [null]

  order_status varchar(30) [default: 'PLACED']
  payment_status varchar(20) [default: 'PENDING'] // Change to 'PAID' triggers stock deduction

  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table order_items {
  id uuid [pk]
  order_id uuid [ref: > orders.id]
  product_id uuid [ref: > products.id]
  quantity integer [not null]
  price_at_purchase decimal(10,2) [not null]
}

// --- SUPPORT ---
Table faqs {
  id uuid [pk]
  question text
  answer text
  sort_order integer [default: 0]
}
```

### **Implementation Logic for Developers:**

1.  **Sequential Unlock Logic:** \* To check if a user can play a video:
    - `IF (class_order == 1 AND enrollment.status == 'ACTIVE')` -> **Unlock**.
    - `IF (previous_class.status == 'COMPLETED' AND enrollment.status == 'ACTIVE')` -> **Unlock**.

2.  **1-Month Expiry Logic:**
    - When fetching a program, the backend should compare `expires_at` with the current system time.
    - If `now() > expires_at`, set `enrollment.status = 'EXPIRED'` and blur the video player in the UI.

3.  **XP Reward Logic:**
    - On `progress_percent == 100`, trigger a function:
    - `User.current_xp += (Base_XP * Difficulty.xp_multiplier)`.

4.  **COD Workflow:**
    - Since this is a "Cash One and Only Pay" system, the `orders.payment_status` stays `UNPAID` until your delivery script or admin manually confirms the physical cash receipt.
