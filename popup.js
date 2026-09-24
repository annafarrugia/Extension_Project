/*
 * Extension Popup Script
 * Handles the logic for the extension's popup interface, 
 * form submissions and interactions with the content script
 * Author: Anna Farrugia and Sophie Castet-Bellocq
 */

const SHEET_HEADERS = ['Due Date', 'Due Time','Class','Type','Assignment'];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup loaded');


    // using the submit button to test OAuth rn
    const submitBtn = document.getElementById('IA_submit_btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function(event) {
            event.preventDefault();
            console.log('Submit button clicked, testing OAuth...');
            testOAuth();
        });
    }

    //initialization functions:
    handleTabSelection();
    //initFormSubmission();

});

/*
 * Individual Assignment form submission handling
 * TODO: connect object created to content script to send data to google sheets
 * Must figure out how to get token for users google sheets
 */
function initFormSubmission() {
    const submitBtn = document.getElementById('IA_submit_btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function(event) {
            event.preventDefault();
            //grabbing the values from the html
            const documentName = document.getElementById('IA_document_dropdown').value;
            const course = document.getElementById('IA_course_dropdown').value;
            const date = document.getElementById('IA_due_date').value;
            const time = document.getElementById('IA_time_due').value;
            const assignmentTitle = document.getElementById('IA_assignment_name').value;
            const assignmentDescription = document.getElementById('IA_assignment_description').value;
            const assignmentType = document.getElementById('IA_type_dropdown').value;

            //creating the assignment object
            const assignmentData = {
                documentName, 
                course,
                date,
                time,
                assignmentTitle,
                assignmentDescription,
                assignmentType
            };
            console.log('Submitting assignment data:', assignmentData);

            //THEN send this data to google sheets using the content script

        });
    }
}


/* Handles the Selection of each Tab and makes every tab visible when clicked
*/
function handleTabSelection() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(function(button) { 
          button.addEventListener('click ', function() { 
          tabButtons.forEach(b => b.classList.remove('active'));
          tabContents.forEach(c => c.classList.remove('active'));
          });
        });
    }

/* Selection of Document from Google sheets API
* TODO : Implement the logic for selecting a document from Google Sheets
*/
function handleDocumentSelection() {
    const selectedDocument = document.getElementById('IA_document_dropdown').value;
    //Checks if the user picked the Create new Doc option
    if (selectedDocument === "Create new Document") {
        document.getElementById('NewAssignmentPopup').style.display = 'flex';
    }
}


function testOAuth() {
  console.log("Attempting to fetch OAuth token...");
  
  // 'interactive: true' makes the google login prompt pop up
  chrome.identity.getAuthToken({ interactive: true }, async function(token) {
    if (chrome.runtime.lastError) {
      // error message
      console.error("OAuth Failed:", chrome.runtime.lastError.message);
      return;
    }
    
    // IF THIS PRINTS OAUTH WORKS
    console.log("OAuth Success! Your access token is:", token);

    /*TEMPORARY */
    fetch("https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=" + token)
      .then(response => response.json())
      .then(data => console.log("Token info:", data));

    const folderId = await getOrCreateFolder(token);
    console.log("Using folder ID:", folderId);
  });
}


/* Creating a new folder in Google Drive for the new Google sheets Documents and also checking if it exists */
async function getOrCreateFolder(token) {
  const stored = await chrome.storage.local.get("driveFolderId");

  if (stored.driveFolderId) {
    const stillExists = await verifyFolderExists(
      stored.driveFolderId,
      token
    );

    if (stillExists) {
      console.log("Reusing existing folder:", stored.driveFolderId);
      return stored.driveFolderId;
    }
  }

  const folderId = await createDriveFolder(token);

  await chrome.storage.local.set({
    driveFolderId: folderId
  });

  console.log("Created new folder:", folderId);

  return folderId;
}

/*Logs the response from the GD API and returns folder ID if it exists */
async function createDriveFolder(token) {
  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "MyExtension Documents",
        mimeType: "application/vnd.google-apps.folder"
      })
    }
  );

  const text = await response.text();

  console.log("Status:", response.status);
  console.log("Raw response:", text);

  if (!response.ok) {
    throw new Error(text);
  }

  return JSON.parse(text).id;
}

async function verifyFolderExists(folderId, token) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,trashed`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) return false; // 404 = deleted or inaccessible
  const data = await response.json();
  return !data.trashed;
}
