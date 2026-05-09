# Trace Visualizer VS Code Extension

Extension này giúp hiển thị đồ thị mối quan hệ giữa các hàm gọi (callers) và hàm được gọi (callees) từ file `data.json`.

## Cấu trúc thư mục
- `src/extension.ts`: Logic chính của extension (backend).
- `webview/main.js`: Logic hiển thị đồ thị sử dụng Cytoscape.js (frontend).
- `package.json`: Khai báo thông tin extension và commands.
- `tsconfig.json`: Cấu hình TypeScript.

## Cách chạy thử (F5)
1. Mở thư mục `trace-visualizer-extension` trong VS Code.
2. Chạy lệnh `npm install` để cài đặt các types cần thiết.
3. Nhấn phím **F5** để mở một cửa sổ [Extension Development Host] mới.
4. Trong cửa sổ mới, đảm bảo có file `data.json` ở thư mục gốc của workspace.
5. Mở Command Palette (`Ctrl+Shift+P` hoặc `Cmd+Shift+P`) và tìm lệnh: **Trace Visualizer: Show Graph**.

## Cách test
1. Khi đồ thị hiện ra, thử click vào một node:
   - Node đó và các đường liên quan sẽ được highlight.
   - VS Code sẽ tự động mở file tương ứng tại đúng dòng code.
2. Thử nút **Show Only Highlighted**:
   - Chỉ các node đang được highlight mới hiển thị.
3. Click vào vùng trống của đồ thị để bỏ highlight.
