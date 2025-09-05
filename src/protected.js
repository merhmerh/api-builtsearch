import { Hono } from "hono";
import { supabase } from "./modules/supabase.js";
import org from "./routes/org/index.js";

const secured = new Hono();
const admin = new Hono();

secured.use("/*", async (c, next) => {
	const authHeader = c.req.header("authorization");
	if (!authHeader) {
		return c.json({ error: "No authorization provided" }, 401);
	}

	const token = authHeader.split(" ")[1];
	const { data, error } = await supabase.auth.getUser(token);
	if (!data || error) {
		return c.json({ error: "Invalid token" }, 401);
	}
	c.user = data.user;
	await next();
});

admin.use("/*", async (c, next) => {
	const authHeader = c.req.header("authorization");
	if (!authHeader) return c.json({ error: "No authorization provided" }, 401);

	const token = authHeader.split(" ")[1];
	const { data, error } = await supabase.auth.getUser(token);

	const { data: role } = await supabase
		.from("admin_roles")
		.select("*")
		.eq("user_id", data.user.id)
		.single();

	if (role && role?.super_admin) {
		c.admin = data.user;
		await next();
	}

	return c.json({ error: "Unauthorized" }, 403);
});

admin.route("/*", org);
secured.route("/org", org);

export { admin, secured };
