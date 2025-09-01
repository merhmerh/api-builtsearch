import { Hono } from "hono";
import { grantProductOnSignUpCode } from "../../common/activate_signup_code.js";
import { activeBuiltFormsMembers } from "../../common/active_builtforms_members.js";

const hook = new Hono();

hook.post("/user-updated", async (c) => {
	const data = await c.req.json();

	const { record, old_record } = data;

	if (old_record.email_confirmed_at === null && record.email_confirmed_at !== null) {
		console.log("User confirmed email");
		await grantProductOnSignUpCode(record.id);
		await activeBuiltFormsMembers(record);
	}

	return c.json({ received: true });
});

export const auth_webhook = hook;
