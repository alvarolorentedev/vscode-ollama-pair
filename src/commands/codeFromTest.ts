import * as vscode from 'vscode';
import ollama from 'ollama';
import { awaitTaskResult } from '../helpers/awaitTaskResult';
import { error } from 'console';

const generateAndReplaceCode = async (testDoc: vscode.TextEditor, codeDoc: vscode.TextEditor, model: string, codeGeneratedList: any[]) => {
	const response = await ollama.generate({
		model,
		prompt: `you are a code completion assistant that is an expert in TDD doing ping pong, you will not explain only provide code. 
            based on the next test specification:
            ´´´
            ${testDoc.document.getText()}
            ´´´
            you will create production level minimal code to pass them modifiing the next content:
            ´´´
            ${codeDoc.document.getText()}
            ´´´
            this is a list of previous solutions to avoid:
            ${codeGeneratedList.reduce((acc, value) => `${acc}
            ---
            code
            ´´´
            ${value.code}
            ´´´
            error
            ´´´
            ${value.error}
            ´´´
            `,"")}
			`,
	});
	const regex = /`{3}[\w]*\n([\S\s]+?)\n`{3}/gm;
	const codeGenerated: string = regex.exec(response.response)?.[1] || "";
	await codeDoc.edit(editBuilder => editBuilder.replace(
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
        return {result: true}
    } catch (error) {
        return {result: false, error}
    }
}

export async function createCodeFromTest(model: string, testFileExtension: string, testCommand: string) {
    let next = 'yes';
    const codeGeneratedList : any[] = []
    const testDoc = await Promise.all(vscode.window.visibleTextEditors.filter(doc => doc.document.fileName.endsWith(testFileExtension)));
	const codeDoc = await Promise.all(vscode.window.visibleTextEditors.filter(doc => !doc.document.fileName.endsWith(testFileExtension)));

    while (next === 'yes') {
        const codeGenerated = await generateAndReplaceCode(testDoc[0], codeDoc[0], model, codeGeneratedList)
        const testResult = await didPassTest(testCommand)
        if(testResult.result)
            break;
        codeGeneratedList.push({code: codeGenerated, error: testResult.error})
        next = await vscode.window.showQuickPick(['yes','no'], {
		    placeHolder: 'Get Next Answer'
	    }) as string;
    }
}