// app.js - Document Tracking System

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzULQKueVXUW9_SwtT_A3aAODBX8SbLB45Ngz8tiPU_id24xhOL0deSn_dqcFbe4ciklw/exec';

let dtData = {
  projects: [],
  recruiters: [],
  logins: [],
  customOptions: { documents: [], processType: [] },
  allData: { process1: [], process2: [], process3: [], process4: [] }
};

let loggedInUser = null;
let candidatesRegistry = []; // Aggregated candidates with document states

const defaultDocuments = [
  "SSLC", "Plus Two", "Degree", "Diploma", "ITI", 
  "Council Registration", "Experience Letter", "Still working"
];

const defaultProcessTypes = [
  "ME Attestation", "Visa Stamping"
];
const defaultChannels = ["Postal", "Direct Office", "Collected by Staff"];
const defaultSendTypes = ["India Post", "Courier", "Flight Courier"];
const defaultReturnTypes = ["India Post", "Courier", "Flight Courier", "Direct"];

document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('dt_logged_in_user');
  if (savedUser) {
    loggedInUser = savedUser;
    document.getElementById('dt-logged-in-user').textContent = loggedInUser;
    document.getElementById('dt-login-btn').style.display = 'none';
    document.getElementById('dt-logout-btn').style.display = 'inline-block';
    document.getElementById('dt-login-modal').style.display = 'none';
    document.getElementById('doctrack-view').style.display = 'block';
    fetchDtData();
  } else {
    // If not logged in, we still need logins list for the dropdown
    fetchInitialData().then(() => openDocTrackLogin());
  }
  
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('dt-p1-datetime').value = now.toISOString().slice(0, 16);
  
  const expDetailsInput = document.getElementById('dt-p1-experience-details');
  expDetailsInput.style.display = 'none';
});

function openDocTrackLogin() {
  document.getElementById('dt-login-modal').style.display = 'flex';
}

function doDocTrackLogout() {
  loggedInUser = null;
  localStorage.removeItem('dt_logged_in_user');
  document.getElementById('dt-logged-in-user').textContent = "Not logged in";
  document.getElementById('dt-login-btn').style.display = 'inline-block';
  document.getElementById('dt-logout-btn').style.display = 'none';
  document.getElementById('doctrack-view').style.display = 'none';
  openDocTrackLogin();
}

async function fetchInitialData() {
  if (APPS_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') return;
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=get_initial_data`);
    const json = await res.json();
    if (json.status === 'success') {
      dtData = { ...dtData, ...json.data };
      populateLoginDropdown();
    }
  } catch(e) {}
}

function populateLoginDropdown() {
  const sel = document.getElementById('dt-login-name');
  sel.innerHTML = '<option value="">Select User</option>';
  dtData.logins.forEach(l => {
    sel.innerHTML += `<option value="${l.name}">${l.name}</option>`;
  });
}

function doDocTrackLogin(e) {
  e.preventDefault();
  const name = document.getElementById('dt-login-name').value;
  const pin = document.getElementById('dt-login-pin').value;
  
  if (APPS_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') {
    if (name === 'Admin' || (name==="" && pin==="1234")) {
        dtData.logins = [{name: 'Admin', pin: '1234'}];
        loggedInUser = "Admin";
    } else {
        alert("Please set APPS_SCRIPT_URL.");
        return;
    }
  } else {
    const validUser = dtData.logins.find(l => l.name === name && String(l.pin) === String(pin));
    if (!validUser) {
      document.getElementById('dt-login-error').style.display = 'block';
      return;
    }
    loggedInUser = validUser.name;
  }
  
  localStorage.setItem('dt_logged_in_user', loggedInUser);
  document.getElementById('dt-logged-in-user').textContent = loggedInUser;
  document.getElementById('dt-login-btn').style.display = 'none';
  document.getElementById('dt-logout-btn').style.display = 'inline-block';
  document.getElementById('dt-login-modal').style.display = 'none';
  document.getElementById('doctrack-view').style.display = 'block';
  
  fetchDtData();
}

function switchDtTab(tabName) {
  document.querySelectorAll('.status-tabs .status-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.status-tabs [data-dt-tab="${tabName}"]`).classList.add('active');
  
  document.querySelectorAll('.dt-tab-content').forEach(content => content.style.display = 'none');
  document.getElementById(`dt-tab-${tabName}`).style.display = 'block';
  
  if (['process', 'receive', 'return', 'reports'].includes(tabName)) {
    buildCandidateRegistry();
    if(tabName === 'reports') renderReports();
  }
}

async function fetchDtData(silent = false) {
  if (APPS_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') {
      dtData.projects = ['Project Alpha', 'Project Beta'];
      dtData.recruiters = [{name: 'John Doe', email: 'john@example.com'}];
      dtData.allData = {
        process1: [
          { 'Timestamp': new Date().toISOString(), 'Candidate Name': 'Test User', 'Passport Number': 'A1234567', 'Project': 'Project Alpha', 'Documents': 'SSLC, Plus Two, Degree', 'Collected By': 'Admin' },
          { 'Timestamp': new Date().toISOString(), 'Candidate Name': 'Jane Smith', 'Passport Number': 'B7654321', 'Project': 'Project Beta', 'Documents': 'Diploma, ITI', 'Collected By': 'Admin' }
        ],
        process2: [
          { 'Timestamp': new Date().toISOString(), 'Candidate Name': 'Test User', 'Passport Number': 'A1234567', 'Project': 'Project Alpha', 'Documents Sent': 'SSLC', 'Process Type': 'Visa Stamping', 'Processed By': 'Admin' }
        ],
        process3: [],
        process4: []
      };
      populateDropdowns();
      buildCandidateRegistry();
      if (document.querySelector('.status-tabs .active').dataset.dtTab === 'reports') {
         renderReports();
      }
      return;
  }
  
  if (!silent) showSync("Loading Data...");
  try {
    const [resInit, resAll] = await Promise.all([
      fetch(`${APPS_SCRIPT_URL}?action=get_initial_data`),
      fetch(`${APPS_SCRIPT_URL}?action=get_all_data`)
    ]);
    
    const jsonInit = await resInit.json();
    const jsonAll = await resAll.json();
    
    if (jsonInit.status === 'success') {
      dtData = { ...dtData, ...jsonInit.data };
    }
    
    populateDropdowns();
    
    if (jsonAll.status === 'success') {
      dtData.allData = jsonAll.data;
      buildCandidateRegistry();
      if (candidatesRegistry.length === 0 && !silent) {
        alert("Data was fetched, but 0 candidates were found.");
      }
    } else {
      if(!silent) alert("Failed to fetch all data: " + jsonAll.message);
    }
  } catch (err) {
    console.error("Error fetching data", err);
    if (!silent) alert("Error communicating with Google Apps Script: " + err.message);
  } finally {
    if (!silent) hideSync();
  }
}

function buildCandidateRegistry() {
  const map = new Map();
  
  // 1. Process Collection
  dtData.allData.process1.forEach(row => {
    const key = `${row['Passport Number']}_${row['Project']}`;
    if(!map.has(key)) {
      map.set(key, {
        name: String(row['Candidate Name'] || ''),
        passport: String(row['Passport Number'] || ''),
        project: String(row['Project'] || ''),
        email: String(row['Email'] || ''),
        mobile: String(row['Mobile'] || ''),
        address: String(row['Address'] || ''),
        recruiter: String(row['Recruiter'] || ''),
        docs: {} // docName -> state
      });
    }
    const c = map.get(key);
    const collectedDocs = row['Documents'] ? row['Documents'].split(',').map(d=>d.trim()) : [];
    collectedDocs.forEach(d => {
      if(d) c.docs[d] = 'Collected';
    });
  });

  // 2. Process Send
  dtData.allData.process2.forEach(row => {
    const key = `${row['Passport Number']}_${row['Project']}`;
    if(map.has(key)) {
      const c = map.get(key);
      const sentDocs = row['Documents Sent'] ? row['Documents Sent'].split(',').map(d=>d.trim()) : [];
      sentDocs.forEach(d => {
        if(c.docs[d] !== undefined) c.docs[d] = 'Sent';
      });
    }
  });

  // 3. Process Receive
  dtData.allData.process4.forEach(row => {
    const key = `${row['Passport Number']}_${row['Project']}`;
    if(map.has(key)) {
      const c = map.get(key);
      const recDocs = row['Documents Received'] ? row['Documents Received'].split(',').map(d=>d.trim()) : [];
      recDocs.forEach(d => {
        if(c.docs[d] !== undefined) c.docs[d] = 'Received';
      });
    }
  });

  // 4. Process Return
  dtData.allData.process3.forEach(row => {
    const key = `${row['Passport Number']}_${row['Project']}`;
    if(map.has(key)) {
      const c = map.get(key);
      const retDocs = row['Documents Returned'] ? row['Documents Returned'].split(',').map(d=>d.trim()) : [];
      retDocs.forEach(d => {
        if(c.docs[d] !== undefined) c.docs[d] = 'Returned';
      });
    }
  });

  candidatesRegistry = Array.from(map.values());
  populateCandidateDropdowns();
}

function populateCandidateDropdowns() {
  ['p2', 'p3', 'p4'].forEach(prefix => {
    const projSelect = document.getElementById(`dt-${prefix}-project-select`);
    if (projSelect) {
      projSelect.innerHTML = '<option value="">-- Select Project --</option>';
      const uniqueProjects = [...new Set(candidatesRegistry.map(c => c.project))].sort();
      uniqueProjects.forEach(p => {
        projSelect.innerHTML += `<option value="${p}">${p}</option>`;
      });
    }

    const select = document.getElementById(`dt-${prefix}-candidate-select`);
    if (select) {
      select.innerHTML = '<option value="">-- Select Project First --</option>';
    }
  });

  const repCand = document.getElementById('dt-rep-candidate');
  if (repCand) {
    repCand.innerHTML = '<option value="All">All Candidates</option>';
    const uniqueCands = [];
    const seenPassports = new Set();
    candidatesRegistry.forEach(c => {
      if (!seenPassports.has(c.passport)) {
        seenPassports.add(c.passport);
        uniqueCands.push(c);
      }
    });
    uniqueCands.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
      repCand.innerHTML += `<option value="${c.passport}">${c.name} - ${c.passport}</option>`;
    });
  }
}

window.handleProjectDropdownChange = function(prefix) {
  const proj = document.getElementById(`dt-${prefix}-project-select`).value;
  const select = document.getElementById(`dt-${prefix}-candidate-select`);
  
  clearCandidateSelection(prefix);

  if (!proj) {
    select.innerHTML = '<option value="">-- Select Project First --</option>';
    return;
  }
  
  select.innerHTML = '<option value="">-- Select Candidate --</option>';
  candidatesRegistry.forEach((c, index) => {
    if (c.project === proj) {
      select.innerHTML += `<option value="${index}">${c.name} - ${c.passport}</option>`;
    }
  });
}

function populateDropdowns() {
  const p1Project = document.getElementById('dt-p1-project');
  p1Project.innerHTML = '<option value="">Select Project</option>';
  dtData.projects.forEach(p => p1Project.innerHTML += `<option value="${p}">${p}</option>`);
  
  const repProject = document.getElementById('dt-rep-project');
  repProject.innerHTML = '<option value="All">All Projects</option>';
  dtData.projects.forEach(p => repProject.innerHTML += `<option value="${p}">${p}</option>`);

  const p1Recruiter = document.getElementById('dt-p1-recruiter');
  p1Recruiter.innerHTML = '<option value="">Select Recruiter</option>';
  dtData.recruiters.forEach(r => p1Recruiter.innerHTML += `<option value="${r.name}">${r.name} (${r.email})</option>`);
  
  renderDocumentsCheckboxes();
  renderProcessTypesDropdowns();
}

function renderDocumentsCheckboxes() {
  const docContainer = document.getElementById('dt-p1-documents-list');
  docContainer.innerHTML = '';
  let allDocs = [...defaultDocuments];
  if (dtData.customOptions && dtData.customOptions.documents) {
    allDocs = [...allDocs, ...dtData.customOptions.documents];
  }
  allDocs = [...new Set(allDocs)].sort((a, b) => String(a).localeCompare(String(b)));
  
  allDocs.forEach(doc => {
    const div = document.createElement('div');
    div.innerHTML = `<label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="checkbox" name="dt-doc-checkbox" value="${doc}" onchange="handleDocCheckboxChange(this)"> ${doc}</label>`;
    docContainer.appendChild(div);
  });
}

function renderProcessTypesDropdowns() {
  const p2Process = document.getElementById('dt-p2-process');
  p2Process.innerHTML = '';
  let allProcesses = [...defaultProcessTypes, ...(dtData.customOptions.processType || [])];
  allProcesses = [...new Set(allProcesses)].sort((a, b) => String(a).localeCompare(String(b)));
  allProcesses.forEach(pt => p2Process.innerHTML += `<option value="${pt}">${pt}</option>`);
  p2Process.innerHTML += `<option value="ADD_NEW">+ Add New Option</option>`;

  const p1Channel = document.getElementById('dt-p1-channel');
  p1Channel.innerHTML = '';
  let allChannels = [...defaultChannels, ...(dtData.customOptions.channel || [])];
  allChannels = [...new Set(allChannels)].sort((a, b) => String(a).localeCompare(String(b)));
  allChannels.forEach(pt => p1Channel.innerHTML += `<option value="${pt}">${pt}</option>`);
  p1Channel.innerHTML += `<option value="ADD_NEW">+ Add New Option</option>`;

  const p2SendType = document.getElementById('dt-p2-sendtype');
  p2SendType.innerHTML = '';
  let allSendTypes = [...defaultSendTypes, ...(dtData.customOptions.sendType || [])];
  allSendTypes = [...new Set(allSendTypes)].sort((a, b) => String(a).localeCompare(String(b)));
  allSendTypes.forEach(pt => p2SendType.innerHTML += `<option value="${pt}">${pt}</option>`);
  p2SendType.innerHTML += `<option value="ADD_NEW">+ Add New Option</option>`;

  const p3ReturnType = document.getElementById('dt-p3-sendtype');
  p3ReturnType.innerHTML = '';
  let allReturnTypes = [...defaultReturnTypes, ...(dtData.customOptions.returnType || [])];
  allReturnTypes = [...new Set(allReturnTypes)].sort((a, b) => String(a).localeCompare(String(b)));
  allReturnTypes.forEach(pt => p3ReturnType.innerHTML += `<option value="${pt}">${pt}</option>`);
  p3ReturnType.innerHTML += `<option value="ADD_NEW">+ Add New Option</option>`;
}

function handleDocCheckboxChange(checkbox) {
  if (checkbox.value === 'Experience Letter') {
    const expInput = document.getElementById('dt-p1-experience-details');
    expInput.style.display = checkbox.checked ? 'block' : 'none';
    expInput.required = checkbox.checked;
  }
}

async function handleDropdownAddOption(selectElement, categoryStr) {
  if (selectElement.value !== 'ADD_NEW') return;

  const val = prompt("Enter new option:");
  if (!val || val.trim() === '') {
    selectElement.selectedIndex = 0; // reset
    return;
  }
  
  if(APPS_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') {
      if(!dtData.customOptions[categoryStr]) dtData.customOptions[categoryStr] = [];
      dtData.customOptions[categoryStr].push(val.trim());
      renderProcessTypesDropdowns();
      selectElement.value = val.trim();
      return;
  }
  
  await submitDtData({ action: 'add_option', category: categoryStr, value: val.trim() }, null);
  if(!dtData.customOptions[categoryStr]) dtData.customOptions[categoryStr] = [];
  dtData.customOptions[categoryStr].push(val.trim());
  renderProcessTypesDropdowns();
  selectElement.value = val.trim();
  fetchDtData(true);
}

async function addCustomDocumentOption() {
  const val = prompt("Enter new Document Type:");
  if(!val || val.trim() === '') return;
  
  if(APPS_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') {
      if(!dtData.customOptions.documents) dtData.customOptions.documents = [];
      dtData.customOptions.documents.push(val.trim());
      renderDocumentsCheckboxes();
      return;
  }
  
  await submitDtData({ action: 'add_option', category: 'documents', value: val.trim() }, null);
  if(!dtData.customOptions.documents) dtData.customOptions.documents = [];
  dtData.customOptions.documents.push(val.trim());
  renderDocumentsCheckboxes();
  fetchDtData(true); // refresh silently
}

function handleCandidateDropdownChange(prefix) {
  const select = document.getElementById(`dt-${prefix}-candidate-select`);
  const index = select.value;
  if (index === "") {
    clearCandidateSelection(prefix);
    return;
  }
  const candidate = candidatesRegistry[index];
  selectCandidate(prefix, candidate);
}

let selectedCandidates = { p2: null, p3: null, p4: null };

function selectCandidate(prefix, candidate) {
  selectedCandidates[prefix] = candidate;
  
  const card = document.getElementById(`dt-${prefix}-selected-candidate`);
  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <strong>${candidate.name}</strong> (${candidate.passport})<br>
        <span style="font-size:0.85rem; color:var(--text-muted);"><i class="fa-solid fa-briefcase"></i> ${candidate.project}</span>
        ${prefix === 'p3' ? `<div style="margin-top:8px; font-size:0.9rem; color:var(--text-main);">
          <i class="fa-solid fa-envelope"></i> ${candidate.email}<br>
          <i class="fa-solid fa-phone"></i> ${candidate.mobile}<br>
          <i class="fa-solid fa-location-dot"></i> ${candidate.address}
        </div>` : ''}
      </div>
      <button type="button" class="btn-secondary btn-sm" onclick="clearCandidateSelection('${prefix}')">Clear</button>
    </div>
  `;
  card.style.display = 'block';
  
  const docContainer = document.getElementById(`dt-${prefix}-documents`);
  docContainer.innerHTML = '';
  
  let availableDocs = [];
  
  Object.keys(candidate.docs).forEach(docName => {
    const state = candidate.docs[docName];
    if(prefix === 'p2') {
      // Send: only Collected or Received
      if(state === 'Collected' || state === 'Received') availableDocs.push({name: docName, state});
    } else if (prefix === 'p4') {
      // Receive: only Sent
      if(state === 'Sent') availableDocs.push({name: docName, state});
    } else if (prefix === 'p3') {
      // Return: only Collected or Received
      if(state === 'Collected' || state === 'Received') availableDocs.push({name: docName, state});
    }
  });
  
  if (availableDocs.length === 0) {
    docContainer.innerHTML = '<span class="text-muted">No documents available for this action.</span>';
  } else {
    availableDocs.forEach(doc => {
      const div = document.createElement('div');
      div.innerHTML = `<label style="display:flex; align-items:center; gap:5px; cursor:pointer;"><input type="checkbox" name="dt-${prefix}-doc-checkbox" value="${doc.name}"> ${doc.name} <span style="font-size:0.75rem; color:var(--text-muted);">(${doc.state})</span></label>`;
      docContainer.appendChild(div);
    });
  }
}

function clearCandidateSelection(prefix) {
  selectedCandidates[prefix] = null;
  const select = document.getElementById(`dt-${prefix}-candidate-select`);
  if(select) select.value = '';
  document.getElementById(`dt-${prefix}-selected-candidate`).style.display = 'none';
  document.getElementById(`dt-${prefix}-documents`).innerHTML = '<span class="text-muted">Search and select a candidate first</span>';
}

// ----------------- SUBMISSIONS -----------------

async function submitDtProcess1(e) {
  e.preventDefault();
  const btn = document.getElementById('dt-p1-submit');
  
  const checkedDocs = Array.from(document.querySelectorAll('input[name="dt-doc-checkbox"]:checked')).map(cb => {
    return cb.value === 'Experience Letter' ? `Experience Letter (${document.getElementById('dt-p1-experience-details').value})` : cb.value;
  });
  if (checkedDocs.length === 0) return alert("Select at least one document.");
  
  const recruiterName = document.getElementById('dt-p1-recruiter').value;
  const recruiterData = dtData.recruiters.find(r => r.name === recruiterName);
  
  const payload = {
    action: 'submit_process1',
    collectedBy: loggedInUser,
    timestamp: document.getElementById('dt-p1-datetime').value,
    candidateName: document.getElementById('dt-p1-name').value,
    passportNumber: document.getElementById('dt-p1-passport').value,
    mobile: document.getElementById('dt-p1-mobile').value,
    email: document.getElementById('dt-p1-email').value,
    channel: document.getElementById('dt-p1-channel').value,
    address: document.getElementById('dt-p1-address').value,
    documents: checkedDocs.join(', '),
    recruiter: recruiterName,
    recruiterEmail: recruiterData ? recruiterData.email : "",
    project: document.getElementById('dt-p1-project').value,
    remarks: document.getElementById('dt-p1-remarks').value
  };
  
  const success = await submitDtData(payload, "Collection form submitted.", btn);
  if(success) {
    if (payload.channel === 'Direct' || payload.channel === 'Direct Office') {
      printAcknowledgment('collect', payload);
    }
    dtData.allData.process1.push({
      'Timestamp': payload.timestamp, 'Collected By': payload.collectedBy, 'Candidate Name': payload.candidateName,
      'Passport Number': payload.passportNumber, 'Address': payload.address, 'Mobile': payload.mobile, 'Email': payload.email,
      'Channel': payload.channel, 'Documents': payload.documents, 'Recruiter': payload.recruiter, 'Project': payload.project, 'Remarks': payload.remarks
    });
    buildCandidateRegistry();
    
    e.target.reset();
    document.getElementById('dt-p1-experience-details').style.display = 'none';
    const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('dt-p1-datetime').value = now.toISOString().slice(0, 16);
    fetchDtData(true); // refresh data silently
  }
}

async function submitDtProcess2(e) {
  e.preventDefault();
  const btn = document.getElementById('dt-p2-submit');
  const c = selectedCandidates['p2'];
  if (!c) return alert("Select a candidate.");
  const checkedDocs = Array.from(document.querySelectorAll('input[name="dt-p2-doc-checkbox"]:checked')).map(cb => cb.value);
  if (checkedDocs.length === 0) return alert("Select documents to send.");
  
  const payload = {
    action: 'submit_process2', processedBy: loggedInUser, candidateName: c.name, passportNumber: c.passport, project: c.project,
    documentsSent: checkedDocs.join(', '), processType: document.getElementById('dt-p2-process').value,
    sendType: document.getElementById('dt-p2-sendtype').value, agencyName: document.getElementById('dt-p2-agency').value,
    agencyAddress: document.getElementById('dt-p2-agency-address').value, remarks: document.getElementById('dt-p2-remarks').value
  };
  
  const success = await submitDtData(payload, "Sent to process successfully.", btn);
  if(success) { 
    dtData.allData.process2.push({
      'Timestamp': new Date().toISOString(), 'Processed By': payload.processedBy, 'Candidate Name': payload.candidateName,
      'Passport Number': payload.passportNumber, 'Project': payload.project, 'Documents Sent': payload.documentsSent,
      'Process Type': payload.processType, 'Agency Name': payload.agencyName, 'Agency Address': payload.agencyAddress,
      'Send Type': payload.sendType, 'Remarks': payload.remarks
    });
    buildCandidateRegistry();
    e.target.reset(); clearCandidateSelection('p2'); fetchDtData(true); 
  }
}

async function submitDtProcess4(e) {
  e.preventDefault();
  const btn = document.getElementById('dt-p4-submit');
  const c = selectedCandidates['p4'];
  if (!c) return alert("Select a candidate.");
  const checkedDocs = Array.from(document.querySelectorAll('input[name="dt-p4-doc-checkbox"]:checked')).map(cb => cb.value);
  if (checkedDocs.length === 0) return alert("Select documents to receive.");
  
  const payload = {
    action: 'submit_process4', receivedBy: loggedInUser, candidateName: c.name, passportNumber: c.passport, project: c.project,
    documentsReceived: checkedDocs.join(', '), processType: "Received Back", remarks: document.getElementById('dt-p4-remarks').value
  };
  
  const success = await submitDtData(payload, "Documents received successfully.", btn);
  if(success) { 
    dtData.allData.process4.push({
      'Timestamp': new Date().toISOString(), 'Received By': payload.receivedBy, 'Candidate Name': payload.candidateName,
      'Passport Number': payload.passportNumber, 'Project': payload.project, 'Documents Received': payload.documentsReceived,
      'Process Type': payload.processType, 'Remarks': payload.remarks
    });
    buildCandidateRegistry();
    e.target.reset(); clearCandidateSelection('p4'); fetchDtData(true); 
  }
}

async function submitDtProcess3(e) {
  e.preventDefault();
  const btn = document.getElementById('dt-p3-submit');
  const c = selectedCandidates['p3'];
  if (!c) return alert("Select a candidate.");
  const checkedDocs = Array.from(document.querySelectorAll('input[name="dt-p3-doc-checkbox"]:checked')).map(cb => cb.value);
  if (checkedDocs.length === 0) return alert("Select documents to return.");
  
  const payload = {
    action: 'submit_process3', timestamp: new Date().toISOString(), returnedBy: loggedInUser, candidateName: c.name, passportNumber: c.passport, project: c.project,
    documentsReturned: checkedDocs.join(', '), reason: document.getElementById('dt-p3-reason').value,
    sendType: document.getElementById('dt-p3-sendtype').value, remarks: document.getElementById('dt-p3-remarks').value,
    email: c.email, mobile: c.mobile, recruiterEmail: dtData.recruiters.find(r => r.name === c.recruiter)?.email || ""
  };
  
  const success = await submitDtData(payload, "Documents returned successfully.", btn);
  if(success) {
    if (payload.sendType === 'Direct' || payload.sendType === 'Direct Office') {
      printAcknowledgment('return', payload);
    }
    dtData.allData.process3.push({
      'Timestamp': new Date().toISOString(), 'Returned By': payload.returnedBy, 'Candidate Name': payload.candidateName,
      'Passport Number': payload.passportNumber, 'Project': payload.project, 'Documents Returned': payload.documentsReturned,
      'Reason': payload.reason, 'Send Type': payload.sendType, 'Email': payload.email, 'Mobile': payload.mobile, 'Remarks': payload.remarks
    });
    buildCandidateRegistry();
    e.target.reset(); clearCandidateSelection('p3'); fetchDtData(true); 
  }
}

async function submitDtData(payload, successMsg, submitBtn = null) {
  if (APPS_SCRIPT_URL === 'YOUR_WEB_APP_URL_HERE') {
    alert("Configure APPS_SCRIPT_URL first."); return false;
  }
  
  let originalHtml = "";
  if (submitBtn) {
    originalHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
  } else {
    showSync("Submitting...");
  }
  
  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
    const json = await res.json();
    if (json.status === 'success') {
      if(successMsg) alert(successMsg);
      return true;
    } else {
      alert("Error: " + json.message);
      return false;
    }
  } catch (err) {
    alert("Failed to communicate with server: " + err.message);
    return false;
  } finally {
    if (submitBtn) {
      submitBtn.innerHTML = originalHtml;
      submitBtn.disabled = false;
    } else {
      hideSync();
    }
  }
}

// ----------------- SUBMISSIONS END -----------------

function printAcknowledgment(type, payload) {
  let title, date, contentHtml = '';
  
  if (type === 'collect') {
    title = "Document Collection Acknowledgment";
    date = payload.timestamp || new Date().toISOString();
    
    contentHtml = `
      <div class="field"><span class="label">Candidate Name:</span> ${payload.candidateName}</div>
      <div class="field"><span class="label">Passport Number:</span> ${payload.passportNumber}</div>
      <div class="field"><span class="label">Project:</span> ${payload.project}</div>
      <div class="field"><span class="label">Documents:</span> ${payload.documents}</div>
      <div class="field"><span class="label">Remarks:</span> ${payload.remarks || 'None'}</div>
    `;
    
  } else if (type === 'return') {
    title = "Document Return Acknowledgment";
    date = new Date().toISOString();
    
    contentHtml = `
      <div class="field"><span class="label">Candidate Name:</span> ${payload.candidateName}</div>
      <div class="field"><span class="label">Passport Number:</span> ${payload.passportNumber}</div>
      <div class="field"><span class="label">Project:</span> ${payload.project}</div>
      <div class="field"><span class="label">Documents Returned:</span> ${payload.documentsReturned}</div>
      <div class="field"><span class="label">Reason:</span> ${payload.reason}</div>
      <div class="field"><span class="label">Remarks:</span> ${payload.remarks || 'None'}</div>
    `;
  }
  
  const htmlContent = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; margin-top: 100px; }
          .date { text-align: right; margin-bottom: 30px; font-weight: bold; }
          .doc-title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 30px; text-decoration: underline; }
          .content { margin-bottom: 40px; font-size: 15px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; width: 170px; display: inline-block; }
          .signatures { display: flex; justify-content: space-between; margin-top: 80px; }
          .sig-box { text-align: center; width: 250px; }
          .sig-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="date">Date: ${new Date(date).toLocaleDateString()}</div>
        <div class="doc-title">${title}</div>
        <div class="content">
          ${contentHtml}
        </div>
        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">Staff Signature (${loggedInUser})</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Candidate Signature (${payload.candidateName})</div>
          </div>
        </div>
      </body>
    </html>
  `;
  
  let iframe = document.getElementById('print-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }
  
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();
  
  iframe.contentWindow.focus();
  setTimeout(() => { iframe.contentWindow.print(); }, 500);
}

// ----------------- REPORTS -----------------

let currentReportOps = [];

function renderReports() {
  const cat = document.getElementById('dt-rep-category').value;
  const proj = document.getElementById('dt-rep-project').value;
  const cand = document.getElementById('dt-rep-candidate').value;
  const dateFrom = document.getElementById('dt-rep-date-from').value;
  const dateTo = document.getElementById('dt-rep-date-to').value;
  
  const missingUI = document.getElementById('dt-rep-missing-alert');
  if (missingUI) missingUI.style.display = 'none';
  
  let allOps = [];
  if (dtData.allData) {
    dtData.allData.process1.forEach(r => allOps.push({...r, _cat: 'Collection', _op: 'Collected', _by: r['Collected By'], _docs: r['Documents']}));
    dtData.allData.process2.forEach(r => allOps.push({...r, _cat: 'Processing', _op: `Sent (${r['Process Type']})`, _by: r['Processed By'], _docs: r['Documents Sent']}));
    dtData.allData.process4.forEach(r => allOps.push({...r, _cat: 'Received', _op: 'Received Back', _by: r['Received By'], _docs: r['Documents Received']}));
    dtData.allData.process3.forEach(r => allOps.push({...r, _cat: 'Return', _op: `Returned (${r['Reason']})`, _by: r['Returned By'], _docs: r['Documents Returned']}));
  }
  
  if (cat === 'Missing') {
    candidatesRegistry.forEach(c => {
      let missingDocs = [];
      Object.keys(c.docs).forEach(d => {
        if(c.docs[d] === 'Sent') missingDocs.push(d);
      });
      if(missingDocs.length > 0) {
        allOps.push({
          Timestamp: '9999-12-31T23:59:59Z', // sort at top
          _isMissing: true,
          _cat: 'Missing',
          _op: 'Missing Document',
          'Candidate Name': c.name,
          'Passport Number': c.passport,
          'Project': c.project,
          _docs: missingDocs.join(', '),
          _by: '-',
          'Remarks': 'Currently in process'
        });
      }
    });
  }
  
  allOps.sort((a,b) => new Date(b.Timestamp) - new Date(a.Timestamp));
  
  const tbody = document.getElementById('dt-rep-tbody');
  tbody.innerHTML = '';
  currentReportOps = [];
  
  let opIndex = 0;
  allOps.forEach(row => {
    if(cat !== 'All' && cat !== 'Missing' && row._cat !== cat) return;
    if(cat === 'Missing' && row._cat !== 'Missing') return;
    if(proj !== 'All' && row['Project'] !== proj) return;
    if(cand !== 'All' && row['Passport Number'] !== cand) return;
    
    if (dateFrom || dateTo) {
      if (!row._isMissing) {
        const rowDate = new Date(row.Timestamp);
        rowDate.setHours(0,0,0,0);
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0,0,0,0);
          if (rowDate < from) return;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(0,0,0,0);
          if (rowDate > to) return;
        }
      }
    }
    
    currentReportOps.push(row);
    const currentIndex = currentReportOps.length - 1;
    
    const dateStr = row._isMissing ? '-' : new Date(row.Timestamp).toLocaleString();
    const actionHtml = row._isMissing ? '-' : `<button class="btn-secondary btn-sm" onclick="viewReportDetails(${currentIndex})">Details</button>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td><strong>${row._op}</strong></td>
      <td>${row['Candidate Name']}</td>
      <td>${row['Passport Number']}</td>
      <td>${row['Project']}</td>
      <td>${row._docs}</td>
      <td>${row._by}</td>
      <td>${row['Remarks'] || '-'}</td>
      <td>${actionHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

function viewReportDetails(index) {
  const row = currentReportOps[index];
  const body = document.getElementById('dt-report-modal-body');
  
  let html = `<table style="width:100%; border-collapse:collapse;">`;
  
  // Define fields we want to skip or handle specifically
  const skipFields = ['_cat', '_op', '_by', '_docs'];
  
  Object.keys(row).forEach(key => {
    if (skipFields.includes(key)) return;
    if (row[key] !== undefined && row[key] !== '') {
      html += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 8px 0; font-weight:600; width:40%; color:var(--text-muted);">${key}</td>
          <td style="padding: 8px 0;">${row[key]}</td>
        </tr>
      `;
    }
  });
  
  html += `</table>`;
  
  body.innerHTML = html;
  document.getElementById('dt-report-modal').style.display = 'flex';
}

function showSync(msg) {
  document.getElementById('sync-overlay').style.display = 'flex';
  document.getElementById('sync-message').innerText = msg;
}

function hideSync() {
  document.getElementById('sync-overlay').style.display = 'none';
}
