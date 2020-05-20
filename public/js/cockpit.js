'use strict';
console.clear();

function showAccounts(accounts) {
  let ta = document.querySelector('#accounts');
  ta.value = '';
  accounts.forEach(a => {
    ta.value += a.role.join('; ') + ': ' + a.username + '; ' + a.password;
    if (a.assignedProctor) ta.value += '; ' + a.assignedProctor;
    ta.value += '\n';
  });
}

function fetchAccounts() {
  fetch('api/v1.0/accounts/get',{
    method: 'GET',
    headers: {}
  }).then(response => {
    console.log(response);
    return response.json();
  }).then(response => {
    showAccounts(response.users);
  }).catch(err => {
    console.log(err);
    alert('Failed to fetch accounts.');
  });
}

function syncAccounts() {
  fetch('api/v1.0/accounts/sync',{
    method: 'GET',
    headers: {}
  }).then(response => {
    console.log(response);
    return response.json();
  }).then(response => {
    console.log(response);
    showAccounts(response.users);
    alert('All modified users have been logged out. Please re-login if you are affected.');
  }).catch(err => {
    console.log(err);
    alert('Failed to sync accounts.');
  });
}

/**
 * accounts: JSON object with 'accounts' key
 */
function updateAccounts(accounts) {
  return fetch('api/v1.0/accounts/update',{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(accounts)
  }).then(response => {
    console.log(response);
    return response.json();
  });
}

function editAccounts() {
  let ta = document.querySelector('#accounts');
  let edit = document.querySelector('#edit-accounts');
  let cl = edit.childNodes[0].classList;
  cl.toggle('la-edit');
  cl.toggle('la-save');

  if (ta.readOnly) {
    ta.readOnly = false;
    edit.childNodes[1].nodeValue = 'Save';
  } else {
    updateAccounts({
      accounts: ta.value
    }).then((response) => {
      console.log(response);
      ta.readOnly = true;
      edit.childNodes[1].nodeValue = 'Edit';
    }).catch(err => {
      console.log(err);
      alert('Failed to update accounts: ' + err);
    });
  }
}

(async function() {
  fetchAccounts();

  let sync = document.querySelector('#sync-accounts');
  sync.onclick = e => {
    syncAccounts();
  };

  let edit = document.querySelector('#edit-accounts');
  edit.onclick = e => {
    editAccounts();
  };

})();
