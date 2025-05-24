// app.js (Firebase Modular SDK, works on GitHub Pages via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-analytics.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-gonNSLiFX2I5yscemPlYsDpJsnywsm0",
  authDomain: "rentalhub-143f5.firebaseapp.com",
  projectId: "rentalhub-143f5",
  storageBucket: "rentalhub-143f5.firebasestorage.app",
  messagingSenderId: "782996801678",
  appId: "1:782996801678:web:12fa8f937e448919e5e1df",
  measurementId: "G-DZBDKXNVJM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// DOM Elements
const propertiesContainer = document.getElementById('properties');
const searchInput = document.getElementById('searchInput');
const noResultsDiv = document.getElementById('noResults');
let properties = [];

window.addEventListener('DOMContentLoaded', () => {
  fetchProperties();
  searchInput.addEventListener('input', handleSearch);
});

async function fetchProperties() {
  properties = [];
  try {
    const querySnapshot = await getDocs(collection(db, "properties"));
    querySnapshot.forEach((doc) => {
      properties.push(doc.data());
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