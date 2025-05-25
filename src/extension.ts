// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { createCodeFromTest } from './commands/codeFromTest';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const condeFromTestCommand = vscode.commands.registerCommand('ollama-pair.codeFromTest', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		const config = vscode.workspace.getConfiguration()
		const model = config.get('ollamaPair.model.selectedModel') as string;
		const testFilePattern = config.get('ollamaPair.files.testFilePattern') as string;
		const testCommand = config.get('ollamaPair.execute.testCommand') as string;
		await createCodeFromTest(model, testFilePattern,testCommand);
	});

	context.subscriptions.push(condeFromTestCommand);
}



// This method is called when your extension is deactivated
export function deactivate() {}
