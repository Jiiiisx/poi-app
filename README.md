# POI - Sales & Billing Management Dashboard

![Made with Vanilla JS](https://img.shields.io/badge/Made%20with-Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript)

## Overview

POI (Point of Interest) is a web-based dashboard designed for sales teams to monitor customer billing, track sales performance, and manage customer data efficiently. The application features a comprehensive admin panel that visualizes key metrics and provides tools for customer management. The entire front-end is built with vanilla JavaScript, HTML, and CSS, and it dynamically pulls data from Google Sheets, acting as a lightweight database.

## Key Features

- **📊 Admin Dashboard:** A central hub displaying key metrics like total customers, payment status, and closing rates.
- **💳 Billing Monitoring:** A detailed table view for monitoring customer billing status, filterable by sales team and month.
- **📈 Sales Performance Reports:** Generates reports on sales performance with leaderboards and charts.
- **📱 WhatsApp Message Generator:** A utility to quickly generate templated billing reminder messages.
- **🔍 Global Customer Search:** A persistent search bar to quickly find customer profiles.
- **👤 Customer Profile View:** A dedicated page showing detailed customer information, payment history, and notes.
- **🕰️ History & Analytics:** Tracks user activity and web analytics within the admin panel.

## Tech Stack

### Frontend
<p>
  <img src="https://img.shields.io/badge/HTML5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-%23F7DF1E.svg?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
</p>

### Data Source
<p>
  <img src="https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white" alt="Google Sheets">
</p>

### Visualization & Animation
<p>
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Chart.js">
  <img src="https://img.shields.io/badge/ApexCharts-00E396?style=for-the-badge&logo=apexcharts&logoColor=white" alt="ApexCharts">
  <img src="https://img.shields.io/badge/GSAP-88CE02?style=for-the-badge&logo=greensock&logoColor=white" alt="GSAP">
</p>

### Backend & Deployment
<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js">
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel">
</p>

## Project Structure

The project is organized into a few main directories:

-   `/`: Contains the public-facing HTML pages (`index.html`, `landing.html`).
-   `/admin`: Contains all the private admin dashboard pages and their specific assets.
-   `/api`: Contains the Node.js serverless function backend.
-   `/css`: Global CSS files for the public pages.
-   `/admin/css-admin`: CSS files for the admin dashboard.
-   `/js`: Global JavaScript files for the public pages.
-   `/admin/js-admin`: JavaScript files for the admin dashboard logic.

## Setup & Usage

Since this is primarily a static frontend project, no complex build steps are required.

1.  **Serve the files:** You can use a simple local server to run the project.
    - If you have Python: `python -m http.server`
    - If you have Node.js and `serve`: `npx serve`
2.  **Navigate:** Open your browser to the local server's address (e.g., `http://localhost:8000`).
3.  **Admin Panel:** Access the admin panel by navigating to `/admin/login.html`.

**Note:** The application is designed to fetch data from a specific Google Sheets document. The logic for this is contained within `/js/google-sheets-crud.js`. You may need to configure the Google Apps Script endpoint and Sheet ID to point to your own data source.