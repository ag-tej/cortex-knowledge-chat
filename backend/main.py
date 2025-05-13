from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import app modules
from app.auth import auth_router
from app.chat import chat_router
from app.database import init_db

# Create FastAPI app
app = FastAPI(
    title="RAG Chatbot API",
    description="API for a RAG-based chatbot",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, set allowed origins explicitly
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
