import "dotenv/config";
import { Hono } from "hono";
import route from "./routes.js";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { auth_webhook } from "./routes/webhooks/auth/index.js";

const mode = process.env.NODE_ENV || "dev";
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

if (mode === "dev") {
	serve(app, (info) => {
		console.log(`Server is running on http://localhost:3000, in ${process.env.NODE_ENV} mode`);
	});
}

export default app;
