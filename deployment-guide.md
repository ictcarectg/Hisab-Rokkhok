
# হিসাব রক্ষক - Deployment Guide (GitHub -> Vercel)

## ১. Supabase সেটআপ
1. Supabase-এ একটি নতুন প্রজেক্ট খুলুন।
2. `lib/database.sql` ফাইলের সকল কোড কপি করে SQL Editor-এ রান করুন। এটি টেবিল এবং RLS পলিসি তৈরি করবে।
3. Authentication সেকশনে গিয়ে Email/Password এনাবল করুন।

## ২. প্রজেক্ট সেটআপ (Local)
1. এই কোডগুলো আপনার লোকাল কম্পিউটারে একটি ফোল্ডারে রাখুন।
2. `npm install` রান করুন।
3. `.env.local` ফাইল তৈরি করুন এবং Supabase URL ও ANON_KEY দিন।
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## ৩. GitHub-এ পুশ
1. একটি নতুন GitHub রিপোজিটরি তৈরি করুন।
2. কোডগুলো পুশ করুন:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

## ৪. Vercel ডিপ্লয়মেন্ট
1. Vercel-এ লগইন করুন।
2. "Add New Project" বাটনে ক্লিক করে আপনার GitHub রিপোজিটরি সিলেক্ট করুন।
3. "Environment Variables" সেকশনে Supabase-এর URL ও Key যোগ করুন।
4. "Deploy" বাটনে ক্লিক করুন।

## ৫. ফিউচার স্কেলেবিলিটি (Suggestions)
- **Caching:** প্রায়ই ব্যবহৃত ডেটার জন্য React Query বা SWR ব্যবহার করুন।
- **Cloud Functions:** জটিল ক্যালকুলেশন বা PDF জেনারেট করার জন্য Supabase Edge Functions ব্যবহার করুন।
- **Audit Logs:** প্রতিটি গুরুত্বপূর্ণ পরিবর্তনের জন্য `audit_logs` টেবিলে ডেটা ইনসার্ট করুন।
- **Push Notifications:** লোনের কিস্তি পরিশোধের সময় হলে ইউজারকে নোটিফিকেশন পাঠান।
