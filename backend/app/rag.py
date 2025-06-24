import uuid
import requests
from typing import List
from datetime import datetime
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorDatabase

# LangChain core and community modules
from langchain_chroma import Chroma
from langchain_ollama import OllamaLLM
from langchain.docstore.document import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

# RAG utilities
from langchain.chains.retrieval import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.history_aware_retriever import create_history_aware_retriever

# Messages & prompts
from langchain_core.messages import HumanMessage, AIMessage
from langchain.prompts.chat import ChatPromptTemplate, MessagesPlaceholder

# Document loaders
from langchain_community.document_loaders import (
    TextLoader, PyPDFLoader, Docx2txtLoader, CSVLoader
)

# Initialize Embedding Model
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"}
)

# Initialize LLM
llm = OllamaLLM(
    model="llama3.2",
    temperature=0.5,
    top_p=0.95,
    num_ctx=2048,
    repeat_penalty=1.1,
    stop=["\nUser:"],
)

# Initialize Text Splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,
    chunk_overlap=150
)

# Document processing
async def process_document(db: AsyncIOMotorDatabase, chat_id: str, file_path: str, file_name: str) -> str:
    """Process a document and store its vectors"""
    # Determine loader based on file extension
    if file_path.endswith('.pdf'):
        loader = PyPDFLoader(file_path)
    elif file_path.endswith(('.docx', '.doc')):
        loader = Docx2txtLoader(file_path)
    elif file_path.endswith('.csv'):
        loader = CSVLoader(file_path)
    else:
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
    Chroma.from_documents(
        documents=splits,
        embedding=embeddings,
        collection_name=f"chat_{chat_id}",
        persist_directory="./chroma_db"
    )
    # Store document metadata in MongoDB
    await db.chat_documents.insert_one({
        "_id": doc_id,
        "chat_id": chat_id,
        "filename": file_name,
        "type": "document",
        "chunk_count": len(splits),
        "processed_at": datetime.utcnow()
    })
    return doc_id

# Website processing
async def process_website(db: AsyncIOMotorDatabase, chat_id: str, url: str) -> str:
    """Process a website URL and store its vectors"""
    # Fetch website content
    try:
        response = requests.get(url, timeout=60)
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
        Chroma.from_documents(
            documents=splits,
            embedding=embeddings,
            collection_name=f"chat_{chat_id}",
            persist_directory="./chroma_db"
        )
        # Store document metadata in MongoDB
        await db.chat_documents.insert_one({
            "_id": url_id,
            "chat_id": chat_id,
            "url": url,
            "type": "website",
            "chunk_count": len(splits),
            "processed_at": datetime.utcnow()
        })
        return url_id
    except Exception as e:
        print(f"Error processing URL {url}: {str(e)}")
        raise

# RAG Query
async def query_rag(db: AsyncIOMotorDatabase, chat_id: str, query: str) -> str:
    try:
        # Load the vector store
        vectorstore = Chroma(
            collection_name=f"chat_{chat_id}",
            embedding_function=embeddings,
            persist_directory="./chroma_db"
        )
        # Step 1: Load chat history
        chat = await db.chats.find_one({"_id": chat_id}) or {}
        messages = chat.get("messages", [])
        filtered_msgs = [msg for msg in messages if msg["role"] in ["user", "assistant"]]
        last_msgs = filtered_msgs[-6:]
        history_msgs = []
        for msg in last_msgs:
            if msg["role"] == "user":
                history_msgs.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                history_msgs.append(AIMessage(content=msg["content"]))
        # Step 2: Generate self-contained query using LLM
        contextualize_prompt = ChatPromptTemplate.from_messages([
            ("system", "Given the chat history, rewrite the user's question to be fully self-contained. Don't provide any answers, code or explanation. Simply rewrite the user's question to be fully self-contained. Only provide a single line question as output."),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}")
        ])
        contextualizer_chain = contextualize_prompt | llm
        standalone_query = contextualizer_chain.invoke({
            "input": query,
            "chat_history": history_msgs
        })
        print("Standalone Query Output:", standalone_query)
        # Step 3: Similarity search using rewritten query
        docs_and_scores = vectorstore.similarity_search_with_score(standalone_query, k=8)
        # Build context snippets (with resilience against non-Document entries)
        snippets = []
        for doc, score in docs_and_scores:
            if score < 0.5:
                snippets.append(getattr(doc, "page_content", str(doc)))
        if not snippets:
            # fallback to all entries if none under threshold
            for doc, _ in docs_and_scores:
                snippets.append(getattr(doc, "page_content", str(doc)))
        # Format retrieved documents as context
        context = "\n\n".join(snippets)
        # Step 4: Generate final response using original history + retrieved context
        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful assistant. Use the following context to answer the user's question. If unsure, say you don't know.\nContext:\n{context}"),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}")
        ])
        qa_sequence = qa_prompt | llm
        response = qa_sequence.invoke({
            "input": standalone_query,
            "context": context,
            "chat_history": history_msgs
        })
        print("Response:", response)
        return response
    except Exception as e:
        print(f"Error querying RAG system: {str(e)}")
        # Return a friendly error message instead of exposing the error
        return "I'm sorry, I encountered a problem while processing your question. Please try again or rephrase your question."

# Delete vector store
async def delete_chat_vectorstore(chat_id: str) -> str:
    """Delete the ChromaDB collection when chat is deleted"""
    # Instantiating Chroma with same names allows deletion
    vectorstore = Chroma(
        collection_name=f"chat_{chat_id}",
        embedding_function=embeddings,
        persist_directory="./chroma_db"
    )
    vectorstore.delete_collection()

# Test LLM
if __name__ == "__main__":
    def test_llm():
        prompt = "Explain what Retrieval Augmented Generation is in simple terms."
        try:
            print("LLM Test Response:", llm.invoke(prompt))
        except Exception as e:
            import traceback; traceback.print_exc()
    test_llm()
