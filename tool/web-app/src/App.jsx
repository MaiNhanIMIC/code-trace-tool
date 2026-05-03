import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);

const App = () => {
  const cyRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [functionCalls, setFunctionCalls] = useState(null);
  const [vfsMapping, setVfsMapping] = useState(null);
  const [showUserSpace, setShowUserSpace] = useState(true);
  const [showKernelSpace, setShowKernelSpace] = useState(true);

  // Auto-fetch if available
  useEffect(() => {
    fetch('/function_calls.json').then(r => r.json()).then(setFunctionCalls).catch(e => console.log('function_calls.json not in public/'));
    fetch('/vfs.json').then(r => r.json()).then(setVfsMapping).catch(e => console.log('vfs.json not in public/'));
  }, []);

  const handleFileUpload = (type, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          if (type === 'calls') setFunctionCalls(json);
          else setVfsMapping(json);
        } catch (err) {
          alert('Error parsing JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const transformData = (calls, vfs) => {
    if (!calls) return { nodes: [], edges: [] };

    const nodes = [];
    const edges = [];
    const funcMap = new Map(); // id -> fullId
    
    // Add VFS Layer Node
    nodes.push({ data: { id: 'VFS_Layer', label: 'Virtual File System', type: 'vfs_layer' } });

    // Step 1: Process Function Calls
    calls.forEach(pkg => {
      const isKernel = pkg.layer === 'Driver' || pkg.layer === 'Hardware';
      const parentLayer = isKernel ? 'Kernel_Space' : 'User_Space';
      
      // Ensure Layer Compound Nodes exist
      if (!nodes.find(n => n.data.id === parentLayer)) {
        nodes.push({ data: { id: parentLayer, label: parentLayer.replace('_', ' '), type: 'layer' } });
      }

      // Package Node
      nodes.push({
        data: { id: pkg.package_name, label: pkg.package_name, parent: parentLayer, type: 'package', layer: pkg.layer }
      });

      pkg.files.forEach(file => {
        const fileId = `${pkg.package_name}:${file.file_name}`;
        nodes.push({
          data: { id: fileId, label: file.file_name, parent: pkg.package_name, type: 'file' }
        });

        file.functions.forEach(func => {
          const funcId = `${fileId}:${func.id}`;
          nodes.push({
            data: { id: funcId, label: func.id, parent: fileId, type: 'function', logs: func.logs, calls: func.calls }
          });
          
          if (!funcMap.has(func.id)) funcMap.set(func.id, []);
          funcMap.get(func.id).push(funcId);
        });
      });
    });

    // Step 2: Create normal edges and identify VFS calls
    calls.forEach(pkg => {
      pkg.files.forEach(file => {
        const fileId = `${pkg.package_name}:${file.file_name}`;
        file.functions.forEach(func => {
          const sourceId = `${fileId}:${func.id}`;
          (func.calls || []).forEach(call => {
            if (call.startsWith('vfs:')) {
              // Format: vfs:<device_node>:<operation>
              const [_, node, op] = call.split(':');
              const deviceId = `device:${node}`;
              
              // Create Device Node if missing
              if (!nodes.find(n => n.data.id === deviceId)) {
                nodes.push({ 
                  data: { id: deviceId, label: node, parent: 'VFS_Layer', type: 'device_node' } 
                });
              }

              // Edge from Syscall caller -> Device Node
              edges.push({
                data: { source: sourceId, target: deviceId, label: op, type: 'vfs_call' }
              });
            } else {
              // Normal internal call
              const targets = funcMap.get(call);
              if (targets) {
                targets.forEach(targetId => {
                  edges.push({ data: { source: sourceId, target: targetId, type: 'normal' } });
                });
              }
            }
          });
        });
      });
    });

    // Step 3: Integrate VFS Mapping (Device Node -> Driver)
    if (vfs) {
      vfs.forEach(link => {
        const deviceId = `device:${link.device_node}`;
        
        // Ensure Device Node exists
        if (!nodes.find(n => n.data.id === deviceId)) {
          nodes.push({ 
            data: { id: deviceId, label: link.device_node, parent: 'VFS_Layer', type: 'device_node' } 
          });
        }

        // Link all operations to driver functions
        Object.entries(link.operations).forEach(([op, driverFunc]) => {
          const targets = funcMap.get(driverFunc);
          if (targets) {
            targets.forEach(targetId => {
              edges.push({
                data: { source: deviceId, target: targetId, label: op, type: 'vfs_bind' }
              });
            });
          }
        });
      });
    }

    return { nodes, edges };
  };

  useEffect(() => {
    if (!functionCalls) return;

    const { nodes, edges } = transformData(functionCalls, vfsMapping);

    const cy = cytoscape({
      container: document.getElementById('cy'),
      elements: { nodes, edges },
      style: [
        {
          selector: 'node[type="layer"]',
          style: {
            'label': 'data(label)',
            'background-color': '#f8f9fa',
            'border-width': 2,
            'border-color': '#dee2e6',
            'border-style': 'dashed',
            'font-size': '24px',
            'text-valign': 'top',
            'text-halign': 'center',
            'padding': '40px'
          }
        },
        {
          selector: 'node[id="User_Space"]',
          style: { 'background-color': '#e7f1ff' }
        },
        {
          selector: 'node[id="Kernel_Space"]',
          style: { 'background-color': '#fff5f5' }
        },
        {
          selector: 'node[type="vfs_layer"]',
          style: {
            'label': 'data(label)',
            'background-color': '#f3e5f5',
            'border-color': '#9c27b0',
            'border-width': 2,
            'padding': '20px'
          }
        },
        {
          selector: 'node[type="package"]',
          style: {
            'label': 'data(label)',
            'background-color': '#ffffff',
            'border-width': 1,
            'border-color': '#adb5bd',
            'shape': 'rectangle'
          }
        },
        {
          selector: 'node[type="file"]',
          style: {
            'label': 'data(label)',
            'font-size': '10px',
            'background-color': '#f1f3f5'
          }
        },
        {
          selector: 'node[type="function"]',
          style: {
            'label': 'data(label)',
            'width': 'label',
            'height': 'label',
            'padding': '8px',
            'shape': 'round-rectangle',
            'background-color': '#ffffff',
            'border-width': 2,
            'border-color': '#007bff',
            'text-valign': 'center',
            'font-size': '12px'
          }
        },
        {
          selector: 'node[type="device_node"]',
          style: {
            'label': 'data(label)',
            'shape': 'barrel',
            'background-color': '#9c27b0',
            'color': '#fff',
            'text-outline-width': 2,
            'text-outline-color': '#9c27b0',
            'width': '60px',
            'height': '60px'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'font-size': '10px',
            'text-rotation': 'autorotate'
          }
        },
        {
          selector: 'edge[type="normal"]',
          style: { 'line-color': '#495057', 'target-arrow-color': '#495057' }
        },
        {
          selector: 'edge[type="vfs_call"]',
          style: {
            'label': 'data(label)',
            'line-color': '#dc3545',
            'target-arrow-color': '#dc3545',
            'line-style': 'dashed'
          }
        },
        {
          selector: 'edge[type="vfs_bind"]',
          style: {
            'label': 'data(label)',
            'line-color': '#28a745',
            'target-arrow-color': '#28a745',
            'line-style': 'dashed'
          }
        }
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 60,
        rankSep: 120
      }
    });

    cy.on('tap', 'node[type="function"]', (evt) => setSelectedNode(evt.target.data()));

    cyRef.current = cy;
    
    // Apply filters
    cy.batch(() => {
        if (!showUserSpace) cy.nodes('#User_Space').descendants().union(cy.nodes('#User_Space')).hide();
        if (!showKernelSpace) cy.nodes('#Kernel_Space').descendants().union(cy.nodes('#Kernel_Space')).hide();
    });

    return () => { if (cyRef.current) cyRef.current.destroy(); };
  }, [functionCalls, vfsMapping, showUserSpace, showKernelSpace]);

  return (
    <div className="app-container">
      <div className="sidebar">
        <h2>Trace Visualizer</h2>
        
        <div className="section">
          <h3>Data Sources</h3>
          <div className="upload-group">
            <div>
              <input type="file" id="calls-up" style={{display:'none'}} onChange={e=>handleFileUpload('calls',e)} />
              <button className="upload-btn" onClick={()=>document.getElementById('calls-up').click()}>
                {functionCalls ? '✓ Calls Loaded' : 'Load function_calls.json'}
              </button>
            </div>
            <div>
              <input type="file" id="vfs-up" style={{display:'none'}} onChange={e=>handleFileUpload('vfs',e)} />
              <button className="upload-btn secondary" onClick={()=>document.getElementById('vfs-up').click()}>
                {vfsMapping ? '✓ VFS Loaded' : 'Load vfs.json'}
              </button>
            </div>
          </div>
        </div>

        <div className="section">
          <h3>Layer Visibility</h3>
          <div className="toggle-group">
            <label className="toggle-item">
              <input type="checkbox" checked={showUserSpace} onChange={e=>setShowUserSpace(e.target.checked)} />
              User Space
            </label>
            <label className="toggle-item">
              <input type="checkbox" checked={showKernelSpace} onChange={e=>setShowKernelSpace(e.target.checked)} />
              Kernel Space
            </label>
          </div>
        </div>

        {selectedNode && (
          <div className="section">
            <h3>Node Information</h3>
            <div className="info-panel">
              <div className="info-row">
                <span className="info-label">Function</span>
                <span className="info-value">{selectedNode.label}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Source File</span>
                <span className="info-value">{selectedNode.id.split(':')[1]}</span>
              </div>
              {selectedNode.logs && selectedNode.logs.length > 0 && (
                <div className="log-container">
                  <span className="info-label">Trace Logs</span>
                  {selectedNode.logs.map((log, i) => (
                    <div key={i} className="log-item">{log}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="canvas-container">
        <div id="cy"></div>
      </div>
    </div>
  );
};

export default App;
