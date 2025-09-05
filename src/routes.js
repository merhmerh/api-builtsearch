import { Hono } from "hono";
import { signup_code_api } from "./routes/signup_codes/index.js";
import { secured, admin } from "./protected.js";

const route = new Hono();

route.route("/signup_codes", signup_code_api);

route.route("/admin", admin);
route.route("/", secured);

export default route;
