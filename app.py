# Import necessary modules
from flask import Flask, render_template, request, jsonify
import uuid
import time

# Initialize Flask app
app = Flask(__name__)

# In-memory storage for locations (in a real app, use a database)
locations = {}

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/share', methods=['POST'])
def share_location():
    """Endpoint to share a location."""
    data = request.json
    
    # Generate a unique ID for this sharing session
    share_id = str(uuid.uuid4())
    
    # Store the location data
    locations[share_id] = {
        'lat': data['lat'],
        'lng': data['lng'],
        'timestamp': time.time(),
        'name': data.get('name', 'Anonymous')
    }
    
    # Return the shareable link
    return jsonify({'share_id': share_id})

@app.route('/location/<share_id>')
def get_location(share_id):
    """Endpoint to retrieve a shared location."""
    if share_id in locations:
        # Check if location is stale (older than 5 minutes)
        if time.time() - locations[share_id]['timestamp'] > 300:
            del locations[share_id]
            return jsonify({'error': 'Location expired'}), 404
        return jsonify(locations[share_id])
    return jsonify({'error': 'Location not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)