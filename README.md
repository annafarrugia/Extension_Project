# Extension_Project
A chrome extension that lets students add assignments and exams intoa google sheet directly from a popup, and get desktop reminders before they're due.

Authors: Sophie Castet-Bellocq and Anna Farrugia

# What it does
    - Signs in with Google (OAuth 2.0) and creates a dedicated Drive folder for the user's tracker documents
    - Creates new tracker spreadsheets by copying a pre-built template, so every document starts with consistent formatting and formulas
    - Lets the user pick a tracker document and add courses scoped to that specific document
    - WRites new assignments/exams directly into the correct Google Sheet row through the Sheets API
    - Schedules desktop notifications ahead of due dates, with reminder types that the user picks

# What types of Tech used
    - Chrome Extension and Manifest V3
    - JavaScript
    - Google Drive API and Google Sheets API
    - Chrome Extension APIs (chrome.identity, chrome.storage.local, and chrome.alarms/chrome.notifications)

# Decisions while building this
    - The popup.js handles everything the user sees and does while the background.js handles scheduling and firing reminders independently, so a reminder still fires correctly even if the popup is closed. 
        - they communicate through the message ASSIGNMENT_ADDED rather than sharing directly, which we though would be easier because the responsibilities are kept seperated to debug easily
    - Copying from a template instead of generating from scratch. The new tracker documents are created by duplicating a template spreadsheet (using files.copy from Drive APIs) instead of building headers and formatting every single time.
        - Our thought process was that it would keep formulas and conditional formatting and layout consistent across everyone's document without have to do it all in JavaScript
    - Row targeting instead of using the Sheets API. We started with appending rows with the Sheets API's built in append operator but it produced incosistent results. We think the pre-applied formatting and checkbox validation further down the template caused the API to not understand where the real data was ending. 
        - We decided to just manually find the last populated row in a reliable column and then write to that exact row which made the row placement predictable no matter what
    - We chose to scope courses to specific spreadsheets that they belong to (using the sheet ID key) and notification preferences persisting across popoup sessions. This is so we don't need a backend server

# File Structures
    manifest.json : Extension permissions, Oauth scopes, and icons
    popup.html/popup.css : Deals with the Popup UI 
    popup.js : form handling, Drive/Sheets API calls, dropdown logic
    background.js : notification scheduling, independent of the popup's lifecycle
    icons/ : extension icons

# Repo Setting this up
    1. Clone the repo
    2. Go to "chrome://extensions", and enable "Developer Mode"
    3. Click "Load unpacked" and select this project's folder

    Google Cloud setup (Only 1 time)
    1. Enable the Google Drive API and Google Sheets API in Google Cloud Console
    2. Create an OAuth 2.0 CLient ID, using the extension ID shown in "chrome://extensions" after loading it
    3. Add test users under the OAuth consent screen
    4. Add the client ID to manifest.json under oauth2.client_id

# Limitations
    - There is no retry logic for expired kOAuth token mid-session
    - No handling for a tracker document deleted after being selected
    - Course lists and settings are stored locally per browser, not synced across devices
    - The "Full Syllabus" tab isn't built yet

# Possible Next Steps
    - Sync notifs setting to chrome.storage.sync so they follow the user across different devices
    - Add retry/refresh handling around expired OAuth tokens
    - Build out the FUll Syllabus tab for bulk assignment entry
    -Add automated tests around the row-calculation logic in appendAssignmnet
    -When we feel like we don't wnat to add anything else we pay actually publish this popup to the Chrome Store