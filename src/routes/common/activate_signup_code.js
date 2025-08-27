import dayjs from "dayjs";
import { supabase } from "../../modules/supabase.js";
import { genId, printBlock } from "../../modules/helper.js";
import z from "zod";
import { z_dayjs } from "./zod.js";

export async function grantProductOnSignUpCode(user_id) {
	const { data: signupCodeData, error } = await supabase
		.schema("aux")
		.from("signup_code_users")
		.select("*, signup_codes!inner(*)")
		.eq("user_id", user_id)
		.eq("applied", false);

	for (const item of signupCodeData) {
		const product = item.signup_codes.product;

		const ref = item.signup_codes.license_prefix + ":" + genId(8);

		const licenseData = {
			user_id,
			product,
			start_date: dayjs().toISOString(),
			duration: item.signup_codes.duration,
			reference: ref,
		};

		const { error } = await createSingleLicense(licenseData);
		console.log("Error Creating License", error);
	}
}

const z_licenseData = z.object({
	user_id: z.uuid(),
	product: z.enum(["iv", "builtchat-pro", "builtchat-lite", "specs-m&e"]),
	start_date: z_dayjs,
	duration: z.number().min(1),
	reference: z.string(),
});

export async function createSingleLicense(rawLicenseData) {
	const parsed = z_licenseData.safeParse(rawLicenseData);
	if (parsed.error) {
		const errorMessage = JSON.parse(parsed.error.message);

		return {
			error: {
				name: "ValidationError",
				message: "Some fields are invalid.",
				validationErrors: errorMessage,
			},
		};
	}

	const { user_id, product, start_date, duration, reference } = parsed.data;

	const end_date = dayjs(start_date).add(duration, "day").toISOString();

	const insertLicenseData = {
		owner_type: "user",
		user_id: user_id,
		product: product,
		start_date: start_date,
		end_date: end_date,
		seat_limit: 1,
		reference: reference,
	};

	if (product.includes("builtchat")) {
		const cycle_end_date =
			duration < 30 ? end_date : dayjs(start_date).add(1, "month").toISOString();
		insertLicenseData.cycle_end_date = cycle_end_date;
	}

	const { data: licenseData, error: insertError } = await supabase
		.schema("public")
		.from("licenses")
		.insert(insertLicenseData)
		.select()
		.single();
	if (insertError) return { error: insertError };

	if (product.includes("builtchat")) {
		const plan = product === "builtchat-lite" ? "lite" : "pro";
		await addBuiltChatLicense([user_id], licenseData, plan);
	}

	await supabase
		.schema("aux")
		.from("signup_code_users")
		.update({
			applied: true,
		})
		.eq("user_id", user_id);

	return {};
}

async function addBuiltChatLicense(toAddUserIds, license, plan) {
	for (const user_id of toAddUserIds) {
		await supabase
			.schema("builtchat")
			.rpc("create_or_get_user", {
				p_user_id: user_id,
			})
			.single();
	}

	const { error: chatError } = await supabase
		.schema("builtchat")
		.from("users")
		.update({
			license_id: license.license_id,
			plan: plan,
		})
		.in("user_id", toAddUserIds);

	const limits = {
		monthly_standard: license.product === "builtchat-lite" ? 500 : 1500,
		monthly_advanced: license.product === "builtchat-lite" ? 100 : 500,
		monthly_image_gen: license.product === "builtchat-lite" ? 30 : 100,
	};

	const { error: updateError } = await supabase
		.schema("builtchat")
		.from("credits")
		.update({
			...limits,
			last_reset_date: dayjs().toISOString(),
			next_reset_date: license.cycle_end_date,
			reference: license.license_id,
		})
		.in("user_id", toAddUserIds);

	if (chatError || updateError) {
		console.log(chatError || updateError);
	}
}
