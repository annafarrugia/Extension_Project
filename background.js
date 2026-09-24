//waits for the popup to send "assignment was added" and then sets a reminder for the due date

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'ASSIGNMENT_WAS_ADDED') {
        const a = message.assignment;
        const due = new Date(`${a.dueDate}T${a.dueTime || '23:59'}`).getTime();
        if (due > Date.now()) {
            chrome.alarms.create(a.title, {when:due});
        }
    }

})
chrome.alarms.onAlarm.addListener((alarm)=> {
    chrome.notifications.create({
        type:'basic', iconUrl: 'icons/icon128.png', title: 'Assingmnet due', message: '${alarm.name} is due now'
    })
})