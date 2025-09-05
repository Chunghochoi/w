const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// CƠ SỞ DỮ LIỆU GIẢ LẬP
// Trong thực tế, bạn sẽ dùng PostgreSQL hoặc Redis trên Render
// Cấu trúc: { shortCode: { originalUrl, password, features, ... } }
const urlDatabase = {};

app.use(express.json());
// Phục vụ các file tĩnh từ thư mục 'public', nhưng không phải cho mọi đường dẫn
app.use(express.static(path.join(__dirname, 'public')));

// API ĐỂ TẠO LINK MỚI (Nâng cấp)
app.post('/api/create', (req, res) => {
    const { originalUrl, password, features, title } = req.body;

    if (!originalUrl || !features || !Array.isArray(features)) {
        return res.status(400).json({ error: 'URL gốc và các tính năng là bắt buộc.' });
    }

    const shortCode = crypto.randomBytes(4).toString('hex'); // 8 ký tự

    const linkData = {
        originalUrl,
        password: password || null, // Lưu null nếu không có mật khẩu
        features,
        title: title || originalUrl,
        createdAt: new Date().toISOString(),
        clicks: 0,
        // Các trường analytics có thể được thêm ở đây
    };

    urlDatabase[shortCode] = linkData;

    const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
    res.status(201).json({ shortUrl });
});

// ENDPOINT XỬ LÝ CHUYỂN HƯỚNG VÀ XÁC THỰC (Logic chính)
app.get('/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    const linkData = urlDatabase[shortCode];

    if (linkData) {
        // Tìm thấy link! Thay vì redirect, chúng ta sẽ gửi file index.html
        // đã được "nhúng" dữ liệu của link.
        try {
            const indexPath = path.join(__dirname, 'public', 'index.html');
            let htmlContent = fs.readFileSync(indexPath, 'utf8');

            // Tạo một đối tượng an toàn chỉ chứa thông tin cần thiết cho client
            const clientSafeData = {
                originalUrl: linkData.originalUrl,
                password: linkData.password,
                features: linkData.features,
            };

            // Nhúng dữ liệu vào HTML. Client sẽ đọc biến __LINK_DATA__ này.
            const scriptToInject = `<script>window.__LINK_DATA__ = ${JSON.stringify(clientSafeData)};</script>`;
            htmlContent = htmlContent.replace('</head>', `${scriptToInject}</head>`);
            
            res.send(htmlContent);

        } catch (error) {
            console.error("Error reading index.html:", error);
            res.status(500).send("Lỗi máy chủ.");
        }
    } else {
        // Không tìm thấy link, trả về trang lỗi 404 (hoặc bạn có thể redirect về trang chủ)
        res.status(404).send('<h1>404 Not Found</h1><p>Link không tồn tại hoặc đã bị xóa.</p>');
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
