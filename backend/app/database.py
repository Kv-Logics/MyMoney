import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb+srv://muruga:muruga99@muruga.n9rrdn0.mongodb.net/?appName=muruga")
DB_NAME = "mymoney"

client = None
db = None

def get_db():
    global client, db
    if db is None:
        try:
            client = MongoClient(MONGODB_URI)
            db = client[DB_NAME]
            # Verify connection
            client.admin.command('ping')
            print("Successfully connected to MongoDB Atlas!")
        except Exception as e:
            print(f"Error connecting to MongoDB Atlas: {e}")
            raise e
    return db

# Collections helper
def get_collection(collection_name: str):
    database = get_db()
    return database[collection_name]
