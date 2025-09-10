const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CẢI TIẾN: SỬ DỤNG TỆP JSON LÀM CƠ SỞ DỮ LIỆU ---
const DB_PATH = path.join(__dirname, 'database.json');

// Hàm để đọc dữ liệu từ file
const readDatabase = () => {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Lỗi khi đọc database:", error);
    }
    // Trả về đối tượng rỗng nếu file không tồn tại hoặc có lỗi
    return {}; 
};

// Hàm để ghi dữ liệu vào file
const writeDatabase = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); // `null, 2` để format file JSON cho đẹp
    } catch (error) {
        console.error("Lỗi khi ghi vào database:", error);
    }
};

// Khởi tạo urlDatabase bằng cách đọc từ file
let urlDatabase = readDatabase();
// ----------------------------------------------------

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API ĐỂ TẠO LINK MỚI (Nâng cấp)
app.post('/api/create', (req, res) => {
    const { originalUrl, password, features, title } = req.body;

    if (!originalUrl || !features || !Array.isArray(features)) {
        return res.status(400).json({ error: 'URL gốc và các tính năng là bắt buộc.' });
    }

    const shortCode = crypto.randomBytes(4).toString('hex');

    const linkData = {
        originalUrl,
        password: password || null,
        features,
        title: title || originalUrl,
        createdAt: new Date().toISOString(),
        clicks: 0,
    };

    urlDatabase[shortCode] = linkData;
    
    // --- CẢI TIẾN: GHI DỮ LIỆU MỚI VÀO FILE ---
    writeDatabase(urlDatabase);
    // ------------------------------------------

    const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
    res.status(201).json({ shortUrl });
});

// ENDPOINT XỬ LÝ CHUYỂN HƯỚNG VÀ XÁC THỰC
app.get('/:shortCode', (req, res) => {
    // --- CẢI TIẾN: ĐẢM BẢO DỮ LIỆU LUÔN MỚI NHẤT ---
    // (Tùy chọn, nhưng hữu ích nếu có nhiều server cùng chạy)
    // urlDatabase = readDatabase(); 
    // ---------------------------------------------
    
    const { shortCode } = req.params;
    const linkData = urlDatabase[shortCode];

    if (linkData) {
        try {
            const indexPath = path.join(__dirname, 'public', 'index.html');
            let htmlContent = fs.readFileSync(indexPath, 'utf8');
            
            const clientSafeData = {
                originalUrl: linkData.originalUrl,
                password: linkData.password,
                features: linkData.features,
            };

            const scriptToInject = `<script>window.__LINK_DATA__ = ${JSON.stringify(clientSafeData)};</script>`;
            htmlContent = htmlContent.replace('</head>', `${scriptToInject}</head>`);
            
            res.send(htmlContent);

        } catch (error) {
            console.error("Error reading index.html:", error);
            res.status(500).send("Lỗi máy chủ.");
        }
    } else {
        res.status(404).send('<h1>404 Not Found</h1><p>Link không tồn tại hoặc đã bị xóa.</p>');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
