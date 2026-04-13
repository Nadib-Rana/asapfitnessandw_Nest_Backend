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
Because the project operates on a **Cash on Delivery (COD)** model, the workflow is built for manual fulfillment:
* **Mobile Verification:** Orders require a verified phone number to minimize "ghost" or fake orders.
* **Status Lifecycle:** Orders are initially placed as `UNPAID` with a `PLACED` status.
* **Fulfillment:** Once the delivery agent collects the physical cash, the administrator updates the order to `PAID` and `DELIVERED`, completing the transaction.

---

## 3. Technical Architecture
* **Frontend:** Designed for a reactive experience (React/Next.js) with a heavy focus on Tailwind CSS for the Glassmorphism effects.
* **Backend:** A robust **Node.js** environment using **Prisma ORM** to manage the complex relational database.
* **Database (PostgreSQL):** A structured schema that links Users to Enrollments, Programs to Classes, and Products to Orders.

---

## 4. User Journey Summary
1.  **Onboarding:** User registers and verifies their identity via **OTP**.
2.  **Enrollment:** User chooses a program, granting them a **30-day active window**.
3.  **Training:** User completes video classes one by one, unlocking the next only after 100% completion.
4.  **Reward:** User earns XP and levels up their profile.
5.  **Shopping:** User orders supplements via **COD** to support their physical training.



This platform is more than just a workout app; it is a complete digital coach and retail partner that strictly rewards consistency and provides the physical tools for success.
