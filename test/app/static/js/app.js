/**
 * Agent Web Client - Fully JavaScript-driven UI
 */

const AgentClient = {
    // State
    chatHistory: [],
    isLoading: false,

    // CSS styles
    styles: `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container { width: 100%; max-width: 800px; background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
        .header h1 { font-size: 1.5rem; font-weight: 600; }
        .header p { font-size: 0.9rem; opacity: 0.9; margin-top: 5px; }
        .chat-container { height: 450px; overflow-y: auto; padding: 20px; background: #f5f7fa; }
        .message { margin-bottom: 16px; display: flex; flex-direction: column; }
        .message.user { align-items: flex-end; }
        .message.agent { align-items: flex-start; }
        .message-content { max-width: 75%; padding: 12px 16px; border-radius: 16px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
        .message.user .message-content { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-bottom-right-radius: 4px; }
        .message.agent .message-content { background: white; color: #333; border: 1px solid #e0e0e0; border-bottom-left-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .message-time { font-size: 0.75rem; color: #999; margin-top: 4px; padding: 0 8px; }
        .welcome { text-align: center; color: #666; padding: 40px 20px; }
        .welcome h2 { font-size: 1.2rem; margin-bottom: 10px; color: #333; }
        .input-container { padding: 20px; background: white; border-top: 1px solid #e0e0e0; }
        .input-wrapper { display: flex; gap: 10px; }
        #message-input { flex: 1; padding: 14px 18px; border: 2px solid #e0e0e0; border-radius: 25px; font-size: 1rem; outline: none; transition: border-color 0.3s; }
        #message-input:focus { border-color: #667eea; }
        #send-btn { padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 25px; font-size: 1rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        #send-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
        #send-btn:active { transform: translateY(0); }
        #send-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .loading { display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255,255,255,.3); border-radius: 50%; border-top-color: white; animation: spin 1s ease-in-out infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .status-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; background: #f0f0f0; font-size: 0.85rem; color: #666; }
        .reset-btn { padding: 6px 14px; background: #ff6b6b; color: white; border: none; border-radius: 15px; font-size: 0.8rem; cursor: pointer; transition: background 0.2s; }
        .reset-btn:hover { background: #ff5252; }
        .typing-indicator { display: flex; gap: 4px; padding: 12px 16px; background: white; border-radius: 16px; width: fit-content; }
        .typing-indicator span { width: 8px; height: 8px; background: #999; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out; }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
    `,

    // DOM references
    elements: {},

    /**
     * Inject styles into head
     */
    injectStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = this.styles;
        document.head.appendChild(styleEl);
    },

    /**
     * Render the complete UI
     */
    renderUI() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="container">
                <div class="header">
                    <h1>Telecom Agent</h1>
                    <p>Telecom Data Analysis with AI</p>
                </div>
                <div class="chat-container" id="chat-container">
                    <div class="welcome" id="welcome">
                        <h2>Welcome!</h2>
                        <p>Start a conversation with the Agent</p>
                    </div>
                </div>
                <div class="status-bar">
                    <span id="status">Ready</span>
                    <button class="reset-btn" id="reset-btn">Reset Chat</button>
                </div>
                <div class="input-container">
                    <div class="input-wrapper">
                        <input type="text" id="message-input" placeholder="Type your message...">
                        <button id="send-btn">Send</button>
                    </div>
                </div>
            </div>
        `;
        this.cacheElements();
    },

    /**
     * Cache DOM elements after render
     */
    cacheElements() {
        this.elements = {
            app: document.getElementById('app'),
            chatContainer: document.getElementById('chat-container'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            resetBtn: document.getElementById('reset-btn'),
            status: document.getElementById('status'),
            welcome: document.getElementById('welcome')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.elements.resetBtn.addEventListener('click', () => this.resetChat());
    },

    /**
     * Load chat history from server
     */
    async loadHistory() {
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            if (data.history && data.history.length > 0) {
                this.chatHistory = data.history;
                this.renderHistory();
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    },

    /**
     * Render all messages from history
     */
    renderHistory() {
        for (let i = 0; i < this.chatHistory.length; i += 2) {
            if (this.chatHistory[i]) this.addMessage(this.chatHistory[i], true, false);
            if (this.chatHistory[i + 1]) this.addMessage(this.chatHistory[i + 1], false, false);
        }
    },

    /**
     * Add a message to the chat UI
     */
    addMessage(content, isUser = false, animate = true) {
        if (this.elements.welcome) {
            this.elements.welcome.remove();
            this.elements.welcome = null;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'agent'}`;
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(content)}</div>
            <div class="message-time">${this.formatTime()}</div>
        `;

        if (animate) {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(10px)';
            messageDiv.style.transition = 'opacity 0.3s, transform 0.3s';
            requestAnimationFrame(() => {
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            });
        }

        this.elements.chatContainer.appendChild(messageDiv);
        this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
    },

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'message agent';
        indicator.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        this.elements.chatContainer.appendChild(indicator);
        this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
    },

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    },

    /**
     * Send a message to the agent
     */
    async sendMessage() {
        if (this.isLoading) return;

        const message = this.elements.messageInput.value.trim();
        if (!message) return;

        this.elements.messageInput.value = '';
        this.addMessage(message, true);
        this.setLoading(true);
        this.setStatus('Agent is thinking...');
        this.showTypingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            this.hideTypingIndicator();

            if (data.error) {
                this.addMessage(`Error: ${data.error}`, false);
            } else {
                this.addMessage(data.response, false);
                this.chatHistory = data.history || [];
            }
            this.setStatus('Ready');
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage(`Network error: ${error.message}`, false);
            this.setStatus('Connection error');
        } finally {
            this.setLoading(false);
        }
    },

    /**
     * Reset the chat
     */
    async resetChat() {
        try {
            await fetch('/api/reset', { method: 'POST' });
            this.chatHistory = [];
            this.elements.chatContainer.innerHTML = `
                <div class="welcome" id="welcome">
                    <h2>Chat Reset!</h2>
                    <p>Start a new conversation</p>
                </div>
            `;
            this.elements.welcome = document.getElementById('welcome');
            this.setStatus('Chat reset');
        } catch (error) {
            console.error('Reset failed:', error);
        }
    },

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isLoading = loading;
        this.elements.sendBtn.disabled = loading;
        this.elements.messageInput.disabled = loading;
        this.elements.sendBtn.innerHTML = loading ? '<span class="loading"></span>' : 'Send';
    },

    /**
     * Set status text
     */
    setStatus(text) {
        this.elements.status.textContent = text;
    },

    /**
     * Format current time
     */
    formatTime() {
        return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    },

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Initialize the client
     */
    init() {
        this.injectStyles();
        this.renderUI();
        this.bindEvents();
        this.loadHistory();
        this.elements.messageInput.focus();
        console.log('AgentClient initialized');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => AgentClient.init());
