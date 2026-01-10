# 如何添加自定义评估视频

## 方法一：使用本地视频文件

### 步骤1：准备视频文件
1. 录制或准备示范动作的视频
2. 确保视频格式为 **MP4** (推荐) 或 **WebM**
3. 建议视频分辨率: 720p 或 1080p
4. 建议视频时长: 5-15秒

### 步骤2：上传视频
将视频文件放入以下目录：
```
/workspaces/XIAOICE/app/static/upload/videos/
```

例如：
- `bear_raise_hands.mp4` - 熊举手示范
- `bear_clapping.mp4` - 熊拍手示范
- `bear_kicking.mp4` - 熊踢腿示范
- `bear_waving.mp4` - 熊挥手示范
- `bear_squatting.mp4` - 熊蹲下示范

### 步骤3：更新题目配置

编辑文件: `/workspaces/XIAOICE/app/static/js/child_assessment.js`

找到 `loadQuestions()` 方法，更新 `videoUrl`：

```javascript
static loadQuestions() {
    const questions = [
        {
            id: 1,
            domain: '大運動',
            emoji: '🐻',
            question: '兒童能否舉起雙手？',
            description: '觀察兒童是否能模仿影片中的動作，將雙手舉起到頭部上方。',
            videoUrl: '/static/upload/videos/bear_raise_hands.mp4'  // ← 修改这里
        },
        {
            id: 2,
            domain: '精細動作',
            emoji: '🐻',
            question: '兒童能否拍手？',
            description: '觀察兒童是否能模仿影片中的動作，雙手合掌拍打。',
            videoUrl: '/static/upload/videos/bear_clapping.mp4'  // ← 修改这里
        },
        // ... 其他题目
    ];
    this.displayQuestion(questions[0]);
}
```

## 方法二：使用YouTube视频

### 步骤1：准备YouTube视频
1. 上传示范视频到YouTube
2. 获取视频的直接链接

### 步骤2：转换YouTube链接
由于浏览器安全限制，需要使用YouTube嵌入链接：

原始链接：
```
https://www.youtube.com/watch?v=XXXXXXXXXXX
```

转换为嵌入链接：
```
https://www.youtube.com/embed/XXXXXXXXXXX
```

### 步骤3：使用iframe替代video标签

编辑 `displayQuestion()` 方法中的视频部分：

```javascript
<!-- 視頻示範區域 -->
<div style="background: #f5f7fa; padding: 20px; border-radius: 15px; margin-bottom: 20px;">
    <h4 style="margin-bottom: 15px; color: #4A3B5C;">
        🎬 觀看示範影片
    </h4>
    <iframe 
        id="demoVideo"
        width="100%" 
        height="400"
        src="${question.videoUrl}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        style="border-radius: 10px; max-width: 600px; display: block; margin: 0 auto;">
    </iframe>
</div>
```

## 方法三：使用外部视频托管服务

### 支持的服务
- **Vimeo**: `https://player.vimeo.com/video/VIDEO_ID`
- **Google Drive**: 需要设置为公开访问
- **自建服务器**: 使用CDN加速

### 示例配置
```javascript
videoUrl: 'https://player.vimeo.com/video/123456789'
```

## 视频文件命名规范

建议使用有意义的文件名：

```
{domain}_{action}_{age_group}.mp4
```

示例：
- `gross_motor_raise_hands_12m.mp4` - 大运动-举手-12个月
- `fine_motor_clapping_18m.mp4` - 精细动作-拍手-18个月
- `gross_motor_kicking_24m.mp4` - 大运动-踢腿-24个月

## 创建自定义题库

可以为不同年龄段创建不同的题库：

```javascript
class ChildAssessmentModule {
    static getQuestionsForAge(ageInMonths) {
        if (ageInMonths <= 12) {
            return this.getInfantQuestions();
        } else if (ageInMonths <= 36) {
            return this.getToddlerQuestions();
        } else {
            return this.getPreschoolQuestions();
        }
    }
    
    static getInfantQuestions() {
        return [
            {
                id: 1,
                domain: '大運動',
                emoji: '🐻',
                question: '兒童能否抬頭？',
                description: '觀察兒童俯臥時是否能抬起頭部。',
                videoUrl: '/static/upload/videos/infant_head_lift.mp4'
            },
            // ... 更多婴儿题目
        ];
    }
    
    static getToddlerQuestions() {
        return [
            {
                id: 1,
                domain: '大運動',
                emoji: '🐻',
                question: '兒童能否走路？',
                description: '觀察兒童是否能獨立行走。',
                videoUrl: '/static/upload/videos/toddler_walking.mp4'
            },
            // ... 更多幼儿题目
        ];
    }
}
```

## 视频制作建议

### 背景
- 使用纯色或简单背景
- 避免杂乱的背景元素
- 确保光线充足

### 拍摄角度
- 正面拍摄为主
- 展示完整动作
- 避免遮挡关键部位

### 时长
- 保持简短（5-15秒）
- 可循环播放
- 一个动作重复2-3次

### 音频
- 可选：添加简单的背景音乐
- 可选：添加语音指导
- 避免嘈杂的环境音

## 测试清单

在部署前，请确认：

- [ ] 视频文件能正常播放
- [ ] 视频分辨率适中
- [ ] 文件大小合理（建议<20MB）
- [ ] 路径配置正确
- [ ] 所有题目都有对应视频
- [ ] 视频内容符合评估要求
- [ ] 在不同浏览器测试
- [ ] 在移动设备测试

## 故障排除

### 视频无法播放
1. 检查文件路径是否正确
2. 检查视频格式是否支持
3. 检查文件权限
4. 查看浏览器控制台错误

### 视频加载缓慢
1. 压缩视频文件
2. 使用CDN加速
3. 降低视频分辨率
4. 使用视频流媒体服务

### 视频显示异常
1. 检查视频编码
2. 更新浏览器
3. 清除浏览器缓存
4. 尝试不同浏览器

## 视频压缩工具

推荐使用以下工具压缩视频：

1. **HandBrake** (免费)
   - 跨平台
   - 支持批量处理
   
2. **FFmpeg** (命令行)
   ```bash
   ffmpeg -i input.mp4 -vcodec h264 -acodec mp2 output.mp4
   ```

3. **在线工具**
   - CloudConvert
   - OnlineConverter
   - Clipchamp

---

**提示**: 始终保留原始视频文件的备份！
