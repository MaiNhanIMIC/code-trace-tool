Mẫu Prompt cho Gemini CLI
Hãy copy toàn bộ nội dung bên dưới để yêu cầu Gemini CLI:

Hãy đóng vai là một Chuyên gia phát triển VS Code Extension. Tôi cần bạn viết mã nguồn và hướng dẫn chi tiết để tạo một extension có chức năng hiển thị đồ thị (graph) thể hiện mối quan hệ giữa các hàm gọi (callers) và hàm được gọi (callees).

Phần 1: Cấu trúc dữ liệu đầu vào
Extension sẽ đọc dữ liệu từ một file data.json nằm trong workspace. Dưới đây là định dạng JSON chuẩn cần tuân thủ. Hãy viết code để extension parse dữ liệu theo format này:

JSON

[
  {
    "file_name": "src/app.js",
    "line": 25,
    "caller": "startApplication",
    "callees": ["initializeDB", "loadConfig"],
    "logs": ["App is starting...", "Loading core modules"]
  },
  {
    "file_name": "src/db.js",
    "line": 10,
    "caller": "initializeDB",
    "callees": ["connect"],
    "logs": ["Connecting to database"]
  }
]
Phần 2: Yêu cầu về Giao diện (Webview) và Đồ thị

Tạo một Webview Panel trong VS Code để hiển thị đồ thị.

Sử dụng một thư viện vẽ đồ thị phù hợp (ví dụ: Cytoscape.js, Vis.js, hoặc D3.js) để render các node (đại diện cho hàm) và edges (đại diện cho luồng gọi hàm) dựa trên dữ liệu từ data.json.

Phần 3: Tương tác của người dùng
Hãy viết code xử lý các tương tác sau trên đồ thị:

Nhảy đến mã nguồn (Jump to code): Khi người dùng click vào một node, Webview phải gửi message về extension backend để mở file file_name tương ứng trong VS Code workspace và tự động cuộn/focus con trỏ chuột đến đúng dòng line nơi hàm đó được định nghĩa.

Highlight đường đi (Path Highlighting): Khi click vào một node, đồ thị phải tự động làm nổi bật (đổi màu, tăng độ đậm) node đó cùng với tất cả các node và cạnh thuộc luồng gọi hàm (cả chiều đi lên caller và đi xuống callees) của nó.

Bộ lọc hiển thị (Toggle Button): Thêm một nút (button) trên giao diện Webview với chức năng toggle (bật/tắt). Khi được kích hoạt, đồ thị sẽ ẩn đi các node không liên quan và chỉ hiển thị các node đang được highlight. Khi tắt, đồ thị sẽ show lại tất cả các node.

Phần 4: Cấu trúc code và Hướng dẫn

Cung cấp cấu trúc thư mục của extension.

Viết code chi tiết cho các file quan trọng: package.json (đăng ký command), extension.js (hoặc extension.ts - logic chính và tạo Webview), và file HTML/JS cho giao diện Webview.

Hướng dẫn ngắn gọn cách chạy thử (F5) và test extension này.