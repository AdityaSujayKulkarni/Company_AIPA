import datetime
import os.path
import sqlite3 # <--- NEW: Added to read your database
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

# --- NEW HELPER FUNCTION ---
def get_email_by_role(role_name):
    """Query the enterprise.db to find the email for a specific role."""
    try:
        conn = sqlite3.connect('enterprise.db')
        cursor = conn.cursor()
        
        # Make the search case-insensitive (e.g., "ceo" works for "CEO")
        cursor.execute("SELECT calendar_id FROM staff WHERE role LIKE ?", (role_name,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return result[0] # Return the email string
        else:
            return None
    except Exception as e:
        return None

# --- UPDATED CALENDAR FUNCTION ---
def get_upcoming_events(target_email='primary'):
    """
    Fetches events for a SPECIFIC email address.
    """
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    try:
        service = build('calendar', 'v3', credentials=creds)
        now = datetime.datetime.utcnow().isoformat() + 'Z'
        
        print(f"System: Checking calendar for: {target_email}...") # Debug print
        
        events_result = service.events().list(calendarId=target_email, timeMin=now,
                                              maxResults=5, singleEvents=True,
                                              orderBy='startTime').execute()
        events = events_result.get('items', [])

        if not events:
            return f"No upcoming events found for {target_email}."

        calendar_summary = f"Schedule for {target_email}:\n"
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            calendar_summary += f"- {start}: {event['summary']}\n"
            
        return calendar_summary

    except Exception as error:
        print(f"⚠️ RAW GOOGLE ERROR: {error}") # <--- ADD THIS LINE
        return f"Error accessing calendar for {target_email}. (Do you have permission?)"

# --- TEST AREA ---
if __name__ == "__main__":
    # Test 1: Look up the CEO's email from the DB
    role = "CTO"
    email = get_email_by_role(role) 

    print(f"Found email for {role}: {email}")
    
    # Test 2: Fetch that calendar
    if email:
        print(get_upcoming_events(email))