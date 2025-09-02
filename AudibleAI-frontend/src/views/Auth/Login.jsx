import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import { loginUser } from "../../api/auth";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Login = ({ setJwt }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		try {
			const data = await loginUser(email, password);
			if (data.ok && data.token) {
				localStorage.setItem("jwt", data.token);
				setJwt(data.token);
				navigate("/chat");
			} else {
				setError(data.error || "Login failed");
			}
		} catch (err) {
			setError("Network error");
		}
		setLoading(false);
	};

	return (
		<div className={styles.loginContainer}>
			<form className={styles.form} onSubmit={handleSubmit}>
				<h2>Login</h2>
				<input
					type="email"
					placeholder="Email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>
				<input
					type="password"
					placeholder="Password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
				{error && <div className={styles.error}>{error}</div>}
				<button type="submit" disabled={loading}>
					{loading ? "Logging in..." : "Login"}
				</button>
				<div className={styles.switchText}>
					Don't have an account?{" "}
					<span onClick={() => navigate("/register")}>Register</span>
				</div>
			</form>
		</div>
	);
};

export default Login;
