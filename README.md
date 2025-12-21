# Coupon Busters

A production-ready football picks league application for the UK market.

## 🚀 Repository Link
**GitHub:** [https://github.com/couponbuster97-sketch/couponbusters.git](https://github.com/couponbuster97-sketch/couponbusters.git)

## 🛠 How to Push to GitHub
To connect this project to your repository and push the latest changes, execute these commands in your terminal:

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Add the remote origin
git remote add origin https://github.com/couponbuster97-sketch/couponbusters.git

# 3. Stage and commit all files
git add .
git commit -m "Initial commit: Complete Coupon Busters App with Landing Page"

# 4. Set the main branch and push
git branch -M main
git push -u origin main
```

## 🏗 Tech Stack
*   **Frontend**: React 19 (ESM via Import Maps)
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **Charts**: Recharts
*   **State**: Mocked for preview (ready for Postgres/NestJS integration)

## 📋 Features
- **Syndicate Management**: Automated "Banker" coupon generation for admins.
- **Hybrid Payout Model**: Real-money accumulator stake + "Pot Builder" savings.
- **Dual-Pick Strategy**: "The Banker" (Money + Points) vs "The Cover" (Points only).
- **Compliance Ready**: Admin checklists for UK Gambling Commission guidelines.

## 🗄 Database Schema (SQL)
*The app is designed to map to the following schema:*

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user',
  wallet_balance_pence INTEGER DEFAULT 0
);

CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  weekly_fee_pence INTEGER DEFAULT 0,
  pot_deduction_pence INTEGER DEFAULT 0
);
```

## ⚖️ Legal
- **18+ Only.**
- Designed for Private Society Lottery exemptions.
- Ensure GDPR compliance for user data.
