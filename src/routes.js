import { Hono } from "hono";
import { signup_code_api } from "./routes/signup_codes/index.js";

const route = new Hono();

route.route("/signup_codes", signup_code_api);

export default route;
