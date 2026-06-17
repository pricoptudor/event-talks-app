# BigQuery Release Notes Explorer

A beautiful, premium web application built using **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that fetches, parses, and formats the Google Cloud BigQuery Release Notes feed. It includes filtering, keyword searching, cache management, and a custom tweet composer.

## Features

- **Automated Parsing**: Breaks down the consolidated daily release notes from the XML feed into individual, category-coded updates (Features, Fixes, Issues, and Deprecations).
- **Premium Dark Space Theme**: Features an Outfit/Inter typography, vibrant HSL tailored color accents, subtle gradients, micro-animations, card hover effects, and custom scrollbars.
- **Search & Filters**: Real-time filtering by category type and instant text search matching date, type, or description content.
- **Dynamic Counters**: Live badges showing the total count of updates matching each category.
- **Refresh with Spinner**: Force-refresh button with a loading spinner that fetches live data, backed by a 5-minute memory caching system to prevent hitting Google's servers on every load.
- **Tweet Composer**: A custom sharing modal that extracts text from the HTML update, formats it cleanly, counts characters dynamically (adhering to X/Twitter rules, reserving space for the URL), and opens the official Twitter share web intent.

## File Structure

- [app.py](file:///C:/Users/tpricop/OneDrive%20-%20Microsoft/Desktop/KaggleXGoogle/agy-cli-projects/bq-releases-notes/app.py): Python Flask backend that handles network requests, parses the XML Atom feed, and exposes API endpoints.
- [templates/index.html](file:///C:/Users/tpricop/OneDrive%20-%20Microsoft/Desktop/KaggleXGoogle/agy-cli-projects/bq-releases-notes/templates/index.html): HTML page template with inline SVGs for fast loading and crisp visuals.
- [static/css/styles.css](file:///C:/Users/tpricop/OneDrive%20-%20Microsoft/Desktop/KaggleXGoogle/agy-cli-projects/bq-releases-notes/static/css/styles.css): Custom CSS stylesheets containing variables, grid/flexbox layouts, responsive design rules, and styles.
- [static/js/app.js](file:///C:/Users/tpricop/OneDrive%20-%20Microsoft/Desktop/KaggleXGoogle/agy-cli-projects/bq-releases-notes/static/js/app.js): Core JavaScript logic handling client-side rendering, search, filtering, and the X/Twitter intent integration.
- [run.bat](file:///C:/Users/tpricop/OneDrive%20-%20Microsoft/Desktop/KaggleXGoogle/agy-cli-projects/bq-releases-notes/run.bat): Batch script shortcut to run the Flask application using the local project virtual environment.
- **venv/**: A lightweight local Python virtual environment containing the app's packages.

## How to Run

### Option 1: Double-click (Windows)
Double-click on [run.bat](file:///C:/Users/tpricop/OneDrive%20-%20Microsoft/Desktop/KaggleXGoogle/agy-cli-projects/bq-releases-notes/run.bat) in the project directory.

### Option 2: Command Line (Windows)
Open a terminal in the project directory and run:
```powershell
.\run.bat
```

Once started, open your web browser and visit `http://127.0.0.1:5000`.
