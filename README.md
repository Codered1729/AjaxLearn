# CVR College of Engineering — Student Portal
### Lightweight AJAX Learning Demo

A compact, minimal student portal for **CVR College of Engineering (CVRCE)** built with vanilla HTML, CSS, and JavaScript.

## Features

- **Login & Register:** Student authentication and branch selection without page reloads.
- **Edit Mode Toggle:** Use the **Edit Mode: OFF / ON** button in the navbar to show or hide all create, edit, and delete controls across the portal.
- **Notices / Announcements:** View college notices; post, edit, or delete notices when Edit Mode is on.
- **Courses:** Filter subjects by department; add, edit, or delete courses when Edit Mode is on.
- **Timetable:** Weekly class schedule; click any slot to edit or clear it when Edit Mode is on.
- **College Blog:** Expandable campus articles; write, edit, or delete stories when Edit Mode is on.
- **Profile & Persistence:** Edit student profile details on the Dashboard; changes persist via `localStorage` with an option to reset defaults.

## Demo Accounts

| Name | Email | Password | Branch |
|------|-------|----------|--------|
| **Vishnu Teja** | `vishnuteja@cvr.ac.in` | `cvr2024` | Computer Science & Engineering |
| **Rahul Reddy** | `rahul@cvr.ac.in` | `cvr2024` | Electronics & Communication Engg |

## Running Locally

```powershell
npx serve . --listen 5500
```
Open [http://localhost:5500](http://localhost:5500) in your browser.
