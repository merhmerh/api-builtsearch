import { Hono } from "hono";
import { supabase } from "../../modules/supabase.js";
import { getUploadUrls } from "../../modules/r2.js";
import * as v from "valibot";

const org = new Hono();

org.get("/:org_id/r2/logo", async (c) => {
	//check if user is admin or owner of the owner
	const org_id = c.req.param("org_id");
	const { user } = c;
	const allowed = await checkRole(c, org_id, ["admin", "owner"]);
	if (!allowed) {
		return c.json({ error: { message: "Unauthorized" } }, 403);
	}

	const path = `org/${org_id}/logo`;
	const upload_urls_data = await getUploadUrls(path, "builtsearch-public");
	console.log(upload_urls_data);
	return c.json({ data: upload_urls_data });
});

org.get("/test", async (c) => {
	console.log("ok");
	return c.json({ ok: true });
});

const updateOrgSchema = v.object({
	name: v.nullish(v.string()),
	logo: v.nullish(v.string()),
});

org.put("/:org_id/profile", async (c) => {
	const { user } = c;
	const org_id = c.req.param("org_id");

	const allowed = await checkRole(c, org_id, ["admin", "owner"]);
	if (!allowed) {
		return c.json({ error: { message: "Unauthorized" } }, 403);
	}

	const body = await c.req.json();

	const { output } = v.safeParse(updateOrgSchema, body);
	if (!output) {
		return c.json({ error: { message: "Invalid body" } }, 400);
	}

	const { error } = await supabase
		.from("organizations")
		.update({
			...output,
			updated_at: new Date().toISOString(),
		})
		.eq("org_id", org_id);

	return c.json({ error });
});

org.get("/:org_id/licenses", async (c) => {
	const org_id = c.req.param("org_id");
	if (!(await isOrgMember(c, org_id))) {
		return c.json({ error: { message: "You are not a member of the organization" } }, 403);
	}

	const { data: licenses } = await supabase.from("licenses").select("*").eq("org_id", org_id);

	const grouped = Object.values(
		licenses.reduce((acc, item) => {
			const key = item.group_id;
			if (!acc[key]) {
				acc[key] = {
					group_id: key,
					org_id: item.org_id,
					product: item.product,
					start_date: item.start_date,
					end_date: item.end_date,
					reference: item.reference,
					users: [],
				};
			}
			// Check consistency on the other fields
			const group = acc[key];
			if (
				group.org_id !== item.org_id ||
				group.product !== item.product ||
				group.start_date !== item.start_date ||
				group.end_date !== item.end_date ||
				group.reference !== item.reference
			) {
				throw new Error("Inconsistent data for group_id " + key);
			}
			group.users.push(item);
			return acc;
		}, {}),
	);

	return c.json({ data: grouped });
});

org.get("/:org_id/members", async (c) => {
	const { user } = c;
	const org_id = c.req.param("org_id");
	if (!(await isOrgMember(c, org_id))) {
		return c.json({ error: { message: "You are not a member of the organization" } }, 403);
	}

	const { data: members, error } = await supabase
		.from("org_members")
		.select("*,userData:users!inner(*)")
		.eq("org_id", org_id);
	return c.json({ data: members, error });
});

//UPDATE LICENSES
org.put("/:org_id/licenses", async (c) => {
	const { user } = c;
	const org_id = c.req.param("org_id");

	const allowed = await checkRole(c, org_id, ["admin", "owner"]);
	if (!allowed) {
		return c.json({ error: { message: "Unauthorized" } }, 403);
	}

	const body = await c.req.json();
	const { group_id, delta: { add = [], remove = [] } = {} } = body;

	const { data: groupLicense } = await supabase
		.from("licenses")
		.select("*")
		.eq("group_id", group_id)
		.limit(1)
		.single();

	const product = groupLicense.product;
	const isBuiltChat = product.startsWith("builtchat");

	//guard clause to prevent over adding licenses
	if (add.length > 0) {
		const { data: group_licenses } = await supabase
			.from("licenses")
			.select("*")
			.eq("group_id", group_id)
			.eq("org_id", org_id);

		const unused_count = group_licenses.filter((l) => l.user_id === null).length;

		if (add.length - remove.length > unused_count) {
			console.log("Not enough unused licenses");
			return c.json({ error: { message: "Not enough unused licenses" } }, 400);
		}
	}

	//remove license first:
	for (const user_id of remove) {
		const { data: license, error } = await supabase
			.from("licenses")
			.update({
				user_id: null,
			})
			.select("*")
			.eq("group_id", group_id)
			.eq("user_id", user_id)
			.single();

		if (isBuiltChat) await bcRemoveLicense(user_id, license);
	}

	//get unused licenses in the group
	const { data: unused_licenses } = await supabase
		.from("licenses")
		.select("*")
		.eq("group_id", group_id)
		.eq("org_id", org_id)
		.is("user_id", null);

	const unused_license_ids = unused_licenses.map((l) => l.license_id);
	for (const user_id of add) {
		const license_id = unused_license_ids.pop();
		const { data: license, error } = await supabase
			.from("licenses")
			.update({ user_id: user_id })
			.select("*")
			.eq("license_id", license_id)
			.single();
		if (error) {
			return c.json({ error }, 400);
		}

		if (isBuiltChat) await bcAddLicense(user_id, license);
	}

	return c.json({});
});

export default org;

async function bcRemoveLicense(user_id, license) {
	await supabase
		.schema("builtchat")
		.from("users")
		.update({
			plan: "free",
			license_id: null,
		})
		.eq("user_id", user_id);

	//get credits row
	const { data: credits } = await supabase
		.schema("builtchat")
		.from("credits")
		.select("*")
		.eq("user_id", user_id)
		.single();

	delete credits.user_id;
	delete credits.free_standard;

	//store credits to metadata field inside license
	const metadata = license.metadata || {};
	metadata.credits = credits;

	await supabase.from("licenses").update({ metadata }).eq("license_id", license.license_id);

	//	reset to free plan
	const newCredits = {
		monthly_standard: null,
		monthly_advanced: null,
		monthly_image_gen: null,
		last_reset_date: null,
		next_reset_date: null,
		manual_end_date: null,
		reference: null,
	};

	await supabase.schema("builtchat").from("credits").update(newCredits).eq("user_id", user_id);
}

async function bcAddLicense(user_id, license) {
	const plan = license.product.replace("builtchat-", "");

	await supabase
		.schema("builtchat")
		.from("users")
		.update({
			plan: plan,
			license_id: license.license_id,
		})
		.eq("user_id", user_id);

	const extgCredits = license.metadata?.credits || {};
	//remove these key to avoid conflicts
	delete extgCredits.user_id;
	delete extgCredits.free_standard;

	const credits = {
		monthly_standard: plan === "lite" ? 1500 : 500,
		monthly_advanced: plan === "pro" ? 500 : 100,
		monthly_image_gen: plan === "pro" ? 100 : 30,
		last_reset_date: new Date().toISOString(),
		next_reset_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
		manual_end_date: license.end_date,
		...extgCredits,
	};

	await supabase.schema("builtchat").from("credits").update(credits).eq("user_id", user_id);

	//clear license metadata
	if (license.metadata?.credits) {
		delete license.metadata.credits;
		await supabase
			.from("licenses")
			.update({ metadata: license.metadata })
			.eq("license_id", license.license_id);
	}
}

async function checkRole(c, org_id, allowedRoles = []) {
	const { user, admin } = c;
	if (admin) return true;

	if (allowedRoles.length === 0) {
		return false;
	}

	//get user role in org
	const { data, error } = await supabase
		.from("org_members")
		.select("user_id, org_roles!inner(*)")
		.eq("org_id", org_id)
		.eq("user_id", user.id)
		.single();

	const userRole = data?.org_roles?.role_key;

	if (allowedRoles.includes(userRole)) {
		return true;
	}

	return false;
}

async function isOrgMember(c, org_id) {
	const { user, admin } = c;

	if (admin) return true;

	const { data, error } = await supabase
		.from("org_members")
		.select("id")
		.eq("org_id", org_id)
		.eq("user_id", user.id)
		.single();

	if (!data || error) {
		return false;
	}

	return true;
}
