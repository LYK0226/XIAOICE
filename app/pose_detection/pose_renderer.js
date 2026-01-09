/**
 * PoseRenderer - 在畫布上繪製全方位標記點（姿勢、臉、手）
 * 
 * 支援繪製共 543 個標記點：
 * - 33 個姿勢標記點
 * - 468 個臉部標記點
 * - 每手 21 個手部標記點（兩手共 42 個）
 */
class PoseRenderer {
    constructor() {
        // 定義關鍵點連線以形成骨架
        // 格式: [起點索引, 終點索引]
        this.POSE_CONNECTIONS = [
            // 手臂
            [11, 13], [13, 15],  // 左手臂: 肩-肘-腕
            [12, 14], [14, 16],  // 右手臂: 肩-肘-腕
            
            // 肩膀
            [11, 12],
            
            // 軀幹
            [11, 23], [12, 24],  // 肩膀到臀部
            
            // 臀部
            [23, 24],
            
            // 腿部
            [23, 25], [25, 27],  // 左腿: 臀-膝-踝
            [24, 26], [26, 28]   // 右腿: 臀-膝-踝
        ];

        // 手部連線（每手 21 個標記點）
        this.HAND_CONNECTIONS = [
            // 拇指
            [0, 1], [1, 2], [2, 3], [3, 4],
            // 食指
            [0, 5], [5, 6], [6, 7], [7, 8],
            // 中指
            [0, 9], [9, 10], [10, 11], [11, 12],
            // 無名指
            [0, 13], [13, 14], [14, 15], [15, 16],
            // 小指
            [0, 17], [17, 18], [18, 19], [19, 20],
            // 手掌
            [5, 9], [9, 13], [13, 17]
        ];

        // 臉部網格連線（簡化 - 僅主要輪廓）
        this.FACE_OVAL_CONNECTIONS = [
            [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
            [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397],
            [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
            [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
            [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
            [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10]
        ];

        // 嘴唇連線
        this.LIPS_CONNECTIONS = [
            // 外唇
            [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314],
            [314, 405], [405, 321], [321, 375], [375, 291], [291, 61],
            // 內唇
            [78, 95], [95, 88], [88, 178], [178, 87], [87, 14], [14, 317],
            [317, 402], [402, 318], [318, 324], [324, 308], [308, 78]
        ];

        // 左眼連線
        this.LEFT_EYE_CONNECTIONS = [
            [263, 249], [249, 390], [390, 373], [373, 374], [374, 380],
            [380, 381], [381, 382], [382, 362], [362, 263],
            [466, 388], [388, 387], [387, 386], [386, 385], [385, 384],
            [384, 398], [398, 466]
        ];

        // 右眼連線
        this.RIGHT_EYE_CONNECTIONS = [
            [33, 7], [7, 163], [163, 144], [144, 145], [145, 153],
            [153, 154], [154, 155], [155, 133], [133, 33],
            [246, 161], [161, 160], [160, 159], [159, 158], [158, 157],
            [157, 173], [173, 246]
        ];

        // 左眉毛連線 (Left eyebrow)
        this.LEFT_EYEBROW_CONNECTIONS = [
            [276, 283], [283, 282], [282, 295], [295, 285],
            [300, 293], [293, 334], [334, 296], [296, 336]
        ];

        // 右眉毛連線 (Right eyebrow)
        this.RIGHT_EYEBROW_CONNECTIONS = [
            [46, 53], [53, 52], [52, 65], [65, 55],
            [70, 63], [63, 105], [105, 66], [66, 107]
        ];

        // 完整臉部網格三角連線 (MediaPipe Face Mesh Tesselation - 全臉覆蓋)
        this.FACE_MESH_TESSELATION = [
            // 右側臉部 (Right side)
            [127, 34], [34, 139], [139, 127], [11, 0], [0, 37], [37, 11], [232, 231], [231, 120], [120, 232],
            [72, 37], [37, 39], [39, 72], [128, 121], [121, 47], [47, 128], [232, 121], [121, 128], [128, 232],
            [104, 69], [69, 67], [67, 104], [175, 171], [171, 148], [148, 175], [118, 50], [50, 101], [101, 118],
            [73, 39], [39, 40], [40, 73], [9, 151], [151, 108], [108, 9], [48, 115], [115, 131], [131, 48],
            [194, 204], [204, 211], [211, 194], [74, 40], [40, 185], [185, 74], [80, 42], [42, 183], [183, 80],
            [40, 92], [92, 186], [186, 40], [230, 229], [229, 118], [118, 230], [202, 212], [212, 214], [214, 202],
            [83, 18], [18, 17], [17, 83], [76, 61], [61, 146], [146, 76], [160, 29], [29, 30], [30, 160],
            [56, 157], [157, 173], [173, 56], [106, 204], [204, 194], [194, 106], [135, 214], [214, 192], [192, 135],
            [203, 165], [165, 98], [98, 203], [21, 71], [71, 68], [68, 21], [51, 45], [45, 4], [4, 51],
            [144, 24], [24, 23], [23, 144], [77, 146], [146, 91], [91, 77], [205, 50], [50, 187], [187, 205],
            [201, 200], [200, 18], [18, 201], [91, 106], [106, 182], [182, 91], [90, 91], [91, 181], [181, 90],
            [85, 84], [84, 17], [17, 85], [206, 203], [203, 36], [36, 206], [148, 171], [171, 140], [140, 148],
            [92, 40], [40, 39], [39, 92], [193, 189], [189, 244], [244, 193], [159, 158], [158, 28], [28, 159],
            [247, 246], [246, 161], [161, 247], [236, 3], [3, 196], [196, 236], [54, 68], [68, 104], [104, 54],
            [193, 168], [168, 8], [8, 193], [117, 228], [228, 31], [31, 117], [189, 193], [193, 55], [55, 189],
            [98, 97], [97, 99], [99, 98], [126, 47], [47, 100], [100, 126], [166, 79], [79, 218], [218, 166],
            [155, 154], [154, 26], [26, 155], [209, 49], [49, 131], [131, 209], [135, 136], [136, 150], [150, 135],
            [47, 126], [126, 217], [217, 47], [223, 52], [52, 53], [53, 223], [45, 51], [51, 134], [134, 45],
            [211, 170], [170, 140], [140, 211], [67, 69], [69, 108], [108, 67], [43, 106], [106, 91], [91, 43],
            [230, 119], [119, 120], [120, 230], [226, 130], [130, 247], [247, 226], [63, 53], [53, 52], [52, 63],
            [238, 20], [20, 242], [242, 238], [46, 70], [70, 156], [156, 46], [78, 62], [62, 96], [96, 78],
            [46, 53], [53, 63], [63, 46], [143, 34], [34, 227], [227, 143], [123, 117], [117, 111], [111, 123],
            [44, 125], [125, 19], [19, 44], [236, 134], [134, 51], [51, 236], [216, 206], [206, 205], [205, 216],
            [154, 153], [153, 22], [22, 154], [39, 37], [37, 167], [167, 39], [200, 201], [201, 208], [208, 200],
            [36, 142], [142, 100], [100, 36], [57, 212], [212, 202], [202, 57], [20, 60], [60, 99], [99, 20],
            [28, 158], [158, 157], [157, 28], [35, 226], [226, 113], [113, 35], [160, 159], [159, 27], [27, 160],
            [204, 202], [202, 210], [210, 204], [113, 225], [225, 46], [46, 113], [43, 202], [202, 204], [204, 43],
            [62, 76], [76, 77], [77, 62], [137, 123], [123, 116], [116, 137], [41, 38], [38, 72], [72, 41],
            [203, 129], [129, 142], [142, 203], [64, 98], [98, 240], [240, 64], [49, 102], [102, 64], [64, 49],
            [41, 73], [73, 74], [74, 41], [212, 216], [216, 207], [207, 212], [42, 74], [74, 184], [184, 42],
            [169, 170], [170, 211], [211, 169], [170, 149], [149, 176], [176, 170], [105, 66], [66, 69], [69, 105],
            [122, 6], [6, 168], [168, 122], [123, 147], [147, 187], [187, 123], [96, 77], [77, 90], [90, 96],
            [65, 55], [55, 107], [107, 65], [89, 90], [90, 180], [180, 89], [101, 100], [100, 120], [120, 101],
            [63, 105], [105, 104], [104, 63], [93, 137], [137, 227], [227, 93], [15, 86], [86, 85], [85, 15],
            [129, 102], [102, 49], [49, 129], [14, 87], [87, 86], [86, 14], [55, 8], [8, 9], [9, 55],
            [100, 47], [47, 121], [121, 100], [145, 23], [23, 22], [22, 145], [88, 89], [89, 179], [179, 88],
            [6, 168], [168, 193], [193, 6], [119, 118], [118, 101], [101, 119],
            [75, 76], [76, 146], [146, 75], [139, 34], [34, 143], [143, 139], [28, 27], [27, 158], [158, 28],
            [174, 171], [171, 175], [175, 174], [83, 82], [82, 38], [38, 83], [61, 76], [76, 75], [75, 61],
            [146, 61], [61, 185], [185, 146], [41, 72], [72, 38], [38, 41], [167, 37], [37, 0], [0, 167],
            [123, 137], [137, 177], [177, 123], [112, 233], [233, 232], [232, 112], [196, 134], [134, 236], [236, 196],
            [230, 231], [231, 232], [232, 230], [112, 232], [232, 128], [128, 112],
            [217, 126], [126, 234], [234, 217], [234, 127], [127, 93], [93, 234],
            [136, 135], [135, 192], [192, 136], [227, 34], [34, 127], [127, 227],
            // 左側臉部 (Left side - mirrored landmarks 251-467)
            [356, 264], [264, 368], [368, 356], [240, 269], [269, 267], [267, 240],
            [452, 451], [451, 349], [349, 452], [302, 267], [267, 269], [269, 302],
            [357, 350], [350, 277], [277, 357], [452, 350], [350, 357], [357, 452],
            [333, 299], [299, 297], [297, 333], [399, 400], [400, 377], [377, 399],
            [347, 280], [280, 330], [330, 347], [303, 269], [269, 270], [270, 303],
            [338, 380], [380, 337], [337, 338], [278, 279], [279, 360], [360, 278],
            [418, 424], [424, 431], [431, 418], [304, 270], [270, 409], [409, 304],
            [310, 272], [272, 407], [407, 310], [270, 322], [322, 410], [410, 270],
            [450, 449], [449, 347], [347, 450], [422, 432], [432, 434], [434, 422],
            [313, 18], [18, 17], [17, 313], [306, 291], [291, 375], [375, 306],
            [389, 259], [259, 260], [260, 389], [286, 384], [384, 398], [398, 286],
            [336, 424], [424, 418], [418, 336], [364, 434], [434, 416], [416, 364],
            [423, 391], [391, 327], [327, 423], [251, 301], [301, 298], [298, 251],
            [281, 275], [275, 4], [4, 281], [373, 253], [253, 252], [252, 373],
            [307, 375], [375, 321], [321, 307], [425, 280], [280, 411], [411, 425],
            [421, 200], [200, 18], [18, 421], [321, 336], [336, 406], [406, 321],
            [320, 321], [321, 405], [405, 320], [315, 314], [314, 17], [17, 315],
            [426, 423], [423, 266], [266, 426], [377, 400], [400, 369], [369, 377],
            [322, 270], [270, 269], [269, 322], [417, 413], [413, 464], [464, 417],
            [386, 385], [385, 258], [258, 386], [467, 466], [466, 390], [390, 467],
            [456, 3], [3, 420], [420, 456], [284, 298], [298, 333], [333, 284],
            [417, 168], [168, 8], [8, 417], [346, 448], [448, 261], [261, 346],
            [413, 417], [417, 285], [285, 413], [327, 326], [326, 328], [328, 327],
            [355, 277], [277, 329], [329, 355], [392, 309], [309, 454], [454, 392],
            [382, 381], [381, 256], [256, 382], [429, 279], [279, 360], [360, 429],
            [364, 365], [365, 379], [379, 364], [277, 355], [355, 447], [447, 277],
            [453, 282], [282, 283], [283, 453], [275, 281], [281, 363], [363, 275],
            [431, 395], [395, 369], [369, 431], [297, 299], [299, 337], [337, 297],
            [273, 336], [336, 321], [321, 273], [450, 348], [348, 349], [349, 450],
            [446, 359], [359, 467], [467, 446], [293, 283], [283, 282], [282, 293],
            [463, 341], [341, 256], [256, 463], [276, 300], [300, 383], [383, 276],
            [276, 283], [283, 293], [293, 276], [372, 264], [264, 457], [457, 372],
            [352, 346], [346, 340], [340, 352], [274, 354], [354, 19], [19, 274],
            [456, 363], [363, 281], [281, 456], [436, 426], [426, 425], [425, 436],
            [381, 380], [380, 252], [252, 381], [269, 267], [267, 393], [393, 269],
            [266, 421], [421, 428], [428, 266], [358, 371], [371, 329], [329, 358],
            [287, 432], [432, 422], [422, 287], [241, 290], [290, 328], [328, 241],
            [258, 385], [385, 384], [384, 258], [265, 446], [446, 342], [342, 265],
            [389, 386], [386, 257], [257, 389], [342, 446], [446, 276], [276, 342],
            [292, 306], [306, 307], [307, 292], [366, 352], [352, 345], [345, 366],
            [271, 268], [268, 302], [302, 271], [423, 358], [358, 371], [371, 423],
            [294, 327], [327, 460], [460, 294], [279, 331], [331, 294], [294, 279],
            [271, 303], [303, 304], [304, 271], [432, 436], [436, 427], [427, 432],
            [272, 304], [304, 408], [408, 272], [394, 395], [395, 431], [431, 394],
            [395, 378], [378, 402], [402, 395], [334, 296], [296, 299], [299, 334],
            [351, 6], [6, 168], [168, 351], [352, 376], [376, 411], [411, 352],
            [325, 307], [307, 320], [320, 325], [295, 285], [285, 336], [336, 295],
            [319, 320], [320, 403], [403, 319], [330, 329], [329, 349], [349, 330],
            [293, 334], [334, 333], [333, 293], [323, 366], [366, 457], [457, 323],
            [315, 316], [316, 315], [358, 129], [129, 331], [331, 358],
            [14, 317], [317, 316], [316, 14], [285, 8], [8, 9], [9, 285],
            [329, 277], [277, 350], [350, 329], [374, 252], [252, 253], [253, 374],
            [318, 319], [319, 403], [403, 318], [6, 168], [168, 417], [417, 6],
            [348, 347], [347, 330], [330, 348], [305, 306], [306, 375], [375, 305],
            [368, 264], [264, 372], [372, 368], [258, 257], [257, 385], [385, 258],
            [398, 400], [400, 399], [399, 398], [313, 312], [312, 268], [268, 313],
            [291, 306], [306, 305], [305, 291], [375, 291], [291, 409], [409, 375],
            [271, 302], [302, 268], [268, 271], [393, 267], [267, 0], [0, 393],
            [352, 366], [366, 401], [401, 352], [341, 463], [463, 452], [452, 341],
            [420, 363], [363, 456], [456, 420], [450, 451], [451, 452], [452, 450],
            [341, 452], [452, 357], [357, 341], [447, 355], [355, 454], [454, 447],
            [365, 364], [364, 416], [416, 365], [457, 264], [264, 356], [356, 457],
        ];
        
        // 關鍵點名稱參考（MediaPipe Pose 索引）
        this.KEYPOINT_NAMES = [
            'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
            'right_eye_inner', 'right_eye', 'right_eye_outer',
            'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
            'left_index', 'right_index', 'left_thumb', 'right_thumb',
            'left_hip', 'right_hip', 'left_knee', 'right_knee',
            'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
            'left_foot_index', 'right_foot_index'
        ];

        // 繪製選項
        this.options = {
            showPose: true,
            showFace: true,
            showHands: true,
            showPoseFaceKeypoints: false,  // 是否顯示臉部的姿勢關鍵點（避免與臉部網格重疊）
            faceOpacity: 0.6,
            handColor: { left: '#00ff00', right: '#ff6600' }
        };

        // 當偵測到手部時要跳過的姿勢關鍵點索引
        // 這些為姿勢標記中與手部相關的點：
        // 17: left_pinky, 18: right_pinky, 19: left_index, 20: right_index, 21: left_thumb, 22: right_thumb
        this.HAND_POSE_INDICES = [17, 18, 19, 20, 21, 22];
        
        // 臉部相關的姿勢關鍵點索引（當顯示臉部網格時可隱藏以減少視覺混亂）
        // 0: nose, 1-6: eyes, 7-8: ears, 9-10: mouth corners
        this.FACE_POSE_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }
    
    /**
     * 清空畫布
     * @param {CanvasRenderingContext2D} ctx - 畫布上下文
     * @param {number} width - 畫布寬度
     * @param {number} height - 畫布高度
     */
    clearCanvas(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);
    }
    
    /**
     * 根據信心值選取顏色
     * @param {number} confidence - 信心值 (0-1)
     * @returns {string} RGBA 顏色字串
     */
    getKeypointColor(confidence) {
        if (confidence >= 0.7) {
            return `rgba(0, 255, 0, ${confidence})`; // 高信心顯示綠色
        } else if (confidence >= 0.3) {
            return `rgba(255, 255, 0, ${confidence})`; // 中等信心顯示黃色
        } else {
            return `rgba(255, 0, 0, ${confidence * 0.5})`; // 低信心顯示紅色（低透明度）
        }
    }
    
    /**
     * Get color based on depth (z-coordinate)
     * Creates gradient: blue (far) → cyan → green → yellow → red (close)
     * @param {number} z - Depth coordinate (z_normalized, 0.0-1.0)
     * @param {number} minZ - Minimum z value in the set
     * @param {number} maxZ - Maximum z value in the set
     * @returns {string} RGBA color string
     */
    getDepthColor(z, minZ, maxZ) {

        // 根據最小/最大值將 z 正規化為 0-1 範圍
        let normalizedZ;
        if (maxZ === minZ) {
            normalizedZ = 0.5; // 若所有點深度相同，使用中間顏色
        } else {
            normalizedZ = (z - minZ) / (maxZ - minZ);
        }
        
        // 建立顏色漸層：藍（遠）→ 青 → 綠 → 黃 → 紅（近）
        // 0.0 = 遠（藍），1.0 = 近（紅）
        let r, g, b;
        
        if (normalizedZ < 0.25) {
            // 藍到青（0.0 - 0.25）
            const t = normalizedZ / 0.25;
            r = 0;
            g = Math.round(255 * t);
            b = 255;
        } else if (normalizedZ < 0.5) {
            // 青到綠（0.25 - 0.5）
            const t = (normalizedZ - 0.25) / 0.25;
            r = 0;
            g = 255;
            b = Math.round(255 * (1 - t));
        } else if (normalizedZ < 0.75) {
            // 綠到黃（0.5 - 0.75）
            const t = (normalizedZ - 0.5) / 0.25;
            r = Math.round(255 * t);
            g = 255;
            b = 0;
        } else {
            // 黃到紅（0.75 - 1.0）
            const t = (normalizedZ - 0.75) / 0.25;
            r = 255;
            g = Math.round(255 * (1 - t));
            b = 0;
        }
        
        return `rgba(${r}, ${g}, ${b}, 0.9)`;
    }
    
    /**
     * Calculate keypoint size based on depth
     * Closer keypoints are larger (0.5x to 1.5x base size)
     * @param {number} z - Depth coordinate (z_normalized, 0.0-1.0)
     * @param {number} minZ - Minimum z value in the set
     * @param {number} maxZ - Maximum z value in the set
     * @param {number} baseSize - Base size for keypoints (default: 5)
     * @returns {number} Scaled size in pixels
     */
    getDepthSize(z, minZ, maxZ, baseSize = 5) {
        // 根據最小/最大值將 z 正規化為 0-1 範圍
        let normalizedZ;
        if (maxZ === minZ) {
            normalizedZ = 0.5; // 若所有點深度相同，使用中間大小
        } else {
            normalizedZ = (z - minZ) / (maxZ - minZ);
        }
        
        // 將大小由 0.5x 拉到 1.5x 基底大小
        // normalizedZ = 0 (遠) -> 0.5x 基底大小
        // normalizedZ = 1 (近) -> 1.5x 基底大小
        const scaleFactor = 0.5 + normalizedZ;
        return baseSize * scaleFactor;
    }
    
    /**
     * 在畫布上繪製關鍵點
     * @param {Array} keypoints - 含 x, y, visibility 的關鍵點陣列
     * @param {CanvasRenderingContext2D} ctx - 畫布上下文
     * @param {number} canvasWidth - 畫布寬度
     * @param {number} canvasHeight - 畫布高度
     * @param {boolean} skipHandPoints - 是否略過手部相關的姿勢點（索引 17-22）
     * @param {string} highlightColor - 可選，覆蓋所有關鍵點的顏色
     */
    drawKeypoints(keypoints, ctx, canvasWidth, canvasHeight, skipHandPoints = false, highlightColor = null) {
        if (!keypoints || keypoints.length === 0) {
            return;
        }
        
        keypoints.forEach((keypoint, index) => {
            if (!keypoint) return;
            
            // 若有完整手部標記，則跳過手部相關的姿勢點
            if (skipHandPoints && this.HAND_POSE_INDICES.includes(index)) {
                return;
            }
            
            // 若選項設定為不顯示臉部姿勢關鍵點，則跳過
            if (!this.options.showPoseFaceKeypoints && this.FACE_POSE_INDICES.includes(index)) {
                return;
            }
            
            const x = keypoint.x * canvasWidth;
            const y = keypoint.y * canvasHeight;
            const confidence = keypoint.visibility || 0;
            
            // 僅繪製具有一定可見度的關鍵點
            if (confidence > 0) {
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                // 若有指定高亮顏色則使用，否則依信心值決定顏色
                ctx.fillStyle = highlightColor || this.getKeypointColor(confidence);
                ctx.fill();
                
                // 加上邊框以提升可見性
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }
    
    /**
     * 繪製關鍵點之間的骨架連線
     * @param {Array} keypoints - 含 x, y, visibility 的關鍵點陣列
     * @param {CanvasRenderingContext2D} ctx - 畫布上下文
     * @param {number} canvasWidth - 畫布寬度
     * @param {number} canvasHeight - 畫布高度
     * @param {string} highlightColor - 可選，覆蓋所有骨架線的顏色
     */
    drawSkeleton(keypoints, ctx, canvasWidth, canvasHeight, highlightColor = null) {
        if (!keypoints || keypoints.length === 0) {
            return;
        }
        
        this.POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
            const startPoint = keypoints[startIdx];
            const endPoint = keypoints[endIdx];
            
            if (!startPoint || !endPoint) return;
            
            const startConfidence = startPoint.visibility || 0;
            const endConfidence = endPoint.visibility || 0;
            
            // 僅當兩個關鍵點皆可見時繪製連線
            if (startConfidence > 0 && endConfidence > 0) {
                const avgConfidence = (startConfidence + endConfidence) / 2;
                
                const startX = startPoint.x * canvasWidth;
                const startY = startPoint.y * canvasHeight;
                const endX = endPoint.x * canvasWidth;
                const endY = endPoint.y * canvasHeight;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                
                // 若有高亮顏色則使用，否則依信心值決定樣式
                if (highlightColor) {
                    ctx.strokeStyle = highlightColor;
                    ctx.lineWidth = 3;
                } else if (avgConfidence < 0.3) {
                    // 低信心：細紅線、低不透明度
                    ctx.strokeStyle = `rgba(255, 0, 0, ${avgConfidence * 0.5})`;
                    ctx.lineWidth = 1;
                } else if (avgConfidence < 0.7) {
                    // 中等信心：黃線
                    ctx.strokeStyle = `rgba(255, 255, 0, ${avgConfidence})`;
                    ctx.lineWidth = 2;
                } else {
                    // 高信心：綠線
                    ctx.strokeStyle = `rgba(0, 255, 0, ${avgConfidence})`;
                    ctx.lineWidth = 3;
                }
                
                ctx.stroke();
            }
        });
    }
    
    /**
     * 以 3D 深度視覺化繪製關鍵點
     * @param {Array} keypoints - 含 x, y, z_normalized, visibility 的關鍵點陣列
     * @param {CanvasRenderingContext2D} ctx - 畫布上下文
     * @param {number} canvasWidth - 畫布寬度
     * @param {number} canvasHeight - 畫布高度
     * @param {boolean} skipHandPoints - 是否略過手部相關的姿勢點（索引 17-22）
     */
    drawKeypoints3D(keypoints, ctx, canvasWidth, canvasHeight, skipHandPoints = false) {
        if (!keypoints || keypoints.length === 0) {
            return;
        }
        
        // 找出用於正規化的最小與最大 z 值
        const visibleKeypoints = keypoints.filter(kp => kp && kp.visibility > 0 && kp.z_normalized !== undefined);
        if (visibleKeypoints.length === 0) {
            // 若無 z 資料則退回到 2D 繪製
            this.drawKeypoints(keypoints, ctx, canvasWidth, canvasHeight, skipHandPoints);
            return;
        }
        
        const zValues = visibleKeypoints.map(kp => kp.z_normalized);
        const minZ = Math.min(...zValues);
        const maxZ = Math.max(...zValues);
        
        keypoints.forEach((keypoint, index) => {
            if (!keypoint) return;
            
            // 若有完整手部標記則跳過手部相關的姿勢點
            if (skipHandPoints && this.HAND_POSE_INDICES.includes(index)) {
                return;
            }
            
            // 若選項設定為不顯示臉部姿勢關鍵點，則跳過
            if (!this.options.showPoseFaceKeypoints && this.FACE_POSE_INDICES.includes(index)) {
                return;
            }
            
            const x = keypoint.x * canvasWidth;
            const y = keypoint.y * canvasHeight;
            const confidence = keypoint.visibility || 0;
            const z = keypoint.z_normalized;
            
            // 僅繪製具有一定可見度且有 z 資料的關鍵點
            if (confidence > 0 && z !== undefined) {
                const size = this.getDepthSize(z, minZ, maxZ, 5);
                const color = this.getDepthColor(z, minZ, maxZ);
                
                ctx.beginPath();
                ctx.arc(x, y, size, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
                
                // 加上邊框以提升可見性
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });
    }
    
    /**
     * 以 3D 深度視覺化繪製骨架連線
     * @param {Array} keypoints - 含 x, y, z_normalized, visibility 的關鍵點陣列
     * @param {CanvasRenderingContext2D} ctx - 畫布上下文
     * @param {number} canvasWidth - 畫布寬度
     * @param {number} canvasHeight - 畫布高度
     */
    drawSkeleton3D(keypoints, ctx, canvasWidth, canvasHeight) {
        if (!keypoints || keypoints.length === 0) {
            return;
        }
        
        // 找出用於正規化的最小與最大 z 值
        const visibleKeypoints = keypoints.filter(kp => kp && kp.visibility > 0 && kp.z_normalized !== undefined);
        if (visibleKeypoints.length === 0) {
            // 若無 z 資料則退回到 2D 繪製
            this.drawSkeleton(keypoints, ctx, canvasWidth, canvasHeight);
            return;
        }
        
        const zValues = visibleKeypoints.map(kp => kp.z_normalized);
        const minZ = Math.min(...zValues);
        const maxZ = Math.max(...zValues);
        
        this.POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
            const startPoint = keypoints[startIdx];
            const endPoint = keypoints[endIdx];
            
            if (!startPoint || !endPoint) return;
            
            const startConfidence = startPoint.visibility || 0;
            const endConfidence = endPoint.visibility || 0;
            const startZ = startPoint.z_normalized;
            const endZ = endPoint.z_normalized;
            
            // 僅當兩個關鍵點皆可見且具有 z 資料時才繪製連線
            if (startConfidence > 0 && endConfidence > 0 && startZ !== undefined && endZ !== undefined) {
                const avgZ = (startZ + endZ) / 2;
                const avgConfidence = (startConfidence + endConfidence) / 2;
                
                const startX = startPoint.x * canvasWidth;
                const startY = startPoint.y * canvasHeight;
                const endX = endPoint.x * canvasWidth;
                const endY = endPoint.y * canvasHeight;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                
                // 使用基於深度的顏色
                const color = this.getDepthColor(avgZ, minZ, maxZ);
                ctx.strokeStyle = color;
                
                // 線寬依據信心值調整
                if (avgConfidence < 0.3) {
                    ctx.lineWidth = 1;
                } else if (avgConfidence < 0.7) {
                    ctx.lineWidth = 2;
                } else {
                    ctx.lineWidth = 3;
                }
                
                ctx.stroke();
            }
        });
    }
    
    /**
     * Render complete 3D pose visualization
     * @param {Object} poseResults - Pose detection results with 3D data
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    render3D(poseResults, canvas) {
        if (!canvas || !canvas.getContext) {
            console.error('Invalid canvas element');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 先清空畫布
        this.clearCanvas(ctx, width, height);
        
        // 若未偵測到姿勢或無關鍵點，則不繪製任何內容
        if (!poseResults || !poseResults.detected || !poseResults.keypoints || poseResults.keypoints.length === 0) {
            return;
        }
        
        // 檢查是否有 3D 資料（z_normalized 欄位）
        const has3DData = poseResults.keypoints.some(kp => kp && kp.z_normalized !== undefined);
        
        // 檢查是否有手部標記（以便跳過冗餘的姿勢手部點）
        const hasLeftHand = poseResults.leftHandLandmarks && poseResults.leftHandLandmarks.length > 0;
        const hasRightHand = poseResults.rightHandLandmarks && poseResults.rightHandLandmarks.length > 0;
        const skipHandPoints = hasLeftHand || hasRightHand;
        
        if (has3DData) {
            // 先繪製骨架（讓關鍵點顯示在上層）
            this.drawSkeleton3D(poseResults.keypoints, ctx, width, height);
            
            // 繪製關鍵點（若有完整手部標記則略過手部姿勢點）
            this.drawKeypoints3D(poseResults.keypoints, ctx, width, height, skipHandPoints);
        } else {
            // 若無 3D 資料則退回到 2D 繪製
            this.drawSkeleton(poseResults.keypoints, ctx, width, height);
            this.drawKeypoints(poseResults.keypoints, ctx, width, height, skipHandPoints);
        }

        // 若有臉部標記則繪製
        if (this.options.showFace && poseResults.faceLandmarks && poseResults.faceLandmarks.length > 0) {
            this.drawFaceMesh(poseResults.faceLandmarks, ctx, width, height);
        }

        // 若有手部標記則繪製
        if (this.options.showHands) {
            if (poseResults.leftHandLandmarks && poseResults.leftHandLandmarks.length > 0) {
                this.drawHand(poseResults.leftHandLandmarks, ctx, width, height, 'left');
            }
            if (poseResults.rightHandLandmarks && poseResults.rightHandLandmarks.length > 0) {
                this.drawHand(poseResults.rightHandLandmarks, ctx, width, height, 'right');
            }
        }
    }
    
    /**
     * Render complete pose visualization
     * @param {Object} poseResults - Pose detection results
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {Object} options - Optional rendering options
     * @param {string} options.highlightColor - Override color for keypoints/skeleton (e.g., '#00ff00')
     * @param {number} options.opacity - Overall opacity multiplier (0-1)
     */
    render(poseResults, canvas, options = {}) {
        if (!canvas || !canvas.getContext) {
            console.error('Invalid canvas element');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 此處不清空畫布 — 由呼叫端處理畫布清空以支援多人繪製
        // this.clearCanvas(ctx, width, height);
        
        // 若未偵測到姿勢或無關鍵點，則不繪製任何內容
        if (!poseResults || !poseResults.detected || !poseResults.keypoints || poseResults.keypoints.length === 0) {
            return;
        }
        
        // 若有指定則套用全域不透明度
        const globalOpacity = options.opacity !== undefined ? options.opacity : 1;
        ctx.globalAlpha = globalOpacity;
        
        // 檢查是否有手部標記（以便跳過冗餘的姿勢手部點）
        const hasLeftHand = poseResults.leftHandLandmarks && poseResults.leftHandLandmarks.length > 0;
        const hasRightHand = poseResults.rightHandLandmarks && poseResults.rightHandLandmarks.length > 0;
        const skipHandPoints = hasLeftHand || hasRightHand;
        
        // 先繪製骨架（讓關鍵點顯示在上層）
        this.drawSkeleton(poseResults.keypoints, ctx, width, height, options.highlightColor);
        
        // 繪製關鍵點（若有完整手部標記則略過手部姿勢點）
        this.drawKeypoints(poseResults.keypoints, ctx, width, height, skipHandPoints, options.highlightColor);

        // 若有臉部標記則繪製
        if (this.options.showFace && poseResults.faceLandmarks && poseResults.faceLandmarks.length > 0) {
            this.drawFaceMesh(poseResults.faceLandmarks, ctx, width, height);
        }

        // 若有手部標記則繪製
        if (this.options.showHands) {
            if (poseResults.leftHandLandmarks && poseResults.leftHandLandmarks.length > 0) {
                this.drawHand(poseResults.leftHandLandmarks, ctx, width, height, 'left');
            }
            if (poseResults.rightHandLandmarks && poseResults.rightHandLandmarks.length > 0) {
                this.drawHand(poseResults.rightHandLandmarks, ctx, width, height, 'right');
            }
        }
        
        // 重設全域不透明度
        ctx.globalAlpha = 1;
    }

    /**
     * 繪製臉部網格標記點
     * @param {Array} faceLandmarks - 臉部標記點陣列（468 點）
     * @param {CanvasRenderingContext2D} ctx - 畫布上下文
     * @param {number} canvasWidth - 畫布寬度
     * @param {number} canvasHeight - 畫布高度
     */
    drawFaceMesh(faceLandmarks, ctx, canvasWidth, canvasHeight) {
        if (!faceLandmarks || faceLandmarks.length === 0) {
            return;
        }

        const opacity = this.options.faceOpacity || 0.6;

        // 繪製完整臉部網格三角連線
        this.drawFaceConnections(faceLandmarks, this.FACE_MESH_TESSELATION, ctx, canvasWidth, canvasHeight,
            `rgba(180, 180, 180, ${opacity * 0.5})`, 0.5);

        // 繪製臉部輪廓（加粗顯示）
        this.drawFaceConnections(faceLandmarks, this.FACE_OVAL_CONNECTIONS, ctx, canvasWidth, canvasHeight, 
            `rgba(220, 220, 220, ${opacity})`, 1.5);

        // 繪製嘴唇（紅色）
        this.drawFaceConnections(faceLandmarks, this.LIPS_CONNECTIONS, ctx, canvasWidth, canvasHeight,
            `rgba(255, 100, 100, ${opacity})`, 1.5);

        // 繪製眼睛（藍色）
        this.drawFaceConnections(faceLandmarks, this.LEFT_EYE_CONNECTIONS, ctx, canvasWidth, canvasHeight,
            `rgba(100, 200, 255, ${opacity})`, 1.5);
        this.drawFaceConnections(faceLandmarks, this.RIGHT_EYE_CONNECTIONS, ctx, canvasWidth, canvasHeight,
            `rgba(100, 200, 255, ${opacity})`, 1.5);

        // 繪製眉毛（棕色）
        this.drawFaceConnections(faceLandmarks, this.LEFT_EYEBROW_CONNECTIONS, ctx, canvasWidth, canvasHeight,
            `rgba(139, 90, 43, ${opacity})`, 2);
        this.drawFaceConnections(faceLandmarks, this.RIGHT_EYEBROW_CONNECTIONS, ctx, canvasWidth, canvasHeight,
            `rgba(139, 90, 43, ${opacity})`, 2);
    }

    /**
     * 繪製臉部網格連線
     * @param {Array} faceLandmarks - 臉部標記陣列
     * @param {Array} connections - [起點索引, 終點索引] 的連線陣列
     * @param {CanvasRenderingContext2D} ctx - 畫布上下文
     * @param {number} canvasWidth - 畫布寬度
     * @param {number} canvasHeight - 畫布高度
     * @param {string} color - 線條顏色
     * @param {number} lineWidth - 線寬
     */
    drawFaceConnections(faceLandmarks, connections, ctx, canvasWidth, canvasHeight, color, lineWidth) {
        connections.forEach(([startIdx, endIdx]) => {
            const startLandmark = faceLandmarks[startIdx];
            const endLandmark = faceLandmarks[endIdx];

            if (startLandmark && endLandmark) {
                const startX = startLandmark.x * canvasWidth;
                const startY = startLandmark.y * canvasHeight;
                const endX = endLandmark.x * canvasWidth;
                const endY = endLandmark.y * canvasHeight;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.stroke();
            }
        });
    }

    /**
     * 繪製手部標記與連線
     * @param {Array} handLandmarks - 手部標記陣列（21 點）
     * @param {CanvasRenderingContext2D} ctx - 畫布上下文
     * @param {number} canvasWidth - 畫布寬度
     * @param {number} canvasHeight - 畫布高度
     * @param {string} side - 'left' 或 'right'
     */
    drawHand(handLandmarks, ctx, canvasWidth, canvasHeight, side) {
        if (!handLandmarks || handLandmarks.length === 0) {
            return;
        }

        const color = side === 'left' ? this.options.handColor.left : this.options.handColor.right;

        // 繪製連線
        this.HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
            const startLandmark = handLandmarks[startIdx];
            const endLandmark = handLandmarks[endIdx];

            if (startLandmark && endLandmark) {
                const startX = startLandmark.x * canvasWidth;
                const startY = startLandmark.y * canvasHeight;
                const endX = endLandmark.x * canvasWidth;
                const endY = endLandmark.y * canvasHeight;

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        // 繪製標記點
        handLandmarks.forEach((landmark, index) => {
            const x = landmark.x * canvasWidth;
            const y = landmark.y * canvasHeight;

            // 指尖以較大圓圈繪製
            const isFingertip = [4, 8, 12, 16, 20].includes(index);
            const radius = isFingertip ? 5 : 3;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }

    /**
     * Render complete holistic visualization (pose + face + hands)
     * @param {Object} poseResults - Holistic detection results
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    renderHolistic(poseResults, canvas) {
        // 與 render() 相同，但另命名以利清晰呈現
        this.render(poseResults, canvas);
    }

    /**
     * Set rendering options
     * @param {Object} options - Rendering options
     */
    setOptions(options) {
        if (options) {
            this.options = { ...this.options, ...options };
        }
    }
}

// 匯出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PoseRenderer;
}
