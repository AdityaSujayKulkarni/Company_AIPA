import requests
import json
# 1. NEW: Import the calendar function we just built
from google_calendar_tool import get_upcoming_events

# Define the Endpoint
url = "http://localhost:11434/api/generate"

print("--- The Gatekeeper is Online ---")
print("(Type 'exit' to stop. Type 'refresh' to update calendar.)")

# 2. NEW: Fetch the calendar data once at startup
print("System: Fetching live calendar data from Google...")
calendar_context = get_upcoming_events()
print("System: Calendar data loaded.")

# The Conversation Loop
while True:
    user_input = input("\nYou: ")
    
    if user_input.lower() == "exit":
        print("Gatekeeper: Goodbye.")
        break
    
    # Optional: Allow manual refresh of calendar
    if user_input.lower() == "refresh":
        print("System: Refreshing calendar...")
        calendar_context = get_upcoming_events()
        print("System: Done.")
        continue

    # 3. NEW: Construct the "Augmented Prompt"
    # We hide the calendar data inside the prompt so the AI sees it, but the user doesn't have to type it.
    final_prompt = f"""
    SYSTEM DATA - CURRENT SCHEDULE:
    {calendar_context}
    
    USER REQUEST:
    {user_input}
    """
    # ... previous code ...
    final_prompt = f"""
    SYSTEM DATA - CURRENT SCHEDULE:
    {calendar_context}
    
    USER REQUEST:
    {user_input}
    """
    
    # DEBUG: Print the hidden data to the terminal
    print("\nMEETING SCHEDULE CONTEXT:")
    print(calendar_context)
    print("-------------------------------\n")

    payload = { ... }

    payload = {
        "model": "gatekeeper",
        "prompt": final_prompt, # We send the combined prompt
        "stream": False
    }

    try:
        response = requests.post(url, json=payload)
        result = response.json()
        print(f"Gatekeeper: {result['response']}")

    except Exception as e:
        print(f"Error: {e}")