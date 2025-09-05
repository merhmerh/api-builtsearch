import { supabase } from "../../modules/supabase.js";
import { readFile, writeFile } from "../node.helper.js";

const allUsers = readFile("src/node/delete-fake-users/all-users.json");

const statsWithList = [
	"ycentertainmentgroup+",
	"yan.paingoo+",
	"shivang+",
	"jerika+",
	"jacob+",
	"duke+",
	"brc+",
	"mariahgeller276+",
	"99zarniswe+",
	"thazinphyomkn+",
	"yanpaingoo022+",
	"mariah27613+",
	"aungkoswe96+",
	"bevs+",
	"beverlyn+",
	"yan.paing00+",
	"bevsrivera.c+",
];

const toDelete = [];
for (const item of allUsers) {
	const email = item.email;

	if (statsWithList.some((stat) => email.startsWith(stat))) {
		toDelete.push(item.id);
		// await supabase.auth.admin.deleteUser(item.id);
	}
}

console.log("toDelete", toDelete.length);
