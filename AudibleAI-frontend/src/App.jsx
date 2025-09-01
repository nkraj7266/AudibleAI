import { useEffect, useState } from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";
import Login from "./views/Auth/Login";
import Register from "./views/Auth/Register";
import ChatScreen from "./views/Chat/ChatScreen";
import Home from "./views/Home/Home";
import styles from "./App.module.css";
import "./global.css";

const App = () => {
	const [jwt, setJwt] = useState(localStorage.getItem("jwt"));

	useEffect(() => {
		const handleStorage = () => setJwt(localStorage.getItem("jwt"));
		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);

	return (
		<div className={styles.appContainer}>
			<Router>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route
						path="/login"
						element={
							jwt ? (
								<Navigate to="/chat" />
							) : (
								<Login setJwt={setJwt} />
							)
						}
					/>
					<Route
						path="/register"
						element={
							jwt ? (
								<Navigate to="/chat" />
							) : (
								<Register setJwt={setJwt} />
							)
						}
					/>
					<Route
						path="/chat"
						element={
							jwt ? (
								<ChatScreen jwt={jwt} />
							) : (
								<Navigate to="/login" />
							)
						}
					/>
					<Route
						path="*"
						element={<Navigate to={jwt ? "/chat" : "/login"} />}
					/>
				</Routes>
			</Router>
		</div>
	);
};

export default App;
