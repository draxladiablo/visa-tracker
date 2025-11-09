# visa-tracker
easily track your visa progress
🌍 Visa Tracking Web Application
A modern, user-friendly Visa Tracking System built with HTML, CSS, and JavaScript — designed to help clients track their visa application progress and allow admins to manage and review submissions in real-time.

🧾 Overview
The Visa Tracking Web App provides a seamless interface where:

Clients can register, upload visa documents, and track their visa progress.
Admins can log in to manage, review, approve, or reject visa applications.
All data is stored securely using browser-based local storage, ensuring persistence even after page refreshes.

💼 Features
👤 Client Side
Register and log in using email and password.
Upload required documents (e.g., passport and supporting files).
View a personal dashboard showing:
Tracking ID
Current visa status (Pending, In Review, In Progress, Approved, or Rejected)
Animated progress bar
Track visa using the generated Tracking Code.
Logout anytime securely.
🧑‍💼 Admin Side
Admin login using default credentials:
Manage all client applications.
Update each client’s visa progress in real-time.
Approve, reject, or delete client records with smooth animations.
View uploaded client documents through a document viewer modal with:
Timestamp for each upload
Download buttons for easy access
Persistent data (all client info and uploads are saved in localStorage).
🧠 Technical Highlights
Built with:
HTML5
CSS3 (Responsive, Gradient UI, Animated Transitions)
Vanilla JavaScript (No frameworks)
Uses LocalStorage API for data persistence.
Fully responsive design — works perfectly on desktop and mobile.
Confetti animation on approval for improved user experience 🎉.
📂 File Structure
🚀 Deployment
This project is hosted on Netlify for public access.
You can also host it using GitHub Pages or any static web hosting service.

Example URL:

🧰 How to Run Locally
Download or clone this repository:
git clone https://github.com/yourusername/visa-tracker.git
All uploaded documents are stored locally in the browser (not on a cloud server). This is for demo and educational purposes only.

To implement cloud-based storage or authentication, integrate with:

Firebase

AWS S3

or a backend API (Node.js, Express, MongoDB, etc.)
