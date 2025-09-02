# AudibleAI Backend

AudibleAI backend is a robust Flask application providing REST and WebSocket APIs for real-time AI-powered chat. It integrates with advanced LLMs, manages user authentication, and stores chat history in PostgreSQL.

## Features

-   REST API & Socket.io for authentication and chat
-   WebSocket support for real-time messaging
-   Integration with LLM models (e.g., Gemini)
-   PostgreSQL database for persistent storage
-   Modular architecture: controllers, services, queries
-   Centralized error handling and logging (app.log, error.log)
-   JWT-based authentication
-   CORS support for frontend integration

## Project Structure

```
AudibleAI-backend/
├── components/
│   ├── llm_models/            # LLM API integration
│   │   └── gemini_flash.py
│   └── postgres/              # DB connection and queries
│       ├── postgres_conn_utils.py
│       ├── chat_queries.py
│       └── auth_queries.py
├── monolithic/
│   ├── controllers/           # API endpoints
│   │   ├── auth_controller.py
│   │   └── chat_controller.py
│   ├── services/              # Business logic
│   │   ├── auth_service.py
│   │   └── chat_service.py
│   ├── socket/                # SocketIO events/utilities
│   │   ├── events.py
│   │   └── utils.py
│   ├── utils/                 # Utility functions
│   │   └── jwt_utils.py
│   └── routes/                # Blueprints
│       ├── auth_routes.py
│       └── chat_routes.py
├── logging_config.py          # Centralized logging setup
├── server.py                  # Main app entry point
├── .env.example               # Example environment variables
├── requirements.txt           # Python dependencies
└── README.md
```

## Getting Started

### Prerequisites

-   Python 3.12
-   pip
-   PostgreSQL database

### Installation

1. Clone the repository:
    ```sh
    git clone <repo-url>
    cd AudibleAI-backend
    ```
2. Create and activate a virtual environment:
    ```sh
    python -m venv .venv
    .venv\Scripts\activate  # Windows
    source .venv/bin/activate  # Linux/Mac
    ```
3. Install dependencies:
    ```sh
    pip install -r requirements.txt
    ```
4. Set up your `.env` file:
    ```env
    PORT=5000
    JWT_SECRET=your_jwt_secret_key
    DATABASE_URL=postgresql://user:password@localhost:5432/audibleai
    LLM_API_KEY=your_llm_api_key
    ```

### Running the App

Start the Flask server:

```sh
python server.py
```

-   The backend will be available at `http://localhost:5000`.

## Key Modules

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
