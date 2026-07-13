/*
 * Extension Popup Script
 * Handles the logic for the extension's popup interface, 
 * form submissions and interactions with the content script
 * Author: Anna Farrugia and Sophie Castet-Bellocq
 */

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

            //creating the assignment object
            const assignmentData = {
                documentName,
                course,
                date,
                time,
                assignmentTitle,
                assignmentDescription
            };
            console.log('Submitting assignment data:', assignmentData);

            //THEN send this data to google sheets using the content script

        });
    }
}

function testOAuth() {
  console.log("Attempting to fetch OAuth token...");
  
  // 'interactive: true' makes the google login prompt pop up
  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError) {
      // error message
      console.error("OAuth Failed:", chrome.runtime.lastError.message);
      return;
    }
    
    // IF THIS PRINTS OAUTH WORKS
    console.log("OAuth Success! Your access token is:", token);
  });
}
