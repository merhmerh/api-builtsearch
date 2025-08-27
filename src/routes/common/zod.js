import dayjs from "dayjs";
import z from "zod";

export const z_dayjs = z.string().superRefine((val, ctx) => {
	if (!dayjs(val, true).isValid()) {
		ctx.addIssue({
			code: "invalid_type",
			message: "Invalid date format",
		});
	}
});
