from flask import Flask, render_template, request, jsonify
import os
import numpy as np
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import LLMChain, StuffDocumentsChain
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from flask_cors import CORS , cross_origin
from dotenv import load_dotenv


load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=API_KEY)
vector_store = FAISS.load_local("faiss_db", embeddings , allow_dangerous_deserialization = True)

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

def get_conversational_chain():
    document_prompt = PromptTemplate(
        input_variables=["page_content"],
        template="{page_content}"
    )
    document_variable_name = "context"
    
    prompt = ChatPromptTemplate.from_template("""
    Answer the question with as much detail as possible using the provided context. If the context is insufficient or does not fully answer the question, supplement your response with relevant and reliable information from the internet. If neither the provided context nor the internet contains an accurate answer, explicitly state: 'The answer is not available in the context or online sources.' Do not generate incorrect or misleading information.\n\n
    Context:\n {context}\n
    Question: \n{question}\n
    Answer:
    """)

    llm_chain = LLMChain(
        llm=ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.3, google_api_key=API_KEY),
        prompt=prompt
    )
    
    chain = StuffDocumentsChain(
        llm_chain=llm_chain,
        document_prompt=document_prompt,
        document_variable_name=document_variable_name
    )
    return chain

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/submit", methods=["POST"])
def submit():
    
    user_question = request.get_json().get("user_question","")
    docs = vector_store.similarity_search(user_question)
    chain = get_conversational_chain()
    response = chain.invoke({"input_documents": docs, "question": user_question})
    
    return jsonify({"response": response["output_text"]})

@app.route("/process_audio", methods=["POST"])
def process_audio():
    pass   

if __name__ == "__main__":
    app.run(host='0.0.0.0' , debug=False , port=8000)