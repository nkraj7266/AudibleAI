# AudibleAI Frontend

AudibleAI is a modern web application for real-time chat powered by advanced AI models. The frontend is built with React, providing a fast, responsive, and user-friendly interface for interacting with the backend AI services.

## Features

-   Real-time chat with AI responses
-   Auto-scrolling chat window for new messages
-   Beautiful, minimal UI with custom thin scrollbars
-   Modular component structure for maintainability
-   Responsive design for desktop and mobile
-   Error handling and loading indicators
-   Easy integration with backend via REST and Socket.io

## Project Structure

```
AudibleAI-frontend/
├── public/
│   ├── icons/
│   └── index.html
├── src/
│   ├── api/                   # API utilities
│   ├── components/            # Reusable UI components
│   │   └── MessageBubble.jsx
│   │   └── MessageBubble.module.css
│   │   └── TypingIndicator.jsx
│   │   └── TypingIndicator.module.css
│   ├── hooks/                 # Reusable Custom hooks
│   │   └── useChatMessages.js
│   │   └── useSessionManager.js
│   │   └── useSocket.js
│   ├── utils/                 # Utility files
│   │   └── jwt.js
│   │   └── socket.js
│   ├── views/                 # Main app views
│   │   ├── Auth/              # Auth screen and related files
│   │   |   └── Login.jsx
│   │   |   └── Login.module.css
│   │   |   └── Register.jsx
│   │   |   └── Register.module.css
│   │   ├── Chat/              # Chat screen and related files
│   │   |   └── ChatScreen.jsx
│   │   |   └── ChatScreen.module.css
│   │   └── Home/              # Home screen and related files
│   │       └── Home.jsx
│   │       └── Home.module.css
│   ├── App.jsx                # Main app component
│   ├── App.module.css         # Main app component styles
│   ├── global.css             # Global styles (scrollbar, resets, etc.)
│   └── index.js               # Entry point
├── .env.example               # Example environment variables
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

-   Node.js (v18+ recommended)
-   npm (comes with Node.js)

### Installation

1. Clone the repository:
    ```sh
    git clone <repo-url>
    cd AudibleAI-frontend
    ```
2. Install dependencies:
    ```sh
    npm install
    ```

### Running the App

Start the development server:

```sh
npm start
```

-   The app will be available at `http://localhost:3000`.
-   The development build supports hot-reloading for fast iteration.

### Building for Production

```sh
npm run build
```

-   This creates an optimized build in the `build/` directory.

## Key Components

-   **ChatScreen.jsx**: Main chat interface, handles message rendering, auto-scroll, and user input.
-   **MessageBubble.jsx**: Displays individual chat messages with styling.
-   **global.css**: Global styles including custom scrollbar.
-   **api/**: Contains functions for communicating with the backend (REST/WebSocket).

## Customization

-   Modify styles in `global.css` and component `.module.css` files.
-   Add new components in `src/components/` as needed.
-   Update API endpoints in `src/api/` to match your backend configuration.

## Best Practices

-   Use functional components and React hooks for state management.
-   Keep components small and focused.
-   Use CSS modules for scoped styles.
-   Handle errors gracefully and provide user feedback.

## Troubleshooting

-   If you see CORS errors, ensure the backend allows requests from the frontend origin.
-   For API issues, check the backend server logs and network tab in browser dev tools.
-   For styling issues, verify your CSS selectors and module imports.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a pull request

## License

MIT

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
