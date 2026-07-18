# 🌊 ResQMap Kerala — Live Disaster Relief Coordination Platform

**2nd Place — FIFA HackUp '26 Grand Final** (organized by IEEE Computer Society, College of Engineering Cherthala)

ResQMap Kerala is a full-stack, hyper-local disaster response coordination platform built to help citizens report emergencies and coordinators manage relief efforts in real time — even when internet access is unreliable.

## 🎥 Demo Video
[Watch the full demo here](https://drive.google.com/file/d/1HTe1kyRz7mNS9c0QjW5FM19XwJ1_3qIA/view?usp=sharing)

## 📸 Screenshots

### Citizen Reporter Portal
![Citizen Portal](screenshots/citizen%20portal.png)

### Coordinator Command Dashboard
![Command Dashboard](screenshots/command%20dashboard.png)

### Interactive Demo Simulator
![Interactive Demo](screenshots/interactive%20demo.png)

## 🚀 Features

- **Multi-channel incident reporting** — Web form, SMS, MMS, and voice call ingestion via Twilio
- **NLP-based free-text parsing** — Automatically extracts urgency, category, and vulnerable populations from unstructured reports
- **Real-time triage scoring** — Incidents are automatically scored and prioritized (Critical → Low) based on urgency keywords, vulnerabilities, and time elapsed
- **Smart resource matching** — Matches incidents to the nearest shelter/relief zone based on live capacity
- **Coordinator command dashboard** — Assign, track, and resolve tickets from a live 3-panel command center
- **Live safety zone tracking** — Real-time shelter occupancy, food/water/medical stock levels, with restock controls
- **Emergency communication audit trail** — Full log of all incoming reports and system actions
- **Interactive demo simulator** — Built-in control panel to inject simulated incidents for live demos/presentations

## 🛠️ Tech Stack

**Backend:** Spring Boot, Java, MySQL, Hibernate/JPA, Twilio API
**Frontend:** React, Vite, Leaflet.js (mapping), CSS
**Infrastructure:** RESTful API, Twilio webhooks for SMS/MMS/Voice

## 🏗️ Architecture

Citizen Report (Web/SMS/MMS/Voice)
↓
NLP Parser + Urgency Scoring
↓
Spring Boot Backend (REST API)
↓
MySQL Database
↓
Coordinator Dashboard (React + Leaflet)
↓
Resource Zone Matching & Assignment

## ⚙️ Getting Started

### Prerequisites
- Java 17+
- Node.js 18+
- MySQL

### Backend Setup
```bash
cd backend
./mvnw spring-boot:run
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Backend runs on `http://localhost:8080`, frontend on `http://localhost:3000`.

## 👥 Team

Built by **Danny Paul Sebastian** and **Anaswara Dinesh**, College of Engineering Cherthala (KTU)

## 🏆 Recognition

Awarded 2nd Place at the **FIFA HackUp '26 Grand Final**, organized by IEEE Computer Society, College of Engineering Cherthala.
