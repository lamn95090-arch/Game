# Chess 5D WebSocket Relay Server

Server đơn giản để chơi multiplayer chỉ cần **mã phòng** (không cần IP).

## Chạy local (test)

```bash
cd chess5d_server
npm install
npm start
```

Server chạy ở `ws://127.0.0.1:8080`

Trong Godot, giữ nguyên `RELAY_URL := "ws://127.0.0.1:8080"`

## Deploy miễn phí (để chơi thật trên Android / khác mạng)

### Cách 1: Render.com (khuyên dùng)

1. Tạo tài khoản https://render.com
2. New → Web Service → Deploy from Git (hoặc upload folder này)
3. Runtime: Node
4. Build: `npm install`
5. Start: `npm start`
6. Lấy URL dạng `https://ten-ban.onrender.com` → đổi thành `wss://ten-ban.onrender.com` trong `main.gd` (const RELAY_URL)

### Cách 2: Railway / Fly.io / VPS bất kỳ

Chỉ cần `node server.js`, port lấy từ `process.env.PORT`.

## Cách chơi

1. Một người bấm **Tạo phòng** → nhận mã 6 ký tự (ví dụ K7P2M9)
2. Gửi mã cho bạn (Zalo, Discord...)
3. Người kia nhập tên + mã → **Vào phòng**
4. Tự động bắt đầu: Host = Trắng, Guest = Đen
5. Chỉ cần nhập mã, không cần IP / port forward

## Lưu ý

- Phòng tối đa 2 người
- Tự xóa phòng sau 2 giờ hoặc khi cả hai rời
- Không lưu ván đấu trên server (chỉ relay tin nhắn)
