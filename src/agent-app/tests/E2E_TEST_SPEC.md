# E2E Test Specification

## Overview
This document describes the end-to-end test suite for OperatorBoard, covering 18 core functions with database consistency validation.

## Test Environment

### Prerequisites
- Node.js 18+
- MySQL 8.0+ database
- Chrome/Chromium browser for Playwright

### Environment Variables
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root
DB_NAME=operator_db
APP_URL=http://localhost:3000
```

## Test Structure

### Test Files
- `real-e2e.spec.js` - Main E2E test suite (18 core functions)
- `helpers/dbHelper.js` - Database utilities
- `helpers/index.js` - Helper exports
- `factories/dataFactory.js` - Test data generators
- `pages/ChatPage.js` - Chat page object model
- `hooks.js` - Global test hooks

## Test Categories

### 1. Authentication Tests
| Test | Description |
|------|-------------|
| valid login | Login with correct credentials |
| invalid login | Show error with wrong credentials |

### 2. Chat Functionality Tests
| Test | Description |
|------|-------------|
| send/receive | Send message and receive response |
| streaming | Display streaming response |
| resend | Resend a message |

### 3. Structured Data Rendering Tests
| Test | Description |
|------|-------------|
| table blocks | Render data tables |
| chart blocks | Render charts |
| KPI metrics | Render KPI cards |
| SQL blocks | Render SQL code blocks |

### 4. Database Consistency Tests
| Test | Description |
|------|-------------|
| site count | UI count matches database |
| operator list | UI shows all database operators |

### 5. Theme Tests
| Test | Description |
|------|-------------|
| dark theme | Switch to dark mode |
| light theme | Switch to light mode |
| persist | Theme persists after reload |

### 6. Command Palette Tests
| Test | Description |
|------|-------------|
| Cmd+K | Open palette |
| filter | Search commands |
| navigate | Arrow key navigation |
| execute | Enter to execute |

### 7. Navigation Tests
| Test | Description |
|------|-------------|
| dashboard | Navigate to dashboard |
| switch views | Switch between views |

### 8. Input Handling Tests
| Test | Description |
|------|-------------|
| clear input | Input clears after send |
| empty input | Send button disabled |
| slash commands | `/` triggers command panel |
| @ mentions | `@` triggers mention panel |

### 9. Error Handling Tests
| Test | Description |
|------|-------------|
| API failure | Show error on API failure |
| network error | Handle offline gracefully |

### 10. Loading States Tests
| Test | Description |
|------|-------------|
| streaming | Show streaming indicator |
| thinking | Show thinking indicator |

### 11-18. Additional Features
| Test | Description |
|------|-------------|
| copy | Copy message content |
| feedback | Like/dislike messages |
| thinking toggle | Expand/collapse thinking |
| view toggle | Switch table/chart view |
| help hints | Show shortcuts in footer |
| escape close | Close with Escape |
| new chat | Cmd+N starts new chat |
| theme toggle | Cmd+T toggles theme |

## Running Tests

### Run all tests
```bash
cd agent-app
npm install
npx playwright install chromium
npm test
```

### Run specific test file
```bash
npx playwright test tests/real-e2e.spec.js --project=chromium
```

### Run with UI
```bash
npm run test:ui
```

### Run headed
```bash
npm run test:headed
```

## Database Consistency Validation

Tests validate that UI results match database data by:
1. Direct MySQL queries via mysql2
2. Comparing extracted values with UI content
3. Using regex patterns for numeric extraction

Example:
```javascript
const dbSites = await dbHelper.query('SELECT COUNT(*) as count FROM site_info');
const expectedCount = dbSites[0].count;
// UI query returns number, compare with tolerance
```
