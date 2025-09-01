import { Hono } from "hono";
import { grantProductOnSignUpCode } from "../../common/activate_signup_code.js";
import { activeBuiltFormsMembers } from "../../common/active_builtforms_members.js";

const DB_SECRET = process.env.SUPABASE_SECRET_KEY;
const hook = new Hono();

hook.post("/user-updated", async (c) => {
	const authorization_header = c.req.header("authorization");

	console.log(authorization_header, DB_SECRET);
	if (authorization_header !== DB_SECRET) {
		console.log("Unauthorized request to auth webhook");
		return c.json({ error: "Unauthorized" }, 401);
	}

	const data = await c.req.json();

	console.log("webhook received: user-updated");
	const { record, old_record } = data;
	if (old_record.email_confirmed_at === null && record.email_confirmed_at !== null) {
		console.log("User confirmed email");
		await grantProductOnSignUpCode(record.id);
		await activeBuiltFormsMembers(record);
	}

	return c.json({ received: true });
});

export const auth_webhook = hook;

// api.builtsearch.com
