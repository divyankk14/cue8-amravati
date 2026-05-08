# 🎱 CUE8 Clone — Full Stack Website

> Pool & Snooker club website with online booking + admin dashboard.  
> **100% Free to host. Zero monthly fees.**

---

## 🚀 Tech Stack

| Layer | Tool | Cost |
|-------|------|------|
| Frontend | React + Vite + React Router | Free |
| Database | Supabase (PostgreSQL) | Free |
| Auth | Session-based (env vars) | Free |
| Hosting | Vercel | Free |

---

## 📁 Project Structure

```
cue8-clone/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Top nav with booking button
│   │   └── BookingModal.jsx    # Booking popup modal
│   ├── pages/
│   │   ├── HomePage.jsx        # Public site (hero, leaderboard, tables)
│   │   ├── AdminLogin.jsx      # Admin login page
│   │   └── AdminDashboard.jsx  # Admin panel (bookings, tables, leaderboard, settings)
│   ├── lib/
│   │   └── supabase.js         # Supabase client
│   ├── App.jsx                 # Routes
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── supabase-schema.sql         # Run this in Supabase SQL editor
├── .env.example                # Copy to .env and fill in values
├── index.html
├── vite.config.js
└── package.json
```

---

## ⚙️ Setup Instructions

### Step 1 — Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → Sign up free
2. Click **New Project** → give it a name → choose a region (closest to India: Singapore)
3. Wait for project to be ready (~1 min)
4. Go to **SQL Editor** → click **New Query**
5. Paste the entire contents of `supabase-schema.sql`
6. Click **Run** — this creates all tables + seed data
7. Go to **Settings → API**
8. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

---

### Step 2 — Local Development

```bash
# Clone or download this project
cd cue8-clone

# Install dependencies
npm install

# Copy env file and fill in your Supabase values
cp .env.example .env

# Edit .env with your values:
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJh...
# VITE_ADMIN_EMAIL=admin@cue8.in
# VITE_ADMIN_PASSWORD=yourpassword

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

### Step 3 — Deploy to Vercel (Free)

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   # Create a repo on github.com, then:
   git remote add origin https://github.com/YOUR_USERNAME/cue8-clone.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
3. Click **New Project** → Import your GitHub repo
4. In **Environment Variables**, add:
   ```
   VITE_SUPABASE_URL      = https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJh...
   VITE_ADMIN_EMAIL       = admin@yourclub.com
   VITE_ADMIN_PASSWORD    = your-secure-password
   ```
5. Click **Deploy** — done! 🎉

Your site will be live at: `https://cue8-clone.vercel.app`

---

## 🔐 Admin Panel

- URL: `yoursite.vercel.app/admin/login`
- Credentials: set via `.env` variables
- **Change the default password before going live!**

### What Admin Can Do:
| Tab | Actions |
|-----|---------|
| Bookings | View all bookings, mark done/cancel, filter by status |
| Tables | Toggle Available/Busy, add new tables, delete tables |
| Leaderboard | Add/edit/delete players, update hours & tier |
| Settings | Edit club name, hours, phone, address |

---

## 💸 Cost Summary

```
Supabase Free Tier:   500MB DB, 50k users     → ₹0/month
Vercel Free Tier:     100GB bandwidth          → ₹0/month
Custom Domain (.in):  Optional                 → ₹800/year
─────────────────────────────────────────────────────────
Total monthly cost:   ₹0
Total yearly cost:    ₹0 (or ₹800 with custom domain)
```

---

## 🛠️ Customization

| What to change | Where |
|----------------|-------|
| Club name, address | Admin → Settings |
| Table names & prices | Admin → Tables |
| Leaderboard players | Admin → Leaderboard |
| Colors / fonts | `src/index.css` |
| Booking time slots | `BookingModal.jsx` → `TIMES` array |
| Homepage text | `src/pages/HomePage.jsx` |

---

## 📞 Support

Built with ❤️ for CUE8 Pool & Snooker Club, Nagpur.
