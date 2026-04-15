---

## **1. Core Functional Pillars**

### **A. Sequential Training & LMS (Category Based)**
* **Restricted Access:** একটি সক্রিয় এনরোলমেন্ট ছাড়া ইউজার কোনো ওয়ার্কআউট কন্টেন্ট দেখতে পারবে না।
* **1-Month Validation:** প্রোগ্রামের এক্সেস মাত্র **৩০ দিনের** জন্য কার্যকর থাকবে। মেয়াদ শেষ হওয়ার **৩ দিন আগে** সিস্টেম অটোমেটিক ইমেইল নোটিফিকেশন পাঠাবে। যদি ইমেইল পাঠানো ব্যর্থ হয়, তবে সিস্টেম ৩ বার পুনরায় চেষ্টা (Retry) করবে এবং এরর লগ ডাটাবেসে সেভ রাখবে।
* **Class under class_category:** ক্লাসেসগুলো নির্দিষ্ট ক্যাটাগরির অধীনে সাজানো থাকবে। ১টি এনরোলমেন্টের মাধ্যমে ইউজার ৩টি নির্দিষ্ট ক্যাটাগরির (Beginner, Intermediate, Advanced) সব ক্লাস দেখার সুযোগ পাবে।
* **Linear Lock System:** সঠিক ফর্ম এবং ডিসিপ্লিন বজায় রাখতে প্রতিটি ভিডিও সিরিয়াল অনুযায়ী দেখতে হবে। বর্তমান ভিডিও **১০০% সম্পন্ন** না হওয়া পর্যন্ত পরবর্তী ক্লাসটি 'Locked' থাকবে। 
* **Milestone Achievements:** ভিডিও দেখার প্রগ্রেস যখন **৫০% এবং ৭৫%** এ পৌঁছাবে, তখন সিস্টেম মাইলস্টোন অ্যাচিভমেন্ট ট্রিগার করবে যা `class_progress` টেবিলে স্থায়ীভাবে সেভ থাকবে।
* **Real-time Progress:** সিস্টেম প্রতিটি ভিডিওর প্রগ্রেস (সেকেন্ড অনুযায়ী) এবং পুরো ক্যাটাগরির সার্বিক অগ্রগতি ট্র্যাক করবে, যাতে ইউজার যেকোনো সময় পজ করে আবার শুরু করতে পারে।

### **B. Integrated E-commerce & Supplement Shop**
* **Dynamic Storefront:** সাপ্লিমেন্ট এবং ফিটনেস গিয়ারের জন্য ক্যাটাগরি-বেসড ফিল্টারিং সুবিধা সম্বলিত ক্যাটালগ।
* **Dual-Pricing Logic:** প্রতিটি প্রোডাক্টের জন্য `RegularPrice` এবং `DiscountPrice` সাপোর্ট করবে, যা মার্কেটিং ব্যানার এবং "Sale" ব্যাজ প্রদর্শনে সাহায্য করবে।
* **Persistent Cart:** ডাটাবেস-চালিত `add_to_cart` সিস্টেম, যার ফলে ইউজার ডিভাইস পরিবর্তন করলেও তার কার্ট আইটেমগুলো হারাবে না।

### **C. Order & Payment Workflow**
* **Cash on Delivery (COD):** ইউজাররা ক্যাশ অন ডেলিভারি অপশন ব্যবহার করতে পারবে, যা অ্যাডমিন কনফার্ম না করা পর্যন্ত "UNPAID" হিসেবে থাকবে।
* **Square Payment Integration:** অনলাইন পেমেন্টের জন্য স্কয়ার এপিআই (Square API) ইন্টিগ্রেশন। পেমেন্ট সফল হলে অর্ডার স্ট্যাটাস অটোমেটিক "PAID" হবে এবং ইনভেন্টরি থেকে স্টক আপডেট হবে।

### **D. High-Performance Technical Architecture**
* **Secure Media Storage (MinIO):** সব ভিডিও এবং ইমেজ **MinIO/S3** অবজেক্ট স্টোরেজে সংরক্ষিত থাকবে। ডাটাবেসে শুধুমাত্র **Object Key** সেভ করা হবে। 
* **Temporary Presigned URLs:** নিরাপত্তার খাতিরে এপিআই রেসপন্সে সরাসরি ভিডিও ইউআরএল (URL) পাঠানো হবে না; পরিবর্তে একটি নির্দিষ্ট সময় মেয়াদী (Expired Time) **Presigned URL** জেনারেট করে পাঠানো হবে।
* **Robust Backend:** Nest.js এবং Prisma ORM-এর সমন্বয়ে গঠিত একটি রিলেশনাল ডেটাবেস আর্কিটেকচার যা ডাটা ইনটেগ্রিটি নিশ্চিত করে।

---

```dbml
// =============================================
// HEALTH & FITNESS SAAS - COMPLETE PRODUCTION DBML
// Architecture: LMS + E-commerce + MinIO + Fail-Safe Email
// Location: Dhaka, Bangladesh | Year: 2026
// =============================================

// --- AUTH & USER MANAGEMENT ---
Table users {
  id uuid [pk]
  full_name varchar(255)
  email varchar(255) [unique]
  phone_number varchar(20) [unique]
  phone_verified boolean [default: false]
  password_hash varchar(255)
  avatar_key varchar(500) // MinIO Object Key
  is_verified boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

enum TokenType {
  email_verification
  password_reset
  login_otp
}

Table VerificationToken {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  token varchar(6)
  type TokenType
  expires_at timestamp
  used boolean [default: false]

  // Email Tracking Gaps Fixed
  delivery_status varchar(20) [default: 'PENDING'] // PENDING, SENT, FAILED
  retry_count integer [default: 0]
  last_error text
}

// --- FITNESS & LMS MODULE (Category-Based) ---
Table class_categories {
  id uuid [pk]
  title varchar(255)
  description text
  thumbnail_key varchar(500) // MinIO Object Key
  total_classes integer [default: 0]
  created_at timestamp [default: `now()`]
}

Table classes {
  id uuid [pk]
  category_id uuid [ref: > class_categories.id]
  class_order integer // Linear locking sequence
  title varchar(255)
  subtitle varchar(255)
  video_key varchar(500) // MinIO Object Key (Response: Presigned URL)
  thumb_key varchar(500)  // MinIO Object Key
  duration_seconds integer
  created_at timestamp [default: `now()`]
}

Table enrollments {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  status varchar(20) [default: 'ACTIVE'] // ACTIVE, EXPIRED
  enrolled_at timestamp [default: `now()`]
  expires_at timestamp

  // Expiry Notification Tracking (3-day alert)
  expiry_email_sent boolean [default: false]
  notification_status varchar(20) [default: 'NONE'] // SENT, FAILED
  notification_retry_count integer [default: 0]
  notification_last_error text
}

// 1 Enrollment -> Multiple Categories (Bundle Access)
Table enrollment_categories {
  id uuid [pk]
  enrollment_id uuid [ref: > enrollments.id]
  category_id uuid [ref: > class_categories.id]
}

Table class_progress {
  id uuid [pk]
  enrollment_id uuid [ref: > enrollments.id]
  class_id uuid [ref: > classes.id]
  last_watched_seconds integer [default: 0]
  progress_percent integer [default: 0]
  is_completed boolean [default: false]

  // Milestone Tracking
  reached_50_milestone boolean [default: false]
  reached_75_milestone boolean [default: false]
  last_watched_at timestamp [default: `now()`]

  indexes {
    (enrollment_id, class_id) [unique]
  }
}

Table class_categories_progress {
  id uuid [pk]
  enrollment_id uuid [ref: > enrollments.id]
  progress_percent integer [default: 0]
  total_complete_class integer [default: 0]
}

// --- E-COMMERCE (SHOP) MODULE ---
Table categories {
  id uuid [pk]
  name varchar(100) [unique]
}

Table products {
  id uuid [pk]
  category_id uuid [ref: > categories.id]
  title varchar(255)
  regular_price decimal(10,2)
  discount_price decimal(10,2)
  stock_quantity integer [default: 0]
  image_key varchar(500) // MinIO Object Key
  is_active boolean [default: true]
}

Table add_to_cart {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  product_id uuid [ref: > products.id]
  quantity integer [default: 1]
  updated_at timestamp [default: `now()`]

  indexes {
    (user_id, product_id) [unique]
  }
}

// --- SECURE ORDER & SQUARE PAYMENT ---
Table orders {
  id uuid [pk]
  user_id uuid [ref: > users.id]
  total_amount decimal(10,2)
  payment_method varchar(20) // COD, SQUARE
  payment_status varchar(20) [default: 'PENDING'] // Change to PAID deduces stock
  order_status varchar(30) [default: 'PLACED']
  square_transaction_id varchar(100)
  created_at timestamp [default: `now()`]
}

Table order_items {
  id uuid [pk]
  order_id uuid [ref: > orders.id]
  product_id uuid [ref: > products.id]
  quantity integer
  price_at_purchase decimal(10,2)
}

// --- SUPPORT ---
Table faqs {
  id uuid [pk]
  question text
  answer text
  sort_order integer [default: 0]
}
``
```
