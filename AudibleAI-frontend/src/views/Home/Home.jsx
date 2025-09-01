import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";

const Home = () => {
	const navigate = useNavigate();
	return (
		<div className={styles.homeContainer}>
			<h1>Welcome to AudibleAI</h1>
			<p>
				Experience real-time AI chat with voice read-aloud and
				synchronized text highlighting. Start a conversation and let
				AudibleAI read responses to you!
			</p>
			<button
				className={styles.startBtn}
				onClick={() => navigate("/chat")}
			>
				Start Chat
			</button>
		</div>
	);
};

export default Home;
