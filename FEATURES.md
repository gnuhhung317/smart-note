# 🧠 Socratic Notes - Tài liệu Tính năng

Socratic Notes không chỉ là một ứng dụng ghi chú, mà là một **"Cognitive Assistant"** (Trợ lý nhận thức). Ứng dụng sử dụng AI (Gemini) để đóng vai trò là một người hướng dẫn theo phương pháp Socratic, giúp người dùng hiểu sâu vấn đề thông qua đối thoại, phản biện và tư duy đa chiều trước khi tổng hợp thành một bản ghi chú hoàn chỉnh.

## 1. Cơ chế Tương tác AI (AI Interaction)

### 🤖 Persona: Socratic Tutor
*   **Active Learning**: AI không trả lời ngay lập tức như Google. Nó sẽ phân tích yêu cầu (Học tập/Lên kế hoạch/Sáng tạo) và đặt câu hỏi ngược lại để kích thích tư duy người dùng.
*   **Các kỹ thuật tâm lý**: Áp dụng *The Feynman Technique* (Giải thích đơn giản), *Elaborative Interrogation* (Hỏi tại sao/như thế nào) và *Pareto Principle* (80/20).

### 🛠 Các công cụ hỗ trợ tư duy (Context Tools)
Tại thanh nhập liệu, người dùng có các nút chức năng nhanh:
1.  **💡 Analogy Generator (Giải thích ELI5)**:
    *   Yêu cầu AI giải thích concept hiện tại bằng một hình ảnh so sánh đời thường, đơn giản (Explain Like I'm 5).
2.  **🧠 Challenge Me (Tư duy phản biện)**:
    *   Yêu cầu AI đóng vai trò phản biện, tìm ra lỗ hổng logic, edge-cases (trường hợp biên) hoặc rủi ro trong ý tưởng của người dùng.

## 2. Tính năng Tổng hợp Ghi chú (Synthesis Engine)

Khi người dùng gõ các từ khóa như *"Synthesize"*, *"Finalize"*, *"Create note"*, ứng dụng sẽ chuyển sang chế độ tổng hợp và tạo ra bản ghi chú tối ưu hóa cho **Notion**.

*   **Cấu trúc chuẩn Notion**: Tự động sử dụng H1, H2, H3, Blockquote (Callout), và Toggle list.
*   **📅 Spaced Repetition (Lặp lại ngắt quãng)**: Tự động tính toán và thêm dòng metadata `Next Review: [Date + 3 days]` để nhắc người dùng ôn tập.
*   **🏷️ AI Auto-Tagging**: AI tự động phân tích nội dung và đề xuất 3-5 thẻ hashtag liên quan (ví dụ: `#Backend`, `#Microservices`, `#Learning`) ở cuối ghi chú.
*   **📊 Mermaid Diagrams**: Tự động chuyển đổi quy trình hoặc cấu trúc thành biểu đồ (Flowchart, Sequence diagram...) hiển thị trực quan ngay trong khung chat.
*   **One-Click Copy**: Nút copy chuyên biệt cho các tin nhắn dạng Note để dán trực tiếp vào Notion.

## 3. Quản lý Phiên làm việc (Session Management)

Hệ thống lưu trữ cục bộ (Local Storage) giúp người dùng quản lý các luồng suy nghĩ.

*   **🗂 Sidebar Lịch sử**:
    *   Danh sách các đoạn chat cũ.
    *   **Group by Date**: Phân nhóm theo thời gian ("Today", "Yesterday", ngày cụ thể).
*   **✨ Auto-Title**: Tiêu đề của đoạn chat được AI tự động tạo ra dựa trên tin nhắn đầu tiên của người dùng (Ngắn gọn, súc tích).
*   **CRUD Operations**:
    *   Tạo đoạn chat mới (New Note).
    *   Xóa đoạn chat (Delete) với xác nhận.
    *   Tự động lưu (Auto-save) sau mỗi tin nhắn.

## 4. Giao diện & Trải nghiệm (UI/UX)

*   **🎨 Notion Aesthetics**: Giao diện tối giản, sử dụng font Inter/JetBrains Mono, màu nền giấy (`#F7F7F5`), tạo cảm giác thân thuộc như đang dùng Notion.
*   **⚡ Real-time Streaming**: Phản hồi của AI xuất hiện theo dạng gõ máy (streaming) giúp giảm cảm giác chờ đợi.
*   **📱 Responsive Design**: Sidebar có thể đóng mở (trên mobile), tối ưu hiển thị trên nhiều thiết bị.
*   **Markdown Rendering**: Hỗ trợ hiển thị Rich Text, Code Highlighting và Render biểu đồ Mermaid trực tiếp.

## 5. Ngăn xếp Công nghệ (Tech Stack)

*   **Frontend**: React 19, TypeScript.
*   **Styling**: Tailwind CSS.
*   **AI Model**: Google Gemini 2.5 Flash (thông qua `@google/genai` SDK).
*   **Visualization**: Mermaid.js.
*   **Storage**: Browser LocalStorage.
*   **Icons**: Lucide React.
