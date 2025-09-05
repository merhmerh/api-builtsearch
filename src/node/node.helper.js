import fs from "fs";

export function readFile(path, outputFormat) {
	const file = fs.readFileSync(path, "utf8");

	if (outputFormat == "json" || path.endsWith(".json")) {
		return JSON.parse(file);
	}

	return file;
}

export function writeFile(path, data) {
	if (path.endsWith(".json")) {
		const file = JSON.stringify(data, null, 2);

		fs.writeFileSync(path, file);
	} else {
		fs.writeFileSync(path, data);
	}
}
