/**
 * Chat Page Object for E2E Tests
 * Encapsulates chat-specific selectors and actions
 */
export class ChatPage {
  constructor(page) {
    this.page = page;

    this.locators = {
      // Auth
      usernameInput: page.locator('#username'),
      passwordInput: page.locator('#password'),
      loginButton: page.locator('button[type="submit"]'),
      errorMessage: page.locator('.auth-error, .error'),

      // Chat
      chatInput: page.locator('textarea[data-testid="chat-input"]'),
      sendButton: page.locator('button[data-testid="send-button"]'),
      messageList: page.locator('.message-list, .message-list-inner'),
      // Use first-child for data messages since followup questions are rendered as last-child
      lastAssistantMessage: page.locator('.message-item.assistant:first-child .message-bubble'),
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
      // Wait for login form to be visible
      await this.locators.usernameInput.waitFor({ state: 'visible', timeout: 10000 });

      await this.locators.usernameInput.fill(username);
      await this.locators.passwordInput.fill(password);
      await this.locators.loginButton.click();

      // Wait for navigation or chat input to appear
      await this.page.waitForFunction(() => {
        const input = document.querySelector('textarea[data-testid="chat-input"]');
        return input !== null;
      }, { timeout: 30000 }).catch(() => {});
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
    await this.locators.chatInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.locators.chatInput.fill(text);
    await this.locators.sendButton.click();
  }

  /**
   * Wait for assistant response
   */
  async waitForResponse(timeout = 60000) {
    await this.page.waitForTimeout(2000);

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

    await this.page.waitForTimeout(1000);
  }

  /**
   * Get last assistant message content
   */
  async getLastAssistantMessage() {
    try {
      const message = this.locators.lastAssistantMessage;
      if (await message.isVisible({ timeout: 5000 })) {
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
    await this.page.keyboard.press('Control+k');
    await this.page.waitForTimeout(500);

    const palette = this.page.locator('.command-palette-overlay');
    if (!(await palette.isVisible())) {
      // Try Meta+k for Mac
      await this.page.keyboard.press('Meta+k');
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Select command by name
   */
  async selectCommand(commandName) {
    const commandItem = this.page.locator(`.command-item:has-text("${commandName}")`).first();
    await commandItem.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn() {
    try {
      await this.locators.chatInput.waitFor({ timeout: 5000 });
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default ChatPage;
