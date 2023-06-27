import fs from 'fs';
import path from 'path';

type FileInformation = {
	fileName: string;
	fileSize: number;
	fileContent: Buffer;
	filePath: string;
};

export const getRandomFileFromFolder = (folderPath: string): { fileName: string; fullPath: string } => {
	const files = fs.readdirSync(folderPath);

	const randomIndex = Math.floor(Math.random() * files.length);
	const randomFile = files[randomIndex];

	return { fileName: randomFile, fullPath: path.join(folderPath, randomFile) };
};

export const getRandomFileInFolder = (folderPath: string): FileInformation => {
	const { fileName, fullPath } = getRandomFileFromFolder(folderPath);

	const fileContent = fs.readFileSync(fullPath);

	return {
		fileName,
		fileSize: fileContent.length,
		fileContent,
		filePath: fullPath,
	};
};
