const fs = require('fs');
const path = require('path');

const functionCalls = JSON.parse(fs.readFileSync('tool/material/function_calls.json', 'utf8'));
const vfs = JSON.parse(fs.readFileSync('tool/material/vfs.json', 'utf8'));

const data = [];

// Map to store function metadata for quick lookup
const functionMap = new Map();

functionCalls.forEach(pkg => {
    pkg.files.forEach(file => {
        file.functions.forEach(func => {
            let layerDir = pkg.layer.toLowerCase();
            let pkgDir = pkg.package_name.replace('.so', '').replace('.ko', '');
            
            // Adjust for specific directory structure observed
            let pathSegments = ['source-code', layerDir];
            if (layerDir === 'driver') {
                pathSegments.push(pkg.package_name.replace('.ko', '').replace(/_/g, '-'));
            } else if (layerDir === 'lib') {
                pathSegments.push(pkg.package_name.replace('lib', '').replace('.so', '').replace(/_/g, '-') + '-lib');
            }
            // If it's App, it's directly under app/ (no subfolder in the listing for system_test_app.c)
            
            let filePath = `source-code/${layerDir}/${file.file_name}`;
            if (layerDir === 'driver') {
                // Find driver subfolder
                if (pkg.package_name.includes('data_logger')) filePath = `source-code/driver/data-logger-driver/${file.file_name}`;
                else if (pkg.package_name.includes('eeprom')) filePath = `source-code/driver/epprom-driver/${file.file_name}`;
                else if (pkg.package_name.includes('led_driver')) filePath = `source-code/driver/led-driver/${file.file_name}`;
                else if (pkg.package_name.includes('sensor_manager')) filePath = `source-code/driver/sensor-manager-driver/${file.file_name}`;
                else if (pkg.package_name.includes('shared_lib')) filePath = `source-code/driver/shared-lib-driver/${file.file_name}`;
            } else if (layerDir === 'lib') {
                if (pkg.package_name.includes('led')) filePath = `source-code/lib/led-lib/${file.file_name}`;
                else if (pkg.package_name.includes('nvram')) filePath = `source-code/lib/nvram-lib/${file.file_name}`;
            }

            functionMap.set(func.id, {
                file_name: filePath,
                line: 1,
                logs: func.logs || []
            });
            
            data.push({
                file_name: functionMap.get(func.id).file_name,
                line: 1,
                caller: func.id,
                callees: func.calls || [],
                logs: func.logs || []
            });
        });
    });
});

// Add VFS connections if any
// (This is a simplified version of the design's merger)
vfs.forEach(entry => {
    if (entry.operations) {
        Object.values(entry.operations).forEach(kernelFunc => {
            // We can add logic here to bridge User Space calls to VFS to Kernel functions
        });
    }
});

fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
console.log('Successfully generated data.json from material');
