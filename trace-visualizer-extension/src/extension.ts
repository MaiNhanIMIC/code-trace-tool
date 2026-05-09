import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('trace-visualizer.showGraph', () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const dataPath = path.join(workspaceFolders[0].uri.fsPath, 'data.json');
        if (!fs.existsSync(dataPath)) {
            vscode.window.showErrorMessage('data.json not found in workspace root');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'traceGraph',
            'Trace Graph',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'webview'))
                ]
            }
        );

        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'ready':
                        try {
                            const dataContent = fs.readFileSync(dataPath, 'utf8');
                            const jsonData = JSON.parse(dataContent);
                            panel.webview.postMessage({ command: 'setData', data: jsonData });
                        } catch (err) {
                            const errorMessage = err instanceof Error ? err.message : String(err);
                            vscode.window.showErrorMessage('Failed to read or parse data.json: ' + errorMessage);
                        }
                        return;
                    case 'jumpToCode':
                        jumpToCode(message.fileName, message.line);
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

function jumpToCode(fileName: string, line: number) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const filePath = path.join(workspaceFolders[0].uri.fsPath, fileName);
    const uri = vscode.Uri.file(filePath);

    vscode.workspace.openTextDocument(uri).then(doc => {
        vscode.window.showTextDocument(doc, {
            selection: new vscode.Range(line - 1, 0, line - 1, 0)
        });
    });
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    const mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', 'main.js'));
    const cytoscapeUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', 'cytoscape.min.js'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
    <title>Trace Graph</title>
    <script src="${cytoscapeUri}"></script>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #1e1e1e; color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        #container { display: flex; width: 100%; height: 100%; }
        #main-view { flex-grow: 1; display: flex; flex-direction: column; position: relative; }
        #cy { width: 100%; flex-grow: 1; display: block; min-height: 0; }
        #side-panel { width: 300px; background: #252526; border-left: 1px solid #333; display: flex; flex-direction: column; }
        #side-panel-header { padding: 10px; background: #333; font-weight: bold; border-bottom: 1px solid #444; }
        #log-container { flex-grow: 1; overflow-y: auto; padding: 10px; font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.5; }
        .log-entry { margin-bottom: 8px; border-left: 2px solid #007acc; padding-left: 8px; color: #cccccc; }
        #controls { height: 40px; padding: 5px 15px; background: #333; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #444; }
        #search-container { position: relative; display: flex; align-items: center; }
        #search-input { 
            background: #3c3c3c; 
            color: #ccc; 
            border: 1px solid #555; 
            padding: 4px 8px; 
            border-radius: 2px; 
            font-size: 12px;
            width: 200px;
        }
        #search-input:focus { outline: 1px solid #007acc; border-color: #007acc; }
        #tooltip {
            position: fixed;
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            display: none;
            z-index: 1000;
            border: 1px solid #555;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        #status { font-size: 12px; color: #aaa; flex-grow: 1; }
    </style>
</head>
<body>
    <div id="tooltip"></div>
    <div id="container">
        <div id="main-view">
            <div id="controls">
                <div id="search-container">
                    <input type="text" id="search-input" list="node-list" placeholder="Search function...">
                    <datalist id="node-list"></datalist>
                </div>
                <div id="status">Loading data...</div>
            </div>
            <div id="cy"></div>
        </div>
        <div id="side-panel">
            <div id="side-panel-header">Logs to Check</div>
            <div id="log-container">
                <div style="color: #666; font-style: italic;">Select a node to see its logs</div>
            </div>
        </div>
    </div>
    <script src="${mainScriptUri}"></script>
</body>
</html>`;
}

export function deactivate() {}
