/**
 * Chat Page Object for E2E Tests
 * Encapsulates chat-specific selectors and actions
 */
export class ChatPage {
  constructor(page) {
    this.page = page;

    this.locators = {
      // Auth
      usernameInput: page.locator('input[name="username"], input[placeholder*="用户"]'),
      passwordInput: page.locator('input[name="password"], input[placeholder*="密码"]'),
      loginButton: page.locator('button[type="submit"], button:has-text("登录")'),
      errorMessage: page.locator('.error, .alert-error, [role="alert"]'),

      // Chat
      chatInput: page.locator('textarea[data-testid="chat-input"], .chat-input-field'),
      sendButton: page.locator('button[data-testid="send-button"], .send-btn'),
      messageList: page.locator('.message-list, .message-list-inner'),
      lastAssistantMessage: page.locator('.message-item.assistant:last-child .message-bubble, .message-item.assistant:last-child .message-text'),
    };
  }

  /**
   * Navigate to chat page
   */
  async goto() {
    await this.page.goto(process.env.APP_URL || 'http://localhost:3000');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Login with credentials
   */
  async login(username, password) {
    try {
      await this.locators.usernameInput.fill(username);
      await this.locators.passwordInput.fill(password);
      await this.locators.loginButton.click();
      await this.page.waitForLoadState('networkidle');
    } catch (e) {
      // Already logged in or login not required
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      const logoutBtn = this.page.locator('button:has-text("退出"), button:has-text("Logout")');
      await logoutBtn.click();
      await this.page.waitForLoadState('networkidle');
    } catch (e) {
      // Logout not available
    }
  }

  /**
   * Send a message and wait for response
   */
  async sendMessage(text) {
    await this.locators.chatInput.fill(text);
    await this.locators.sendButton.click();
  }

  /**
   * Wait for assistant response
   */
  async waitForResponse(timeout = 30000) {
    await this.page.waitForTimeout(1000);

    // Wait for streaming to complete or message to appear
    try {
      await this.page.waitForFunction(() => {
        const streaming = document.querySelector('.streaming-cursor');
        const messages = document.querySelectorAll('.message-item.assistant');
        return messages.length > 0 && !streaming;
      }, { timeout });
    } catch (e) {
      // Timeout - might still be streaming
    }

    await this.page.waitForTimeout(500);
  }

  /**
   * Get last assistant message content
   */
  async getLastAssistantMessage() {
    try {
      const message = this.locators.lastAssistantMessage;
      if (await message.isVisible()) {
        return await message.textContent();
      }
    } catch (e) {
      // Message not found
    }
    return '';
  }

  /**
   * Open command palette
   */
  async openCommandPalette() {
    await this.page.keyboard.press('Meta+k');
    await this.page.waitForTimeout(300);

    const palette = this.page.locator('.command-palette-overlay');
    if (!(await palette.isVisible())) {
      // Try Ctrl+K for Windows/Linux
      await this.page.keyboard.press('Control+k');
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Select command by name
   */
  async selectCommand(commandName) {
    const commandItem = this.page.locator(`.command-item:has-text("${commandName}")`).first();
    await commandItem.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn() {
    try {
      await this.locators.chatInput.waitFor({ timeout: 3000 });
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default ChatPage;
