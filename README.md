# MDYB Store PoS

> **Weightless Retail Terminal** — A sophisticated Point of Sale system with QRIS, Split Payment, Kasbon, WhatsApp receipts, and Wholesale pricing.

## 🚀 Tech Stack
- **Frontend**: React + Vite
- **Routing**: React Router v7
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel

## ✨ Features
- 🏪 **Full POS Terminal** — Product grid, category filter, cart management
- 📱 **QRIS Dynamic** — Real-time QR code generation per transaction
- 💸 **Split Payment** — Pay part cash, rest via QRIS
- ⬆️ **Round-Up / Donation** — Auto-round to nearest 500
- 📒 **Kasbon / Piutang** — Record debt for loyal customers
- 🏷️ **Auto-Wholesale** — Automatic bulk pricing at qty 3/6/12
- 💬 **WhatsApp Receipt** — Send digital receipt after transaction
- 🌐 **EN/ID Language Toggle** — Full bilingual interface
- 🔴 **Offline Indicator** — Shows when Supabase sync is lost
- 📊 **Shift Report & Stock tracker** (sidebar)

## 🛠️ Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Then fill in your Supabase URL and anon key

# Start development server
npm run dev
```

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public API key |

## 📦 Deploy to Vercel

1. Push this repo to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in Vercel dashboard
4. Deploy! 🚀
