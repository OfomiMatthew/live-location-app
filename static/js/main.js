// Initialize the map centered on a default location
const map = L.map('map').setView([0, 0], 2);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Variables to track markers and intervals
let userMarker = null;
let sharedMarker = null;
let watchId = null;
let updateInterval = null;

// DOM elements
const shareBtn = document.getElementById('share-btn');
const viewBtn = document.getElementById('view-btn');
const shareLinkInput = document.getElementById('share-link');
const nameInput = document.getElementById('name-input');
const viewInput = document.getElementById('view-input');

// Function to share the current location
function shareLocation(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    
    // Update or create user marker
    if (userMarker) {
        userMarker.setLatLng([lat, lng]);
    } else {
        userMarker = L.marker([lat, lng], {
            title: 'Your Location',
            draggable: true
        }).addTo(map);
        
        // Update location if user drags the marker
        userMarker.on('dragend', function(e) {
            const newPos = userMarker.getLatLng();
            updateSharedLocation(newPos.lat, newPos.lng);
        });
    }
    
    // Center map on user's location
    map.setView([lat, lng], 15);
    
    // Send location to server
    updateSharedLocation(lat, lng);
}

// Function to update the shared location on the server
function updateSharedLocation(lat, lng) {
    const name = nameInput.value.trim();
    
    fetch('/share', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            lat: lat,
            lng: lng,
            name: name || undefined
        })
    })
    .then(response => response.json())
    .then(data => {
        // Update the share link
        const shareUrl = `${window.location.origin}/?share=${data.share_id}`;
        shareLinkInput.value = shareUrl;
    })
    .catch(error => console.error('Error:', error));
}

// Function to view a shared location
function viewSharedLocation(shareId) {
    // Clear any existing interval
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    // Function to fetch and display the shared location
    const fetchAndDisplayLocation = () => {
        fetch(`/location/${shareId}`)
            .then(response => {
                if (!response.ok) throw new Error('Location not found');
                return response.json();
            })
            .then(data => {
                const lat = data.lat;
                const lng = data.lng;
                const name = data.name || 'Shared Location';
                
                // Update or create shared marker
                if (sharedMarker) {
                    sharedMarker.setLatLng([lat, lng]);
                    sharedMarker.setPopupContent(name);
                } else {
                    sharedMarker = L.marker([lat, lng])
                        .addTo(map)
                        .bindPopup(name)
                        .openPopup();
                }
                
                // Center map on shared location
                map.setView([lat, lng], 15);
            })
            .catch(error => {
                console.error('Error:', error);
                if (sharedMarker) {
                    map.removeLayer(sharedMarker);
                    sharedMarker = null;
                }
            });
    };
    
    // Fetch immediately and then every 5 seconds
    fetchAndDisplayLocation();
    updateInterval = setInterval(fetchAndDisplayLocation, 5000);
}

// Event listener for share button
shareBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        // Request continuous location updates
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
        }
        watchId = navigator.geolocation.watchPosition(
            shareLocation,
            (error) => {
                console.error('Geolocation error:', error);
                alert('Error getting location: ' + error.message);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 30000,
                timeout: 27000
            }
        );
    } else {
        alert('Geolocation is not supported by your browser');
    }
});

// Event listener for view button
viewBtn.addEventListener('click', () => {
    const shareId = viewInput.value.trim();
    if (shareId) {
        viewSharedLocation(shareId);
    } else {
        alert('Please enter a share ID');
    }
});

// Check if a share ID was provided in the URL
const urlParams = new URLSearchParams(window.location.search);
const shareId = urlParams.get('share');
if (shareId) {
    viewInput.value = shareId;
    viewSharedLocation(shareId);
}