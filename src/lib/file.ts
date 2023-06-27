import fs from 'fs';
import path from 'path';

export const getRandomFileFromFolder = (folderPath: string): { fileName: string; fullPath: string } => {
	const files = fs.readdirSync(folderPath);

	const randomIndex = Math.floor(Math.random() * files.length);
	const randomFile = files[randomIndex];

	return { fileName: randomFile, fullPath: path.join(folderPath, randomFile) };
};
