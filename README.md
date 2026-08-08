# AI Fitness Ally

Product Name: AI Fitness Coach (with Admin Panel) 

1. 



 Overview 

AI Fitness Coach is an AI-powered platform delivering personalized diet and workout plans 

using body analysis, user goals, and continuous tracking, now extended with a robust 

Admin Panel for monitoring, control, and optimization. 

2. 

�

�

 Objective 

● Deliver personalized fitness guidance 

● Improve user consistency with AI + tracking 

● Enable admins to monitor users, manage AI outputs, and maintain quality 

3. 



 User Roles 

3.1 End User 

● Uses fitness features (plans, tracking, chatbot) 

3.2 Admin 

● Monitors platform activity 

● Manages users & plans 

● Controls AI outputs & moderation 

4. 



 Core Features (User Side) 

4.1 AI Onboarding (Body Analysis) 

● 4 image upload (Front, Back, Left, Right) 

● MediaPipe: 

○ Posture detection 

○ Body landmarks 

○ Estimated BMI 

4.2 Goal Selection 

● Weight Loss / Gain / Muscle / Maintenance 

4.3 AI Diet Plan Generator 

● Personalized meals 

● Calories + macros 

● Allergy-aware 

4.4 Workout Plan Generator 

● Home/Gym plans 

● Sets, reps, weekly split 

4.5 Daily Habit Tracker 

● Meals, water, workout, sleep 

● Streak system 

4.6 AI Chatbot (RAG) 

● Context-aware answers 

● Uses: 

○ User plan 

○ Progress data 

4.7 Weekly Progress Tracking 

● Photo comparison 

● AI insights 

4.8 Dashboard 

● Weight, calories, streaks 

● Fitness score 

5. 



 Admin Panel (NEW - ADVANCED) 

5.1 



 User Management 

● View all users 

● Search/filter users 

● Ban / deactivate accounts 

● View user activity: 

○ Last login 

○ Plan usage 

○ Progress stats 

5.2 





 Analytics Dashboard 

● Total users 

● Active users (DAU/WAU) 

● Plan completion rates 

● Chatbot usage metrics 

● Avg. user fitness score 

5.3 



 AI Output Monitoring 

● View generated diet/workout plans 

● Flag inappropriate or inaccurate outputs 

● Adjust prompt templates (admin-controlled AI tuning) 

5.4 



 Image Moderation 

● Review uploaded body images 

● Detect misuse/inappropriate uploads 

● Delete flagged content 

5.5 



 Plan Management (Override System) 

● Admin can: 

○ Edit AI-generated plans 

○ Create custom templates 

○ Assign manual plans to users 

5.6 

 Chat Moderation 

● View chatbot conversations 

● Detect harmful queries 

● Block abusive users 

5.7 



 Reports & Logs 

● System logs 

● AI usage logs (API calls, tokens) 

● Error tracking 

6. 



 AI Components 

6.1 Computer Vision 

● MediaPipe: 

○ Pose detection 

○ Body structure estimation 

6.2 LLM (OpenAI / Gemini) 

● Diet/workout generation 

● Chatbot 

6.3 RAG System 

● Stores: 

○ User plans 

○ Progress history 

● Enables personalized responses 

7. 



 Technical Architecture 

Frontend (React) 

● User Dashboard 

● Admin Dashboard (separate routes) 

● Chat UI / Material UI/ ShadeCN / Tailwind CSS 

● Image upload 

Backend (Node + Express) 

● REST APIs 

● Auth (JWT + Role-based access) 

Real-Time 

● Socket.IO: 

○ Chat updates 

○ Live tracking sync 

Database (MongoDB) 

Collections: 

● Users (role: user/admin) 

● Plans 

● Progress 

● Chat logs 

● Admin logs 

AI Layer 

● OpenAI / Gemini 

● Prompt management system 

8. 



 Role-Based Access Control (RBAC) 

● User → limited access 

● Admin → full control 

● Middleware: 

○ verifyJWT 

○ checkRole('admin') 

9. 



 User Flow 

1. Signup/Login 

2. Upload body images 

3. AI analysis 

4. Select goal 

5. Get plan 

6. Track daily habits 

7. Chat with AI 

8. Weekly updates 

9. 



 Admin Flow 

1. Admin login 

2. View dashboard analytics 

3. Monitor users 

4. Review AI outputs 

5. Moderate content 

6. Adjust system settings 

7. 

⚠

 Constraints 

● AI not medically certified 

● Image analysis is approximate 

● Requires moderation for safety  Plase use react mongodb and supabase

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fit-quest-plus.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e4548df6-4a65-4404-851e-0d204c059e34).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
