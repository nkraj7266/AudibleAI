# AudibleAI - Text-to-Speech Chat Platform

AudibleAI is a real-time, voice-enabled chat platform powered by advanced AI models. It features text-to-speech capabilities, allowing users to both read and listen to AI responses. Built with React (frontend) and Flask (backend), it provides a seamless, interactive chat experience.

## Key Features

### Chat Functionality

-   Real-time chat with AI responses using Socket.io
-   Streaming AI responses for instant feedback
-   Chat session management (create, rename, delete)
-   Chat history persistence
-   Message streaming with typing indicators
-   Automatic session title generation
-   Multi-session support

### Audio Capabilities

-   Real-time text-to-speech conversion
-   Audio chunk streaming for faster playback
-   Audio message caching for better performance
-   Global playback mode for continuous listening
-   Playback controls (play, stop)
-   Sentence-level audio highlighting

### User Interface

-   Responsive design for all devices
-   Beautiful, minimal UI
-   Auto-scrolling chat window
-   Sidebar for chat session management
-   Loading indicators and error handling
-   Welcome message for new users
-   Clean and intuitive message bubbles

### Authentication & Security

-   JWT-based authentication
-   Secure socket connections
-   Protected API endpoints
-   User session management

## Technical Architecture

### Frontend (`AudibleAI-frontend/`)

```plaintext
src/
├── api/                 # API utilities
├── components/          # Reusable UI components
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
└── views/               # Main app views
    ├── Auth/            # Authentication screens
    ├── Chat/            # Main chat interface
    └── Home/            # Home screen
```

### Backend (`AudibleAI-backend/`)

```plaintext
├── components/         # Core components
│   ├── llm_models/     # LLM integration
│   ├── postgres/       # Database layer
│   └── tts/            # Text-to-speech service
├── monolithic/         # Main application
│   ├── routes/         # API routes
│   ├── controllers/    # API controllers
│   ├── services/       # Business logic
│   ├── socket/         # Socket handlers
│   └── utils/          # Utility functions
└── logging_config.py   # Logging configuration
```

## API Documentation

### REST Endpoints

#### Authentication

-   `POST /auth/register`

    -   Register new user
    -   Body: `{ "email": string, "password": string }`

-   `POST /auth/login`
    -   Login user
    -   Body: `{ "email": string, "password": string }`
    -   Returns: `{ "token": string }`

#### Chat Sessions

-   `GET /sessions`

    -   Get all user sessions
    -   Headers: `Authorization: Bearer <token>`

-   `POST /sessions`

    -   Create new chat session
    -   Headers: `Authorization: Bearer <token>`
    -   Body: `{ "title": string }`

-   `PUT /sessions/:sessionId`

    -   Update session title
    -   Headers: `Authorization: Bearer <token>`
    -   Body: `{ "title": string }`

-   `DELETE /sessions/:sessionId`
    -   Delete chat session
    -   Headers: `Authorization: Bearer <token>`

#### Messages

-   `GET /sessions/:sessionId/messages`

    -   Get all messages in a session
    -   Headers: `Authorization: Bearer <token>`

-   `POST /sessions/:sessionId/messages`
    -   Send a message
    -   Headers: `Authorization: Bearer <token>`
    -   Body: `{ "text": string }`

### Socket Events

#### Client → Server

-   `user:join`

    -   Join user's room
    -   Payload: `{ user_id: string }`

-   `user:message`

    -   Send user message
    -   Payload: `{ session_id: string, user_id: string, text: string, is_first_message?: boolean }`

-   `tts:start`

    -   Start TTS generation
    -   Payload: `{ messageId: string, text: string, userId: string, voice?: string, speakingRate?: number, pitch?: number }`

-   `tts:stop`
    -   Stop TTS playback
    -   Payload: `{ messageId: string, userId: string }`

#### Server → Client

-   `ai:response:chunk`

    -   Streaming AI response chunk
    -   Payload: `{ session_id: string, chunk: string }`

-   `ai:response:end`

    -   Complete AI response
    -   Payload: `{ session_id: string, message: { id: string, text: string, sender: "AI" } }`

-   `tts:audio`

    -   Audio chunk
    -   Payload: `{ messageId: string, bytes: string, chunkSeq: number, isLast: boolean }`

-   `tts:ready`

    -   TTS generation complete
    -   Payload: `{ messageId: string, duration?: number }`

-   `tts:error`

    -   TTS error
    -   Payload: `{ messageId: string, code: string, message: string }`

-   `tts:stopped`

    -   TTS playback stopped
    -   Payload: `{ messageId: string, reason: string }`

-   `session:title:update`
    -   Session title updated
    -   Payload: `{ session_id: string, title: string }

## Getting Started

### Prerequisites

-   Node.js (v18+ recommended)
-   Python 3.12+
-   PostgreSQL database
-   npm/pip package managers

### Frontend Setup

1. Clone repository and navigate to frontend:

    ```bash
    git clone <repo-url>
    cd AudibleAI-frontend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Set up environment variables:

    ```plaintext
    REACT_APP_API_URL=http://localhost:5000
    REACT_APP_SOCKET_URL=http://localhost:5000
    ```

4. Start development server:

    ```bash
    npm start
    ```

### Backend Setup

1. Navigate to backend directory:

    ```bash
    cd AudibleAI-backend
    ```

2. Create and activate virtual environment:

    ```bash
    python -m venv .venv
    # Windows
    .venv\Scripts\activate
    # Linux/Mac
    source .venv/bin/activate
    ```

3. Install dependencies:

    ```bash
    pip install -r requirements.txt
    ```

4. Set up environment variables:

    ```plaintext
    PORT=5000
    JWT_SECRET=your_jwt_secret_key
    DATABASE_URL=postgresql://user:password@localhost:5432/audibleai
    LLM_API_KEY=your_llm_api_key
    TTS_API_KEY=your_text_to_speech_api_key
    STREAM_DELAY=0.5
    ```

5. Start the server:

    ```bash
    python server.py
    or
    flask --app server run
    ```

## Key Backend Modules

-   **server.py**: Main entry, initializes app, DB, blueprints, SocketIO, error handling.
-   **logging_config.py**: Sets up app and error loggers with file name in log format.
-   **controllers/**: API endpoints for authentication and chat.
-   **services/**: Business logic for user and chat management.
-   **postgres/**: Database connection and query modules.
-   **llm_models/**: Integration with LLM APIs.
-   **socket/**: Real-time event handlers and utilities.
-   **utils/**: JWT and other helpers.

## Logging

-   All logs are written to `logs/app.log` (info, debug, warning, error).
-   Errors are also written to `logs/error.log`.
-   Log format includes timestamp, level, logger name, file name, and message.

## API Endpoints

-   `/auth/register` - Register new user
-   `/auth/login` - Login and get JWT
-   `/session/<sessionId>/messages` - Get all messages of a session
-   `/session` - Get chat history
-   Socket.io: Real-time chat events

## Troubleshooting

-   Check `app.log` and `error.log` for issues
-   Ensure `.env` variables are set correctly
-   Verify PostgreSQL is running and accessible
-   For CORS issues, check frontend/backend origins

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a pull request

## License

MIT
