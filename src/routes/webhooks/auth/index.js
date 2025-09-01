import { Hono } from "hono";
import { grantProductOnSignUpCode } from "../../common/activate_signup_code.js";
import { activeBuiltFormsMembers } from "../../common/active_builtforms_members.js";
import { env } from "hono/adapter";

const hook = new Hono();

hook.post("/user-updated", async (c) => {
	const authorization_header = c.req.header("authorization");
	const { SUPABASE_SECRET_KEY } = env(c);
	if (authorization_header !== SUPABASE_SECRET_KEY) {
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
