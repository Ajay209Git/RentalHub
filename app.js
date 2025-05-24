import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-analytics.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-storage.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyC-gonNSLiFX2I5yscemPlYsDpJsnywsm0",
  authDomain: "rentalhub-143f5.firebaseapp.com",
  projectId: "rentalhub-143f5",
  storageBucket: "rentalhub-143f5.appspot.com",
  messagingSenderId: "782996801678",
  appId: "1:782996801678:web:12fa8f937e448919e5e1df",
  measurementId: "G-DZBDKXNVJM"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- DOM Elements ---
const propertiesContainer = document.getElementById('properties');
const searchInput = document.getElementById('searchInput');
const noResultsDiv = document.getElementById('noResults');
const userEmailSpan = document.getElementById('user-email');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const addPropBtn = document.getElementById('add-prop-btn');
const adminBtn = document.getElementById('admin-btn');
const authModal = document.getElementById('auth-modal');
const addModal = document.getElementById('add-modal');
const adminModal = document.getElementById('admin-modal');
const verifyEmailBar = document.getElementById('verify-email-bar');
const resendVerifyBtn = document.getElementById('resend-verify-btn');
const pwResetModal = document.getElementById('pwreset-modal');
const forgotPwLink = document.getElementById('forgot-pw-link');
const closePwReset = document.getElementById('close-pwreset');

// --- Auth State ---
let currentUser = null;
const ADMIN_EMAILS = ['admin@rentalhub.com']; // Change to your admin email(s)
let properties = [];

// --- Modal Helpers ---
function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

// Attach modal logic for open/close
loginBtn.onclick = () => { closeAllModals(); showAuthModal('login'); };
signupBtn.onclick = () => { closeAllModals(); showAuthModal('signup'); };
logoutBtn.onclick = () => { signOut(auth); };
addPropBtn.onclick = () => { closeAllModals(); showModal(addModal); };
adminBtn.onclick = () => { closeAllModals(); loadPending(); showModal(adminModal); };

document.getElementById('close-auth').onclick = closeAllModals;
document.getElementById('close-add').onclick = closeAllModals;
document.getElementById('close-admin').onclick = closeAllModals;
if (closePwReset) closePwReset.onclick = closeAllModals;

// Click outside modal closes all
window.addEventListener('mousedown', function(e) {
  document.querySelectorAll('.modal').forEach(modal => {
    if (!modal.classList.contains('hidden') && !modal.querySelector('.modal-content').contains(e.target) && !e.target.classList.contains('close')) {
      modal.classList.add('hidden');
    }
  });
});

function showModal(modal) { modal.classList.remove('hidden'); }

// Auth form logic
function showAuthModal(type) {
  document.getElementById('auth-modal-title').innerText = type === 'login' ? 'Login' : 'Sign Up';
  document.getElementById('auth-submit-btn').innerText = type === 'login' ? 'Login' : 'Sign Up';
  document.getElementById('auth-form').dataset.type = type;
  document.getElementById('auth-error').innerText = '';
  document.getElementById('auth-form').reset();
  showModal(authModal);
}

forgotPwLink.onclick = (e) => { e.preventDefault(); closeAllModals(); showModal(pwResetModal); };

// --- Auth ---
document.getElementById('auth-form').onsubmit = async (e) => {
  e.preventDefault();
  const type = e.target.dataset.type;
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  document.getElementById('auth-error').innerText = '';
  try {
    if (type === 'login') {
      await signInWithEmailAndPassword(auth, email, password);
      closeAllModals();
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
      alert('Verification email sent. Please verify before using the portal.');
      closeAllModals();
    }
  } catch (err) {
    document.getElementById('auth-error').innerText = err.message;
  }
};

// Password Reset
document.getElementById('pwreset-form').onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('pwreset-email').value;
  const statusDiv = document.getElementById('pwreset-status');
  statusDiv.innerText = '';
  try {
    await sendPasswordResetEmail(auth, email);
    statusDiv.innerText = 'Password reset email sent!';
  } catch (err) {
    statusDiv.innerText = err.message;
  }
};

// --- Auth State Change ---
onAuthStateChanged(auth, async user => {
  currentUser = user;
  await updateAuthUI();
});

// --- Update UI based on user/auth ---
async function updateAuthUI() {
  if (currentUser) {
    userEmailSpan.innerText = currentUser.email;
    loginBtn.style.display = 'none';
    signupBtn.style.display = 'none';
    logoutBtn.style.display = '';
    addPropBtn.style.display = '';
    adminBtn.style.display = ADMIN_EMAILS.includes(currentUser.email) ? '' : 'none';
    await currentUser.reload?.();
    if (currentUser.emailVerified) {
      verifyEmailBar.classList.add('hidden');
      fetchProperties();
    } else {
      verifyEmailBar.classList.remove('hidden');
      propertiesContainer.innerHTML = '<p style="text-align:center;">Please verify your email to view or add properties.</p>';
    }
  } else {
    userEmailSpan.innerText = '';
    loginBtn.style.display = '';
    signupBtn.style.display = '';
    logoutBtn.style.display = 'none';
    addPropBtn.style.display = 'none';
    adminBtn.style.display = 'none';
    verifyEmailBar.classList.add('hidden');
    fetchProperties();
  }
}

// Resend Verification Email
resendVerifyBtn.onclick = async () => {
  if (currentUser) {
    await sendEmailVerification(currentUser);
    alert('Verification email sent!');
  }
};

// --- Fetch Properties (Only approved) ---
window.addEventListener('DOMContentLoaded', () => {
  fetchProperties();
  searchInput.addEventListener('input', handleSearch);
});

async function fetchProperties() {
  properties = [];
  try {
    const q = query(collection(db, "properties"), where("approved", "==", true));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      properties.push({ ...doc.data(), id: doc.id });
    });
    displayProperties(properties);
  } catch (err) {
    propertiesContainer.innerHTML = '<p>Error loading properties from Firebase. Please check your Firestore setup.</p>';
    console.error('Error loading data:', err);
  }
}

function displayProperties(props) {
  propertiesContainer.innerHTML = '';
  noResultsDiv.classList.toggle('hidden', props.length > 0);

  props.forEach(prop => {
    propertiesContainer.appendChild(createPropertyCard(prop));
  });
}

function createPropertyCard(prop) {
  const card = document.createElement('div');
  card.className = 'property-card';

  const img = document.createElement('img');
  img.className = 'property-img';
  img.src = prop.ImageURL || 'https://via.placeholder.com/400x250?text=No+Image';
  img.alt = prop.Title;

  const details = document.createElement('div');
  details.className = 'property-details';

  const title = document.createElement('div');
  title.className = 'property-title';
  title.textContent = prop.Title;

  const location = document.createElement('div');
  location.className = 'property-location';
  location.textContent = prop.Location;

  const price = document.createElement('div');
  price.className = 'property-price';
  price.textContent = prop.Price ? `₹${prop.Price}` : '';

  const desc = document.createElement('div');
  desc.className = 'property-desc';
  desc.textContent = prop.Description;

  details.appendChild(title);
  details.appendChild(location);
  details.appendChild(price);
  details.appendChild(desc);

  card.appendChild(img);
  card.appendChild(details);

  return card;
}

function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) {
    displayProperties(properties);
    return;
  }
  const filtered = properties.filter(prop =>
    (prop.Title && prop.Title.toLowerCase().includes(query)) ||
    (prop.Location && prop.Location.toLowerCase().includes(query)) ||
    (prop.Price && String(prop.Price).toLowerCase().includes(query))
  );
  displayProperties(filtered);
}

// --- Add Property Logic (with optional image upload) ---
document.getElementById('add-form').onsubmit = async (e) => {
  e.preventDefault();
  document.getElementById('add-error').innerText = '';
  document.getElementById('add-success').innerText = '';
  if (!currentUser || !currentUser.emailVerified) {
    document.getElementById('add-error').innerText = 'Please log in and verify your email to submit property.';
    return;
  }
  const title = document.getElementById('prop-title').value;
  const location = document.getElementById('prop-location').value;
  const price = document.getElementById('prop-price').value;
  const desc = document.getElementById('prop-desc').value;
  let imgUrl = document.getElementById('prop-img').value;
  const imgFile = document.getElementById('prop-imgfile').files[0];

  try {
    if (imgFile) {
      const fileRef = storageRef(storage, `property-images/${Date.now()}_${imgFile.name}`);
      await uploadBytes(fileRef, imgFile);
      imgUrl = await getDownloadURL(fileRef);
    }
    await addDoc(collection(db, "properties"), {
      Title: title,
      Location: location,
      Price: price,
      Description: desc,
      ImageURL: imgUrl,
      email: currentUser.email,
      approved: false,
      created: Date.now()
    });
    document.getElementById('add-success').innerText = 'Property submitted for approval!';
    document.getElementById('add-form').reset();
    setTimeout(() => {
      closeAllModals();
      document.getElementById('add-success').innerText = '';
    }, 1500);
  } catch (err) {
    document.getElementById('add-error').innerText = err.message;
  }
};

// --- Admin Panel Logic ---
async function loadPending() {
  document.getElementById('pending-properties').innerHTML = 'Loading...';
  const q = query(collection(db, "properties"), where("approved", "==", false));
  const querySnapshot = await getDocs(q);
  const arr = [];
  querySnapshot.forEach(docSnap => {
    const d = docSnap.data();
    arr.push({ ...d, id: docSnap.id });
  });
  if (arr.length === 0) {
    document.getElementById('pending-properties').innerHTML = '<i>No pending properties.</i>';
    return;
  }
  document.getElementById('pending-properties').innerHTML = '';
  arr.forEach(prop => {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.innerHTML = `
      <img src="${prop.ImageURL || ''}" class="property-img" alt="">
      <div class="property-details">
        <div class="property-title">${prop.Title}</div>
        <div class="property-location">${prop.Location}</div>
        <div class="property-price">₹${prop.Price}</div>
        <div class="property-desc">${prop.Description}</div>
        <div style="font-size:0.9em;color:#666">By: ${prop.email}</div>
        <button data-approve="${prop.id}">Approve</button>
        <button data-reject="${prop.id}" style="margin-left:8px;background:#e53935;color:#fff;">Reject</button>
      </div>
    `;
    document.getElementById('pending-properties').appendChild(card);
  });
  // Add approve/reject handlers
  document.querySelectorAll('[data-approve]').forEach(btn => {
    btn.onclick = async () => {
      await updateDoc(doc(db, "properties", btn.dataset.approve), { approved: true });
      document.getElementById('admin-success').innerText = "Approved!";
      setTimeout(() => { document.getElementById('admin-success').innerText = ''; }, 800);
      loadPending();
      fetchProperties();
    };
  });
  document.querySelectorAll('[data-reject]').forEach(btn => {
    btn.onclick = async () => {
      await updateDoc(doc(db, "properties", btn.dataset.reject), { approved: false, rejected: true });
      document.getElementById('admin-success').innerText = "Rejected!";
      setTimeout(() => { document.getElementById('admin-success').innerText = ''; }, 800);
      loadPending();
      fetchProperties();
    };
  });
}
