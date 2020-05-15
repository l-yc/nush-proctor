'use strict';
//console.clear();

function fetchAccounts() {
  fetch('api/v1.0/accounts/get',{
    method: 'GET',
    headers: {}
  }).then(response => {
    console.log(response);
    return response.json();
  }).then(response => {
    let accounts = response.users;
    let ul = document.querySelector('#accounts');
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    accounts.forEach(a => {
      let li = document.createElement('li');
      li.innerHTML = a.role + ': ' + a.username + '; ' + a.password + '; ' + a.assignedProctor;
      ul.appendChild(li);
    });
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
    fetchAccounts();
  }).catch(err => {
    console.log(err);
    alert('Failed to sync accounts.');
  });
}

(async function() {
  fetchAccounts();

  let sync = document.querySelector('#sync-accounts');
  sync.onclick = e => {
    console.log('clicked');
    syncAccounts();
  };
})();
