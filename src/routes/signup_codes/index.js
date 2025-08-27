import { Hono } from "hono";
import { supabase } from "../../modules/supabase.js";
import { grantProductOnSignUpCode } from "../common/activate_signup_code.js";

const api = new Hono();

api.post("/test", async (c) => {
	const { user_id } = await c.req.json();

	await grantProductOnSignUpCode(user_id);

	return c.json({});
});

api.post("/register", async (c) => {
	const { user_id, signup_code } = await c.req.json();

	const { data: user } = await supabase.auth.admin.getUserById(user_id);
	if (!user.user) return c.json({});

	const { data: alreadyUsed } = await supabase
		.schema("aux")
		.from("signup_code_users")
		.select("*")
		.eq("user_id", user_id)
		.single();

	if (alreadyUsed) return c.json({ error: "User already registered a signup code" }, 400);

	const { error: insertError } = await supabase.schema("aux").from("signup_code_users").insert({
		user_id: user_id,
		signup_code: signup_code,
	});
	if (insertError) console.log(insertError);

	return c.json({});
});

export const signup_code_api = api;
