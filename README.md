# LifeLink: Blood Bank Management System

LifeLink is a professional, industry-grade Blood Bank Management System built with a decoupled architecture. It enables volunteer donors, hospitals, and recipients to connect with administrators to manage cold storage blood stock, schedule appointments, request blood units with compatibility matching, and verify health eligibility metrics.

---

## 🚀 Key Features

1. **Role-Based Access Control (RBAC)**: Secure pages and endpoints customized for four distinct roles:
   - **Admin**: Complete cold-storage refrigerator inventory management, check-in health verification, blood requests fulfillment, user suspension, and audit trails.
   - **Donor**: Health eligibility countdown screen (56 days whole blood interval check), donation scheduler, and printable PDF certificates.
   - **Recipient**: Ticket dispatch tracking, emergency blood requests.
   - **Hospital**: Bulk blood requests, live inventory level checker.
2. **FIFO-Based Automated Stock Deduction**: Fulfilling a blood request searches for compatible blood types in refrigerator inventory and deducts units using First-In-First-Out (FIFO) logic based on expiry date to avoid waste.
3. **Advanced Security**: Access and Refresh Token structure using JWT, hashed password verification with bcrypt, rate limiting, and CORS protections.
4. **Rich Dashboard & Analytics**: High-fidelity dark themed interface with responsive layout, warning thresholds for low stock level, recent activity logs, and Chart.js graphical charts.
5. **Traceable Logs**: Automatic logging of database adjustments in a centralized system audit trail.

---

## 🛠️ Technology Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React (Vite), React Router, Axios, React Hook Form, Zod |
| **Styling** | Vanilla CSS (Custom Design System, CSS Variables, Glassmorphism) |
| **Charts** | Chart.js |
| **Icons** | Lucide React |
| **Backend** | FastAPI (Python 3.11/3.12), SQLAlchemy (ORM) |
| **Authentication** | JWT Access & Refresh Tokens, bcrypt hashing |
| **Database** | SQLite (Local Development) / PostgreSQL (Production) |

---

## 📂 Project Structure

```
blood-bank-system/
├── backend/
│   ├── app/
│   │   ├── core/           # Configuration, Database connection, Security JWTs
│   │   ├── models/         # SQLAlchemy models (User, Stock, Request, Donations)
│   │   ├── schemas/        # Pydantic schemas for data validation
│   │   ├── routers/        # FastAPI endpoint controllers (Auth, Stock, Analytics)
│   │   ├── services/       # Compatibility matcher, smtplib email notification
│   │   └── dependencies/   # Route security guard dependencies
│   ├── requirements.txt    # Python packages
│   └── .env                # Secret keys, database URLs
└── frontend/
    ├── src/
    │   ├── components/     # UI components (Navbar, Sidebar, Modal, StatCard)
    │   ├── context/        # React AuthContext session persistence
    │   ├── pages/          # Login, Register, Dashboards, Requests, Profile
    │   └── services/       # Axios API client with automatic token refresher
    ├── package.json        # Node dependencies
    └── index.html          # Shell template
```

---

## 🛢️ Database Schema ERD Details

1. **`users` Table**: Hashed passwords, roles, blood group biological details, verification flags, and last login timestamps.
2. **`blood_stock` Table**: Tracks individual bags of blood with collection date, expiry date, storage location (fridge/shelf), and status (`available`, `reserved`, `expired`, `transfused`).
3. **`donations` Table**: Appointment date, attending doctor, check-in health parameters (hemoglobin level, weight, pulse, blood pressure, temperature), and certificate flags.
4. **`blood_requests` Table**: Patient details, delivery timelines, urgency scales (`normal`, `urgent`, `critical`), and quantity fulfilled logs.
5. **`notifications` Table**: Inbox triggers for status changes and reminders.
6. **`audit_logs` Table**: Centralized trace logging for admin database modifications.

---

## ⚙️ Installation & Running Locally

### 1. Prerequisites
- **Python 3.11** or **Python 3.12**
- **Node.js (v18+)** and npm

---

### 2. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Set up virtual environment and install packages:
   ```bash
   py -3.11 -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Run the development server (Auto-creates SQLite file and seeds default test users):
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will be live on [http://localhost:8000](http://localhost:8000). Swagger UI docs will be available on [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 3. Frontend Setup
1. Open another terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm packages (including Zod, Hook Form, Chart.js):
   ```bash
   npm install --legacy-peer-deps
   ```
3. Spin up the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to [http://localhost:5173](http://localhost:5173).

---

## 🔑 Pre-Seeded Development Test Accounts

Use these credentials to test the various dashboards:

| Role | Email | Password | Features to Test |
| --- | --- | --- | --- |
| **Admin** | `admin@bloodbank.com` | `AdminPass123` | Fridge inventory, Approve requests, Verify check-in health metrics, View audit trail |
| **Donor** | `donor@bloodbank.com` | `DonorPass123` | Eligibility countdown, Schedule appointment, View certificate |
| **Hospital** | `hospital@bloodbank.com` | `HospitalPass123` | live stock levels, request bulk blood bags |
| **Recipient** | `recipient@bloodbank.com` | `RecipientPass123` | Request blood ticket, track dispatch status |

---

## 🏥 Blood Group Compatibility Rules implemented

The matching module resolves compatible donor blood bags using standard biological matching guidelines:

| Recipient Blood Group | Compatible Donor Blood Groups |
| --- | --- |
| **O-** | O- (Universal donor can only receive O-) |
| **O+** | O-, O+ |
| **A-** | O-, A- |
| **A+** | O-, O+, A-, A+ |
| **B-** | O-, B- |
| **B+** | O-, O+, B-, B+ |
| **AB-** | O-, A-, B-, AB- |
| **AB+** | All blood groups (Universal recipient) |
