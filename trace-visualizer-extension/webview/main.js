(function() {
    const vscode = acquireVsCodeApi();
    const graphContainer = document.getElementById('3d-graph');
    const statusContainer = document.getElementById('status');
    const searchInput = document.getElementById('search-input');
    const nodeDataList = document.getElementById('node-list');
    const logContainer = document.getElementById('log-container');
    
    let Graph;
    let highlightNodes = new Set();
    let highlightLinks = new Set();
    let hoverNode = null;
    let clickTimeout = null;
    let lastClickTime = 0;

    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'setData') {
            init3DGraph(message.data);
        }
    });

    vscode.postMessage({ command: 'ready' });

    function init3DGraph(data) {
        const FG3D = window.ForceGraph3D || (window.default ? window.default : null);
        
        if (!FG3D) {
            statusContainer.textContent = 'Error: 3D Library failed to initialize.';
            return;
        }

        statusContainer.textContent = '3D World Ready. Click to show paths, double-click to jump.';
        
        const nodeMap = new Map();
        const links = [];

        data.forEach(item => {
            if (!item.caller) return;
            if (!nodeMap.has(item.caller)) {
                nodeMap.set(item.caller, {
                    id: item.caller,
                    name: item.caller,
                    fileName: item.file_name,
                    line: item.line,
                    logs: item.logs || [],
                    val: 10,
                    neighbors: [],
                    links: []
                });
            } else {
                const n = nodeMap.get(item.caller);
                n.fileName = item.file_name || n.fileName;
                n.line = item.line || n.line;
                n.logs = item.logs || n.logs;
            }

            (item.callees || []).forEach(callee => {
                if (!callee) return;
                if (!nodeMap.has(callee)) {
                    nodeMap.set(callee, { id: callee, name: callee, logs: [], val: 5, neighbors: [], links: [] });
                }
                const link = { source: item.caller, target: callee };
                links.push(link);
                
                const nodeA = nodeMap.get(item.caller);
                const nodeB = nodeMap.get(callee);
                nodeA.neighbors.push(nodeB);
                nodeB.neighbors.push(nodeA);
                nodeA.links.push(link);
                nodeB.links.push(link);
            });
        });

        const graphData = { nodes: Array.from(nodeMap.values()), links: links };

        nodeDataList.innerHTML = '';
        graphData.nodes.forEach(n => {
            const opt = document.createElement('option');
            opt.value = n.id;
            nodeDataList.appendChild(opt);
        });

        Graph = FG3D()(graphContainer)
            .graphData(graphData)
            .nodeLabel(n => `
                <div style="background:rgba(0,0,0,0.85);padding:8px;border:1px solid #f1c40f;border-radius:4px;color:white;pointer-events:none;">
                    <b style="color:#f1c40f;">${n.name}</b><br>
                    <small style="color:#aaa;">File: ${n.fileName || '??'}</small><br>
                    <small style="color:#aaa;">Line: ${n.line || '?'}</small>
                </div>
            `)
            .nodeColor(n => {
                if (highlightNodes.size > 0) {
                    if (highlightNodes.has(n)) return n === hoverNode ? '#ff0000' : '#f1c40f';
                    return 'rgba(100, 100, 100, 0.2)';
                }
                return '#007acc';
            })
            .linkWidth(link => highlightLinks.has(link) ? 4 : 1)
            .linkColor(link => {
                if (highlightLinks.size > 0) {
                    return highlightLinks.has(link) ? '#f1c40f' : 'rgba(100, 100, 100, 0.1)';
                }
                return 'rgba(255, 255, 255, 0.2)';
            })
            .linkDirectionalArrowLength(link => highlightLinks.has(link) ? 6 : 3)
            .linkDirectionalArrowRelPos(1)
            .linkDirectionalParticles(link => highlightLinks.has(link) ? 4 : 0)
            .linkDirectionalParticleWidth(4)
            .onNodeHover(node => {
                hoverNode = node;
                graphContainer.style.cursor = node ? 'pointer' : null;
                Graph.nodeColor(Graph.nodeColor());
            })
            .onNodeClick(node => {
                const now = Date.now();
                if (now - lastClickTime < 300) {
                    if (clickTimeout) {
                        clearTimeout(clickTimeout);
                        clickTimeout = null;
                    }
                    if (node && node.fileName) {
                        vscode.postMessage({ command: 'jumpToCode', fileName: node.fileName, line: parseInt(node.line) });
                    }
                } else {
                    clickTimeout = setTimeout(() => {
                        handleSingleClick(node);
                        clickTimeout = null;
                    }, 300);
                }
                lastClickTime = now;
            })
            .onBackgroundClick(() => {
                highlightNodes.clear();
                highlightLinks.clear();
                Graph.nodeColor(Graph.nodeColor());
                Graph.linkWidth(Graph.linkWidth());
                Graph.linkDirectionalParticles(0);
                logContainer.innerHTML = '<div style="color:#444;font-style:italic;">Select a node to see logs</div>';
            });

        function handleSingleClick(node) {
            highlightNodes.clear();
            highlightLinks.clear();

            if (node) {
                const queue = [node];
                highlightNodes.add(node);
                let i = 0;
                while(i < queue.length) {
                    const n = queue[i++];
                    (n.neighbors || []).forEach(neighbor => {
                        if (!highlightNodes.has(neighbor)) {
                            highlightNodes.add(neighbor);
                            queue.push(neighbor);
                        }
                    });
                    (n.links || []).forEach(link => highlightLinks.add(link));
                }
                focusNode(node);
            }

            Graph.nodeColor(Graph.nodeColor());
            Graph.linkWidth(Graph.linkWidth());
            Graph.linkDirectionalParticles(Graph.linkDirectionalParticles());
        }

        function focusNode(node) {
            if (!node) return;
            const dist = 120;
            const distRatio = 1 + dist/Math.hypot(node.x || 1, node.y || 1, node.z || 1);
            Graph.cameraPosition({ x: (node.x||0) * distRatio, y: (node.y||0) * distRatio, z: (node.z||0) * distRatio }, node, 1500);

            logContainer.innerHTML = '<div style="margin-bottom:15px;">' +
                '<b style="color:#f1c40f;font-size:18px;">' + node.name + '</b><br>' +
                '<span style="color:#aaa;font-size:12px;">File: ' + (node.fileName||'Unknown') + '</span><br>' +
                '<span style="color:#aaa;font-size:12px;">Line: ' + (node.line||'?') + '</span></div>';

            if (node.logs && node.logs.length > 0) {
                node.logs.forEach(l => {
                    const d = document.createElement('div');
                    d.className = 'log-entry'; d.textContent = l;
                    logContainer.appendChild(d);
                });
            } else {
                logContainer.innerHTML += '<div style="color:#444;font-style:italic;">No logs</div>';
            }
        }

        searchInput.addEventListener('input', () => {
            const n = graphData.nodes.find(x => x.id === searchInput.value);
            if (n) handleSingleClick(n);
        });
    }
})();
