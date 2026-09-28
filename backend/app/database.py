import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from potential locations
load_dotenv()
backend_env = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env)
root_env = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
if os.path.exists(root_env):
    load_dotenv(root_env)

MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = "mymoney"

client = None
db = None

def get_db():
    global client, db
    if db is None:
        if not MONGODB_URI:
            raise ValueError("MONGODB_URI is not configured. Please define MONGODB_URI in your .env file.")
        try:
            client = MongoClient(MONGODB_URI)
            db = client[DB_NAME]
            # Verify connection
            client.admin.command('ping')
            print("Successfully connected to MongoDB Atlas!")
        except Exception as e:
            print(f"Error connecting to MongoDB Atlas: {e}")
            if "bad auth" in str(e).lower() or "authentication failed" in str(e).lower():
                print("HINT: MongoDB Atlas Authentication Failed. Please update your MONGODB_URI in your .env file or environment variable with the correct username/password.")
            raise e
    return db

# Collections helper
def get_collection(collection_name: str):
    database = get_db()
    return database[collection_name]
