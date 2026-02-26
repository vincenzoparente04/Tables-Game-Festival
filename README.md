# Festivals de Jeux — Festival Management Platform

## Project Overview

This application was developed as a **team project** during an academic program at a French engineering university.

The goal was to design and build a complete platform to manage board game festivals, covering everything from festival creation to reservations, placement planning, and invoicing.

The interface is in English to ensure accessibility for an international audience.

👉 The **latest stable version** of the project is available online (deployment version).

🔗 Live application: https://lively-rabanadas-2ae5d7.netlify.app/
🔗 Backend API: https://tables-game-festival.onrender.com/
🔗 GitHub repository: https://github.com/vincenzoparente04/Tables-Game-Festival

> Note: The deployment version includes the latest fixes and improvements beyond the academic submission.

---

## What is this application?

A complete platform for organizing and managing a board game festival.

From festival creation and pricing setup to publisher reservations and invoice generation, it provides organizers with a single tool to manage the entire event.

## How does it work?

### 1. Home Page

When you log in, you arrive on the home page.

On the left, there is a **sidebar menu** with access to all sections of the application.

---

### 2. Create a Festival

**Where to go**: Sidebar → Festivals → Click **"Create"**

**What you do**:
- Give the festival a **name** (e.g., "Festival Ludis 2026")
- Specify the **total number of available tables** (e.g., 100)
- Define the **start date** and **end date**
- Add a **description** (optional)
- Fill in the **furniture stock**:
  - Standard tables, large tables, municipal tables
  - Standard chairs, municipal chairs
- Set the **price per electrical outlet** (e.g., €5)

**After creation**:
- The festival automatically appears first (marked with a ⭐ "current")
- Previous festivals are no longer current
- The new festival appears in the public view (for visitors or volunteers)

**Trying to delete a festival**:  
If you create reservations or zones, you will no longer be able to delete it (the app prevents deletion to avoid data loss).

---

### 3. Create Pricing Zones (different price tiers)

**Where to go**: Festival details → **"Create pricing zone"**

**What you do**:
- Give the zone a **name** (e.g., Premium, Standard, Budget…)
- Specify **how many tables** the zone contains
- Set the **price per table** (e.g., €50 per table)
- The **price per m²** is calculated automatically

**Important**: The sum of all zones cannot exceed the festival total.

- If the festival has 100 tables and you create a zone with 50 tables, you can create another with a maximum of 50 tables.
- If you try to exceed the total, the app refuses and shows how many remain available.

---

### 4. Create a Reservation

**Where to go**:  
Sidebar → Festivals → select a festival → click **Reservations** → click **New Reservation**

**What you fill in**:
- **Reservant**: Select who is reserving (publisher, association, etc.)
- **Number of electrical outlets**: how many outlets they need (each costs the festival price)
- **Will host activities**: check if they will animate activities on site
- **Notes**: internal notes (optional)
- **Tables reserved by zone**: for each pricing zone (Premium, Standard, etc.), specify how many tables they want

The price is **calculated automatically**.  
You can add multiple zones for the same reservation.

**After creation**:
- The reservation appears with the status **"not contacted"**
- You can now add or modify the reservation information

---

### 5. Apply Discounts (optional)

Inside the reservation, there are two discount fields.

You can apply up to two types of reductions:

**Fixed discount**: a fixed reduction in euros  
**Table discount**: a percentage applied to tables only

---

### 6. Add Games to the Reservation

**In the reservation detail** → click **"Add a game"**

**What you do**:
- Select a game from the list (e.g., Catan, Ticket to Ride)
- The game is added to the reservation
- You see the game status: **"Game not received"**, which you can check once received

---

### 7. Generate the Invoice

**Reservation detail** → click **"Generate invoice"**

**What happens**:
- You see: Tables + Outlets − Discounts = Final amount
- Click **Generate**

**After generation**:
- A **unique invoice** is created with a number (FAC-20260120-00001)
- The invoice is marked **unpaid**
- **Important**: You cannot create two invoices for the same reservation.  
  However, it can be modified if payment lines are changed.

---

### 10. Mark the Invoice as Paid

**Reservation detail → Workflow section → "Pay"**

**What you do**:
- Click to confirm the client has paid
- The invoice changes from **unpaid** to **paid**
- Once paid, it cannot be modified or deleted (unless reverted to unpaid)
- The payment date is recorded

---

### 11. Organze the Layout & Place Games (plan zones)

**Where to go**:  
Sidebar → Festivals → select festival → **Plan & Placement**

You arrive at the plan zone management page.

**Create a plan zone**:
- Click **"New Plan Zone"**
- Give the zone a **name** (e.g., Aisle A, Youth Area, VIP Zone)
- Specify the **number of available tables**
- Click **Create**

**Place games in zones**:
- Each zone has a **"Place a game"** button
- Select the game you want to place
- The game is added and the **occupancy rate** is displayed (% of tables used)
- Games are grouped by **reservation**
- Games can also be placed from the “place games” tab.

**Overview**:
- The **Overview** tab shows all zones with placed games
- The **Equipment stock** tab displays remaining tables and chairs

---

### 12. Manage Publishers

**Where to go**: Sidebar → **Publishers**

**Create a publisher**:
- Enter the publisher **name**
- Add **contacts**:
  - Name
  - Email (optional)
  - Phone (optional)
  - Role/function (e.g., Sales Manager)
- You can add multiple contacts

**View & edit**:
- Click a publisher
- See their **games** and **contacts**
- Modify or delete the publisher

---

### 12B. Manage Games

**Where to go**: Sidebar → **Games**

**Create a game**:
- Click **+ Add game**
- Fill in:
  - Game name
  - Publisher (**required**)
  - Game type (e.g., Strategy, Cooperative)
  - Minimum & maximum age
  - Minimum & maximum players
  - Average duration (minutes)
  - Table size (small, large)
  - Authors

You can modify or delete a game later.

---

### 13. Manage Reservants

**Where to go**: Sidebar → **Reservants**

**Create a reservant**:
- Enter the reservant name (e.g., Game Association, Distributor XYZ)
- Choose the type:
  - Publisher
  - Distributor
  - Association
  - Other
- If it is a publisher, you can link an existing publisher (optional)
- Add contacts:
  - Name
  - Email
  - Phone
  - Role/function

---

### Initial Data (CSV import)

At first installation, the database is populated using CSV files:

- **editeur.csv** → list of publishers  
- **jeu.csv** → list of games and properties  
- **typeJeu.csv** → available game types  

These data are automatically imported via **02_seed.sql** during Docker initialization, allowing you to start with a pre-existing catalog.

---

### 14. Public View (for visitors & volunteers)

**Where to go**: Sidebar → **Public Views**

**What is displayed**:
- Games from the **current festival** with details:
  - Name, type, recommended ages, number of players
  - Duration, publisher, authors
  - Plan zone (where the game is placed)
- Publishers of the current festival
- Toggle between **Games view** and **Publishers view**

**Who can see it**: all roles.  
Since other roles can access festivals, limited festival information is shown here so visitors and volunteers can view essential details.

---

### 15. Roles & Permissions

**Admin** — full access
- Manage festivals, pricing zones, reservations
- Generate invoices
- View all reservations
- Manage users
- Manage games & publishers
- Access public view

**Super Organizer** — almost Admin (except user management)
- Manage festivals, pricing zones, reservations
- Generate invoices
- View reservations
- Manage games & publishers
- Access public view
- Cannot manage users

**Organizer**
- Manage their festival
- Create pricing zones
- Manage their reservations
- Generate invoices
- View only their reservations
- Access public view

**Volunteer & Visitor**
- View the current festival
- View the festival layout (zones & placed games)
- Access public view
- Cannot create anything

**User**
- Waits for admin approval
- Cannot access content until validated
