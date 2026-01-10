/**
 * Assessment Questions Database
 * 多個評估項目，每個評估10題，每題都有熊熊示範視頻
 */

const AssessmentQuestions = {
    // 大運動評估 (0-6個月)
    'gross_motor_0_6': [
        {
            id: 1,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否抬頭？',
            description: '觀察兒童俯臥時是否能抬起頭部，保持幾秒鐘。',
            videoUrl: '/static/videos_quesyions/video/伸手取物 ture.mp4'
        },
        {
            id: 2,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否翻身？',
            description: '觀察兒童是否能從仰臥翻到俯臥或相反。',
            videoUrl: '/static/videos_quesyions/video/翻身 ture.mp4'
        },
        {
            id: 3,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否用手肘支撐？',
            description: '觀察兒童俯臥時是否能用手肘支撐上半身。',
            videoUrl: '/static/videos_quesyions/video/手肘支撑(0-6) ture.mp4'
        },
        {
            id: 4,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否伸腿踢踏？',
            description: '觀察兒童仰臥時是否能伸腿做踢踏動作。',
            videoUrl: '/static/videos_quesyions/video/伸腿踢踏(0-6) ture.mp4'
        },
        {
            id: 5,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否抓握物品？',
            description: '觀察兒童是否能抓住並握住物品。',
            videoUrl: '/static/videos_quesyions/video/抓握物品(0-6) ture.mp4'
        },
        {
            id: 6,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否坐起時保持頭部穩定？',
            description: '觀察被扶起坐時頭部是否穩定，不會搖晃。',
            videoUrl: '/static/videos_quesyions/video/保持頭部穩定(0-6)ture.mp4'
        },
        {
            id: 7,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否移動身體？',
            description: '觀察兒童是否能通過扭動身體改變位置。',
            videoUrl: '/static/videos_quesyions/video/移動身體 ture.mp4'
        },
        {
            id: 8,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否用手支撐坐？',
            description: '觀察兒童坐著時是否能用手支撐身體。',
            videoUrl: '/static/videos_quesyions/video/手支撐坐(0-6)ture.mp4'
        },
        {
            id: 9,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否彎曲膝蓋？',
            description: '觀察兒童是否能主動彎曲並伸展膝蓋。',
            videoUrl: '/static/videos_quesyions/video/彎曲膝蓋(0-6)ture.mp4'
        },
        {
            id: 10,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否伸手取物？',
            description: '觀察兒童是否能伸手去抓取面前的物品。',
            videoUrl: '/static/videos_quesyions/video/伸手取物 (0-6) ture.mp4'
        }
    ],

    // 大運動評估 (6-12個月)
    'gross_motor_6_12': [
        {
            id: 1,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否獨立坐？',
            description: '觀察兒童是否能不需要支撐獨立坐著。',
            videoUrl: '/static/videos_quesyions/video_(6-12)/獨立坐 ture.mp4'
        },
        {
            id: 2,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否爬行？',
            description: '觀察兒童是否能用手膝爬行移動。',
            videoUrl: '/static/videos_quesyions/video_(6-12)/爬行 ture.mp4'
        },
        {
            id: 3,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否扶站？',
            description: '觀察兒童是否能扶著家具站立。',
            videoUrl: '/static/videos_quesyions/video_(6-12)/扶站  ture.mp4'
        },
        {
            id: 4,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否扶走？',
            description: '觀察兒童是否能扶著家具橫向移動。',
            videoUrl: '/static/videos_quesyions/video_(6-12)/扶走 ture.mp4'
        },
        {
            id: 5,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否拍手？',
            description: '觀察兒童是否能雙手合拍。',
            videoUrl: '/static/videos_quesyions/video_(6-12)/拍手 ture.mp4'
        },
        {
            id: 6,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否揮手？',
            description: '觀察兒童是否能做出揮手再見的動作。',
            videoUrl: '/static/videos_quesyions/video_(6-12)/揮手 ture.mp4'
        },
        {
            id: 7,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否用食指指東西？',
            description: '觀察兒童是否能用食指指向物品。',
            videoUrl: '/static/videos_quesyions/video_(6-12)/食指指向物品 ture.mp4'
        },
        {
            id: 8,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否把物品放進容器？',
            description: '觀察兒童是否能把小物品放入容器中。',
            videoUrl: '/static/videos_quesyions/video_(6-12)/物品放進容器 ture.mp4'
        },
        {
            id: 9,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否翻書頁？',
            description: '觀察兒童是否能翻動厚紙板書的頁面。',
            videoUrl: '/static/videos_quesyions/video_(6-12)/翻書頁 ture.mp4'
        },
        {
            id: 10,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否短暫獨立站立？',
            description: '觀察兒童是否能不扶任何東西獨立站幾秒。',
            videoUrl: '/static/videos_quesyions/video_(6-12)/短暫獨立站立 ture.mp4'
        }
    ],

    // 精細動作評估 (12-24個月)
    'fine_motor_12_24': [
        {
            id: 1,
            domain: '精細動作',
            emoji: '🐻',
            question: '兒童能否用拇指和食指捏取小物品？',
            description: '觀察兒童是否能用拇指和食指精準捏取小珠子。',
            videoUrl: '/static/videos_quesyions/video/12-24 months/拇指和食指精準捏取小珠子 ture.mp4'
        },
        {
            id: 2,
            domain: '精細動作',
            emoji: '🐻',
            question: '兒童能否堆疊積木？',
            description: '觀察兒童是否能堆疊2-3塊積木。',
            videoUrl: '/static/videos_quesyions/video/12-24 months/堆疊積木 ture.mp4'
        },
        {
            id: 3,
            domain: '精細動作',
            emoji: '🐻',
            question: '兒童能否塗鴉？',
            description: '觀察兒童是否能握筆在紙上塗鴉。',
            videoUrl: '/static/videos_quesyions/video/12-24 months/握筆在紙上塗鴉  ture.mp4'
        },
        {
            id: 4,
            domain: '精細動作',
            emoji: '🐻',
            question: '兒童能否翻薄頁書？',
            description: '觀察兒童是否能翻動普通書的頁面。',
            videoUrl: '/static/videos_quesyions/video/12-24 months/翻書頁(12-24) ture.mp4'
        },
        {
            id: 5,
            domain: '精細動作',
            emoji: '🐻',
            question: '兒童能否用勺子進食？',
            description: '觀察兒童是否能用勺子舀食物送到嘴裡。',
            videoUrl: '/static/videos_quesyions/video/12-24 months/勺子進食 ture.mp4'
        },
        {
            id: 6,
            domain: '精細動作',
            emoji: '🐻',
            question: '兒童能否脫襪子？',
            description: '觀察兒童是否能自己脫掉襪子。',
            videoUrl: '/static/videos_quesyions/video/12-24 months/脫襪子  ture.mp4'
        },
        {
            id: 7,
            domain: '精細動作',
            emoji: '🐻',
            question: '兒童能否拉開拉鍊？',
            description: '觀察兒童是否能拉開大拉鍊。',
            videoUrl: '/static/videos_quesyions/video/12-24 months/拉開拉鍊 ture.mp4'
        },
        {
            id: 8,
            domain: '精細動作',
            emoji: '🐻',
            question: '兒童能否轉動門把？',
            description: '觀察兒童是否能轉動圓形門把。',
            videoUrl: '/static/videos_quesyions/video/12-24 months/轉動圓形門把 ture.mp4'
        },
        {
            id: 9,
            domain: '精細動作',
            emoji: '🐻',
            question: '兒童能否投球？',
            description: '觀察兒童是否能將球投向目標。',
            videoUrl: '/static/videos_quesyions/video/12-24 months/投球 ture.mp4'
        },
        {
            id: 10,
            domain: '精細動作',
            emoji: '🐻',
            question: '兒童能否模仿畫圓？',
            description: '觀察兒童是否能模仿畫出圓形。',
            videoUrl: '/static/videos_quesyions/video/12-24 months/畫出圓形 ture.mp4'
        }
    ],

    // 語言發展評估 (12-24個月)
    'language_12_24': [
        {
            id: 1,
            domain: '語言',
            emoji: '🐻',
            question: '兒童能否說出簡單詞彙？',
            description: '觀察兒童是否能說"媽媽"、"爸爸"等詞。',
           
        },
        {
            id: 2,
            domain: '語言',
            emoji: '🐻',
            question: '兒童能否指認身體部位？',
            description: '觀察兒童是否能指出眼睛、鼻子等部位。',
            
        },
        {
            id: 3,
            domain: '語言',
            emoji: '🐻',
            question: '兒童能否執行簡單指令？',
            description: '觀察兒童是否能遵從"拿球"等簡單指令。',
           
        },
        {
            id: 4,
            domain: '語言',
            emoji: '🐻',
            question: '兒童能否模仿聲音？',
            description: '觀察兒童是否能模仿動物叫聲或簡單聲音。',
           
        },
        {
            id: 5,
            domain: '語言',
            emoji: '🐻',
            question: '兒童能否說出物品名稱？',
            description: '觀察兒童是否能說出常見物品的名稱。',
            
        },
        {
            id: 6,
            domain: '語言',
            emoji: '🐻',
            question: '兒童能否用手勢表達需求？',
            description: '觀察兒童是否會用手勢表示"要"或"不要"。',
           
        },
        {
            id: 7,
            domain: '語言',
            emoji: '🐻',
            question: '兒童能否說兩個詞的短句？',
            description: '觀察兒童是否能說"要水"等兩詞組合。',
           
        },
        {
            id: 8,
            domain: '語言',
            emoji: '🐻',
            question: '兒童能否回應自己的名字？',
            description: '觀察兒童聽到名字時是否會回應或轉頭。',
            
        },
        {
            id: 9,
            domain: '語言',
            emoji: '🐻',
            question: '兒童能否指認圖片中的物品？',
            description: '觀察兒童是否能在圖片中指出被問到的物品。',
           
        },
        {
            id: 10,
            domain: '語言',
            emoji: '🐻',
            question: '兒童能否表達"還要"的意思？',
            description: '觀察兒童是否會用語言或手勢表示還要。',
            
        }
    ],

    // 社交能力評估 (24-36個月)
    'social_24_36': [
        {
            id: 1,
            domain: '社交',
            emoji: '🐻',
            question: '兒童能否與其他孩子一起玩？',
            description: '觀察兒童是否願意與其他孩子互動玩耍。',
            
        },
        {
            id: 2,
            domain: '社交',
            emoji: '🐻',
            question: '兒童能否分享玩具？',
            description: '觀察兒童是否願意與他人分享玩具。',
            
        },
        {
            id: 3,
            domain: '社交',
            emoji: '🐻',
            question: '兒童能否表達情感？',
            description: '觀察兒童是否能表達開心、難過等情感。',
            
        },
        {
            id: 4,
            domain: '社交',
            emoji: '🐻',
            question: '兒童能否輪流等待？',
            description: '觀察兒童是否能在遊戲中輪流等待。',
            
        },
        {
            id: 5,
            domain: '社交',
            emoji: '🐻',
            question: '兒童能否安慰他人？',
            description: '觀察兒童看到他人哭泣時是否會表示關心。',
            
        },
        {
            id: 6,
            domain: '社交',
            emoji: '🐻',
            question: '兒童能否遵守簡單規則？',
            description: '觀察兒童是否能遵守遊戲的簡單規則。',
            
        },
        {
            id: 7,
            domain: '社交',
            emoji: '🐻',
            question: '兒童能否主動打招呼？',
            description: '觀察兒童是否會主動向熟人打招呼。',
            
        },
        {
            id: 8,
            domain: '社交',
            emoji: '🐻',
            question: '兒童能否參與假裝遊戲？',
            description: '觀察兒童是否會玩假裝遊戲（如扮家家酒）。',
            
        },
        {
            id: 9,
            domain: '社交',
            emoji: '🐻',
            question: '兒童能否尋求幫助？',
            description: '觀察兒童遇到困難時是否會尋求成人幫助。',
            
        },
        {
            id: 10,
            domain: '社交',
            emoji: '🐻',
            question: '兒童能否理解"我的"和"你的"？',
            description: '觀察兒童是否理解物品所有權的概念。',
            
        }
    ],

    // 認知發展評估 (36-48個月)
    'cognitive_36_48': [
        {
            id: 1,
            domain: '認知',
            emoji: '🐻',
            question: '兒童能否覆述數字',
            description: '觀察兒童能聽後立刻覆述三個數字。',
            
        },
        {
            id: 2,
            domain: '認知',
            emoji: '🐻',
            question: '兒童能否辨認並說出自己的姓名、性別及年齡？',
            description: '觀察兒童是否能正確回答自己的姓名、性別及年齡。',
            
        },
        {
            id: 3,
            domain: '認知',
            emoji: '🐻',
            question: '兒童能否從兩件物件中分辨出大／小、長／短、幼滑／粗糙、堅硬／柔軟？',
            description: '觀察兒童是否能正確分辨並指出物件的大小、長短、質感及硬度。',
            
        },
        {
            id: 4,
            domain: '認知',
            emoji: '🐻',
            question: '兒童能否認識三至四種顏色的名稱？',
            description: '觀察兒童是否能正確說出三至四種顏色的名稱。',
            
        },
        {
            id: 5,
            domain: '認知',
            emoji: '🐻',
            question: '兒童能否完成簡單拼圖？',
            description: '觀察兒童是否能完成4-6塊的拼圖。',
            
        },
        {
            id: 6,
            domain: '認知',
            emoji: '🐻',
            question: '兒童是否開始懂得把物件分類和組合，例如：食物、衣服、鞋配襪、杯配碟？',
            description: '觀察兒童是否能依物件的種類或功能進行分類與配對。',
            
        },
        {
            id: 7,
            domain: '認知',
            emoji: '🐻',
            question: '兒童是否明白先後次序，能把積木或珠子依圖案排序？',
            description: '觀察兒童是否能依照圖案或指示，正確地將積木或珠子排序。',
            
        },
        {
            id: 8,
            domain: '認知',
            emoji: '🐻',
            question: '兒童在畫人像時，能否繪出頭和身體其中部分？',
            description: '觀察兒童是否在繪畫人像時能畫出頭部及身體的部分特徵。',
            
        },
        {
            id: 9,
            domain: '認知',
            emoji: '🐻',
            question: '兒童能否分辨男女？',
            description: '觀察兒童是否能正確指出並區分男性與女性。',
            
        },
        {
            id: 10,
            domain: '認知',
            emoji: '🐻',
            question: '兒童能否經一至兩次嘗試，便能把五個環依大小次序穿在棍上？',
            description: '觀察兒童是否能在短時間內，依大小順序將五個環正確套在棍上。',
            
        }
    ]
};

// 導出供其他模塊使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssessmentQuestions;
}
