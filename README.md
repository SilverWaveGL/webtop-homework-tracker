# WebTop Homework Tracker

This project turns WebTop homework notifications on an iPhone into rows in a Google Sheet. Each family sets up its own Sheet, Google Apps Script, and iPhone shortcut.

## Files

- [Code.gs](Code.gs) — the Google Apps Script web app that receives homework notifications, extracts the assignment and class, calculates a due date from the timetable, and adds a row to the Sheet. It contains placeholders for your Sheet ID and secret; it is not ready to deploy unchanged.
- [INSTRUCTIONS.md](INSTRUCTIONS.md) — the full setup and troubleshooting guide. Start here if you want to set up the tracker.
- [INSTRUCTIONS.pdf](INSTRUCTIONS.pdf) — a PDF copy of the setup guide for reading or sharing.

Follow the instructions to make your own copy of the Sheet template, configure and deploy the script, and install the iPhone shortcut. Keep your actual secret and deployed web-app URL out of this public repository.
