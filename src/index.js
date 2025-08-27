import { Hono } from "hono";
import route from "./routes.js";
import { cors } from "hono/cors";
import { auth_webhook } from "./routes/webhooks/auth/index.js";

const app = new Hono();

const allowedDomains = ["http://localhost:5173", "https://builtchat.io"];

app.use(
	"*",
	cors({
		origin: [...allowedDomains],
	}),
);

app.get("/", (c) => {
	return c.text("BuiltSearch API ❤️‍🔥");
});

app.route("/", route);
app.route("/webhooks/auth", auth_webhook);

export default app;
