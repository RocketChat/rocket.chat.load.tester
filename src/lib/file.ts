import fs from 'fs';

type FileInformation = {
	fileName: string;
	fileSize: number;
	fileContent: Buffer;
	filePath: string;
};

export const getRandomFileInFolder = (folderPath: string): FileInformation => {
	const files = fs.readdirSync(folderPath);

	const randomIndex = Math.floor(Math.random() * files.length);
	const randomFile = files[randomIndex];

	const filePath = `${folderPath}/${randomFile}`;
	const fileContent = fs.readFileSync(filePath);

	return {
		fileName: randomFile,
		fileSize: fileContent.length,
		fileContent,
		filePath,
	};
};
