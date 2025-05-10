
import os
import uuid
from typing import List, Dict, Any
from datetime import datetime
import asyncio
from motor.motor_asyncio import AsyncIOMotorDatabase
import requests
import torch
from bs4 import BeautifulSoup
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
from langchain.vectorstores import Chroma
from langchain.embeddings import HuggingFaceEmbeddings
from langchain_community.document_loaders import (
    TextLoader,
    PyPDFLoader, 
    Docx2txtLoader,
    CSVLoader
)
from langchain_huggingface import HuggingFaceEndpoint
from langchain.prompts import ChatPromptTemplate
from langchain.schema import StrOutputParser
from langchain.chains import create_retrieval_chain, create_history_aware_retriever
from langchain.chains.combine_documents import create_stuff_documents_chain

# Initialize embeddings model
embeddings = HuggingFaceEmbeddings(model_name="models--sentence-transformers--all-MiniLM-L6-v2")

# Initialize LLM
llm = HuggingFaceEndpoint(
    repo_id="models--meta-llama--Llama-2-7b-chat-hf",
    task="text-generation",
    max_length=2048,
    temperature=0.5,
)

# Document splitting
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,
    chunk_overlap=150
)

async def process_document(db: AsyncIOMotorDatabase, chat_id: str, file_path: str, file_name: str) -> str:
    """Process a document and store its vectors"""
    # Determine loader based on file extension
    if file_path.endswith('.pdf'):
        loader = PyPDFLoader(file_path)
    elif file_path.endswith('.docx') or file_path.endswith('.doc'):
        loader = Docx2txtLoader(file_path)
    elif file_path.endswith('.csv'):
        loader = CSVLoader(file_path)
    else:
        # Default to text loader
        loader = TextLoader(file_path)
        
    # Load document
    try:
        documents = loader.load()
    except Exception as e:
        print(f"Error loading document: {str(e)}")
        raise
    
    # Process metadata
    for doc in documents:
        doc.metadata["source"] = file_name
        doc.metadata["chat_id"] = chat_id
    
    # Split documents
    splits = text_splitter.split_documents(documents)
    
    # Generate document ID
    doc_id = str(uuid.uuid4())
    
    # Create vector store
    vectorstore = Chroma.from_documents(
        documents=splits,
        embedding=embeddings,
        collection_name=f"chat_{chat_id}",
        persist_directory="./chroma_db"
    )
    
    # Store document metadata in MongoDB
    document_record = {
        "_id": doc_id,
        "chat_id": chat_id,
        "filename": file_name,
        "type": "document",
        "chunk_count": len(splits),
        "processed_at": datetime.utcnow()
    }
    
    await db.chat_documents.insert_one(document_record)
    
    return doc_id
    
async def process_website(db: AsyncIOMotorDatabase, chat_id: str, url: str) -> str:
    """Process a website URL and store its vectors"""
    # Fetch website content
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # Parse HTML
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Extract text (remove script and style elements)
        for script in soup(["script", "style"]):
            script.extract()
            
        text = soup.get_text()
        
        # Clean up text (remove extra whitespace)
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        # Create document
        doc = Document(
            page_content=text,
            metadata={"source": url, "chat_id": chat_id}
        )
        
        # Split document
        splits = text_splitter.split_documents([doc])
        
        # Generate document ID
        url_id = str(uuid.uuid4())
        
        # Create vector store
        vectorstore = Chroma.from_documents(
            documents=splits,
            embedding=embeddings,
            collection_name=f"chat_{chat_id}",
            persist_directory="./chroma_db"
        )
        
        # Store document metadata in MongoDB
        document_record = {
            "_id": url_id,
            "chat_id": chat_id,
            "url": url,
            "type": "website",
            "chunk_count": len(splits),
            "processed_at": datetime.utcnow()
        }
        
        await db.chat_documents.insert_one(document_record)
        
        return url_id
        
    except Exception as e:
        print(f"Error processing URL {url}: {str(e)}")
        raise

async def query_rag(db: AsyncIOMotorDatabase, chat_id: str, query: str) -> str:
    """Query the RAG system with the given prompt"""
    try:
        # Load the vector store
        vectorstore = Chroma(
            collection_name=f"chat_{chat_id}",
            embedding_function=embeddings,
            persist_directory="./chroma_db"
        )
        
        # Create retriever
        retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
        
        # Get chat history for context
        chat = await db.chats.find_one({"_id": chat_id})
        messages = chat.get("messages", [])
        
        # Prepare context for the LLM
        context_messages = []
        for msg in messages[-6:]:  # Use last 6 messages for context
            if msg["role"] == "user":
                context_messages.append(f"Human: {msg['content']}")
            elif msg["role"] == "assistant":
                context_messages.append(f"Assistant: {msg['content']}")
                
        context_str = "\n".join(context_messages)
        
        # Create prompt template
        prompt_template = """
        <s>[INST] <<SYS>>
        You are a helpful, respectful and honest assistant. You always answer the questions to the best of your knowledge based on the provided context and chat history.
        If you don't know the answer, just say you don't know. DO NOT make up answers.
        Use the provided context for answering the question, but also incorporate relevant information from the chat history if it helps.
        ALWAYS be truthful and provide information based ONLY on the provided context.
        <</SYS>>
        
        Chat History:
        {chat_history}
        
        Context from documents:
        {context}
        
        Question: {question} [/INST]
        """
        
        # Create and run RAG chain
        prompt = ChatPromptTemplate.from_template(prompt_template)
        
        document_chain = create_stuff_documents_chain(llm, prompt)
        
        retrieval_chain = create_retrieval_chain(retriever, document_chain)
        
        response = retrieval_chain.invoke({
            "question": query,
            "chat_history": context_str,
        })
        
        # Return the answer
        return response["answer"]
        
    except Exception as e:
        print(f"Error querying RAG system: {str(e)}")
        # Return a friendly error message instead of exposing the error
        return "I'm sorry, I encountered a problem while processing your question. Please try again or rephrase your question."
