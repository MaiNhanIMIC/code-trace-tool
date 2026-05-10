"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
function activate(context) {
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
        const panel = vscode.window.createWebviewPanel('traceGraph', 'Trace Graph 3D', vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(context.extensionPath, 'webview')),
                vscode.Uri.file(path.join(context.extensionPath, 'out'))
            ]
        });
        panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'ready':
                    try {
                        const dataContent = fs.readFileSync(dataPath, 'utf8');
                        const jsonData = JSON.parse(dataContent);
                        panel.webview.postMessage({ command: 'setData', data: jsonData });
                    }
                    catch (err) {
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        vscode.window.showErrorMessage('Failed to read or parse data.json: ' + errorMessage);
                    }
                    return;
                case 'jumpToCode':
                    jumpToCode(message.fileName, message.line);
                    return;
                case 'log':
                    console.log('Webview Log:', message.text);
                    return;
                case 'error':
                    vscode.window.showErrorMessage('Webview Error: ' + message.text);
                    return;
            }
        }, undefined, context.subscriptions);
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function jumpToCode(fileName, line) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders)
        return;
    const filePath = path.join(workspaceFolders[0].uri.fsPath, fileName);
    const uri = vscode.Uri.file(filePath);
    vscode.workspace.openTextDocument(uri).then(doc => {
        vscode.window.showTextDocument(doc, {
            selection: new vscode.Range(line - 1, 0, line - 1, 0)
        });
    });
}
function getWebviewContent(webview, extensionUri) {
    const mainScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', 'main.js'));
    const threeScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', 'three.min.js'));
    const graph3dScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview', '3d-force-graph.min.js'));
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval' blob:;">
    <title>Trace Graph 3D</title>
</head>
<body style="margin: 0; padding: 0; background: #000; color: white; overflow: hidden; font-family: sans-serif;">
    <div id="container" style="display: flex; width: 100vw; height: 100vh;">
        <div id="main-view" style="flex-grow: 1; display: flex; flex-direction: column; position: relative;">
            <div id="controls" style="height: 50px; padding: 0 20px; background: #1a1a1a; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #333;">
                <input type="text" id="search-input" list="node-list" placeholder="Search function..." style="background: #2a2a2a; color: #fff; border: 1px solid #444; padding: 6px 12px; border-radius: 4px; width: 250px;">
                <datalist id="node-list"></datalist>
                <div id="status" style="font-size: 12px; color: #888; flex-grow: 1;">Loading libraries...</div>
            </div>
            <div id="3d-graph" style="width: 100%; flex-grow: 1;"></div>
        </div>
        <div id="side-panel" style="width: 350px; background: #111; border-left: 1px solid #333; display: flex; flex-direction: column;">
            <div id="side-panel-header" style="padding: 15px; background: #222; font-weight: bold; border-bottom: 1px solid #444; color: #f1c40f;">Logs</div>
            <div id="log-container" style="flex-grow: 1; overflow-y: auto; padding: 15px; font-family: monospace; font-size: 13px;"></div>
        </div>
    </div>
    <script>
        window.onerror = function(msg, url, line) {
            const vscode = acquireVsCodeApi();
            vscode.postMessage({ command: 'error', text: msg + ' at ' + url + ':' + line });
        };
    </script>
    <script src="${threeScriptUri}" onerror="document.getElementById('status').textContent='Error: Three.js failed'"></script>
    <script src="${graph3dScriptUri}" onerror="document.getElementById('status').textContent='Error: 3D Graph Lib failed'"></script>
    <script src="${mainScriptUri}" onerror="document.getElementById('status').textContent='Error: main.js failed'"></script>
</body>
</html>`;
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map