// Waits for the popup to send "assignment was added," reads the user's
// notification settings, and schedules the appropriate reminders.

//whenever popup.js calls chrome.runtim.sendMessage it sends "ASSIGNMENT_ADDED" to user 
//to let them know it worked
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'ASSIGNMENT_ADDED') {
        scheduleAlarms(message.assignment);
    }
});

//Reads user's notif settings, then schedules whichever reminders are turned
//on for the specific assignmnet
async function scheduleAlarms(a) {
    //load saved toggle states; if none are saved it goes to default
  const { notifSettings } = await chrome.storage.local.get('notifSettings');
  const settings = notifSettings || { email: false, popup: true, min30: true, exam: true };
// defaults to 11:59pm
  const due = new Date(`${a.dueDate}T${a.dueTime || '23:59'}`).getTime();
  const now = Date.now();

//this is a helper to only schedule an alarm if its time hasn't already passed
//Alarm name encodes botht the reminder "kind" and the assignment title
//They are seperated by "::" so onAlarm can tell them apart for later
  const schedule = (kind, when) => {
    if (when > now) {
      chrome.alarms.create(`${kind}::${a.title}`, { when });
    }
  };

  //for popup notifs toggle
  if (settings.popup) {
    schedule('due', due);
  }

  //for 30 min before due time toggle
  //applies for all of the assignments
  if (settings.min30) {
    schedule('min30', due - 30 * 60 * 1000);
  }

  //for the exam notifs toggle
  if (a.assignmentType === 'Exam' && settings.exam) {
    schedule('examday', due - 24 * 60 * 60 * 1000); // 1 day before
  }
}

//happens when any scheduled alarm's time arrives (even if the popup is closed)
chrome.alarms.onAlarm.addListener((alarm) => {
    //splits kind and title into 2 parts
    const [kind, title] = alarm.name.split('::');
    
    //picks the correct message depending on whcih kind of alarm 
    const messages = {
      due: `${title} is due now`,
      min30: `${title} is due in 30 minutes`,
      examday: `Exam tomorrow: ${title}`
    };
//shows the actual windows notification
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Assignment Reminder',
        //just in case this is the fallback
        message: messages[kind] || `${title} is due now` 
    });
});