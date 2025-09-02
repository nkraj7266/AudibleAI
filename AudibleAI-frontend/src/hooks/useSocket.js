import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function useSocket(url, options = {}) {
	const socketRef = useRef(null);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		socketRef.current = io(url, options);
		socketRef.current.on("connect", () => setIsConnected(true));
		socketRef.current.on("disconnect", () => setIsConnected(false));
		return () => {
			socketRef.current.disconnect();
		};
	}, [url]);

	const emit = (event, data) => {
		socketRef.current.emit(event, data);
	};

	const on = (event, handler) => {
		socketRef.current.on(event, handler);
	};

	const off = (event, handler) => {
		socketRef.current.off(event, handler);
	};

	return { socket: socketRef.current, isConnected, emit, on, off };
}
