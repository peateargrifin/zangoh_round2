# Architecture

Standalone copy of the diagrams in README.MD. Mermaid renders on GitHub / GitLab / VS Code preview.

## System architecture

```mermaid
flowchart TB
  subgraph Browser["Supervisor browser - React 18, Chakra UI"]
    REST["REST client<br/>axios"]
    WSC["WebSocket client<br/>live events, auto-reconnect"]
  end

  subgraph Backend["Node.js backend - Express + ws"]
    API["REST API<br/>conversations, agents, intervene,<br/>templates, presets, analytics, ai"]
    HUB["WebSocket hub<br/>broadcast to every client"]
    AI["AI agent service<br/>agent config -> prompt -> reply"]
    SIM["Traffic simulator<br/>customers + AI replies"]
  end

  DB[("MongoDB<br/>conversations, agents, templates,<br/>presets, knowledge bases")]
  LLM["Gemini API<br/>(mock LLM if no key)"]

  REST -->|HTTP| API
  HUB -.->|push| WSC
  API -->|broadcast| HUB
  API --> DB
  API --> AI
  SIM --> AI
  SIM -.->|broadcast| HUB
  AI --> DB
  AI --> LLM
```

## Sequence: take over, reply, hand back, AI turn

```mermaid
sequenceDiagram
  autonumber
  participant UI as Supervisor (React)
  participant API as Express API
  participant DB as MongoDB
  participant WS as WebSocket hub
  participant AI as AI agent (Gemini / mock)

  Note over UI,WS: Take over
  UI->>API: POST /api/intervene
  API->>DB: humanIntervention.active = true, status = escalated
  API->>WS: broadcast conversation_update
  WS-->>UI: push to every open tab

  Note over UI,WS: Reply (optionally from a template)
  UI->>API: POST /api/conversations/:id/messages
  API->>DB: save message
  API->>WS: broadcast message_update
  WS-->>UI: push to every open tab

  Note over UI,WS: Hand back with notes
  UI->>API: POST /api/intervene/release {supervisorNotes}
  API->>DB: active = false, save notes
  API->>WS: broadcast conversation_update
  WS-->>UI: push to every open tab

  Note over API,AI: AI turn (next customer message)
  API->>AI: replyToConversation(id)
  AI->>DB: read agent config + supervisor notes
  AI->>AI: call Gemini (falls back to mock LLM)
  AI->>DB: save reply, update metrics + alert level
  AI->>WS: broadcast message_update + metrics_update
  WS-->>UI: reply appears
```

A conversation under human control is never answered by the AI: `replyToConversation` refuses (409) while
`humanIntervention.active` is true, including when a supervisor takes over while a reply is being generated.
