---
### **Prompt to Synchronize AI with Your Template**

"I am starting a new project using my existing **NestJS + Prisma + PostgreSQL** template. Before we implement the new requirements, please analyze my current codebase to understand my architecture.

**Current Setup in Template:**
1. **User Authentication:** Already implemented (check `src/auth`). Understand how JWT, Guards, and Strategy are structured.

2. **Global Validation & Error Handling:** Already implemented (check `src/common`). Understand how global validation and error handling are set up.

3.**mail:** Already implemented (check `src/mail`). Understand how email sending is structured, especially for OTPs and notifications.

4. **Project Structure:** I follow a specific pattern for Modules, Controllers, Services, and DTOs. Please maintain this consistency.

5. **Project Structure:** I follow a specific pattern for Modules, Controllers, Services, and DTOs. Please maintain this consistency.

6. **Database:** Review the current `schema.prisma`. We will be updating this based on the new requirements I've placed in `README.md`.

7. **Existing Services:** Check if there are any base services or utility functions (like email or file handling) that I have already partially built.


**Your Goal:**
I have updated the `README.md` with the **Final Production Blueprint** (LMS, E-commerce, MinIO, Square Pay). Your task is to:
- **Compare** the new requirements with the current template.
- **Refactor** or **Extend** the existing Auth and User modules to support the new database fields (like `avatar_key`, `is_verified`, etc.).
- **Generate** the missing modules (LMS, Enrollment, Shop, Order) following my template's coding style.
- **Integration:** Ensure the MinIO logic for Presigned URLs is integrated into the response interceptors or services where media keys are used.

Please confirm once you have indexed the codebase and are ready to start with the `schema.prisma` migration."
---

### **কিভাবে এটি কাজ করবে?**

১. **Codebase Indexing:** এআই প্রথমে আপনার `auth` ফোল্ডার এবং `prisma` ফাইলগুলো পড়বে। এতে সে বুঝতে পারবে আপনি `Passport.js` নাকি অন্য কিছু ব্যবহার করছেন।
২. **Consistency:** সে আপনার ভ্যালিডেশন পাইপ (ValidationPipe) বা গ্লোবাল এরর হ্যান্ডলারগুলো দেখে নেবে, যাতে নতুন কোড লিখলে সেটা আপনার টেমপ্লেটের সাথে খাপ খায়।
৩. **Efficiency:** আপনি অলরেডি যা করে রেখেছেন (যেমন ওটিপি লজিক বা লগইন), সে সেটা আর নতুন করে লিখবে না, বরং সেটাকে ইমপ্রুভ করবে।

### **পরবর্তী ধাপ:**

প্রম্পটটি দেওয়ার পর এআই যখন বলবে সে রেডি, তখন আপনি তাকে বলবেন:

> _"Now, let's start by updating the `schema.prisma` file according to the DBML/Requirements in README.md. Show me the changes first."_
