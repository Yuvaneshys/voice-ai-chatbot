import os
import glob
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")

def get_pdf_text(pdf_docs):
    text = ""
    for pdf in pdf_docs:
        pdf_reader = PdfReader(pdf)
        for page in pdf_reader.pages:
            text += page.extract_text()
    return text

def get_text_chunks(text):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=10000, chunk_overlap=1000)
    return text_splitter.split_text(text)

def get_vector_store(text_chunks):
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=API_KEY)
    vector_store = FAISS.from_texts(text_chunks, embedding=embeddings)
    vector_store.save_local("faiss_db")

def convert_docs_to_text(path):
    text = ""
    pdf_files = glob.glob(f"{path}/*.pdf")
    for pdf in pdf_files:
        with open(pdf, "rb") as file:
            text += "\n" + get_pdf_text([pdf])
    return text

if __name__ == "__main__":
    print("Processing documents...")
    raw_text = convert_docs_to_text("documents")
    text_chunks = get_text_chunks(raw_text)
    get_vector_store(text_chunks)
    print("Vector database created successfully!")