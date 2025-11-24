const API = 'http://localhost:3000/api';

async function fetchInventory() {
  const res = await fetch(API + '/inventory');
  const data = await res.json();
  const tbody = document.querySelector('#inventory-table tbody');
  if (tbody) {
    tbody.innerHTML = '';
    data.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.blood_group}</td><td>${r.units}</td>`;
      tbody.appendChild(tr);
    });
  }
}

async function fetchRequests() {
  const res = await fetch(API + '/requests?status=pending');
  const data = await res.json();
  const ul = document.getElementById('requests-list');
  if (ul) {
    ul.innerHTML = '';
    data.forEach(r => {
      const li = document.createElement('li');
      li.textContent = `${r.name} needs ${r.units_needed} ${r.blood_group} — ${r.city || 'N/A'} (${new Date(r.created_at).toLocaleString()})`;
      ul.appendChild(li);
    });
  }
}

async function handleDonorSubmit(e) {
  e.preventDefault();
  const f = e.target;
  const fd = Object.fromEntries(new FormData(f));
  fd.units = Number(fd.units) || 1;
  const res = await fetch(API + '/donors', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(fd)
  });
  const json = await res.json();
  document.getElementById('donor-msg').textContent = json.message || 'Done';
  f.reset();
  fetchInventory();
}

async function handleRequestSubmit(e) {
  e.preventDefault();
  const f = e.target;
  const fd = Object.fromEntries(new FormData(f));
  fd.units_needed = Number(fd.units_needed) || 1;
  const res = await fetch(API + '/requests', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(fd)
  });
  const json = await res.json();
  document.getElementById('request-msg').textContent = json.message || 'Request submitted';
  f.reset();
  fetchRequests();
  fetchInventory();
}

document.addEventListener('DOMContentLoaded', () => {
  fetchInventory();
  fetchRequests();

  const donorForm = document.getElementById('donor-form');
  if (donorForm) donorForm.addEventListener('submit', handleDonorSubmit);

  const reqForm = document.getElementById('request-form');
  if (reqForm) reqForm.addEventListener('submit', handleRequestSubmit);
});
