/*
 * Extension Popup Script
 * Handles the logic for the extension's popup interface, 
 * form submissions and interactions with the content script
 * Author: Anna Farrugia and Sophie Castet-Bellocq
 */

//column order that is written in the sheet
//kept as a reference
const SHEET_HEADERS = ['Due Date', 'Due Time','Class','Type','Assignment'];
//this is the google sheet that gets copied every time the user creates a 
//new document
const TEMPLATE_SHEET_ID = '1iY2qKVzkij_z-Mlxukn0n9FoavGN79pnY4p39aL1w-s';


//This run only once when the popup window is opened
//where every button is attached to the event listener
document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup loaded');
    //whenever user picks a different document
    document.getElementById('IA_document_dropdown').addEventListener('change', async function() {
    
    //if they picked new document
    handleDocumentSelection();
    //this = the dropdown itself because were inside it's own listener
    const sheetId = this.value;
    if (sheetId && sheetId !== 'Create new Document') {
      //loads the specific document's saved courses and puts into dropdown
      await loadCoursesForDoc(sheetId);
    }
  });

  //whenever user picks a difference course this happens
  document.getElementById('IA_course_dropdown').addEventListener('change', function() {
    //__new__ is the values used by "+ add New Course"
    if (this.value === '__new__') {
      const courseName = prompt('Enter the new course name:');
      const sheetId = document.getElementById('IA_document_dropdown').value;
      if (courseName && courseName.trim() && sheetId) {
        addCourseToDoc(sheetId, courseName.trim());
      }
      else {
        //resets if user canceled or didn't type anything
        this.value ='';
      }
    }
  });

    //initialization functions:
    handleTabSelection();     //3 tab buttons
    initFormSubmission();     //add assignment button
    loadDocumentOnOpen();     //autofills document dropdown
    loadNotifSettings();       //restores saved toggle status on the notifs tab

  //wires all 3 notifs so flipping any saves them
  ['popup_toggle', 'min30_toggle', 'exam_toggle'].forEach(function(id) {
    document.getElementById(id).addEventListener('change', saveNotifSettings);
  });

    //this manages the "create" button inside the "create new document"
    document.getElementById('newDocCreateBtn').addEventListener('click', async function() {
    const name = document.getElementById('newDocNameInput').value.trim();
    if (!name) {
      alert('Please enter a document name.');
      return;
    }
    
    //this is interactive and shows the google sign in popup if you aren't already signed in
    chrome.identity.getAuthToken({ interactive: true }, async function(token) {
      if (chrome.runtime.lastError) {
        console.error("OAuth failed:", chrome.runtime.lastError.message);
        return;
      }

      try {
        //this copies the template and makes a whole new spreadsheet
        const sheetId = await createSpreadsheet(name, token);
        console.log('Created sheet:', sheetId);

        // refresh the dropdown and select the new doc
        const files = await listDocuments(token);
        populateDocumentDropdown(files);
        document.getElementById('IA_document_dropdown').value = sheetId;
        await loadCoursesForDoc(sheetId);

        // close modal, reset input
        document.getElementById('NewAssignmentPopup').style.display = 'none';
        document.getElementById('newDocNameInput').value = '';
      } catch (err) {
        console.error('Failed to create spreadsheet:', err);
        alert('Could not create document. Check the console for details.');
      }
    });
  });
  //"cancel" button inside the "Create new Documnet"
document.getElementById('newDocCancelBtn').addEventListener('click', function() {
  document.getElementById('NewAssignmentPopup').style.display = 'none';
  document.getElementById('newDocNameInput').value = '';
  document.getElementById('IA_document_dropdown').value = ''; // back to placeholder
});
});


/*Silently tries to sign in and load the user's docs as soon as the popup opens
without showing a google long prompt
If the user has never signed in before, this quietly fails and won't say 
anything till user interacts with smth that need OAuth*/
async function loadDocumentOnOpen() {
  chrome.identity.getAuthToken({interactive:false }, async function(token) {
    if (chrome.runtime.lastError || !token) {
      console.log ('No cahced toekn - sign in by using the form once.');
      return;
    }
    try {
      const files = await listDocuments(token);
      populateDocumentDropdown(files);
    }catch (err) {
      console.error('Failed to laod documents:', err);
    }
  });
}

/* Individual assignment form submission handling.
Reads every filed, validates the required ones, writes a row to the selected
sheet and tells background.js a new assignment exists
 */
function initFormSubmission() {
    const submitBtn = document.getElementById('IA_submit_btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', function(event) {
          //stop the button from reloading the page
            event.preventDefault();
            //grabbing the values from the html
            const documentName = document.getElementById('IA_document_dropdown').value;
            const course = document.getElementById('IA_course_dropdown').value;
            const date = document.getElementById('IA_due_date').value;
            const assignmentTitle = document.getElementById('IA_assignment_name').value;
            const assignmentDescription = document.getElementById('IA_assignment_description').value;
            const assignmentType = document.getElementById('IA_type_dropdown').value;

            //Basic required field check before doing anything with the network
            if (!documentName || documentName === 'Create new Document' || !course || !date || !assignmentTitle) {
                alert('Please fill in document, course, date, and assignment name.');
                return;
            }
            //this is interactive and it promps a sign in popup if needed
            chrome.identity.getAuthToken({ interactive: true }, async function(token) {
                if (chrome.runtime.lastError) {
                    console.error("OAuth failed:", chrome.runtime.lastError.message);
                    return;
                }

                try {
                  //write the new row into the selected google sheet
                    await appendAssignment(documentName, {
                        date, course, assignmentType, assignmentTitle
                    }, token);
                    console.log('Assignment added!');
                    //let background.js know so it can schedule the right reminders
                    chrome.runtime.sendMessage({
                      type: 'ASSIGNMENT_ADDED',
                      assignment: {title:assignmentTitle, dueDate: date, assignmentType: assignmentType}
                    });
                    alert('Assignment added!');
                } catch (err) {
                    console.error('Failed to add assignment:', err);
                    alert('Could not add assignment. Check the console.');
                }
            });
        });
    }
}


/* Handles the Selection of each Tab and makes every tab visible when clicked
    clicking on hides all tab content, then shows only the matching one by toggling the 'active class
    */
function handleTabSelection() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(function(button) { 
          button.addEventListener('click', function() { 
            //turn everything off
          tabButtons.forEach(b => b.classList.remove('active'));
          tabContents.forEach(c => c.classList.remove('active'));

          //then turn on just the thing that was clicked
          button.classList.add('active');
          document.getElementById(button.getAttribute('data-tab')).classList.add('active');
          });
        });
    }

/* Opens the "Create new Doc page if the user picked that one from the doc dropdown*/
function handleDocumentSelection() {
    const selectedDocument = document.getElementById('IA_document_dropdown').value;
    //Checks if the user picked the Create new Doc option
    if (selectedDocument === "Create new Document") {
        document.getElementById('NewAssignmentPopup').style.display = 'flex';
    }
}

/*maual OAuth test helper that is kept for debugging in console*/ 
function testOAuth() {
  console.log("Attempting to fetch OAuth token...");
  
  // 'interactive: true' makes the google login prompt pop up
  chrome.identity.getAuthToken({ interactive: true }, async function(token) {
  if (chrome.runtime.lastError) {
    console.error("OAuth Failed:", chrome.runtime.lastError.message);
    return;
  }

  const folderId = await getOrCreateFolder(token);
  console.log("Using folder ID:", folderId);

  //load and show the documents
  try {
  const files = await listDocuments(token);
  console.log("Files found:", files);
  populateDocumentDropdown(files);
  console.log("Dropdown HTML after populate:", document.getElementById('IA_document_dropdown').innerHTML);
} catch (err) {
  console.error("listDocuments failed:", err);
}
});
}


/* Creating a new folder in Google Drive for the new Google sheets Documents and also checking if it exists */
async function getOrCreateFolder(token) {
  const stored = await chrome.storage.local.get("driveFolderId");

  //double checking if the folder is still there
  if (stored.driveFolderId) {
    const stillExists = await verifyFolderExists(
      stored.driveFolderId,
      token
    );

    if (stillExists) {
      console.log("Reusing existing folder:", stored.driveFolderId);
      return stored.driveFolderId;
    }
    //if the folder got deleted or soemthing you just make a new one
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

/*Confirms a cached folder ID still points to a real, non-deleted folder
If it returns falls getOrCreateFolder knows to make a new one */
async function verifyFolderExists(folderId, token) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,trashed`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!response.ok) return false; // 404 = deleted or inaccessible
  const data = await response.json();
  return !data.trashed;
}

/*Returns every spreadsheet sitting inside the drive folder as an arr 
to fill in the doc dropdown */
async function listDocuments(token){
  const folderId = await getOrCreateFolder(token);

  // q = query: only files inside our folder, that are spreadsheets, not trashed
  const query = `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;

  const response = await fetch(
    //encodeURIComponent needed bc the string ahs spaces and quotes in it
    //fields=files(id,name) only sends back id and name
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
// array of { id, name }
  return data.files; 
}

/*rebuilds the document dopdown's options from scratch, and alwasy ends in "Create new Document" */
function populateDocumentDropdown(files) {
  const dropdown = document.getElementById('IA_document_dropdown');

  // Clear everything except keep rebuilding from scratch
  dropdown.innerHTML = '';

  // Placeholder option
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Select Document --';
  dropdown.appendChild(placeholder);

  // One option per sheet
  files.forEach(function(file) {
    const option = document.createElement('option');
    option.value = file.id;        // the ID, not the name — you need this later
    option.textContent = file.name;
    dropdown.appendChild(option);
  });

  // "Create new Document" always goes last
  const createOption = document.createElement('option');
  createOption.value = 'Create new Document';
  createOption.textContent = 'Create new Document';
  dropdown.appendChild(createOption);
}


//creates a new document by copying the template sheet and drops teh copy into our drive folder 
async function createSpreadsheet(name, token) {
  const folderId = await getOrCreateFolder(token);

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${TEMPLATE_SHEET_ID}/copy`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,              // what the user typed in the modal
        parents: [folderId]      // put the copy in your extension's folder
      })
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  return data.id;   // the NEW copy's ID, not the template's
}

/*Writes one assignment as a new row on the "masterlist" tab of the 
given sheet. Figures out the correct next empty row itself */
async function appendAssignment(sheetId, data, token){
  //matches the real column order
  const row = [data.date, data.course, data.assignmentType, data.assignmentTitle];

  //count how many real rows already have a du date
  const checkResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Masterlist!B2:B`,
    { headers:{ Authorization: `Bearer ${token}`}}
  );
  const checkData = await checkResponse.json();
  const existingRows = checkData.values ? checkData.values.length : 0;
  const nextRow = existingRows +2;
  //writing directly into the row
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Masterlist!B${nextRow}:E${nextRow}?valueInputOption=USER_ENTERED`,    {
      method: 'PUT',  //overwrite the exact range
      headers: {Authorization: `Bearer ${token}`, 'Content-Type':'application/json'},
      body: JSON.stringify({values: [row]})
    }
  );
  if (!response.ok) throw new Error(await response.text());
  console.log('Wrote to row:', nextRow, 'in sheet:', sheetId);
}

/*Loads the courses with the sheetID of the specific assingment tracker selected */
async function loadCoursesForDoc(sheetId) {
  const{ coursesByDoc = {} } = await chrome.storage.local.get('coursesByDoc');
  const courses = coursesByDoc[sheetId] || [];
  populateCourseDropdown(courses);
}

/*puts the courses that were optained from the specific sheetID into the courses dropdown */
function populateCourseDropdown(courses){
  const dropdown = document.getElementById('IA_course_dropdown');
  dropdown.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Select Course --';
  dropdown.appendChild(placeholder);

  courses.forEach(function(course) {
    const option = document.createElement('option');
    option.value = course;
    option.textContent = course;
    dropdown.appendChild(option);
  });
  
  const newOption = document.createElement('option');
  newOption.value = '__new__';
  newOption.textContent = '+ Add New Course';
  dropdown.appendChild(newOption);
}


/*If you want to create a new course for an assingment tracker, this saves
the course name under the docs course list then refreshes*/
async function addCourseToDoc(sheetId, courseName) {
  const { coursesByDoc = {} }= await chrome.storage.local.get('coursesByDoc');
  if (!coursesByDoc[sheetId]) coursesByDoc[sheetId] = [];
  if (!coursesByDoc[sheetId].includes(courseName)){
    coursesByDoc[sheetId].push(courseName);
    await chrome.storage.local.set({coursesByDoc});
  }
  populateCourseDropdown(coursesByDoc[sheetId]);
  document.getElementById('IA_course_dropdown').value = courseName;
}

/*Restores the Notifs tab toggle switches to whatever wsa last saved.
Runs once when the popup opens  */
async function loadNotifSettings() {
  const { notifSettings } = await chrome.storage.local.get('notifSettings');
  const settings = notifSettings || { email: false, popup: true, min30: true, exam: true };

  document.getElementById('popup_toggle').checked = settings.popup;
  document.getElementById('min30_toggle').checked = settings.min30;
  document.getElementById('exam_toggle').checked = settings.exam;
}

/*Saves current state of all 3 toggle switches to storage
runs every time any one of them is flipped 
background.js reads this before deciding which reminders to schedule for a new assignment */
async function saveNotifSettings() {
  const settings = {
    popup: document.getElementById('popup_toggle').checked,
    min30: document.getElementById('min30_toggle').checked,
    exam: document.getElementById('exam_toggle').checked
  };
  await chrome.storage.local.set({ notifSettings: settings });
}