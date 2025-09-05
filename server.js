// server.js
const express = require('express');
const crypto = require('crypto'); // Để tạo mã ngẫu nhiên
const app = express();
const PORT = process.env.PORT || 3000;

// Giả lập một cơ sở dữ liệu bằng một đối tượng JavaScript
// Trong thực tế, bạn sẽ kết nối tới PostgreSQL hoặc Redis trên Render
const urlDatabase = {}; 

// Middleware để xử lý JSON và phục vụ các file tĩnh từ thư mục 'public'
app.use(express.json());
app.use(express.static('public'));

// 1. API ĐỂ TẠO LINK MỚI
app.post('/api/create', (req, res) => {
    const { originalUrl } = req.body;
    if (!originalUrl) {
        return res.status(400).json({ error: 'Original URL is required' });
    }

    // Tạo một mã ngắn 6 ký tự ngẫu nhiên
    const shortCode = crypto.randomBytes(3).toString('hex'); 
    
    // Lưu vào "cơ sở dữ liệu"
    urlDatabase[shortCode] = originalUrl;

    // Trả về link rút gọn cho client
    const shortUrl = `https://${req.get('host')}/${shortCode}`;
    res.json({ shortUrl });
});

// 2. LOGIC CHUYỂN HƯỚNG
app.get('/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    const originalUrl = urlDatabase[shortCode];

    if (originalUrl) {
        // Nếu tìm thấy, chuyển hướng người dùng
        res.redirect(originalUrl);
    } else {
        // Nếu không, báo lỗi 404
        res.status(404).send('Link not found or expired');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
