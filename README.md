# POI - Sales & Billing Management Dashboard

## Overview

POI (Point of Interest) is a web-based dashboard designed for sales teams to monitor customer billing, track sales performance, and manage customer data efficiently. The application features a comprehensive admin panel that visualizes key metrics and provides tools for customer management. The entire front-end is built with vanilla JavaScript, HTML, and CSS, and it dynamically pulls data from Google Sheets, acting as a lightweight database.

## Key Features

- **Admin Dashboard:** A central hub displaying key metrics like total customers, payment status (paid vs. unpaid), and closing rates. Includes a trend graph for delinquent customers.
- **Billing Monitoring:** A detailed table view for monitoring customer billing status filtered by sales team members and billing month.
- **Sales Performance Reports:** Generates reports on sales performance, including a sales leaderboard, customers-per-sales chart, and individual scorecards.
- **WhatsApp Message Generator:** A utility to quickly generate templated billing reminder messages for WhatsApp.
- **Global Customer Search:** A persistent search bar in the header to quickly find and navigate to customer profiles.
- **Customer Profile View:** A dedicated page showing detailed customer information, payment history, and notes.
- **History & Analytics:** Tracks user activity and web analytics within the admin panel.

## Tech Stack

- **Frontend:**
    - HTML5
    - CSS3 (with custom properties for theming)
    - Vanilla JavaScript (ES6+)
- **Data Source:**
    - [Google Sheets](https://www.google.com/sheets/about/) (used as a database)
- **Visualization & Animation:**
    - [Chart.js](https://www.chartjs.org/)
    - [ApexCharts](https://apexcharts.com/)
    - [GSAP (GreenSock Animation Platform)](https://greensock.com/gsap/)
- **Backend API (Optional):**
    - A small Node.js/Express API is included in the `/api` directory, which can be deployed as a serverless function (e.g., on Vercel).
- **Deployment:**
    - The project is configured for deployment on [Vercel](https://vercel.com/).

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
