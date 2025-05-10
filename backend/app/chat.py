
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import uuid
from datetime import datetime
import os
from motor.motor_asyncio import AsyncIOMotorDatabase
import asyncio

from .database import get_db
from .auth import get_current_active_user
from .rag import process_document, process_website, query_rag

# Models
class Message(BaseModel):
    id: str
    role: str
    content: str
    timestamp: int

class ChatBase(BaseModel):
    title: str

class ChatCreate(ChatBase):
    pass

class ChatUpdate(ChatBase):
    pass

class Chat(ChatBase):
    id: str
    messages: List[Message] = []
    createdAt: int
    updatedAt: int

class MessageCreate(BaseModel):
    content: str

class WebsiteUrls(BaseModel):
    urls: List[str]

# Router
chat_router = APIRouter()

@chat_router.get("/", response_model=List[Chat])
async def list_chats(current_user: dict = Depends(get_current_active_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get all chats for the current user"""
    user_id = current_user["_id"]
    
    # Fetch chats from database
    cursor = db.chats.find({"user_id": user_id}).sort("updated_at", -1)
    chats = []
    
    async for document in cursor:
        chats.append({
            "id": document["_id"],
            "title": document["title"],
            "messages": document["messages"],
            "createdAt": int(document["created_at"].timestamp() * 1000),
            "updatedAt": int(document["updated_at"].timestamp() * 1000)
        })
        
    return chats

@chat_router.post("/", response_model=Chat)
async def create_chat(chat_create: ChatCreate, current_user: dict = Depends(get_current_active_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Create a new chat"""
    user_id = current_user["_id"]
    
    now = datetime.utcnow()
    timestamp_ms = int(now.timestamp() * 1000)
    
    chat_id = str(uuid.uuid4())
    chat = {
        "_id": chat_id,
        "user_id": user_id,
        "title": chat_create.title,
        "messages": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.chats.insert_one(chat)
    
    return {
        "id": chat_id,
        "title": chat_create.title,
        "messages": [],
        "createdAt": timestamp_ms,
        "updatedAt": timestamp_ms
    }

@chat_router.get("/{chat_id}", response_model=Chat)
async def get_chat(chat_id: str, current_user: dict = Depends(get_current_active_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get a specific chat by ID"""
    user_id = current_user["_id"]
    
    chat = await db.chats.find_one({"_id": chat_id, "user_id": user_id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    return {
        "id": chat["_id"],
        "title": chat["title"],
        "messages": chat["messages"],
        "createdAt": int(chat["created_at"].timestamp() * 1000),
        "updatedAt": int(chat["updated_at"].timestamp() * 1000)
    }

@chat_router.patch("/{chat_id}", response_model=Chat)
async def update_chat(chat_id: str, chat_update: ChatUpdate, current_user: dict = Depends(get_current_active_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Update a chat's title"""
    user_id = current_user["_id"]
    
    now = datetime.utcnow()
    chat = await db.chats.find_one({"_id": chat_id, "user_id": user_id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    await db.chats.update_one(
        {"_id": chat_id}, 
        {"$set": {"title": chat_update.title, "updated_at": now}}
    )
    
    updated_chat = await db.chats.find_one({"_id": chat_id})
    
    return {
        "id": updated_chat["_id"],
        "title": updated_chat["title"],
        "messages": updated_chat["messages"],
        "createdAt": int(updated_chat["created_at"].timestamp() * 1000),
        "updatedAt": int(updated_chat["updated_at"].timestamp() * 1000)
    }

@chat_router.delete("/{chat_id}")
async def delete_chat(chat_id: str, current_user: dict = Depends(get_current_active_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Delete a chat"""
    user_id = current_user["_id"]
    
    # Check if chat exists and belongs to user
    chat = await db.chats.find_one({"_id": chat_id, "user_id": user_id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Delete the chat
    await db.chats.delete_one({"_id": chat_id})
    
    # Also delete any associated document vectors
    await db.chat_vectors.delete_many({"chat_id": chat_id})
    
    return {"success": True}

@chat_router.post("/{chat_id}/messages", response_model=Chat)
async def send_message(
    chat_id: str, 
    message: MessageCreate, 
    current_user: dict = Depends(get_current_active_user), 
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Send a message in a chat and get AI response"""
    user_id = current_user["_id"]
    
    # Check if chat exists and belongs to user
    chat = await db.chats.find_one({"_id": chat_id, "user_id": user_id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    now = datetime.utcnow()
    timestamp_ms = int(now.timestamp() * 1000)
    
    # Create user message
    user_message = {
        "id": str(uuid.uuid4()),
        "role": "user",
        "content": message.content,
        "timestamp": timestamp_ms
    }
    
    # Send message to RAG system and get response
    ai_response = await query_rag(db, chat_id, message.content)
    
    # Create AI message
    ai_message = {
        "id": str(uuid.uuid4()),
        "role": "assistant",
        "content": ai_response,
        "timestamp": int(datetime.utcnow().timestamp() * 1000)
    }
    
    # Update chat with new messages
    await db.chats.update_one(
        {"_id": chat_id},
        {
            "$push": {"messages": {"$each": [user_message, ai_message]}},
            "$set": {"updated_at": now}
        }
    )
    
    # Get updated chat
    updated_chat = await db.chats.find_one({"_id": chat_id})
    
    return {
        "id": updated_chat["_id"],
        "title": updated_chat["title"],
        "messages": updated_chat["messages"],
        "createdAt": int(updated_chat["created_at"].timestamp() * 1000),
        "updatedAt": int(updated_chat["updated_at"].timestamp() * 1000)
    }

@chat_router.post("/{chat_id}/documents")
async def upload_documents(
    chat_id: str,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Upload documents to a chat for knowledge processing"""
    user_id = current_user["_id"]
    
    # Check if chat exists and belongs to user
    chat = await db.chats.find_one({"_id": chat_id, "user_id": user_id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Process each file
    processed_files = []
    
    for file in files:
        # Save file to temp directory
        file_path = f"temp/{file.filename}"
        os.makedirs("temp", exist_ok=True)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process document
        try:
            doc_id = await process_document(db, chat_id, file_path, file.filename)
            processed_files.append({"name": file.filename, "id": doc_id})
        finally:
            # Clean up temp file
            if os.path.exists(file_path):
                os.remove(file_path)
    
    # Add system message about processed files
    now = datetime.utcnow()
    timestamp_ms = int(now.timestamp() * 1000)
    
    system_message = {
        "id": str(uuid.uuid4()),
        "role": "system",
        "content": f"Processed {len(processed_files)} documents: {', '.join([f['name'] for f in processed_files])}",
        "timestamp": timestamp_ms
    }
    
    await db.chats.update_one(
        {"_id": chat_id},
        {
            "$push": {"messages": system_message},
            "$set": {"updated_at": now}
        }
    )
    
    return {"success": True, "processed_files": processed_files}

@chat_router.post("/{chat_id}/websites")
async def add_websites(
    chat_id: str,
    website_data: WebsiteUrls,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Add website URLs to a chat for knowledge processing"""
    user_id = current_user["_id"]
    
    # Check if chat exists and belongs to user
    chat = await db.chats.find_one({"_id": chat_id, "user_id": user_id})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Process each URL
    processed_urls = []
    
    for url in website_data.urls:
        # Process website
        try:
            url_id = await process_website(db, chat_id, url)
            processed_urls.append({"url": url, "id": url_id})
        except Exception as e:
            print(f"Error processing URL {url}: {str(e)}")
    
    # Add system message about processed websites
    now = datetime.utcnow()
    timestamp_ms = int(now.timestamp() * 1000)
    
    system_message = {
        "id": str(uuid.uuid4()),
        "role": "system",
        "content": f"Processed {len(processed_urls)} websites: {', '.join([p['url'] for p in processed_urls])}",
        "timestamp": timestamp_ms
    }
    
    await db.chats.update_one(
        {"_id": chat_id},
        {
            "$push": {"messages": system_message},
            "$set": {"updated_at": now}
        }
    )
    
    return {"success": True, "processed_urls": processed_urls}
