This project is a high-performance **Health & Fitness SaaS Ecosystem** that combines a structured Learning Management System (LMS) with an integrated e-commerce store. It is designed to drive user retention through a **Gamified Progression Model** and a "Path to Mastery" approach.

The platform's visual identity is built on a **Glassmorphism** aesthetic—utilizing deep charcoal tones, vibrant orange accents, and semi-transparent frosted UI elements to create a professional, energetic, and premium user experience.

---

## 1. Core Functional Pillars

### **A. Sequential Training & LMS**
* **Restricted Access:** Users cannot view workout content without an active program enrollment. 
* **1-Month Validation:** Access to a program is strictly valid for **30 days**. After this period, the enrollment expires, and the user must re-enroll to continue, encouraging consistent training.
* **Linear Lock System:** To ensure proper training form and discipline, the next class in a series remains locked until the current video is **100% completed**.
* **Real-time Progress:** The system tracks individual video progress percentages, allowing students to pause and resume workouts seamlessly.

### **B. Gamification & XP System**
* **Difficulty Multipliers:** A standalone `Difficulty` system (Beginner, Intermediate, Advanced) determines the XP (Experience Points) yield for each class.
* **Leveling Rewards:** Upon finishing a video, the system calculates earned XP based on the difficulty multiplier. This updates the user’s global **Level** and reflects on their dashboard via circular progress charts.

### **C. E-commerce & Supplement Shop**
* **Dynamic Storefront:** A full grid-view catalog for supplements and fitness gear with category-based filtering.
* **Dual-Pricing Logic:** The system supports both `RegularPrice` and `DiscountPrice`, allowing for marketing banners and "Sale" badges.
* **Persistent Cart:** A global "Add to Cart" state that manages items via a slide-out drawer, accessible from anywhere in the app.

---

## 2. Order & Payment Workflow (COD)
Because the project operates on a **COD** or **online** payment(stripe) model, the workflow is built for manual fulfillment:
* **Mobile Verification:** Orders require a verified phone number to minimize "ghost" or fake orders.
* **Status Lifecycle:** Orders are initially placed as `UNPAID` with a `PLACED` status.
* **Fulfillment:** Once the delivery agent collects the physical cash, the administrator updates the order to `PAID` and `DELIVERED`, completing the transaction.

---

## 3. Technical Architecture
* **Backend:** A robust **Nest.js** environment using **Prisma ORM** to manage the complex relational database.
* **Database (PostgreSQL):** A structured schema that links Users to Enrollments, Programs to Classes, and Products to Orders.

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
// --- AUTH & USER MODULE ---
Table users {
  id uuid [pk]
  full_name varchar
  email varchar [unique]
  gender varchar 
  birth_date date 
  password_hash varchar
  avatar_url varchar
  current_xp integer [default: 0]
  level integer [default: 1]
  is_verified boolean [default: false]
  created_at timestamp [default: `now()`]
}

Table otp_verifications {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  code varchar
  expires_at timestamp
}

// --- FITNESS & DIFFICULTY MODULE ---
Table difficulties {
  id uuid [pk]
  level_name varchar // Beginner, Intermediate, Advanced
  description varchar 
  xp_multiplier float [default: 1.0]
}

Table programs {
  id uuid [pk]
  difficulty_id uuid [ref: > difficulties.id]
  title varchar
  description text
  thumbnail_url varchar
  created_at timestamp [default: `now()`]
}

Table classes {
  id uuid [pk]
  program_id uuid [ref: > programs.id]
  class_order integer // For linear unlocking
  difficulty_id uuid [ref: > difficulties.id]
  title varchar
  video_url varchar
  subtitle varchar
  thumb_image varchar
  instructor_name varchar
  achievements varchar[] 
  equipment varchar[]
  duration varchar
}

Table enrollments {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  program_id uuid [ref: > programs.id]
  status varchar // ACTIVE, EXPIRED, CANCELLED
  progress_percent integer [default: 0]
  enrolled_at timestamp [default: `now()`]
  expires_at timestamp // Set to 30 days from enrollment
}

// --- E-COMMERCE (SHOP) MODULE ---
Table categories {
  id uuid [pk]
  name varchar
}

Table products {
  id uuid [pk]
  category_id uuid [ref: > categories.id]
  title varchar
  sub_title varchar
  description text
  regular_price decimal
  discount_price decimal
  stock_quantity integer
  image_url varchar
}

Table add_to_cart {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  product_id uuid [ref: > products.id]
  quantity integer
}

// --- ORDER & HYBRID PAYMENT MODULE ---
Table orders {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  total_amount decimal
  shipping_address text
  phone_number varchar 
  payment_method varchar // "COD" or "ONLINE"
  transaction_id varchar // For Online Pay tracking
  order_status varchar // PLACED, SHIPPED, DELIVERED, RETURNED
  payment_status varchar [default: "PENDING"] // PENDING, PAID, FAILED
  created_at timestamp [default: `now()`]
}

Table order_items {
  id uuid [pk]
  order_id uuid [ref: > orders.id]
  product_id uuid [ref: > products.id]
  quantity integer
  price_at_purchase decimal
}

// --- SUPPORT ---
Table faqs {
  id uuid [pk]
  question text
  answer text
  sort_order integer
}
```

---

### **Implementation Logic for Developers:**

1.  **Sequential Unlock Logic:** * To check if a user can play a video:
    * `IF (class_order == 1 AND enrollment.status == 'ACTIVE')` -> **Unlock**.
    * `IF (previous_class.status == 'COMPLETED' AND enrollment.status == 'ACTIVE')` -> **Unlock**.

2.  **1-Month Expiry Logic:**
    * When fetching a program, the backend should compare `expires_at` with the current system time. 
    * If `now() > expires_at`, set `enrollment.status = 'EXPIRED'` and blur the video player in the UI.

3.  **XP Reward Logic:**
    * On `progress_percent == 100`, trigger a function: 
    * `User.current_xp += (Base_XP * Difficulty.xp_multiplier)`.

4.  **COD Workflow:**
    * Since this is a "Cash One and Only Pay" system, the `orders.payment_status` stays `UNPAID` until your delivery script or admin manually confirms the physical cash receipt.
