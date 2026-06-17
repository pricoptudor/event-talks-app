from flask import Flask, render_template, jsonify, request
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import time

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to avoid hitting Google's servers too frequently
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 300 # 5 minutes

def parse_feed_content(content_html, date_str, link_href):
    """Parses the entry content html and returns a list of update dicts."""
    if not content_html:
        return []
    
    soup = BeautifulSoup(content_html, 'html.parser')
    updates = []
    
    current_type = None
    current_elements = []
    
    # Iterate through content siblings to group by h3 headers
    for child in soup.contents:
        if child.name == 'h3':
            # Save the previous update before starting a new one
            if current_type and current_elements:
                html_content = "".join(str(el) for el in current_elements).strip()
                updates.append({
                    "type": current_type,
                    "content": html_content,
                    "date": date_str,
                    "link": link_href
                })
            current_type = child.get_text().strip()
            current_elements = []
        elif child.name is not None:
            current_elements.append(child)
        elif str(child).strip():
            current_elements.append(child)
            
    # Save the last update
    if current_type and current_elements:
        html_content = "".join(str(el) for el in current_elements).strip()
        updates.append({
            "type": current_type,
            "content": html_content,
            "date": date_str,
            "link": link_href
        })
        
    return updates

def fetch_and_parse_releases():
    """Fetches the Atom XML feed and parses it into individual structured updates."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(FEED_URL, headers=headers, timeout=10)
        response.raise_for_status()
        
        xml_data = response.content
        root = ET.fromstring(xml_data)
        
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall('atom:entry', ns)
        
        all_updates = []
        
        for idx, entry in enumerate(entries):
            date_str = entry.find('atom:title', ns).text
            link_elem = entry.find('atom:link', ns)
            link_href = link_elem.attrib.get('href', '') if link_elem is not None else ''
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ""
            
            # Parse HTML content into separate updates
            day_updates = parse_feed_content(content_html, date_str, link_href)
            
            # Assign a unique ID for selection in front-end
            for sub_idx, update in enumerate(day_updates):
                update["id"] = f"update-{idx}-{sub_idx}"
                all_updates.append(update)
                
        return all_updates, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    # Return cache if valid and not forced refresh
    if cache["data"] is not None and not force_refresh and (now - cache["last_fetched"] < CACHE_DURATION):
        return jsonify({
            "status": "success",
            "source": "cache",
            "data": cache["data"]
        })
        
    # Fetch and parse
    data, error = fetch_and_parse_releases()
    if error:
        # Fallback to cache on error if available
        if cache["data"] is not None:
            return jsonify({
                "status": "warning",
                "message": f"Failed to refresh feed: {error}. Loaded cached version.",
                "source": "cache_fallback",
                "data": cache["data"]
            })
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch release notes: {error}"
        }), 500
        
    # Update cache
    cache["data"] = data
    cache["last_fetched"] = now
    
    return jsonify({
        "status": "success",
        "source": "live",
        "data": data
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
