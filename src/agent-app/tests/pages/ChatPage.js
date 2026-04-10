/**
 * Chat Page Object Model
 *
 * 封装聊天页面相关的 DOM 操作和断言
 */

export class ChatPage {
  constructor(page) {
    this.page = page;

    // 选择器
    this.selectors = {
      // 主容器
      chatView: '.chat-view',
      messageList: '.message-list',

      // 输入区域
      chatInput: 'textarea, input[type="text"]',
      sendButton: 'button[type="submit"], button:has-text("发送"), button:has-text("Send")',

      // 消息
      userMessage: '.message-item.user',
      assistantMessage: '.message-item.assistant',
      messageBubble: '.message-bubble',
      messageContent: '.message-content',

      // 消息操作
      copyButton: 'button:has([class*="copy"]), button[title*="复制"], button[title*="Copy"]',
      regenerateButton: 'button:has([class*="regenerate"]), button[title*="重新"]',
      feedbackButtons: 'button[class*="thumbs"]',
      likeButton: 'button[class*="liked"]',
      dislikeButton: 'button[class*="disliked"]',

      // 思考链
      thinkingChain: '.thinking-chain',
      thinkingToggle: '.thinking-toggle',
      thinkingContent: '.thinking-content',

      // 结构化数据
      structuredTable: '.structured-table',
      dataTable: '.data-table',
      structuredChart: '.structured-chart',
      structuredMetrics: '.structured-metrics',
      metricCard: '.metric-card',
      structuredSteps: '.structured-steps',
      structuredSql: '.structured-sql',
      sqlContent: '.sql-content',

      // Toggle 块
      toggleBlock: '.structured-toggle',
      toggleButtons: '.toggle-btn',

      // 流式输出
      streamingCursor: '.streaming-cursor',
      thinkingIndicator: '.thinking-indicator',

      // 空状态
      emptyState: '.message-list-empty',

      // 侧边栏
      sidebar: '.sidebar, aside',
      newChatButton: 'button:has-text("新对话"), button:has-text("新聊天"), button:has-text("New Chat")',

      // 验证状态
      validationStatus: '.validation-status',
    };
  }

  // ========== 页面导航 ==========

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async setViewport(width, height) {
    await this.page.setViewportSize({ width, height });
  }

  // ========== 消息操作 ==========

  async sendMessage(text) {
    const input = this.page.locator(this.selectors.chatInput).first();
    const sendBtn = this.page.locator(this.selectors.sendButton).first();

    await input.fill(text);
    await sendBtn.click();

    // 等待消息发送
    await this.page.waitForTimeout(500);
  }

  async getUserMessages() {
    return this.page.locator(this.selectors.userMessage);
  }

  async getAssistantMessages() {
    return this.page.locator(this.selectors.assistantMessage);
  }

  async getLastAssistantMessage() {
    const messages = await this.getAssistantMessages();
    return messages.last();
  }

  async getMessageContent(messageLocator) {
    return messageLocator.locator(this.selectors.messageContent).textContent();
  }

  // ========== 结构化数据验证 ==========

  async getTables() {
    return this.page.locator(this.selectors.structuredTable);
  }

  async getCharts() {
    return this.page.locator(this.selectors.structuredChart);
  }

  async getMetrics() {
    return this.page.locator(this.selectors.metricCard);
  }

  async getSteps() {
    return this.page.locator(this.selectors.structuredSteps);
  }

  async getSqlBlocks() {
    return this.page.locator(this.selectors.sqlContent);
  }

  async getThinkingChain() {
    return this.page.locator(this.selectors.thinkingChain);
  }

  async getToggleBlocks() {
    return this.page.locator(this.selectors.toggleBlock);
  }

  // ========== 交互操作 ==========

  async toggleThinkingChain() {
    const toggle = this.page.locator(this.selectors.thinkingToggle).first();
    if (await toggle.isVisible()) {
      await toggle.click();
    }
  }

  async copyMessage(messageLocator) {
    // 模拟 clipboard API
    await this.page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async () => {},
          readText: async () => ''
        },
        configurable: true
      });
    });

    const copyBtn = messageLocator.locator(this.selectors.copyButton);
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
    }
  }

  async clickFeedback(messageLocator, type = 'like') {
    const btn = type === 'like'
      ? messageLocator.locator(this.selectors.likeButton)
      : messageLocator.locator(this.selectors.dislikeButton);

    if (await btn.isVisible()) {
      await btn.click();
    }
  }

  async switchToggleView(toggleBlockLocator, view) {
    const buttons = toggleBlockLocator.locator(this.selectors.toggleButtons);
    const viewBtn = view === 'chart'
      ? buttons.filter({ hasText: '图表' })
      : buttons.filter({ hasText: '表格' });

    if (await viewBtn.isVisible()) {
      await viewBtn.click();
    }
  }

  // ========== 状态验证 ==========

  async hasThinkingChain() {
    return (await this.page.locator(this.selectors.thinkingChain).count()) > 0;
  }

  async hasTables() {
    return (await this.page.locator(this.selectors.structuredTable).count()) > 0;
  }

  async hasCharts() {
    return (await this.page.locator(this.selectors.structuredChart).count()) > 0;
  }

  async hasMetrics() {
    return (await this.page.locator(this.selectors.metricCard).count()) > 0;
  }

  async hasSteps() {
    return (await this.page.locator(this.selectors.structuredSteps).count()) > 0;
  }

  async hasSql() {
    return (await this.page.locator(this.selectors.sqlContent).count()) > 0;
  }

  async isThinkingVisible() {
    const toggle = this.page.locator(this.selectors.thinkingToggle).first();
    if (await toggle.isVisible()) {
      const content = this.page.locator(this.selectors.thinkingContent);
      return await content.isVisible();
    }
    return false;
  }

  async getValidationStatus() {
    const status = this.page.locator(this.selectors.validationStatus);
    if (await status.isVisible()) {
      const text = await status.textContent();
      return { visible: true, text };
    }
    return { visible: false };
  }

  // ========== 表格数据提取 ==========

  async extractTableData(tableLocator) {
    const headers = [];
    const rows = [];

    // 获取表头
    const headerCells = tableLocator.locator('thead th');
    const headerCount = await headerCells.count();
    for (let i = 0; i < headerCount; i++) {
      headers.push(await headerCells.nth(i).textContent());
    }

    // 获取数据行
    const bodyRows = tableLocator.locator('tbody tr');
    const rowCount = await bodyRows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = [];
      for (let j = 0; j < headerCount; j++) {
        const cell = bodyRows.nth(i).locator('td').nth(j);
        row.push(await cell.textContent());
      }
      rows.push(row);
    }

    return { headers, rows };
  }

  // ========== 指标数据提取 ==========

  async extractMetricsData() {
    const metrics = [];
    const cards = this.page.locator(this.selectors.metricCard);
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const label = await card.locator('.metric-label').textContent();
      const value = await card.locator('.metric-value').textContent();
      metrics.push({ label, value });
    }

    return metrics;
  }

  // ========== 步骤数据提取 ==========

  async extractStepsData() {
    const steps = [];
    const stepItems = this.page.locator('.step-item');
    const count = await stepItems.count();

    for (let i = 0; i < count; i++) {
      const stepText = await stepItems.nth(i).locator('.step-text').textContent();
      steps.push(stepText);
    }

    return steps;
  }

  // ========== 图表验证 ==========

  async hasChartRendered() {
    const charts = this.page.locator('.recharts-wrapper, .recharts-surface');
    return (await charts.count()) > 0;
  }

  async getChartType() {
    const bar = this.page.locator('.recharts-bar');
    const line = this.page.locator('.recharts-line');
    const pie = this.page.locator('.recharts-pie');

    if (await bar.count() > 0) return 'bar';
    if (await line.count() > 0) return 'line';
    if (await pie.count() > 0) return 'pie';
    return 'unknown';
  }
}
