import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

def list_all_calendars():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    if not creds or not creds.valid:
        # If token is invalid, just delete it and re-run your main script later
        print("Token expired or missing. Run google_calendar_tool.py to login first.")
        return

    try:
        service = build('calendar', 'v3', credentials=creds)
        
        print("--- 📅 ALL VISIBLE CALENDARS ---")
        
        # Fetch list of calendars
        calendar_list = service.calendarList().list().execute()
        
        if not calendar_list.get('items'):
            print("No calendars found.")
        
        for calendar_entry in calendar_list['items']:
            print(f"Name: {calendar_entry['summary']}")
            print(f"ID:   {calendar_entry['id']}")  # <--- THIS IS THE KEY
            print("-" * 30)

    except Exception as error:
        print(f"An error occurred: {error}")

if __name__ == "__main__":
    list_all_calendars()