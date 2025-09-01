import { supabase } from "../../modules/supabase.js";

export async function activeBuiltFormsMembers(record) {
	const user_id = record.id;
	const email = record.email;

	const { data: isInvited } = await supabase
		.schema("builtforms")
		.from("project_members")
		.select("*")
		.eq("invited_email", email)
		.single();

	if (isInvited) {
		const { error } = await supabase
			.schema("builtforms")
			.from("project_members")
			.update({
				invited_email: null,
				user_id: user_id,
			})
			.eq("invited_email", email);
		if (error) console.log(error);
	}
}
