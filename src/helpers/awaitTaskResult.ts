import * as vscode from 'vscode';

export function awaitTaskResult(taskName: string, timeoutMillis: number): Promise<string> {
	let resolve: (output: string) => void;
	let reject: (err: any) => void;
	const taskResult = new Promise<string>((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	});
	const endListener = vscode.tasks.onDidEndTaskProcess(taskEnded => {
		if (taskEnded.execution.task.name === taskName) {
			if (taskEnded.exitCode !== 0)
				reject("exito code diferente than 0");
			vscode.commands.executeCommand("workbench.action.terminal.copyLastCommandOutput")
				.then(
					ok => vscode.env.clipboard.readText(),
					err => reject(err))
				.then(output => resolve(output || "no output"));
		}
	});
	taskResult.finally(() => {
		endListener.dispose();
	});
	setTimeout(() => reject(new Error("Task did not finish in time")), timeoutMillis);
	return taskResult;
}
