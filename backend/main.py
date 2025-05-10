
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import os
import shutil
import uuid
from dotenv import load_dotenv
import asyncio
import json

# Import our application modules
from app.auth import auth_router, get_current_active_user, User, TokenData
from app.database import init_db, get_db
from app.chat import chat_router
from app.rag import process_document, process_website, query_rag

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="RAG Chatbot API",
    description="API for a RAG-based chatbot using LLaMA-2 and sentence transformers",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat_router, prefix="/api/chats", tags=["Chats"])

@app.on_event("startup")
async def startup_event():
    # Initialize database connection
    await init_db()

@app.get("/")
async def root():
    return {"message": "RAG Chatbot API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
