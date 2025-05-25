import * as vscode from 'vscode';
import ollama from 'ollama';
import { awaitTaskResult } from '../helpers/awaitTaskResult';

const generateAndReplaceCode = async (model: string, testFileExtension: string, codeGeneratedList: string[]) => {
    const testDoc = await Promise.all(vscode.window.visibleTextEditors.filter(doc => doc.document.fileName.endsWith(testFileExtension)).map(async (doc) => doc.document.getText()));
	const codeDoc = await Promise.all(vscode.window.visibleTextEditors.filter(doc => !doc.document.fileName.endsWith(testFileExtension)).map(async (doc) => doc.document.getText()));

	const response = await ollama.generate({
		model,
		prompt: `you are a code completion assistant that is an expert in TDD doing ping pong, you will not explain only provide code. 
            based on the next test specification:
            ´´´
            ${testDoc}
            ´´´
            you will create production level minimal code to pass them modifiing the next content:
            ´´´
            ${codeDoc}
            ´´´
            this is a list of previous solutions to avoid:
            ${codeGeneratedList.reduce((acc, value) => `${acc}
            ---
            ´´´
            ${value}
            ´´´`,"")}
			`,
	});
	const regex = /`{3}[\w]*\n([\S\s]+?)\n`{3}/gm;
	const codeGenerated: string = regex.exec(response.response)?.[1] || "";
	await vscode.window.visibleTextEditors.filter(doc => !doc.document.fileName.endsWith(testFileExtension))[0].edit(editBuilder => editBuilder.replace(
		new vscode.Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE),
		codeGenerated));
    return codeGenerated
}

const didPassTest = async (testCommand: string) =>{
    try {
        vscode.tasks.executeTask(new vscode.Task(
            { type: 'shell' },
            vscode.TaskScope.Workspace,
            "test",
            "run test",
            new vscode.ShellExecution(testCommand)));
        const result = await awaitTaskResult("test", 60000);
        return true
    } catch (error) {
        return false
    }
}

export async function createCodeFromTest(model: string, testFileExtension: string, testCommand: string) {
    let next = 'yes';
    const codeGeneratedList = []
    while (next === 'yes') {
        const codeGenerated = await generateAndReplaceCode(model, testFileExtension, codeGeneratedList)
        codeGeneratedList.push(codeGenerated)
        if(await didPassTest(testCommand))
            break;
        next = await vscode.window.showQuickPick(['yes','no'], {
		    placeHolder: 'Get Next Answer'
	    }) as string;
    }
}