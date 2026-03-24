"""Web Client for Agent - Flask-based web interface"""
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from telecom_agent import TelecomAgent
from config import OPENAI_API_KEY

app = Flask(__name__,
            template_folder='templates',
            static_folder='static')
app.secret_key = os.urandom(24)
CORS(app)

# Initialize global agent
_agent = None


def get_agent():
    """Get or create the global agent instance"""
    global _agent
    if _agent is None:
        _agent = TelecomAgent()
    return _agent


@app.route("/")
def index():
    """Render the chat interface"""
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """Handle chat requests"""
    data = request.get_json()
    query = data.get("message", "").strip()

    if not query:
        return jsonify({"error": "Empty message"}), 400

    try:
        agent = get_agent()

        # Get chat history from session
        chat_history = session.get("chat_history", [])

        # Convert history to LangChain message format
        from langchain_core.messages import HumanMessage, AIMessage
        lc_history = []
        for i, msg in enumerate(chat_history):
            if i % 2 == 0:
                lc_history.append(HumanMessage(content=msg))
            else:
                lc_history.append(AIMessage(content=msg))

        # Run agent
        response = agent.run(query, lc_history)

        # Update session history
        chat_history.append(query)
        chat_history.append(response)
        session["chat_history"] = chat_history[-20:]  # Keep last 20 messages

        return jsonify({
            "response": response,
            "history": chat_history,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/reset", methods=["POST"])
def reset():
    """Reset the chat history"""
    session.pop("chat_history", None)
    return jsonify({"status": "reset"})


@app.route("/api/history", methods=["GET"])
def history():
    """Get current chat history"""
    return jsonify({"history": session.get("chat_history", [])})


if __name__ == "__main__":
    print("Starting Web Client...")
    print("Open http://127.0.0.1:5000 in your browser")
    app.run(host="127.0.0.1", port=5000, debug=True)
