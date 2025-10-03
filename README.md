# 🏬 Store Management System

[![Built with Node.js](https://img.shields.io/badge/Node.js-%23339933.svg?logo=node.js\&logoColor=white)](https://nodejs.org/) [![React](https://img.shields.io/badge/React-%2320232a.svg?logo=react\&logoColor=%2361DAFB)](https://reactjs.org/) [![MySQL](https://img.shields.io/badge/MySQL-%230072B4.svg?logo=mysql\&logoColor=white)](https://www.mysql.com/) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

> A role-based store management web app where users can register, log in and submit ratings for stores (1–5). Built with **React.js**, **Express.js**, and **MySQL**. The project includes an ER diagram and UI screenshots for quick review.

---

## ✨ Highlights

* ✅ Role-based authentication: **Admin**, **Store Owner**, **Normal User**
* ✅ Admin dashboard: manage users & stores, global stats
* ✅ Store Owner dashboard: view ratings and users who rated their store
* ✅ Normal User: sign up, browse/search stores, submit & modify ratings (1–5)
* ✅ Server-side validation and secure password storage
* ✅ ER diagram + screenshots included in the repo

---

## 🗄️ Database (ER Diagram)

![ER Diagram](./project%20screen%20shots/ER%20diagram\(schema\).png)

---

## 📸 UI Screenshots

**Login (role based)**
![Login Page](./project%20screen%20shots/login%20page%20with%20role%20based%20.png)

**Signup**
![Signup Page](./project%20screen%20shots/signup%20page.png)

**Admin Dashboard**
![Admin Dashboard](./project%20screen%20shots/admin%20dashboard.png)

**Store Owner Dashboard**
![Store Owner Dashboard](./project%20screen%20shots/store%20owner%20dashboard.png)

**Normal User Dashboard**
![Normal User Dashboard](./project%20screen%20shots/normal%20user%20dashboard.png)

---

## 🛠 Tech Stack

| Layer    | Technology           |
| -------- | -------------------- |
| Frontend | React.js             |
| Backend  | Node.js + Express.js |
| Database | MySQL (mysql2)       |
| Auth     | JWT, bcrypt          |

---

## 📂 Project Structure

```
store/
├─ backend/                # Express APIs, controllers, models
├─ frontend/               # React app
├─ project screen shots/   # ER diagram + UI screenshots        
├─ .gitignore
└─ README.md
```

---

## 🚀 Quick Start (Local)

> Make sure MySQL is running locally and you have created a database for the project.

### 1. Clone

```bash
git clone https://github.com/your-username/store.git
cd store
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # update DB credentials and JWT secret
npm install
npm run dev             # or `npm start`
```

### 3. Frontend

```bash
cd ../frontend
npm install
npm run dev             # or `npm start`
```


## 🔒 Validation rules

* **Name:** 20–60 characters
* **Address:** max 400 characters
* **Password:** 8–16 chars, at least one uppercase and one special character
* **Email:** standard email format

---

## 👨‍💻 Sample Accounts (for demo)

> You can create users via the signup page or seed the DB. Example credentials (change passwords after first login):

* Admin: `admin@gmail.com` / `Admin@123`
* Normal User: `user@gmail.com` / `User@1234`
* Store Owner: `Owner2@gmail.com` / `Owner2@123`

---

## 📌 Notes for Technical reviewTeam:-

* The `project screen shots` folder contains all screenshots and the ER diagram for quick visual review.
* Use the Admin account to see global stats (users, stores, ratings) and filters.
* Store Owners can view users who rated their store and the average rating.

---

## 🔭 Next Steps / Improvements

* Add product management for stores
* Deploy backend and frontend to cloud (Heroku/Render + Vercel)
* Add automated tests and CI workflow
* Add pagination + advanced search on listing endpoints

---


## 📄 License

This project is provided for evaluation as part of a FullStack Intern Coding Challenge.

---


