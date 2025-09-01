import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Register.module.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Register = ({ setJwt }) => {
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
			const res = await fetch(`${API_URL}/auth/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const data = await res.json();
			if (res.ok && data.token) {
				localStorage.setItem("jwt", data.token);
				navigate("/chat");
			} else {
				setError(data.error || "Registration failed");
			}
		} catch (err) {
			setError("Network error");
		}
		setLoading(false);
	};

	return (
		<div className={styles.registerContainer}>
			<form className={styles.form} onSubmit={handleSubmit}>
				<h2>Register</h2>
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
					{loading ? "Registering..." : "Register"}
				</button>
				<div className={styles.switchText}>
					Already have an account?{" "}
					<span onClick={() => navigate("/login")}>Login</span>
				</div>
			</form>
		</div>
	);
};

export default Register;
