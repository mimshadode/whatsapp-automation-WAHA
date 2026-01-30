# Google Form Automation System Architecture

## LLM-Powered WhatsApp Integration

**Version:** 1.0  
**Date:** 2024  
**Author:** Technical Architecture Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Diagram Description](#architecture-diagram-description)
4. [Component Breakdown](#component-breakdown)
5. [Data Flow](#data-flow)
6. [API Integration Points](#api-integration-points)
7. [Technology Stack](#technology-stack)
8. [Deployment Architecture](#deployment-architecture)
9. [Security Best Practices](#security-best-practices)
10. [Scalability Considerations](#scalability-considerations)
11. [Monitoring and Logging](#monitoring-and-logging)
12. [Error Handling and Recovery](#error-handling-and-recovery)

---

## Executive Summary

This document outlines the architecture for an intelligent Google Form automation system that leverages WhatsApp as the primary user interface. The system uses Large Language Models (LLMs) via Biznet Gio API to process natural language inputs from users, extract structured data, and automatically populate Google Forms.

**Key Capabilities:**

- Natural language form filling via WhatsApp
- Intelligent data extraction and validation using LLM
- Real-time form submission to Google Forms
- Server-side rendering for admin dashboard and monitoring
- Scalable microservices architecture

---

## System Overview

### High-Level Architecture

The system consists of four primary layers:

1. **Presentation Layer**: WhatsApp interface (via WAHA) and Next.js web dashboard
2. **Application Layer**: Next.js API routes and business logic
3. **Intelligence Layer**: Biznet Gio LLM API for natural language processing
4. **Integration Layer**: Google Forms API and data persistence

### Architecture Principles

- **Separation of Concerns**: Each component has a single, well-defined responsibility
- **Scalability**: Horizontal scaling capability for high-volume processing
- **Resilience**: Graceful degradation and error recovery mechanisms
- **Security**: End-to-end encryption and secure API communication
- **Observability**: Comprehensive logging and monitoring

---

## Architecture Diagram Description

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE LAYER                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐                    ┌──────────────────┐      │
│  │   WhatsApp User  │                    │  Web Dashboard   │      │
│  │                  │                    │   (Next.js SSR)  │      │
│  └────────┬─────────┘                    └────────┬─────────┘      │
│           │                                       │                 │
└───────────┼───────────────────────────────────────┼─────────────────┘
            │                                       │
            │ HTTPS                                 │ HTTPS
            ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      COMMUNICATION LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              WAHA (WhatsApp HTTP API)                        │  │
│  │  - Webhook receiver for incoming messages                    │  │
│  │  - Message sender for responses                              │  │
│  │  - Session management                                        │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                            │                                         │
└────────────────────────────┼─────────────────────────────────────────┘
                             │ Webhook POST
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (Next.js)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Next.js Server (SSR)                      │  │
│  │                                                              │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │  │
│  │  │  API Routes    │  │  Middleware    │  │  Pages (SSR)  │ │  │
│  │  │                │  │                │  │               │ │  │
│  │  │ /api/webhook   │  │ - Auth         │  │ - Dashboard   │ │  │
│  │  │ /api/forms     │  │ - Rate Limit   │  │ - Analytics   │ │  │
│  │  │ /api/sessions  │  │ - Validation   │  │ - Logs        │ │  │
│  │  └────────┬───────┘  └────────┬───────┘  └───────────────┘ │  │
│  │           │                   │                             │  │
│  └───────────┼───────────────────┼─────────────────────────────┘  │
│              │                   │                                 │
│  ┌───────────▼───────────────────▼─────────────────────────────┐  │
│  │              Business Logic Layer                           │  │
│  │                                                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │   Message    │  │   Session    │  │   Form           │  │  │
│  │  │   Handler    │  │   Manager    │  │   Processor      │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │  │
│  │         │                 │                    │            │  │
│  └─────────┼─────────────────┼────────────────────┼────────────┘  │
│            │                 │                    │                │
└────────────┼─────────────────┼────────────────────┼────────────────┘
             │                 │                    │
             ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INTELLIGENCE LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Biznet Gio LLM API                              │  │
│  │                                                              │  │
│  │  Endpoint: https://api.biznetgio.ai/v1/chat/completions     │  │
│  │  Model: openai/gpt-oss-20b                                  │  │
│  │                                                              │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │  │
│  │  │   Intent       │  │   Entity       │  │   Validation  │ │  │
│  │  │   Detection    │  │   Extraction   │  │   & Format    │ │  │
│  │  └────────────────┘  └────────────────┘  └───────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
             │                 │                    │
             ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Google Forms    │  │   Database       │  │   Cache Layer    │  │
│  │  API             │  │   (PostgreSQL)   │  │   (Redis)        │  │
│  │                  │  │                  │  │                  │  │
│  │  - Form Submit   │  │  - Sessions      │  │  - User State    │  │
│  │  - Form Fetch    │  │  - Conversations │  │  - Rate Limits   │  │
│  │  - Validation    │  │  - Audit Logs    │  │  - Temp Data     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. WAHA (WhatsApp HTTP API)

**Repository:** https://waha.devlike.pro/docs/overview/quick-start/

**Responsibilities:**

- Manage WhatsApp Web sessions
- Receive incoming messages via webhooks
- Send outgoing messages to users
- Handle media attachments (images, documents)
- Maintain connection state with WhatsApp servers

**Key Features:**

- Multiple session support
- QR code authentication
- Webhook-based message delivery
- REST API for sending messages
- Session persistence

**Configuration:**

```yaml
WAHA_CONFIG:
  webhook_url: "https://your-nextjs-app.com/api/webhook"
  webhook_events:
    - message
    - message.any
    - state.change
  session_name: "form-automation-bot"
```

**API Endpoints Used:**

- `POST /api/sessions/start` - Initialize WhatsApp session
- `POST /api/sendText` - Send text messages
- `POST /api/sendImage` - Send images (confirmations, receipts)
- `GET /api/sessions` - Check session status
- `POST /api/sessions/stop` - Terminate session

---

### 2. Next.js Application Layer

**Version:** Next.js 14+ (App Router recommended)

**Responsibilities:**

- Handle incoming webhooks from WAHA
- Process business logic
- Orchestrate LLM interactions
- Manage user sessions and conversation state
- Render admin dashboard with SSR
- Provide API endpoints for all operations

**Directory Structure:**

```
nextjs-app/
├── app/
│   ├── api/
│   │   ├── webhook/
│   │   │   └── route.ts          # WAHA webhook handler
│   │   ├── forms/
│   │   │   ├── submit/
│   │   │   │   └── route.ts      # Form submission
│   │   │   └── validate/
│   │   │       └── route.ts      # Form validation
│   │   ├── llm/
│   │   │   └── process/
│   │   │       └── route.ts      # LLM processing
│   │   └── sessions/
│   │       └── route.ts          # Session management
│   ├── dashboard/
│   │   ├── page.tsx              # Main dashboard (SSR)
│   │   ├── analytics/
│   │   │   └── page.tsx          # Analytics page (SSR)
│   │   └── logs/
│   │       └── page.tsx          # Logs viewer (SSR)
│   └── layout.tsx
├── lib/
│   ├── waha-client.ts            # WAHA API wrapper
│   ├── biznetgio-client.ts       # Biznet Gio API wrapper
│   ├── google-forms-client.ts    # Google Forms integration
│   ├── session-manager.ts        # Session state management
│   ├── message-processor.ts      # Message processing logic
│   └── db/
│       ├── client.ts             # Database client
│       └── models/               # Data models
├── middleware.ts                 # Auth & rate limiting
└── types/
    └── index.ts                  # TypeScript definitions
```

**Key Components:**

#### a. Webhook Handler (`/api/webhook/route.ts`)

```typescript
// Receives messages from WAHA
// Validates webhook signature
// Queues messages for processing
// Returns 200 OK immediately
```

#### b. Message Processor (`lib/message-processor.ts`)

```typescript
// Parses incoming messages
// Maintains conversation context
// Determines user intent
// Routes to appropriate handler
```

#### c. Session Manager (`lib/session-manager.ts`)

```typescript
// Tracks user conversation state
// Stores partial form data
// Manages multi-step interactions
// Handles session timeouts
```

#### d. Form Processor (`lib/form-processor.ts`)

```typescript
// Validates extracted data
// Maps data to form fields
// Submits to Google Forms
// Handles submission errors
```

---

### 3. Biznet Gio LLM API Integration

**Endpoint:** `https://api.biznetgio.ai/v1/chat/completions`  
**Model:** `openai/gpt-oss-20b`  
**Authentication:** Bearer token

**Responsibilities:**

- Natural language understanding
- Entity extraction from user messages
- Data validation and formatting
- Intent classification
- Conversational responses

**Integration Pattern:**

```typescript
// lib/biznetgio-client.ts

interface BiznetGioRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface BiznetGioResponse {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
      reasoning_content?: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class BiznetGioClient {
  private apiKey: string;
  private baseURL: string = "https://api.biznetgio.ai/v1";

  async processMessage(
    userMessage: string,
    conversationHistory: Message[],
    formSchema: FormSchema,
  ): Promise<ExtractedData> {
    const systemPrompt = this.buildSystemPrompt(formSchema);

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: userMessage },
        ],
        temperature: 0.3, // Lower for more consistent extraction
        max_tokens: 1000,
      }),
    });

    const data: BiznetGioResponse = await response.json();
    return this.parseExtractedData(data.choices[0].message.content);
  }

  private buildSystemPrompt(formSchema: FormSchema): string {
    return `You are a form-filling assistant. Extract structured data from user messages.
    
Form Schema:
${JSON.stringify(formSchema, null, 2)}

Instructions:
1. Extract all relevant information from the user's message
2. Map extracted data to form fields
3. Identify missing required fields
4. Validate data formats (email, phone, dates)
5. Return JSON with extracted data and validation status

Response Format:
{
  "extracted_fields": {
    "field_name": "value"
  },
  "missing_fields": ["field1", "field2"],
  "validation_errors": [],
  "confidence_score": 0.95,
  "next_question": "What is your email address?"
}`;
  }
}
```

**Use Cases:**

1. **Intent Detection**
   - Determine if user wants to fill a form, check status, or cancel
2. **Entity Extraction**
   - Extract name, email, phone, address, dates, etc.
   - Handle various input formats
3. **Data Validation**
   - Verify email format
   - Validate phone numbers
   - Check date ranges
4. **Conversational Flow**
   - Ask clarifying questions
   - Confirm extracted information
   - Handle corrections

---

### 4. Google Forms Integration

**API:** Google Forms API v1  
**Authentication:** OAuth 2.0 or Service Account

**Responsibilities:**

- Fetch form schema and field definitions
- Submit form responses programmatically
- Validate field requirements
- Handle form-specific logic (conditional fields)

**Integration Approach:**

```typescript
// lib/google-forms-client.ts

import { google } from "googleapis";

class GoogleFormsClient {
  private forms;

  constructor(credentials: ServiceAccountCredentials) {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/forms"],
    });

    this.forms = google.forms({ version: "v1", auth });
  }

  async getFormSchema(formId: string): Promise<FormSchema> {
    const response = await this.forms.forms.get({ formId });
    return this.parseFormSchema(response.data);
  }

  async submitResponse(
    formId: string,
    answers: Record<string, any>,
  ): Promise<SubmissionResult> {
    // Google Forms doesn't have direct API submission
    // Use one of these approaches:

    // Option 1: Use Google Apps Script as middleware
    // Option 2: Use form prefill URLs
    // Option 3: Use Google Sheets API (if form is linked)

    const prefillUrl = this.generatePrefillUrl(formId, answers);

    // Simulate submission or use headless browser
    return await this.submitViaPrefill(prefillUrl);
  }

  private generatePrefillUrl(
    formId: string,
    answers: Record<string, any>,
  ): string {
    const baseUrl = `https://docs.google.com/forms/d/e/${formId}/formResponse`;
    const params = new URLSearchParams();

    Object.entries(answers).forEach(([fieldId, value]) => {
      params.append(`entry.${fieldId}`, String(value));
    });

    return `${baseUrl}?${params.toString()}`;
  }
}
```

**Alternative: Google Apps Script Middleware**

For more reliable submissions, deploy a Google Apps Script:

```javascript
// Google Apps Script (deployed as web app)

function doPost(e) {
  const formId = "YOUR_FORM_ID";
  const form = FormApp.openById(formId);
  const data = JSON.parse(e.postData.contents);

  const formResponse = form.createResponse();

  data.answers.forEach((answer) => {
    const item = form.getItemById(answer.itemId);
    const response = item.asTextItem().createResponse(answer.value);
    formResponse.withItemResponse(response);
  });

  formResponse.submit();

  return ContentService.createTextOutput(
    JSON.stringify({
      success: true,
      responseId: formResponse.getId(),
    }),
  ).setMimeType(ContentService.MimeType.JSON);
}
```

---

### 5. Database Layer (PostgreSQL)

**Responsibilities:**

- Store conversation history
- Track form submissions
- Maintain user sessions
- Audit logging
- Analytics data

**Schema Design:**

```sql
-- Users/Sessions
CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  session_state JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW()
);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES whatsapp_sessions(id),
  message_type VARCHAR(20), -- 'incoming' or 'outgoing'
  message_content TEXT,
  message_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Form Submissions
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES whatsapp_sessions(id),
  form_id VARCHAR(255) NOT NULL,
  form_name VARCHAR(255),
  extracted_data JSONB NOT NULL,
  submission_status VARCHAR(50), -- 'pending', 'submitted', 'failed'
  google_response_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP
);

-- LLM Interactions
CREATE TABLE llm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES whatsapp_sessions(id),
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  model VARCHAR(100),
  tokens_used INTEGER,
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  user_identifier VARCHAR(255),
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_phone ON whatsapp_sessions(phone_number);
CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_submissions_session ON form_submissions(session_id);
CREATE INDEX idx_submissions_status ON form_submissions(submission_status);
CREATE INDEX idx_llm_session ON llm_interactions(session_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

---

### 6. Cache Layer (Redis)

**Responsibilities:**

- Store active session state
- Rate limiting
- Temporary data storage
- Message queue for async processing

**Key Patterns:**

```typescript
// Session state caching
const sessionKey = `session:${phoneNumber}`;
await redis.setex(sessionKey, 3600, JSON.stringify(sessionState));

// Rate limiting
const rateLimitKey = `ratelimit:${phoneNumber}`;
const count = await redis.incr(rateLimitKey);
if (count === 1) {
  await redis.expire(rateLimitKey, 60); // 1 minute window
}
if (count > 10) {
  throw new Error("Rate limit exceeded");
}

// Message queue
await redis.lpush("message_queue", JSON.stringify(message));
const message = await redis.brpop("message_queue", 0);
```

---

## Data Flow

### Scenario 1: User Initiates Form Filling

```
1. User sends WhatsApp message: "I want to register for the event"
   ↓
2. WAHA receives message → Sends webhook to Next.js
   POST /api/webhook
   {
     "event": "message",
     "session": "form-automation-bot",
     "payload": {
       "from": "1234567890@c.us",
       "body": "I want to register for the event",
       "timestamp": 1234567890
     }
   }
   ↓
3. Next.js Webhook Handler:
   - Validates webhook signature
   - Extracts phone number and message
   - Checks/creates session in database
   - Queues message for processing
   - Returns 200 OK
   ↓
4. Message Processor (async):
   - Retrieves session state from Redis/DB
   - Identifies intent: "form_filling"
   - Determines form type: "event_registration"
   - Fetches form schema from Google Forms
   ↓
5. LLM Processing:
   - Sends to Biznet Gio API with system prompt
   POST https://api.biznetgio.ai/v1/chat/completions
   {
     "model": "openai/gpt-oss-20b",
     "messages": [
       {
         "role": "system",
         "content": "Extract registration info. Required: name, email, phone"
       },
       {
         "role": "user",
         "content": "I want to register for the event"
       }
     ]
   }
   ↓
6. LLM Response Analysis:
   {
     "extracted_fields": {},
     "missing_fields": ["name", "email", "phone"],
     "next_question": "Great! I'll help you register. What's your full name?"
   }
   ↓
7. Response to User:
   - Update session state (current_step: "collecting_name")
   - Send message via WAHA
   POST https://waha-api/api/sendText
   {
     "session": "form-automation-bot",
     "chatId": "1234567890@c.us",
     "text": "Great! I'll help you register. What's your full name?"
   }
   ↓
8. User responds: "My name is Clarahexa Doe"
   ↓
9. Repeat steps 2-7 until all fields collected
   ↓
10. Final Confirmation:
    "Please confirm your details:
    Name: Clarahexa Doe
    Email: Clarahexa@example.com
    Phone: +1234567890

    Reply 'CONFIRM' to submit or 'EDIT' to make changes"
    ↓
11. User: "CONFIRM"
    ↓
12. Form Submission:
    - Validate all fields
    - Submit to Google Forms (via Apps Script or prefill)
    - Store submission record in database
    - Send confirmation to user
    "✅ Registration successful! Confirmation ID: ABC123"
```

### Scenario 2: Admin Views Dashboard

```
1. Admin navigates to https://your-app.com/dashboard
   ↓
2. Next.js SSR:
   - Authenticates user (middleware)
   - Fetches data from database:
     * Active sessions count
     * Recent submissions
     * Success/failure rates
     * LLM usage statistics
   - Renders page on server
   ↓
3. HTML sent to browser with pre-rendered data
   ↓
4. Client-side hydration for interactive elements
   ↓
5. Real-time updates via WebSocket or polling
```

---

## API Integration Points

### 1. WAHA API Integration

**Base URL:** `http://localhost:3000` (or deployed WAHA instance)

**Authentication:** API Key in header

**Key Endpoints:**

| Endpoint                 | Method | Purpose                | Request Body                                                              |
| ------------------------ | ------ | ---------------------- | ------------------------------------------------------------------------- |
| `/api/sessions/start`    | POST   | Start WhatsApp session | `{ "name": "session-name" }`                                              |
| `/api/sendText`          | POST   | Send text message      | `{ "session": "name", "chatId": "phone@c.us", "text": "message" }`        |
| `/api/sendImage`         | POST   | Send image             | `{ "session": "name", "chatId": "phone@c.us", "file": { "url": "..." } }` |
| `/api/sessions`          | GET    | List sessions          | -                                                                         |
| `/api/{session}/auth/qr` | GET    | Get QR code            | -                                                                         |

**Webhook Configuration:**

```typescript
// Configure in WAHA
{
  "webhook": {
    "url": "https://your-nextjs-app.com/api/webhook",
    "events": ["message", "message.any", "state.change"],
    "hmac": {
      "key": "your-secret-key"
    }
  }
}

// Webhook payload structure
interface WAHAWebhook {
  event: string;
  session: string;
  engine: string;
  payload: {
    id: string;
    timestamp: number;
    from: string;
    fromMe: boolean;
    body: string;
    hasMedia: boolean;
    ack?: number;
    // ... more fields
  };
}
```

---

### 2. Biznet Gio API Integration

**Base URL:** `https://api.biznetgio.ai/v1`

**Authentication:** Bearer token

**Primary Endpoint:**

```
POST /chat/completions
```

**Request Structure:**

```typescript
interface ChatCompletionRequest {
  model: "openai/gpt-oss-20b";
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number; // 0-2, default 1
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
}
```

**Response Structure:**

```typescript
interface ChatCompletionResponse {
  id: string;
  created: number;
  model: string;
  object: "chat.completion";
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string;
      reasoning_content?: string;
    };
    finish_reason: "stop" | "length" | "content_filter";
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

**Error Handling:**

```typescript
try {
  const response = await fetch("https://api.biznetgio.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.BIZNETGIO_API_KEY}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    if (response.status === 429) {
      // Rate limit - implement exponential backoff
      await sleep(1000);
      return retry();
    }
    if (response.status === 401) {
      // Invalid API key
      throw new Error("Authentication failed");
    }
    // Handle other errors
  }

  return await response.json();
} catch (error) {
  // Network error, timeout, etc.
  logger.error("LLM API error", error);
  throw error;
}
```

**Best Practices:**

1. **Prompt Engineering:**
   - Use clear, structured system prompts
   - Include examples in few-shot learning format
   - Specify output format (JSON preferred)

2. **Token Management:**
   - Monitor token usage
   - Implement conversation truncation for long chats
   - Use lower temperature (0.2-0.4) for extraction tasks

3. **Caching:**
   - Cache form schemas in system prompts
   - Reuse conversation context efficiently

---

### 3. Google Forms API Integration

**API Version:** Forms API v1  
**Base URL:** `https://forms.googleapis.com/v1`

**Authentication:** OAuth 2.0 or Service Account

**Key Operations:**

```typescript
// 1. Get Form Metadata
GET /forms/{formId}

Response:
{
  "formId": "abc123",
  "info": {
    "title": "Event Registration",
    "documentTitle": "Event Registration Form"
  },
  "items": [
    {
      "itemId": "12345",
      "title": "Full Name",
      "questionItem": {
        "question": {
          "required": true,
          "textQuestion": {
            "paragraph": false
          }
        }
      }
    }
  ]
}

// 2. Submit Response (via Apps Script middleware)
POST https://script.google.com/macros/s/{deploymentId}/exec

Request:
{
  "formId": "abc123",
  "answers": [
    {
      "itemId": "12345",
      "value": "Clarahexa Doe"
    }
  ]
}

Response:
{
  "success": true,
  "responseId": "xyz789",
  "editUrl": "https://docs.google.com/forms/d/e/..."
}
```

**Service Account Setup:**

```typescript
// lib/google-auth.ts
import { google } from "googleapis";

export function getGoogleAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(
        /\\n/g,
        "\n",
      ),
    },
    scopes: [
      "https://www.googleapis.com/auth/forms.body.readonly",
      "https://www.googleapis.com/auth/forms.responses.readonly",
    ],
  });
}
```

---

## Technology Stack

### Backend

| Component     | Technology | Version  | Purpose                    |
| ------------- | ---------- | -------- | -------------------------- |
| **Runtime**   | Node.js    | 20.x LTS | JavaScript runtime         |
| **Framework** | Next.js    | 14+      | Full-stack React framework |
| **Language**  | TypeScript | 5.x      | Type-safe development      |
| **Database**  | PostgreSQL | 15+      | Primary data store         |
| **Cache**     | Redis      | 7.x      | Session cache & queues     |
| **ORM**       | Prisma     | 5.x      | Database toolkit           |

### Frontend (Dashboard)

| Component        | Technology      | Purpose                 |
| ---------------- | --------------- | ----------------------- |
| **UI Framework** | React 18+       | Component library       |
| **Styling**      | Tailwind CSS    | Utility-first CSS       |
| **Charts**       | Recharts        | Data visualization      |
| **Forms**        | React Hook Form | Form management         |
| **State**        | Zustand         | Client state management |

### Infrastructure

| Component           | Technology                  | Purpose                    |
| ------------------- | --------------------------- | -------------------------- |
| **Container**       | Docker                      | Containerization           |
| **Orchestration**   | Docker Compose / Kubernetes | Container management       |
| **Reverse Proxy**   | Nginx                       | Load balancing & SSL       |
| **Process Manager** | PM2                         | Node.js process management |

### External Services

| Service          | Purpose                     | Provider           |
| ---------------- | --------------------------- | ------------------ |
| **WhatsApp API** | Messaging interface         | WAHA (self-hosted) |
| **LLM API**      | Natural language processing | Biznet Gio         |
| **Forms API**    | Form submission             | Google Forms       |
| **Monitoring**   | Application monitoring      | Sentry / DataDog   |
| **Logging**      | Centralized logging         | Winston / Pino     |

### Development Tools

| Tool           | Purpose         |
| -------------- | --------------- |
| **ESLint**     | Code linting    |
| **Prettier**   | Code formatting |
| **Jest**       | Unit testing    |
| **Playwright** | E2E testing     |
| **Husky**      | Git hooks       |

---

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (Nginx)                    │
│                    SSL Termination (Let's Encrypt)           │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Next.js    │  │  Next.js    │  │  Next.js    │
│  Instance 1 │  │  Instance 2 │  │  Instance 3 │
│  (Docker)   │  │  (Docker)   │  │  (Docker)   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │   Redis     │  │    WAHA     │
│  (Primary)  │  │  (Cluster)  │  │  (Docker)   │
└──────┬──────┘  └─────────────┘  └─────────────┘
       │
       ▼
┌─────────────┐
│ PostgreSQL  │
│  (Replica)  │
└─────────────┘
```

### Deployment Options

#### Option 1: Docker Compose (Small-Medium Scale)

```yaml
# docker-compose.yml
version: "3.8"

services:
  nextjs:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/formbot
      - REDIS_URL=redis://redis:6379
      - BIZNETGIO_API_KEY=${BIZNETGIO_API_KEY}
    depends_on:
      - postgres
      - redis
      - waha
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure

  waha:
    image: devlikeapro/waha:latest
    ports:
      - "3001:3000"
    environment:
      - WAHA_WEBHOOK_URL=http://nextjs:3000/api/webhook
      - WAHA_WEBHOOK_SECRET=${WEBHOOK_SECRET}
    volumes:
      - waha_data:/app/.wwebjs_auth

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=formbot
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - nextjs

volumes:
  postgres_data:
  redis_data:
  waha_data:
```

#### Option 2: Kubernetes (Large Scale)

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nextjs-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: nextjs
  template:
    metadata:
      labels:
        app: nextjs
    spec:
      containers:
        - name: nextjs
          image: your-registry/nextjs-app:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
            - name: BIZNETGIO_API_KEY
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: biznetgio-key
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: nextjs-service
spec:
  selector:
    app: nextjs
  ports:
    - port: 80
      targetPort: 3000
  type: LoadBalancer
```

### Environment Variables

```bash
# .env.production

# Application
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://host:6379
REDIS_PASSWORD=your-redis-password

# WAHA
WAHA_API_URL=http://waha:3000
WAHA_API_KEY=your-waha-api-key
WAHA_WEBHOOK_SECRET=your-webhook-secret
WAHA_SESSION_NAME=form-automation-bot

# Biznet Gio
BIZNETGIO_API_KEY=sk-AG6LBHTeRO6PLLt_-IBB-A
BIZNETGIO_API_URL=https://api.biznetgio.ai/v1
BIZNETGIO_MODEL=openai/gpt-oss-20b

# Google
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/your-deployment-id/exec

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
SESSION_SECRET=your-session-secret

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t your-registry/nextjs-app:${{ github.sha }} .

      - name: Push to registry
        run: docker push your-registry/nextjs-app:${{ github.sha }}

      - name: Deploy to production
        run: |
          kubectl set image deployment/nextjs-app \
            nextjs=your-registry/nextjs-app:${{ github.sha }}
          kubectl rollout status deployment/nextjs-app
```

---

## Security Best Practices

### 1. Authentication & Authorization

**API Key Management:**

```typescript
// Rotate API keys regularly
// Store in environment variables, never in code
// Use different keys for dev/staging/production

// Validate all incoming requests
export function validateAPIKey(req: Request): boolean {
  const apiKey = req.headers.get("x-api-key");
  return apiKey === process.env.INTERNAL_API_KEY;
}
```

**Webhook Signature Verification:**

```typescript
// Verify WAHA webhook signatures
import crypto from "crypto";

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
```

**Dashboard Authentication:**

```typescript
// Use NextAuth.js for admin dashboard
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Verify against database
        const user = await verifyUser(credentials);
        return user || null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
};
```

### 2. Data Protection

**Encryption at Rest:**

```typescript
// Encrypt sensitive data before storing
import crypto from "crypto";

const algorithm = "aes-256-gcm";
const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
```

**PII Handling:**

```typescript
// Mask sensitive data in logs
export function maskPII(data: any): any {
  const masked = { ...data };

  const sensitiveFields = ["phone", "email", "ssn", "password"];

  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = "***REDACTED***";
    }
  }

  return masked;
}

// Use in logging
logger.info("User data", maskPII(userData));
```

### 3. Input Validation

**Sanitize User Input:**

```typescript
import validator from "validator";
import DOMPurify from "isomorphic-dompurify";

export function sanitizeInput(input: string): string {
  // Remove HTML tags
  let clean = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });

  // Trim whitespace
  clean = clean.trim();

  // Limit length
  if (clean.length > 1000) {
    clean = clean.substring(0, 1000);
  }

  return clean;
}

export function validateEmail(email: string): boolean {
  return validator.isEmail(email);
}

export function validatePhone(phone: string): boolean {
  return validator.isMobilePhone(phone, "any");
}
```

**SQL Injection Prevention:**

```typescript
// Use Prisma ORM with parameterized queries
// Never concatenate user input into SQL

// GOOD
const user = await prisma.user.findUnique({
  where: { email: userEmail },
});

// BAD - Never do this
// const user = await prisma.$queryRaw`SELECT * FROM users WHERE email = '${userEmail}'`;
```

### 4. Rate Limiting

```typescript
// middleware.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
  analytics: true,
});

export async function middleware(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      },
    });
  }

  return NextResponse.next();
}
```

### 5. HTTPS & SSL

```nginx
# nginx.conf
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://nextjs:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. Secrets Management

```typescript
// Use environment variables
// Never commit secrets to git

// .gitignore
.env
.env.local
.env.production

// Use secret management services
// - AWS Secrets Manager
// - Google Secret Manager
// - HashiCorp Vault

// Example: Load secrets at runtime
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

async function getSecret(secretName: string): Promise<string> {
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`,
  });
  return version.payload?.data?.toString() || '';
}
```

### 7. CORS Configuration

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.ALLOWED_ORIGINS || "https://your-domain.com",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};
```

---

## Scalability Considerations

### Horizontal Scaling

**Load Balancing:**

- Use Nginx or cloud load balancers (AWS ALB, GCP Load Balancer)
- Distribute traffic across multiple Next.js instances
- Session affinity not required (stateless design)

**Database Scaling:**

```typescript
// Read replicas for analytics queries
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: isReadQuery
        ? process.env.DATABASE_READ_REPLICA_URL
        : process.env.DATABASE_URL,
    },
  },
});

// Connection pooling
const pool = new Pool({
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Caching Strategy:**

```typescript
// Multi-layer caching
// 1. In-memory cache (Node.js)
const memoryCache = new Map();

// 2. Redis cache (distributed)
const redisCache = new Redis(process.env.REDIS_URL);

// 3. CDN cache (static assets)
// Configure in next.config.js

export async function getCachedData(key: string) {
  // Check memory cache
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  // Check Redis
  const cached = await redisCache.get(key);
  if (cached) {
    memoryCache.set(key, cached);
    return cached;
  }

  // Fetch from database
  const data = await fetchFromDB(key);

  // Cache in both layers
  await redisCache.setex(key, 3600, data);
  memoryCache.set(key, data);

  return data;
}
```

### Async Processing

**Message Queue:**

```typescript
// Use Bull for job queues
import Queue from "bull";

const messageQueue = new Queue("messages", process.env.REDIS_URL);

// Producer
export async function queueMessage(message: Message) {
  await messageQueue.add(message, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  });
}

// Consumer
messageQueue.process(async (job) => {
  const message = job.data;
  await processMessage(message);
});
```

### Database Optimization

**Indexing:**

```sql
-- Add indexes for frequently queried fields
CREATE INDEX CONCURRENTLY idx_sessions_phone
  ON whatsapp_sessions(phone_number);

CREATE INDEX CONCURRENTLY idx_conversations_session_created
  ON conversations(session_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_submissions_status_created
  ON form_submissions(submission_status, created_at DESC);
```

**Query Optimization:**

```typescript
// Use select to fetch only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});

// Use pagination
const page = 1;
const pageSize = 20;
const submissions = await prisma.formSubmission.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: "desc" },
});
```

---

## Monitoring and Logging

### Application Monitoring

**Health Checks:**

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    waha: await checkWAHA(),
    llm: await checkLLM(),
  };

  const healthy = Object.values(checks).every((c) => c.status === "ok");

  return Response.json(
    { status: healthy ? "healthy" : "unhealthy", checks },
    { status: healthy ? 200 : 503 },
  );
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}
```

**Metrics Collection:**

```typescript
// Use Prometheus client
import { Counter, Histogram, register } from "prom-client";

const messageCounter = new Counter({
  name: "messages_processed_total",
  help: "Total number of messages processed",
  labelNames: ["status"],
});

const llmLatency = new Histogram({
  name: "llm_request_duration_seconds",
  help: "LLM request duration",
  buckets: [0.1, 0.5, 1, 2, 5],
});

// Expose metrics endpoint
export async function GET() {
  return new Response(await register.metrics(), {
    headers: { "Content-Type": register.contentType },
  });
}
```

### Logging

**Structured Logging:**

```typescript
// lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ["phone", "email", "*.phone", "*.email"],
    remove: true,
  },
});

// Usage
logger.info({ userId: "123", action: "form_submit" }, "User submitted form");
logger.error(
  { error: err, context: { userId: "123" } },
  "Form submission failed",
);
```

**Log Aggregation:**

```yaml
# docker-compose.yml - Add log shipping
services:
  nextjs:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=nextjs"

  # Optional: Add Loki for log aggregation
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
```

### Error Tracking

**Sentry Integration:**

```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }
    return event;
  },
});

// Usage
try {
  await processMessage(message);
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: "message-processor" },
    extra: { messageId: message.id },
  });
  throw error;
}
```

---

## Error Handling and Recovery

### Retry Mechanisms

```typescript
// lib/retry.ts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

// Usage
const response = await retryWithBackoff(
  () => fetch("https://api.biznetgio.ai/v1/chat/completions", options),
  3,
  1000,
);
```

### Circuit Breaker

```typescript
// lib/circuit-breaker.ts
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }
}

// Usage
const llmCircuitBreaker = new CircuitBreaker(5, 60000);

const response = await llmCircuitBreaker.execute(() =>
  fetch("https://api.biznetgio.ai/v1/chat/completions", options),
);
```

### Graceful Degradation

```typescript
// Fallback when LLM is unavailable
export async function processMessageWithFallback(message: string) {
  try {
    return await processWithLLM(message);
  } catch (error) {
    logger.warn("LLM unavailable, using rule-based fallback");
    return processWithRules(message);
  }
}

function processWithRules(message: string): ExtractedData {
  // Simple regex-based extraction
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
  const phoneRegex = /\+?\d{10,}/;

  return {
    email: message.match(emailRegex)?.[0],
    phone: message.match(phoneRegex)?.[0],
    confidence: 0.5,
  };
}
```

---

## Appendix

### A. Sample Environment Variables

```bash
# Complete .env.example file
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/formbot
DATABASE_READ_REPLICA_URL=postgresql://user:password@replica:5432/formbot
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# WAHA
WAHA_API_URL=http://localhost:3001
WAHA_API_KEY=your-waha-api-key
WAHA_WEBHOOK_SECRET=your-webhook-secret
WAHA_SESSION_NAME=form-automation-bot

# Biznet Gio
BIZNETGIO_API_KEY=sk-AG6LBHTeRO6PLLt_-IBB-A
BIZNETGIO_API_URL=https://api.biznetgio.ai/v1
BIZNETGIO_MODEL=openai/gpt-oss-20b

# Google
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/your-id/exec

# Security
JWT_SECRET=your-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-encryption-key-hex-64-chars
SESSION_SECRET=your-session-secret-min-32-chars
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

### B. Useful Commands

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint
npm run test               # Run tests

# Database
npx prisma migrate dev     # Run migrations (dev)
npx prisma migrate deploy  # Run migrations (prod)
npx prisma studio          # Open database GUI
npx prisma generate        # Generate Prisma client

# Docker
docker-compose up -d       # Start all services
docker-compose logs -f     # View logs
docker-compose down        # Stop all services
docker-compose ps          # List running services

# Kubernetes
kubectl apply -f k8s/      # Deploy to cluster
kubectl get pods           # List pods
kubectl logs -f pod-name   # View pod logs
kubectl describe pod name  # Pod details
```

### C. Testing Strategy

```typescript
// __tests__/message-processor.test.ts
import { processMessage } from "@/lib/message-processor";

describe("Message Processor", () => {
  it("should extract email from message", async () => {
    const message = "My email is Clarahexa@example.com";
    const result = await processMessage(message);

    expect(result.extracted_fields.email).toBe("Clarahexa@example.com");
  });

  it("should handle missing fields", async () => {
    const message = "Hello";
    const result = await processMessage(message);

    expect(result.missing_fields).toContain("email");
  });
});

// __tests__/api/webhook.test.ts
import { POST } from "@/app/api/webhook/route";

describe("Webhook API", () => {
  it("should accept valid webhook", async () => {
    const request = new Request("http://localhost/api/webhook", {
      method: "POST",
      body: JSON.stringify({
        event: "message",
        payload: { from: "123@c.us", body: "test" },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

---

## Conclusion

This architecture provides a robust, scalable foundation for an LLM-powered Google Form automation system. Key strengths:

1. **Modularity**: Each component has clear responsibilities
2. **Scalability**: Horizontal scaling capability at every layer
3. **Resilience**: Error handling, retries, and circuit breakers
4. **Security**: Multiple layers of protection for data and APIs
5. **Observability**: Comprehensive logging and monitoring

### Next Steps

1. **Phase 1**: Set up core infrastructure (Next.js, WAHA, databases)
2. **Phase 2**: Implement basic message flow and LLM integration
3. **Phase 3**: Add Google Forms integration
4. **Phase 4**: Build admin dashboard
5. **Phase 5**: Implement monitoring and alerting
6. **Phase 6**: Load testing and optimization
7. **Phase 7**: Production deployment

### Maintenance Considerations

- Regular security updates for all dependencies
- Monitor API rate limits and costs (Biznet Gio)
- Database backup and recovery procedures
- Log rotation and archival
- Performance monitoring and optimization
- User feedback collection and iteration

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** Technical Architecture Team

For questions or updates, please contact the development team.
