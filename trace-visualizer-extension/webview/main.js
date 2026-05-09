(function() {
    const vscode = acquireVsCodeApi();
    const errorContainer = document.getElementById('cy');
    const statusContainer = document.getElementById('status');
    const searchInput = document.getElementById('search-input');
    const nodeDataList = document.getElementById('node-list');
    let cy;

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'setData':
                renderGraph(message.data);
                break;
        }
    });

    // Signal we are ready for data
    vscode.postMessage({ command: 'ready' });

    function renderGraph(data) {
        console.log('Received data:', data);
        statusContainer.textContent = 'Click a node to view logs';

        if (!data || !Array.isArray(data) || data.length === 0) {
            errorContainer.innerHTML = '<div style="color: #666; padding: 20px;">No data to display.</div>';
            return;
        }

        const elements = [];
        const nodeMap = new Map();

        try {
            // Clear previous datalist
            nodeDataList.innerHTML = '';

            data.forEach(item => {
                if (!item.caller) return;
                
                if (!nodeMap.has(item.caller)) {
                    nodeMap.set(item.caller, {
                        id: item.caller,
                        label: item.caller,
                        fileName: item.file_name,
                        line: item.line,
                        logs: item.logs || []
                    });
                    
                    const option = document.createElement('option');
                    option.value = item.caller;
                    nodeDataList.appendChild(option);
                } else {
                    const node = nodeMap.get(item.caller);
                    node.fileName = item.file_name || node.fileName;
                    node.line = item.line || node.line;
                    node.logs = item.logs || node.logs;
                }

                (item.callees || []).forEach(callee => {
                    if (!callee) return;
                    if (!nodeMap.has(callee)) {
                        nodeMap.set(callee, {
                            id: callee,
                            label: callee,
                            logs: []
                        });
                        const option = document.createElement('option');
                        option.value = callee;
                        nodeDataList.appendChild(option);
                    }
                    elements.push({
                        data: {
                            id: 'edge_' + Math.random().toString(36).substr(2, 9),
                            source: item.caller,
                            target: callee
                        }
                    });
                });
            });

            nodeMap.forEach(nodeData => {
                elements.push({ data: nodeData });
            });

            if (typeof cytoscape === 'undefined') {
                errorContainer.innerHTML = '<div style="color: #e51400; padding: 20px;">Error: Cytoscape not loaded.</div>';
                return;
            }

            cy = cytoscape({
                container: errorContainer,
                elements: elements,
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#007acc',
                            'label': 'data(label)',
                            'color': '#cccccc',
                            'text-valign': 'bottom',
                            'text-halign': 'center',
                            'text-margin-y': 8,
                            'font-size': '11px',
                            'width': '30px',
                            'height': '30px',
                            'shape': 'ellipse',
                            'border-width': 2,
                            'border-color': '#005a9e'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 2,
                            'line-color': '#555',
                            'target-arrow-color': '#555',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier',
                            'opacity': 0.6
                        }
                    },
                    {
                        selector: 'node.highlighted',
                        style: {
                            'background-color': '#f1c40f',
                            'border-color': '#d4ac0d',
                            'border-width': 4,
                            'width': '35px',
                            'height': '35px',
                            'opacity': 1,
                            'z-index': 999
                        }
                    },
                    {
                        selector: 'edge.highlighted',
                        style: {
                            'line-color': '#f1c40f',
                            'target-arrow-color': '#f1c40f',
                            'width': 4,
                            'opacity': 1,
                            'z-index': 998
                        }
                    },
                    {
                        selector: '.dimmed',
                        style: {
                            'opacity': 0.1
                        }
                    }
                ],
                layout: {
                    name: 'cose',
                    padding: 40
                }
            });

            const tooltip = document.getElementById('tooltip');
            const logContainer = document.getElementById('log-container');

            cy.on('mouseover', 'node', function(evt) {
                const node = evt.target;
                if (node.data('fileName')) {
                    tooltip.innerHTML = '<b>' + node.data('label') + '</b><br>File: ' + node.data('fileName') + '<br>Line: ' + node.data('line');
                    tooltip.style.display = 'block';
                }
            });

            cy.on('mousemove', function(evt) {
                tooltip.style.left = (evt.renderedPosition.x + 20) + 'px';
                tooltip.style.top = (evt.renderedPosition.y + 20) + 'px';
            });

            cy.on('mouseout', 'node', function() {
                tooltip.style.display = 'none';
            });

            function highlightNode(node) {
                cy.elements().removeClass('highlighted dimmed');
                const path = node.predecessors().union(node.successors()).union(node);
                cy.elements().not(path).addClass('dimmed');
                path.addClass('highlighted');
                cy.animate({
                    center: { eles: node },
                    zoom: 1.2,
                    duration: 500
                });

                const logs = node.data('logs');
                logContainer.innerHTML = '<div style="font-weight: bold; color: #f1c40f;">Logs for ' + node.data('label') + ':</div>';
                if (logs && logs.length > 0) {
                    logs.forEach(log => {
                        const div = document.createElement('div');
                        div.className = 'log-entry';
                        div.textContent = log;
                        logContainer.appendChild(div);
                    });
                } else {
                    const div = document.createElement('div');
                    div.style.cssText = 'font-style: italic; color: #666;';
                    div.textContent = 'No logs';
                    logContainer.appendChild(div);
                }
            }

            cy.on('tap', 'node', function(evt) {
                highlightNode(evt.target);
            });

            // Search functionality
            searchInput.addEventListener('input', () => {
                const val = searchInput.value;
                const node = cy.nodes().filter(n => n.data('label') === val);
                if (node.length > 0) {
                    highlightNode(node[0]);
                }
            });

            cy.on('dbltap', 'node', function(evt) {
                const node = evt.target;
                if (node.data('fileName')) {
                    vscode.postMessage({
                        command: 'jumpToCode',
                        fileName: node.data('fileName'),
                        line: parseInt(node.data('line'))
                    });
                }
            });

            cy.on('tap', function(evt) {
                if (evt.target === cy) {
                    cy.elements().removeClass('highlighted dimmed');
                    logContainer.innerHTML = '<div style="font-style: italic; color: #666;">Select a node</div>';
                    searchInput.value = '';
                }
            });

        } catch (e) {
            errorContainer.innerHTML = '<div style="color: #e51400; padding: 20px;">Render Error: ' + e.message + '</div>';
        }
    }
})();
