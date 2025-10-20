# API 模塊分離說明

## 📁 新的文件結構

```
app/static/js/
├── api.js       # 新增：API 交互模塊（與後端通信）
├── script.js    # 主要：UI 邏輯和用戶交互
└── config.example.js
```

---

## 🔄 架構改進

### **之前（耦合架構）**
```
script.js (1000+ 行)
├── UI 邏輯
├── API 調用
├── 事件處理
└── 數據管理
```

### **現在（分離架構）**
```
api.js (100 行)
└── API 交互邏輯
    ├── sendChatMessage()
    ├── sendTextMessage()
    ├── sendImageMessage()
    └── checkConnection()

script.js (900+ 行)
└── UI 和業務邏輯
    ├── DOM 操作
    ├── 事件處理
    ├── 語言管理
    └── 調用 api.js
```

---

## 🎯 優點

### 1. **關注點分離**
- `api.js`：專注於後端通信
- `script.js`：專注於用戶界面

### 2. **易於維護**
- API 變更只需修改 `api.js`
- UI 變更只需修改 `script.js`

### 3. **可重用性**
```javascript
// 在任何地方都可以使用
const response = await chatAPI.sendTextMessage('你好', 'zh-CN');
```

### 4. **易於測試**
```javascript
// 可以單獨測試 API 模塊
const isConnected = await chatAPI.checkConnection();
```

### 5. **錯誤處理集中**
- 所有 API 錯誤在一個地方處理
- 統一的錯誤訊息格式

---

## 📖 使用方法

### **發送純文字訊息**
```javascript
try {
    const response = await chatAPI.sendTextMessage('你好嗎？', 'zh-TW');
    console.log(response);
} catch (error) {
    console.error('發送失敗:', error.message);
}
```

### **發送帶圖片的訊息**
```javascript
const fileInput = document.getElementById('imageInput');
const file = fileInput.files[0];

try {
    const response = await chatAPI.sendImageMessage(
        '請分析這張圖片',
        file,
        'zh-CN'
    );
    console.log(response);
} catch (error) {
    console.error('發送失敗:', error.message);
}
```

### **檢查連接狀態**
```javascript
const isOnline = await chatAPI.checkConnection();
if (!isOnline) {
    alert('無法連接到服務器');
}
```

---

## 🔧 API 類方法

### `ChatAPI` 類

#### 構造函數
```javascript
const api = new ChatAPI();
```

#### 方法列表

| 方法 | 參數 | 返回 | 說明 |
|------|------|------|------|
| `sendChatMessage(message, imageFile, language)` | string, File?, string | Promise\<string\> | 通用發送方法 |
| `sendTextMessage(message, language)` | string, string | Promise\<string\> | 發送純文字 |
| `sendImageMessage(message, imageFile, language)` | string, File, string | Promise\<string\> | 發送帶圖片 |
| `checkConnection()` | - | Promise\<boolean\> | 檢查連接 |

---

## 🌐 全域實例

系統自動創建了一個全域實例：

```javascript
// 直接使用全域實例
chatAPI.sendTextMessage('Hello', 'en');

// 或創建新實例
const myAPI = new ChatAPI();
myAPI.sendTextMessage('你好', 'zh-CN');
```

---

## 📝 HTML 載入順序

**重要：** 必須先載入 `api.js`，再載入 `script.js`

```html
<!-- ✅ 正確順序 -->
<script src="../static/js/api.js"></script>
<script src="../static/js/script.js"></script>

<!-- ❌ 錯誤順序 -->
<script src="../static/js/script.js"></script>
<script src="../static/js/api.js"></script>
```

---

## 🔍 代碼對比

### **之前的方式**
```javascript
// script.js 中直接寫 API 調用
async function callBackendAPI(userMessage, imageFile = null) {
    const formData = new FormData();
    formData.append('message', userMessage);
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    const response = await fetch('/chat', {
        method: 'POST',
        body: formData
    });
    // ... 更多代碼
}
```

### **現在的方式**
```javascript
// api.js 中定義
class ChatAPI {
    async sendChatMessage(userMessage, imageFile, language) {
        // ... API 邏輯
    }
}

// script.js 中使用
const response = await chatAPI.sendTextMessage(message, currentLanguage);
```

---

## 🚀 未來擴展

這個架構方便未來添加更多功能：

```javascript
class ChatAPI {
    // 現有方法
    async sendTextMessage() { ... }
    
    // 可以輕鬆添加新方法
    async getConversationHistory() { ... }
    async deleteConversation(id) { ... }
    async uploadFile(file) { ... }
    async generateImage(prompt) { ... }
}
```

---

## ⚠️ 注意事項

1. **依賴順序**：確保 HTML 中 `api.js` 在 `script.js` 之前載入
2. **全域變量**：`chatAPI` 是全域實例，可在任何地方使用
3. **錯誤處理**：所有方法都會拋出錯誤，需要用 `try-catch` 捕獲
4. **語言參數**：記得傳遞正確的語言代碼（'zh-CN', 'zh-TW', 'en'）

---

## 📊 影響範圍

### 修改的文件
- ✅ `app/static/js/api.js` - **新建**
- ✅ `app/static/js/script.js` - **修改**（移除 API 代碼）
- ✅ `app/templates/index.html` - **修改**（添加 api.js 引用）

### 不需要修改的文件
- ✅ `app/routes.py` - 後端 API 不變
- ✅ `app/vertex_ai.py` - AI 邏輯不變
- ✅ HTML/CSS - 界面不變

---

## ✅ 測試檢查清單

- [ ] 發送純文字訊息正常
- [ ] 上傳並分析圖片正常
- [ ] 錯誤訊息顯示正確的語言
- [ ] 對話歷史記錄正常
- [ ] 語言切換功能正常
- [ ] 所有 UI 功能無影響

---

**總結**：這次重構將 API 調用邏輯完全分離，使代碼更模塊化、更易維護，為未來功能擴展打下良好基礎！
