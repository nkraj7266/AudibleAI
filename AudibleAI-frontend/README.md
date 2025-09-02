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
