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

def get_clean_mongodb_uri() -> str:
    raw = os.getenv("MONGODB_URI", "")
    if not raw:
        return ""
    # Strip quotes, whitespace, carriage returns, and newlines
    clean = raw.strip().strip("'").strip('"')
    # Remove any internal carriage returns, newlines, or tabs (e.g. trailing \n from copy-paste)
    clean = clean.replace("\r", "").replace("\n", "").replace("\t", "").strip()
    return clean

MONGODB_URI = get_clean_mongodb_uri()
DB_NAME = "mymoney"

client = None
db = None

def ensure_indexes(database):
    try:
        database["expenses"].create_index([("user_id", 1), ("date", -1)], background=True)
        database["expenses"].create_index([("user_id", 1), ("category", 1)], background=True)
        database["budgets"].create_index([("user_id", 1), ("category", 1)], background=True)
        database["ai_access"].create_index([("user_id", 1)], background=True)
        database["tasks"].create_index([("user_id", 1), ("due_date", 1)], background=True)
        database["audit_logs"].create_index([("user_id", 1), ("timestamp", -1)], background=True)
    except Exception as idx_err:
        print(f"Index creation note: {idx_err}")

def get_db():
    global client, db
    if db is None:
        uri = get_clean_mongodb_uri()
        if not uri:
            raise ValueError("MONGODB_URI is not configured. Please define MONGODB_URI in your .env file.")
        try:
            client = MongoClient(
                uri,
                w="majority",
                minPoolSize=5,
                maxPoolSize=50,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=10000
            )
            db = client[DB_NAME]
            # Verify connection
            client.admin.command('ping')
            print("Successfully connected to MongoDB Atlas!")
            ensure_indexes(db)
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
