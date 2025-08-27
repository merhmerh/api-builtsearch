import boxen from "boxen";
import chalk from "chalk";
import { v4 as uuidv4, v7 as uuidv7 } from "uuid";
import { customAlphabet } from "nanoid";

const dev = process.env.NODE_ENV == "dev";

export { uuidv4, uuidv7 };

/**
 * Truncates a string by words or characters and appends an ellipsis if needed.
 *
 * @param {string} str - The string to truncate.
 * @param {Object} [options] - Truncation options.
 * @param {number} [options.length=100] - Maximum length (words or characters).
 * @param {string} [options.ellipsis=" ..."] - Ellipsis to append after truncation.
 * @param {boolean} [options.byCharacters=false] - If true, truncate by characters; otherwise, by words.
 * @returns {string} The truncated string.
 */
export function truncateString(str, { length = 50, ellipsis = " ...", byCharacters = false } = {}) {
	if (!str) return "";

	let words = str.split(" ");
	if (!byCharacters) {
		if (str.length <= length) return str;

		return words.slice(0, length).join(" ") + ellipsis;
	} else {
		if (str.length <= length) return str;

		let charCount = 0;
		let index = 0;

		for (const word of words) {
			const space = index > 0 ? 1 : 0;
			if (charCount + word.length + space > length) break; // +1 accounts for spaces
			charCount += word.length + space; // Count word + space
			index++;
		}

		if (!index) {
			return words[0] + ellipsis;
		}

		if (charCount > length) index--;

		return words.slice(0, index - 1).join(" ") + ellipsis;
	}
}

export function returnNullIfEmptyArray(arr) {
	if (arr.length === 0) {
		return null;
	}
	return arr;
}

export function removeNulls(obj) {
	if (obj == null || typeof obj !== "object") return obj;

	const result = Array.isArray(obj) ? [] : {};

	for (const [key, value] of Object.entries(obj)) {
		if (value == null) continue;

		if (typeof value === "object") {
			const cleaned = removeNulls(value);
			if (cleaned !== null) {
				result[key] = cleaned;
			}
		} else {
			result[key] = value;
		}
	}

	return Object.keys(result).length === 0 ? null : result;
}

export function createPrint() {
	function basePrint(style, ...msg) {
		let fn = chalk;
		if (style && style.includes(".")) {
			for (const s of style.split(".")) {
				fn = fn[s];
			}
		} else if (style && fn[style]) {
			fn = fn[style];
		}
		console.log(fn(msg.join(" ")));
	}

	basePrint.warn = (...msg) => basePrint("yellow.bold", ...msg);
	basePrint.info = (...msg) => basePrint("cyan", ...msg);
	basePrint.error = (...msg) => basePrint("red.bold", ...msg);
	basePrint.ok = (...msg) => basePrint("green", ...msg);
	basePrint.debug = (...msg) => basePrint("gray", ...msg);

	return basePrint;
}

export function print(...args) {
	console.log(...args);
}

export function printText(title = "", text) {
	if (!dev) {
		return console.log(chalk.green(title) + ":\n", text);
	}
	const boxOptions = {
		title: chalk.blue.bold(title),
		titleAlignment: "center",
		padding: 0.5,
		borderStyle: "round",
		borderColor: "magenta",
	};

	console.log(boxen(text, boxOptions));
}

export function printBlock(title = "", obj) {
	if (!dev) {
		return console.log(chalk.green(title) + ":\n", obj);
	}

	if (typeof obj !== "object" || obj === null) {
		throw new Error("printBlock: Second argument must be an object.");
	}

	const lines = Object.entries(obj).flatMap(([k, v]) => {
		if (typeof v === "object" && v !== null) {
			const pretty = JSON.stringify(v, null, 2).split("\n");
			// First line: key + colon + first '{'
			return [
				`${chalk.cyanBright(k)}: ${chalk.yellow(pretty[0])}`,
				...pretty.slice(1).map((line) => "⠀" + chalk.yellow(line)), // 2 spaces indent
			];
		} else {
			return [`${chalk.cyanBright(k)}: ${chalk.yellow(String(v))}`];
		}
	});

	const boxOptions = {
		title: chalk.blue.bold(title),
		titleAlignment: "center",
		padding: 0.5,
		borderStyle: "round",
		borderColor: "magenta",
	};

	console.log(boxen(lines.join("\n"), boxOptions));
}

/**
 * Generates a random alphanumeric ID using nanoid with an optional prefix.
 *
 * @param {number} [length=24] - The length of the generated ID. Default is 24 characters.
 * @param {string} [prefix=""] - An optional prefix to add before the generated ID. If provided, a dash will separate the prefix and the ID.
 * @returns {string} - A unique ID consisting of alphanumeric characters, optionally prefixed.
 */
export function genId(length = 24, prefix = "") {
	const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	if (typeof length !== "number" || length <= 0) {
		length = 24;
	}
	const random = customAlphabet(alphabet, length);

	if (prefix) return prefix + "-" + random();
	return random();
}
