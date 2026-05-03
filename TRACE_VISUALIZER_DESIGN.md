# Thiết kế Web App: Trace Code Visualizer (Kiến trúc Dual-Input)

## 1. Mục tiêu dự án
Xây dựng một ứng dụng web dạng Single Page Application (SPA) để đọc, tổng hợp và trực quan hóa dữ liệu trace code từ hệ thống C/C++ và Linux Kernel. 
Đồ thị cần thể hiện được luồng gọi hàm (Function Call Graph) xuyên suốt từ **User Space (App, Libs)** -> **VFS (Virtual File System)** -> **Kernel Space (Drivers)** -> **Hardware**, dựa trên 2 nguồn dữ liệu đầu vào riêng biệt.

## 2. Phân tích Dữ liệu đầu vào (Input)
Hệ thống sử dụng 2 file JSON từ thư mục `tool/material/`:

1.  **`function_calls.json` (Đồ thị gọi hàm cơ bản):** - Chứa cấu trúc phân cấp tĩnh của mã nguồn: `Package` -> `File` -> `Function`.
    - Chứa các mối quan hệ gọi hàm (caller-callee) thông thường trong cùng một không gian (ví dụ: App gọi Lib, hoặc Driver gọi các hàm nội bộ/hàm kernel khác).
2.  **`vfs.json` (Giao tiếp qua File System):**
    - Chứa thông tin ánh xạ (mapping) giữa các lời gọi hệ thống (System Calls như `open`, `read`, `write`, `ioctl`) ở User Space với các tệp thiết bị (Device files, ví dụ: `/dev/bbb_led`, `/dev/bbb_eeprom`).
    - Ánh xạ từ các Device files này xuống các hàm xử lý tương ứng (file operations) trong Driver ở Kernel Space.

## 3. Lựa chọn Công nghệ (Tech Stack)
- **Framework Frontend:** ReactJS (hoặc VueJS).
- **Thư viện vẽ đồ thị (Core):** **Cytoscape.js** (Hỗ trợ tốt Compound Nodes để vẽ Package/File lồng nhau).
- **Thuật toán Layout:** **Dagre (cytoscape-dagre)** (Sắp xếp đồ thị có hướng theo dạng luồng từ trên xuống dưới: App -> VFS -> Driver -> Hardware).

## 4. Thiết kế Kiến trúc UI/UX

### 4.1. Giao diện chính (Main Layout)
- **Sidebar:**
  - Khu vực tải file: Hỗ trợ kéo thả (Drag & Drop) hoặc tự động fetch 2 file `function_calls.json` và `vfs.json` từ server (nếu chạy kèm backend).
  - Bảng **Layer Toggle**: Các công tắc (Switch) để ẩn/hiện nhanh các tầng: `User Space` và `Kernel Space` (trong kernel space sẽ có `vfs` và `drivers`)
  - Bảng **Node Info**: Hiển thị chi tiết khi click vào node (Tên hàm, tham số, thuộc file/package nào).
- **Canvas View (Giữa):** Khu vực hiển thị đồ thị tương tác (Zoom, Pan).

### 4.2. Quy tắc Hiển thị (Visual Rules)
- **Compound Nodes (Các hộp chứa):**
  - **User Space:** Nền màu xanh nhạt (Light Blue).
  - **Kernel Space:** Nền màu cam nhạt (Light Coral).
- **Leaf Nodes (Các node chức năng):**
  - **Hàm thông thường:** Hình chữ nhật bo góc.
  - **Device Node (VFS):** Hình trụ (Cylinder/Barrel) đại diện cho file/dữ liệu (Ví dụ: `/dev/bbb_eeprom`), viền màu tím.
- **Edges (Đường liên kết):**
  - Mũi tên nét liền (Solid black): Lời gọi hàm thông thường (dữ liệu từ `function_calls.json`).
  - Mũi tên nét đứt (Dashed red/blue): Lời gọi qua VFS (ví dụ: `write() -> /dev/bbb_led -> bbb_led_write()`) (dữ liệu từ `vfs.json`).

## 5. Cấu trúc Data Transformer (Logic hợp nhất JSON)
App cần một module (ví dụ: `GraphBuilder.js`) để kết hợp 2 file JSON thành một tập hợp Nodes và Edges cho Cytoscape:

```javascript
// Mã giả (Pseudocode) Logic Parser & Merger
async function buildGraphData(functionCallsJson, vfsJson) {
    let elements = { nodes: [], edges: [] };
    let vfsNodesMap = new Set();
    
    // Bước 1: Xử lý function_calls.json
    functionCallsJson.forEach(pkg => {
        elements.nodes.push({ data: { id: pkg.package_name, label: pkg.package_name, type: 'package' } });
        pkg.files.forEach(file => {
            let fileId = `${pkg.package_name}/${file.file_name}`;
            elements.nodes.push({ data: { id: fileId, parent: pkg.package_name, label: file.file_name, type: 'file' } });
            
            file.functions.forEach(func => {
                let funcId = `${fileId}/${func.name}`;
                elements.nodes.push({ data: { id: funcId, parent: fileId, label: func.name, type: 'function' } });
                
                // Thêm edges thông thường từ caller -> callee...
            });
        });
    });

    // Bước 2: Xử lý vfs.json (Tạo cầu nối User <-> Kernel)
    vfsJson.forEach(vfsLink => {
        // 1. Tạo node Device File (nếu chưa có) và đặt vào một Compound Node giả lập tên "VFS"
        let deviceId = `VFS/${vfsLink.device_file}`;
        if (!vfsNodesMap.has(deviceId)) {
            elements.nodes.push({ data: { id: "VFS_Layer", label: "Virtual File System", type: 'vfs_layer' }});
            elements.nodes.push({ data: { id: deviceId, parent: "VFS_Layer", label: vfsLink.device_file, type: 'device_node' } });
            vfsNodesMap.add(deviceId);
        }
        
        // 2. Tạo Edge từ User Space (Syscall) -> Device File (Nét đứt)
        elements.edges.push({ 
            data: { source: vfsLink.caller_func_id, target: deviceId, type: 'vfs_call', label: vfsLink.syscall } 
        });Gọi API bbb_nvram_read: Đọc dữ liệu từ offset 0x%02X...
        
        // 3. Tạo Edge từ Device File -> Kernel Driver Function (Nét đứt)
        elements.edges.push({ 
            data: { source: deviceId, target: vfsLink.kernel_func_id, type: 'vfs_bind', label: 'trigger' } 
        });
    });
    
    return elements;
}
```
