// backend_script.gs - Document Tracking System Backend

const MAIN_DB_ID = "1KR4o2H62lHgJro8DzBUSbM87Q_y-dCGykGa4Ni54u8E";
const RECRUITER_DB_ID = "1PFgseF3NpuBZRqW6RGvCnTlGZS7ZjpmkVlHU73GQxfs";

function doOptions(e) {
  return HtmlService.createHtmlOutput("")
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result = { status: 'success' };
    
    if (action === 'submit_process1') result = handleProcess1(data);
    else if (action === 'submit_process2') result = handleProcess2(data);
    else if (action === 'submit_process3') result = handleProcess3(data);
    else if (action === 'submit_process4') result = handleProcess4(data);
    else if (action === 'add_option') result = handleAddOption(data);
    else throw new Error("Unknown action");
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    let result = { status: 'success' };
    
    if (action === 'get_initial_data') result.data = getInitialData();
    else if (action === 'get_all_data') result.data = getAllData(); // New for Reports and Lifecycle
    else throw new Error("Unknown action");
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getInitialData() {
  const mainDb = SpreadsheetApp.openById(MAIN_DB_ID);
  const recruiterDb = SpreadsheetApp.openById(RECRUITER_DB_ID);
  
  const projectSheet = mainDb.getSheetByName('Active Projects');
  let projects = [];
  if (projectSheet && projectSheet.getLastRow() > 0) {
    projects = projectSheet.getRange(1, 1, projectSheet.getLastRow(), 1).getValues().flat().filter(String);
    // Remove header if it exists
    if (projects[0] && (projects[0].toLowerCase().includes('project') || projects[0].toLowerCase() === 'active projects')) {
      projects.shift();
    }
  }
  
  let recruiterSheet = recruiterDb.getSheets()[0];
  const recruiterData = recruiterSheet.getRange(2, 2, recruiterSheet.getLastRow() - 1, 8).getValues();
  const recruiters = recruiterData.map(r => ({ name: r[0], email: r[7] })).filter(r => r.name);
  
  let loginSheet = mainDb.getSheetByName('Login');
  if (!loginSheet) {
    loginSheet = mainDb.insertSheet('Login');
    loginSheet.appendRow(['Name', 'PIN']);
  }
  const loginData = loginSheet.getRange(2, 1, Math.max(1, loginSheet.getLastRow() - 1), 2).getValues();
  const logins = loginData.map(r => ({ name: r[0], pin: String(r[1]) })).filter(r => r.name);
  
  let optionsSheet = mainDb.getSheetByName('Options');
  if (!optionsSheet) {
    optionsSheet = mainDb.insertSheet('Options');
    optionsSheet.appendRow(['Category', 'Value']);
  }
  const optionsData = optionsSheet.getRange(2, 1, Math.max(1, optionsSheet.getLastRow() - 1), 2).getValues();
  const customOptions = {};
  optionsData.forEach(r => {
    if (!customOptions[r[0]]) customOptions[r[0]] = [];
    if (r[1]) customOptions[r[0]].push(r[1]);
  });
  
  return { projects, recruiters, logins, customOptions };
}

function getSheetData(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => { 
      if (h) obj[h] = row[i]; 
      // If header is missing but we have data, we might have appended File Number to an old sheet
      else if (i === 12 && row[i] && row[i].toString().startsWith('GD/')) obj['File Number'] = row[i];
    });
    return obj;
  });
}

function ensureFileNumberHeader(sheet, expectedHeaders) {
  if (!sheet) return;
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  const headers = sheet.getRange(1, 1, 1, Math.max(lastCol, expectedHeaders.length)).getValues()[0];
  
  // Find where 'File Number' should be
  const fileNumIndex = expectedHeaders.indexOf('File Number');
  if (fileNumIndex !== -1 && (!headers[fileNumIndex] || headers[fileNumIndex] === '')) {
    sheet.getRange(1, fileNumIndex + 1).setValue('File Number');
  }
}

function getAllData() {
  const mainDb = SpreadsheetApp.openById(MAIN_DB_ID);
  
  return {
    process1: getSheetData(mainDb.getSheetByName('Process1')),
    process2: getSheetData(mainDb.getSheetByName('Process2')),
    process3: getSheetData(mainDb.getSheetByName('Process3')),
    process4: getSheetData(mainDb.getSheetByName('Process4')) // Receive Process
  };
}

function handleProcess1(data) {
  const mainDb = SpreadsheetApp.openById(MAIN_DB_ID);
  let sheet = mainDb.getSheetByName('Process1');
  if (!sheet) {
    sheet = mainDb.insertSheet('Process1');
    sheet.appendRow(['Timestamp', 'Collected By', 'Candidate Name', 'Passport Number', 'Address', 'Mobile', 'Email', 'Channel', 'Documents', 'Recruiter', 'Project', 'Remarks', 'File Number']);
  } else {
    ensureFileNumberHeader(sheet, ['Timestamp', 'Collected By', 'Candidate Name', 'Passport Number', 'Address', 'Mobile', 'Email', 'Channel', 'Documents', 'Recruiter', 'Project', 'Remarks', 'File Number']);
  }
  
  sheet.appendRow([
    data.timestamp || new Date().toISOString(), data.collectedBy, data.candidateName, data.passportNumber,
    data.address, data.mobile, data.email, data.channel, data.documents, data.recruiter, data.project, data.remarks, data.fileNumber
  ]);
  
  sendEmailNotification('Collection', data);
  return { status: 'success' };
}

function handleProcess2(data) {
  const mainDb = SpreadsheetApp.openById(MAIN_DB_ID);
  let sheet = mainDb.getSheetByName('Process2');
  if (!sheet) {
    sheet = mainDb.insertSheet('Process2');
    sheet.appendRow(['Timestamp', 'Processed By', 'Candidate Name', 'Passport Number', 'Project', 'Documents Sent', 'Process Type', 'Agency Name', 'Agency Address', 'Send Type', 'Remarks', 'File Number']);
  } else {
    ensureFileNumberHeader(sheet, ['Timestamp', 'Processed By', 'Candidate Name', 'Passport Number', 'Project', 'Documents Sent', 'Process Type', 'Agency Name', 'Agency Address', 'Send Type', 'Remarks', 'File Number']);
  }
  
  sheet.appendRow([
    data.timestamp || new Date().toISOString(), data.processedBy, data.candidateName, data.passportNumber,
    data.project, data.documentsSent, data.processType, data.agencyName, data.agencyAddress, data.sendType, data.remarks, data.fileNumber
  ]);
  return { status: 'success' };
}

function handleProcess4(data) {
  const mainDb = SpreadsheetApp.openById(MAIN_DB_ID);
  let sheet = mainDb.getSheetByName('Process4');
  if (!sheet) {
    sheet = mainDb.insertSheet('Process4');
    sheet.appendRow(['Timestamp', 'Received By', 'Candidate Name', 'Passport Number', 'Project', 'Documents Received', 'Process Type', 'Remarks', 'File Number']);
  } else {
    ensureFileNumberHeader(sheet, ['Timestamp', 'Received By', 'Candidate Name', 'Passport Number', 'Project', 'Documents Received', 'Process Type', 'Remarks', 'File Number']);
  }
  
  sheet.appendRow([
    data.timestamp || new Date().toISOString(), data.receivedBy, data.candidateName, data.passportNumber,
    data.project, data.documentsReceived, data.processType, data.remarks, data.fileNumber
  ]);
  return { status: 'success' };
}

function handleProcess3(data) {
  const mainDb = SpreadsheetApp.openById(MAIN_DB_ID);
  let sheet = mainDb.getSheetByName('Process3');
  if (!sheet) {
    sheet = mainDb.insertSheet('Process3');
    sheet.appendRow(['Timestamp', 'Returned By', 'Candidate Name', 'Passport Number', 'Project', 'Documents Returned', 'Reason', 'Send Type', 'Email', 'Mobile', 'Remarks', 'File Number']);
  } else {
    ensureFileNumberHeader(sheet, ['Timestamp', 'Returned By', 'Candidate Name', 'Passport Number', 'Project', 'Documents Returned', 'Reason', 'Send Type', 'Email', 'Mobile', 'Remarks', 'File Number']);
  }
  
  sheet.appendRow([
    data.timestamp || new Date().toISOString(), data.returnedBy, data.candidateName, data.passportNumber,
    data.project, data.documentsReturned, data.reason, data.sendType, data.email, data.mobile, data.remarks, data.fileNumber
  ]);
  
  sendEmailNotification('Return', data);
  return { status: 'success' };
}

function handleAddOption(data) {
  const mainDb = SpreadsheetApp.openById(MAIN_DB_ID);
  let optionsSheet = mainDb.getSheetByName('Options');
  if (!optionsSheet) {
    optionsSheet = mainDb.insertSheet('Options');
    optionsSheet.appendRow(['Category', 'Value']);
  }
  optionsSheet.appendRow([data.category, data.value]);
  return { status: 'success', category: data.category, value: data.value };
}

function sendEmailNotification(type, data) {
  try {
    const to = data.email || "";
    let cc = "gokulchittar@gmail.com,gokul.gowell@gmail.com";
    if (data.recruiterEmail) cc += "," + data.recruiterEmail;
    
    let subject = "", body = "";
    
    if (type === 'Collection') {
      subject = `Document Collection Acknowledgement - ${data.candidateName} - ${data.project}`;
      body = `Dear ${data.candidateName},\n\nWe have collected your original documents for the project: ${data.project}.\n\nFile Number: ${data.fileNumber || 'N/A'}\nDocuments Collected:\n${data.documents}\n\nCollected By: ${data.collectedBy}\nDate: ${data.timestamp}\n\nThank you.\n\nRegards,\nDocumentation Division,\nGowell International Recruitment Consultancy.`;
    } else if (type === 'Return') {
      subject = `Document Return Acknowledgement - ${data.candidateName} - ${data.project}`;
      body = `Dear ${data.candidateName},\n\nWe have returned your original documents for the project: ${data.project}.\n\nFile Number: ${data.fileNumber || 'N/A'}\nDocuments Returned:\n${data.documentsReturned}\n\nReason: ${data.reason}\nReturned By: ${data.returnedBy}\nDate: ${data.timestamp}\n\nThank you.\n\nRegards,\nDocumentation Division,\nGowell International Recruitment Consultancy.`;
    }
    
    if (to) MailApp.sendEmail({ to, cc, subject, body });
  } catch(e) {
    console.error("Failed to send email: " + e.message);
  }
}
