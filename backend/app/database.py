
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection settings
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "rag_chatbot")

# MongoDB client
client = None
db = None

async def init_db():
    global client, db
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.chats.create_index("user_id")
    
    print("Connected to MongoDB")
    return db

async def get_db() -> AsyncIOMotorDatabase:
    if db is None:
        await init_db()
    return db
