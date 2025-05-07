// 常量定义
const THRESHOLD_DEFAULT = 60; // 默认分贝阈值
const ENERGY_INCREMENT_DEFAULT = 0.1; // 默认每次能量增加量（百分比），约5秒生成一个火
const ENERGY_MAX = 100; // 能量最大值
const TREE_STAGES = 3; // 树木成长阶段值
const SUNSHINE_PER_STAGE = 12; // 每个阶段需要的火焰数量
const SUNSHINE_ANIMATION_DURATION = 3000; // 火焰动画持续时间（毫秒）
const MIN_DECIBEL = 35; // 最低分贝值 - 降低以提高灵敏度
const MIN_FLAME_SPEED = 0.5; // 最快火焰生成速度（秒）
const MAX_FLAME_SPEED = 25; // 最慢火焰生成速度（秒）
const WARNING_THRESHOLD = 85; // 分贝警告阈值，超过此值将显示警告
const WARNING_COOLDOWN = 10000; // 警告冷却时间，单位毫秒（10秒）

// 主题相关常量
const THEMES = {
    nezha: {
        name: "哪吒",
        elementClass: "energy-element-nezha",
        path: "成长图/哪吒/",
        themeClass: "", // 默认主题不需要额外的CSS类
        elementName: "火焰"
    },
    shijiNiangniang: {
        name: "石矶娘娘",
        elementClass: "energy-element-shijiNiangniang",
        path: "成长图/石矶娘娘主题/",
        themeClass: "theme-shijiNiangniang",
        elementName: "石头"
    },
    aoBing: {
        name: "敖丙",
        elementClass: "energy-element-aoBing",
        path: "成长图/敖丙主题/",
        themeClass: "theme-aoBing",
        elementName: "水滴"
    }
};

// 全局变量
let isRecording = false; // 是否正在录音
let audioContext = null; // 音频上下文
let analyser = null; // 音频分析器
let microphone = null; // 麦克风输入
let energyValue = 0; // 当前火焰能量值
let sunshineCount = 0; // 累计产生的火焰数
let maxSunshineCount = 0; // 历史最高火焰数
let treeEnergyValues = [0]; // 每棵树的能量值（实际上是火焰数量值）
let currentTreeIndex = 0; // 当前正在成长的树索引
let treeStages = [1]; // 每棵树的当前阶段
let grownTreesCount = 0; // 已完全成长的树木数量
let decibelThreshold = THRESHOLD_DEFAULT; // 分贝阈值
let animationFrameId = null; // 动画帧ID
let isQuiet = false; // 是否处于安静状态
let quietStartTime = null; // 安静开始时间
let quietTotalTime = 0; // 总安静时间（毫秒）
let quietTimerInterval = null; // 安静计时器的间隔标识
let isFullscreen = false; // 是否处于全屏状态
let isWarningActive = false; // 是否显示警告
let energyIncrement = ENERGY_INCREMENT_DEFAULT; // 当前火焰能量增长速度
let flameGenerationSpeed = 5; // 当前火焰生成速度（秒/个）
let isLoud = false; // 是否处于大声状态
let loudStartTime = null; // 大声开始时间
let loudTotalTime = 0; // 总大声时间（毫秒）
let loudTimerInterval = null; // 大声计时器的间隔标识
let disableWarnings = false; // 是否禁用大声警告
let lastWarningTime = 0; // 上次显示警告的时间
let lowVolumeWarningElement = null; // 低音量警告元素

// 音效相关变量
let lowVolumeTimeout = null;
const LOW_VOLUME_DELAY = 3000; // 低音量3秒后提醒
let currentPlayingReminder = null;
let lastReminderTime = 0;
const REMINDER_COOLDOWN = 0; // 修改为0，移除冷却时间限制
let reminderSounds = []; // 存储已加载的音效
let isBelowThreshold = false; // 新增：跟踪是否低于阈值

// 在全局变量部分添加
let lastEnergyDecrementTime = 0; // 上次能量减少的时间

// DOM元素
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const resetBtn = document.getElementById('reset-btn');
const thresholdSlider = document.getElementById('threshold-slider');
const thresholdValue = document.getElementById('threshold-value');
const currentDecibel = document.getElementById('current-decibel');
const decibelMeterFill = document.getElementById('decibel-meter-fill');
const statusEmoji = document.getElementById('status-emoji');
const statusText = document.getElementById('status-text');
const energyFill = document.getElementById('energy-fill');
const sunshineContainer = document.getElementById('sunshine-container');
const grownTreesCountElement = document.getElementById('grown-trees-count');
const sunshineCountElement = document.getElementById('sunshine-count');
const maxSunshineCountElement = document.getElementById('max-sunshine-count');
const quietTimeElement = document.getElementById('quiet-time');
const treeProgressElement = document.getElementById('tree-1-progress');
const warningContainer = document.getElementById('warning-container');
const warningSound = document.getElementById('warning-sound');
const flameSpeedSlider = document.getElementById('flame-speed-slider');
const flameSpeedValue = document.getElementById('flame-speed-value');
const disableWarningsCheckbox = document.getElementById('disable-warnings');

// 全局变量
let currentTheme = 'nezha'; // 当前主题，默认为哪吒

// 初始化函数
function init() {
    // 设置事件监听
    document.getElementById('start-btn').addEventListener('click', startRecording);
    document.getElementById('pause-btn').addEventListener('click', pauseRecording);
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    document.getElementById('reset-btn').addEventListener('click', resetTrees);
    thresholdSlider.addEventListener('input', updateThreshold);
    flameSpeedSlider.addEventListener('input', updateFlameSpeed);
    
    // 初始化设置
    thresholdSlider.value = THRESHOLD_DEFAULT;
    thresholdValue.textContent = THRESHOLD_DEFAULT;
    
    // 初始化火焰速度滑动条
    // 确保最大值为200
    flameSpeedSlider.max = "200";
    flameSpeedSlider.value = 50; // 默认值，对应5秒生成一个火
    
    // 初始化帧率计数器
    initFpsCounter();
    
    // 输出滑动条的属性，确认设置是否正确
    console.log(`滑动条设置 min=${flameSpeedSlider.min}, max=${flameSpeedSlider.max}, value=${flameSpeedSlider.value}`);
    
    // 禁用暂停按钮
    pauseBtn.disabled = true;
    
    // 提示用户点击开始按钮开始检测！
    statusEmoji.textContent = '🤗';
    statusText.textContent = '点击开始按钮开始检测！';
    
    // 初始化树木进度显示
    updateTreeProgress();
    
    // 从localStorage加载最高火焰数
    loadMaxSunshineCount();
    
    // 添加退出全屏的监听
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // 设置初始火焰生成速度
    setTimeout(updateFlameSpeed, 500); // 等待帧率测量完成后更新
    
    // 初始化音效
    initReminders();
    
    // 创建分贝警告元素
    createDecibelWarning();
    
    // 创建低音量警告元素
    createLowVolumeWarning();
    
    // 预加载警告音效
    preloadWarningSound();
    
    // 设置禁用警告复选框监听
    if (disableWarningsCheckbox) {
        disableWarningsCheckbox.addEventListener('change', function() {
            disableWarnings = this.checked;
            console.log(`大声警告已${disableWarnings ? '禁用' : '启用'}`);
            
            // 如果禁用警告并且当前有活动的警告，则隐藏它
            if (disableWarnings && isWarningActive) {
                hideWarning();
            }
        });
    }
    
    // 初始化主题
    initThemes();
    
    // 加载上次使用的主题
    loadSavedTheme();
    
    // 更新主题相关的文本
    updateThemeText();
}

// 初始化帧率计数器
function initFpsCounter() {
    window.fpsCounter = {
        lastCheck: Date.now(),
        frames: 0,
        fps: 144, // 设置一个初始值，大多数显示器在0-144之间
        lastFpsValues: [], // 存储最近几次的FPS测量值
        stableFps: 0 // 稳定的FPS值（取平均）
    };
    
    // 开始测量帧率
    function measureFps() {
        window.fpsCounter.frames++;
        
        const now = Date.now();
        if (now - window.fpsCounter.lastCheck >= 500) { // 0.5秒更新一次
            // 计算FPS
            const currentFps = Math.round(window.fpsCounter.frames * 1000 / (now - window.fpsCounter.lastCheck));
            
            // 存储最近的FPS值
            window.fpsCounter.lastFpsValues.push(currentFps);
            if (window.fpsCounter.lastFpsValues.length > 10) { // 保留最近10次测量值
                window.fpsCounter.lastFpsValues.shift();
            }
            
            // 计算平均FPS
            if (window.fpsCounter.lastFpsValues.length > 0) {
                const sum = window.fpsCounter.lastFpsValues.reduce((a, b) => a + b, 0);
                window.fpsCounter.stableFps = Math.round(sum / window.fpsCounter.lastFpsValues.length);
            }
            
            // 更新FPS
            window.fpsCounter.fps = currentFps;
            window.fpsCounter.frames = 0;
            window.fpsCounter.lastCheck = now;
            
            // 输出稳定的帧率
            if (window.fpsCounter.stableFps > 0) {
                console.log(`持续测量的稳定帧率 ${window.fpsCounter.stableFps} FPS`);
            }
        }
        
        requestAnimationFrame(measureFps);
    }
    
    // 开始测量
    requestAnimationFrame(measureFps);
}

// 更新阈值
function updateThreshold() {
    decibelThreshold = parseInt(thresholdSlider.value);
    thresholdValue.textContent = decibelThreshold;
}

// 切换全屏模式
function toggleFullscreen() {
    if (!isFullscreen) {
        // 进入全屏
        const docEl = document.documentElement;
        
        if (docEl.requestFullscreen) {
            docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) { // Safari
            docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) { // Firefox
            docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) { // IE11
            docEl.msRequestFullscreen();
        }
    } else {
        // 退出全屏
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Safari
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) { // IE11
            document.msExitFullscreen();
        }
    }
}

// 处理全屏变化
function handleFullscreenChange() {
    isFullscreen = !!document.fullscreenElement || 
                   !!document.webkitFullscreenElement || 
                   !!document.mozFullScreenElement ||
                   !!document.msFullscreenElement;
    
    // 更新按钮图标
    if (isFullscreen) {
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> 退出全屏';
    } else {
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> 全屏';
    }
}

// 开始录音
async function startRecording() {
    try {
        // 已经在录音就不做任何操作
        if (isRecording) return;
        
        // 请求麦克风权限
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: true
            }, 
            video: false 
        });
        
        // 创建音频上下文
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        
        // 连接节点
        microphone.connect(analyser);
        
        // 配置分析器
        analyser.fftSize = 2048; // 提高FFT大小以获得更细粒度的频谱数据
        analyser.smoothingTimeConstant = 0.6; // 降低平滑常数使响应更灵敏
        
        // 更新UI
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        isRecording = true;
        
        // 开始分析
        updateVolume();
        
        // 播放开始音效（拟声词代替）
        playEmoji('🔊', '叮咚！开始检测~');
        
        // 确保警告元素已创建，但不显示
        if (!lowVolumeWarningElement) {
            console.log("开始检测时发现低音量警告元素不存在，重新创建");
            createLowVolumeWarning();
        }
        
        // 重置能量递减时间
        lastEnergyDecrementTime = 0;
    } catch (error) {
        console.error('无法访问麦克风', error);
        statusEmoji.textContent = '🤔';
        statusText.textContent = '无法访问麦克风，请检查权限设置';
    }
}

// 暂停录音
function pauseRecording() {
    if (!isRecording) return;
    
    // 停止音频分析
    cancelAnimationFrame(animationFrameId);
    
    // 关闭麦克风
    if (microphone && audioContext) {
        microphone.disconnect();
        audioContext.close();
    }
    
    // 更新UI
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    isRecording = false;
    
    // 停止大声计时
    stopLoudTimer();
    
    // 播放暂停音效（拟声词代替）
    playEmoji('⏸️', '唰~已暂停检测！');
    
    // 重置能量递减时间
    lastEnergyDecrementTime = 0;
    
    // 隐藏低音量警告（太乙真人）
    hideLowVolumeWarning();
    
    // 停止当前正在播放的提醒音效
    stopCurrentReminder();
    
    // 清除低音量计时器
    if (lowVolumeTimeout) {
        clearTimeout(lowVolumeTimeout);
        lowVolumeTimeout = null;
    }
}

// 音量分析和更新
function updateVolume() {
    // 创建数据数组
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    // 获取音量数据
    analyser.getByteFrequencyData(dataArray);
    
    // 计算平均音量，加权处理高频部分以提高灵敏度
    let sum = 0;
    const weightedLength = dataArray.length;
    for (let i = 0; i < dataArray.length; i++) {
        // 给高频部分更高的权重，因为人声和大多数环境噪音主要在中高频
        const weight = 1 + (i / dataArray.length) * 0.5;
        sum += dataArray[i] * weight;
    }
    const average = sum / (weightedLength * 1.25); // 调整分母以平衡加权效果
    
    // 将音量数据转换为分贝值(0-100)
    const volume = Math.min(100, Math.max(0, average * 100 / 200));
    
    // 计算分贝值，调整算法提高灵敏度
    const decibels = Math.round(MIN_DECIBEL + (volume * (90 - MIN_DECIBEL) / 100));
    
    // 更新分贝显示
    currentDecibel.textContent = decibels;
    decibelMeterFill.style.width = `${volume}%`;
    
    // 根据分贝值设置表情和文本
    updateStatusDisplay(decibels);
    
    // 处理声音状态和能量积累
    if (decibels >= decibelThreshold) {
        if (isBelowThreshold) {
            console.log("声音恢复到阈值以上");
            isBelowThreshold = false; // 设置为高于阈值
            // 声音恢复后，始终隐藏低音量警告图片
            hideLowVolumeWarning();
        }
        
        if (!isLoud) {
            startLoudTimer();
        }
        incrementEnergy();
        
        // 如果有超时设置，清除它并停止当前播放的提醒
        if (lowVolumeTimeout) {
            console.log("清除低音量计时器");
            clearTimeout(lowVolumeTimeout);
            lowVolumeTimeout = null;
            stopCurrentReminder(); // 只停止音频播放，不会隐藏警告图
        }
        
        // 检查是否需要显示警告 - 声音过大时
        if (decibels >= WARNING_THRESHOLD && !disableWarnings) {
            const now = Date.now();
            // 检查是否在冷却时间内
            if (now - lastWarningTime > WARNING_COOLDOWN) {
                showWarning();
                lastWarningTime = now;
            }
        } else if (isWarningActive && (decibels < WARNING_THRESHOLD - 5 || disableWarnings)) {
            // 声音恢复正常或警告被禁用，隐藏警告
            hideWarning();
        }
    } else {
        if (!isBelowThreshold) {
            console.log("声音低于阈值");
            isBelowThreshold = true; // 设置为低于阈值
            
            // 不在这里显示低音量警告，而是等待提醒音效播放时才显示
        }
        
        if (isLoud) {
            stopLoudTimer();
        }
        
        // 声音低于阈值时，减少火焰能量
        decrementEnergy();
        
        // 如果没有设置低音量超时，设置一个
        if (!lowVolumeTimeout && !currentPlayingReminder) {
            console.log("设置低音量计时器，3秒后播放提醒");
            lowVolumeTimeout = setTimeout(() => {
                playRandomReminder();
            }, LOW_VOLUME_DELAY);
        }
        
        // 如果警告是活动的，但声音已经降低，隐藏警告
        if (isWarningActive) {
            hideWarning();
        }
    }
    
    // 继续分析
    animationFrameId = requestAnimationFrame(updateVolume);
}

// 开始安静计时
function startQuietTimer() {
    isQuiet = true;
    quietStartTime = new Date();
    
    // 清除之前的计时器
    if (quietTimerInterval) {
        clearInterval(quietTimerInterval);
    }
    
    // 设置每秒更新一次计时显示
    quietTimerInterval = setInterval(updateQuietTime, 1000);
}

// 停止安静计时
function stopQuietTimer() {
    if (isQuiet) {
        isQuiet = false;
        // 计算并累加安静时间
        if (quietStartTime) {
            quietTotalTime += new Date() - quietStartTime;
            quietStartTime = null;
        }
        
        // 清除计时器
        if (quietTimerInterval) {
            clearInterval(quietTimerInterval);
            quietTimerInterval = null;
        }
        
        // 更新显示的总时间
        updateQuietTime();
    }
}

// 更新安静时间显示
function updateQuietTime() {
    let totalMilliseconds = quietTotalTime;
    
    // 如果当前处于安静状态，加上当前阶段的时
    if (isQuiet && quietStartTime) {
        totalMilliseconds += new Date() - quietStartTime;
    }
    
    // 转换为时分秒格式
    const totalSeconds = Math.floor(totalMilliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // 格式化为 HH:MM:SS
    quietTimeElement.textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 根据分贝值更新状态显示
function updateStatusDisplay(decibels) {
    if (decibels < decibelThreshold) {
        // 安静状态
        if (decibels < decibelThreshold - 10) {
            // 非常安静
            statusEmoji.textContent = '😴';
            statusText.textContent = '现在很安静，需要更高的声音来获得火焰能量！';
        } else {
            // 安静
            statusEmoji.textContent = '😊';
            statusText.textContent = '声音需要再大一些才能获得火焰能量！';
        }
    } else {
        // 嘈杂状态，但现在这是积极的
        if (decibels > decibelThreshold + 10) {
            // 非常嘈杂 - 火焰能量增长很快
            statusEmoji.textContent = '🔥';
            statusText.textContent = '声音很大！火焰能量快速增长中';
        } else {
            // 声音适中 - 正在获得火焰能量
            statusEmoji.textContent = '😀';
            statusText.textContent = '声音达标！正在获得火焰能量~';
        }
    }
}

// 显示警告
function showWarning() {
    if (!isWarningActive) {
        isWarningActive = true;
        
        // 使用Web Animation API进行动画，确保跨浏览器兼容性
        const keyframes = [
            { opacity: 0, transform: 'scale(0.8)' },
            { opacity: 1, transform: 'scale(1.05)' },
            { opacity: 1, transform: 'scale(1)' }
        ];
        
        const options = {
            duration: 500,
            easing: 'ease-out',
            fill: 'forwards'
        };
        
        warningContainer.animate(keyframes, options);
        warningContainer.classList.add('active');
        
        // 创建文字警告
        createTextWarning();
        
        // 播放警报声
        try {
            warningSound.play();
        } catch (e) {
            console.error('无法播放警报声', e);
        }
    }
}

// 隐藏警告
function hideWarning() {
    if (isWarningActive) {
        isWarningActive = false;
        
        // 使用Web Animation API进行退出动画
        const keyframes = [
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(0.8)' }
        ];
        
        const options = {
            duration: 300,
            easing: 'ease-in',
            fill: 'forwards'
        };
        
        const animation = warningContainer.animate(keyframes, options);
        
        animation.onfinish = () => {
            warningContainer.classList.remove('active');
            
            // 移除文字警告
            const textWarning = document.querySelector('.text-warning');
            if (textWarning) {
                textWarning.remove();
            }
        };
        
        // 停止警报声
        try {
            warningSound.pause();
            warningSound.currentTime = 0;
        } catch (e) {
            console.error('无法停止警报声', e);
        }
    }
}

// 创建分贝警告元素
function createDecibelWarning() {
    // 添加样式到头部
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        @-webkit-keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        @-moz-keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .text-warning {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            max-width: 300px;
            animation: pulse 1s ease-in-out infinite;
            -webkit-animation: pulse 1s ease-in-out infinite;
            -moz-animation: pulse 1s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);
}

// 创建文字警告
function createTextWarning() {
    // 移除现有文字警告
    const existingWarning = document.querySelector('.text-warning');
    if (existingWarning) {
        existingWarning.remove();
    }
    
    // 创建新文字警告
    const textWarning = document.createElement('div');
    textWarning.className = 'text-warning';
    textWarning.textContent = '声音过大！请降低音量！';
    document.body.appendChild(textWarning);
    
    // 5秒后自动移除
    setTimeout(() => {
        if (textWarning && textWarning.parentNode) {
            textWarning.remove();
        }
    }, 5000);
}

// 更新火焰生成速度
function updateFlameSpeed() {
    // 获取滑动条当前值
    const sliderValue = parseInt(flameSpeedSlider.value);
    
    // 计算速度值
    flameGenerationSpeed = calculateFlameSpeed(sliderValue);
    
    // 更新显示
    flameSpeedValue.textContent = `${flameGenerationSpeed.toFixed(1)}秒/个`;
    
    // 获取最准确的帧率 - 优先使用稳定帧率
    const fps = window.fpsCounter ? 
                 (window.fpsCounter.stableFps > 0 ? 
                   window.fpsCounter.stableFps : 
                   window.fpsCounter.fps) : 
                 60;
    
    // 确保fps在合理范围内
    const validFps = Math.min(Math.max(fps, 30), 144);
    
    // 关键修复：更精确地计算每帧应该增加的能量
    // 公式: 每秒需要增加的能量百分比 = 100 / 目标秒数
    // 每帧需要增加的能量百分比 = 每秒需要增加的能量百分比 / 帧率
    energyIncrement = (100 / flameGenerationSpeed) / validFps;
    
    // 计算实际的生成时间
    const actualFramesToFill = 100 / energyIncrement;
    const actualTimeToFill = actualFramesToFill / validFps;
    
    // 详细日志
    console.log(`========================`);
    console.log(`滑动条值 ${sliderValue}`);
    console.log(`目标生成速度: ${flameGenerationSpeed.toFixed(2)}秒/个`);
    console.log(`使用的帧率 ${validFps} FPS (原始: ${fps})`);
    console.log(`计算的能量增量 ${energyIncrement}`);
    console.log(`100%能量需要的帧数: ${Math.round(actualFramesToFill)}`);
    console.log(`预计实际生成时间: ${actualTimeToFill.toFixed(2)}秒`);
    
    // 检查精度
    const accuracy = Math.abs(actualTimeToFill - flameGenerationSpeed) / flameGenerationSpeed * 100;
    console.log(`计算精度: ${(100 - accuracy).toFixed(2)}% (误差: ${accuracy.toFixed(2)}%)`);
    console.log(`========================`);
}

// 根据滑动条值计算火焰生成速度
function calculateFlameSpeed(sliderValue) {
    // 直接将滑动条值5-200线性映射到火焰生成速度(0.5-25秒)
    // 这种方式更简单直接，确保在滑动条最大值时能准确获得0.5秒
    
    // 检查滑动条的实际值范围
    console.log(`滑动条原始值 ${sliderValue}`);
    
    // 确保滑动条值在正确的范围内
    const normalizedValue = Math.max(5, Math.min(200, sliderValue)); 
    
    // 线性映射公式 y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
    // 其中 x 是滑动条值，范围是[5, 200]
    // y 是火焰生成速度，范围是[0.5, 25]
    const speed = 0.5 + (normalizedValue - 5) * (25 - 0.5) / (200 - 5);
    
    console.log(`计算得到的速度: ${speed.toFixed(2)}秒/个`);
    return speed;
}

// 增加能量
function incrementEnergy() {
    // 添加帧率调试信息
    if (!window.fpsCounter) {
        window.fpsCounter = {
            lastCheck: Date.now(),
            frames: 0,
            fps: 0
        };
    }
    
    window.fpsCounter.frames++;
    const now = Date.now();
    if (now - window.fpsCounter.lastCheck >= 1000) { // 每秒更新一次
        window.fpsCounter.fps = window.fpsCounter.frames;
        window.fpsCounter.frames = 0;
        window.fpsCounter.lastCheck = now;
        
        // 输出实际帧率和当前增量 - 更详细的日志
        console.log(`----------帧率调试信息----------`);
        console.log(`实际帧率: ${window.fpsCounter.fps} FPS`);
        console.log(`能量增量: ${energyIncrement}`);
        console.log(`当前火焰生成速度设置: ${flameGenerationSpeed.toFixed(1)}秒/个`);
        
        // 计算预期生成一个火焰需要的时间
        const expectedTimeForOneFlame = ENERGY_MAX / (energyIncrement * window.fpsCounter.fps);
        console.log(`预期生成时间(计算): ${expectedTimeForOneFlame.toFixed(2)}秒`);
        console.log(`当前能量值 ${energyValue.toFixed(2)}/${ENERGY_MAX}`);
        console.log(`每帧能量增加: ${energyIncrement} ({(1/energyIncrement).toFixed(2)}帧增加100%能量)`);
        console.log(`--------------------------------`);
    }

    // 添加能量
    energyValue += energyIncrement; // 使用当前能量增长速度
    
    // 当能量达到最大值时，创建一个火焰
    if (energyValue >= ENERGY_MAX) {
        energyValue = 0;
        sunshineCount++;
        sunshineCountElement.textContent = sunshineCount;
        
        // 记录时间戳，用于计算实际生成间隔
        const currentTime = Date.now();
        if (window.lastFlameTime) {
            const interval = (currentTime - window.lastFlameTime) / 1000;
            console.log(`==============================`);
            console.log(`实际火焰生成间隔: ${interval.toFixed(2)}秒`);
            console.log(`预期生成间隔: ${flameGenerationSpeed.toFixed(2)}秒`);
            console.log(`差异: ${(interval - flameGenerationSpeed).toFixed(2)}秒`);
            console.log(`==============================`);
        }
        window.lastFlameTime = currentTime;
        
        // 检查并更新最高火焰数
        updateMaxSunshineCount();
        
        // 创建火焰动画
        createSunshine();
        
        // 增加当前树的能量
        incrementTreeEnergy();
    }
    
    // 更新能量条显示
    updateEnergyBar();
}

// 检查并更新最高火焰数
function updateMaxSunshineCount() {
    if (sunshineCount > maxSunshineCount) {
        maxSunshineCount = sunshineCount;
        maxSunshineCountElement.textContent = maxSunshineCount;
        
        // 保存到localStorage
        saveMaxSunshineCount();
    }
}

// 保存最高火焰数到localStorage
function saveMaxSunshineCount() {
    try {
        localStorage.setItem('maxSunshineCount', maxSunshineCount.toString());
    } catch (e) {
        console.error('无法保存数据到localStorage:', e);
    }
}

// 从localStorage加载最高火焰数
function loadMaxSunshineCount() {
    try {
        const savedCount = localStorage.getItem('maxSunshineCount');
        if (savedCount !== null) {
            maxSunshineCount = parseInt(savedCount, 10);
            maxSunshineCountElement.textContent = maxSunshineCount;
        }
    } catch (e) {
        console.error('无法从localStorage加载数据:', e);
    }
}

// 更新能量值
function updateEnergyBar() {
    energyFill.style.width = `${energyValue}%`;
}

// 创建火焰
function createSunshine() {
    // 创建火焰元素
    const sunshine = document.createElement('div');
    sunshine.className = `sunshine energy-element ${THEMES[currentTheme].elementClass}`; // 使用当前主题的能量元素类
    
    // 随机位置（顶部区域）
    const posX = Math.random() * window.innerWidth;
    const posY = Math.random() * (window.innerHeight / 3);
    
    // 设置初始位置
    sunshine.style.left = `${posX}px`;
    sunshine.style.top = `${posY}px`;
    
    // 添加到容器
    sunshineContainer.appendChild(sunshine);
    
    // 设置延迟后移动到树木位置
    setTimeout(() => {
        moveSunshineToTree(sunshine);
    }, 1000);
}

// 将火焰移动到树木位置
function moveSunshineToTree(sunshine) {
    // 获取当前树木的位置
    const treeElement = document.getElementById(`tree-${currentTreeIndex + 1}-img`);
    const treeRect = treeElement.getBoundingClientRect();
    
    // 设置目标位置（树木顶部中心）
    const targetX = treeRect.left + treeRect.width / 2;
    const targetY = treeRect.top;
    
    // 使用CSS动画移动到树
    sunshine.style.transition = `all ${SUNSHINE_ANIMATION_DURATION/1000}s ease-in-out`;
    sunshine.style.left = `${targetX}px`;
    sunshine.style.top = `${targetY}px`;
    sunshine.style.opacity = '0.8';
    
    // 动画结束后移除火焰
    setTimeout(() => {
        sunshine.remove();
    }, SUNSHINE_ANIMATION_DURATION);
}

// 增加树木能量
function incrementTreeEnergy() {
    treeEnergyValues[currentTreeIndex]++;
    
    // 更新树木能量值
    updateTreeEnergyBar();
    updateTreeProgress();
    
    // 检查是否需要升级树
    if (treeEnergyValues[currentTreeIndex] >= SUNSHINE_PER_STAGE) {
        upgradeTree();
    }
}

// 更新树木能量值
function updateTreeEnergyBar() {
    try {
        // 检查数组边界
        if (currentTreeIndex < 0 || currentTreeIndex >= treeEnergyValues.length) {
            console.error(`更新树木能量条时索引错误: ${currentTreeIndex}`);
            return;
        }
        
        const fillElement = document.getElementById(`tree-${currentTreeIndex + 1}-energy-fill`);
        if (!fillElement) {
            console.error(`未找到树木能量条元素: tree-${currentTreeIndex + 1}-energy-fill`);
            return;
        }
        
        const fillPercentage = (treeEnergyValues[currentTreeIndex] / SUNSHINE_PER_STAGE) * 100;
        fillElement.style.width = `${fillPercentage}%`;
    } catch (e) {
        console.error("更新树木能量条时出错:", e);
    }
}

// 更新树木进度文本
function updateTreeProgress() {
    try {
        // 检查数组边界
        if (currentTreeIndex < 0 || currentTreeIndex >= treeEnergyValues.length) {
            console.error(`更新树木进度时索引错误: ${currentTreeIndex}`);
            return;
        }
        
        const progressElement = document.getElementById(`tree-${currentTreeIndex + 1}-progress`);
        if (!progressElement) {
            console.error(`未找到树木进度元素: tree-${currentTreeIndex + 1}-progress`);
            return;
        }
        
        progressElement.textContent = `${treeEnergyValues[currentTreeIndex]}/${SUNSHINE_PER_STAGE}`;
    } catch (e) {
        console.error("更新树木进度时出错:", e);
    }
}

// 升级树木
function upgradeTree() {
    // 检查是否已经达到最大阶段
    if (treeStages[currentTreeIndex] >= TREE_STAGES) {
        // 已经是最后一个阶段，新增一棵树
        treeStages[currentTreeIndex] = TREE_STAGES; // 确保不超过最大阶段
        
        // 记录完全成长的树木
        grownTreesCount++;
        
        // 将当前树的能量值重置为满值
        treeEnergyValues[currentTreeIndex] = SUNSHINE_PER_STAGE;
        
        // 更新UI
        updateTreeEnergyBar();
        updateTreeProgress();
        
        // 添加一棵新树
        addNewTree();
        
        // 播放完全成长动画
        playEmoji('🌳', '一棵树完全成长啦！');
        
        return;
    }
    
    // 增加树木阶段
    treeStages[currentTreeIndex]++;
    
    // 设置新阶段的图片
    const treeImage = document.getElementById(`tree-${currentTreeIndex + 1}-img`);
    if (treeImage) {
        // 获取阶段对应的中文文字
        const stageText = getStageText(treeStages[currentTreeIndex]);
        
        // 创建新的树木图片路径 - 使用当前主题路径
        const newImagePath = `${THEMES[currentTheme].path}第${stageText}阶段的成长图.png`;
        
        console.log(`将树木升级到第 ${treeStages[currentTreeIndex]} 阶段, 图片: ${newImagePath}`);
        treeImage.src = newImagePath;
    } else {
        console.error(`无法找到树木图片元素 tree-${currentTreeIndex + 1}-img`);
    }
    
    // 重置树木能量
    treeEnergyValues[currentTreeIndex] = 0;
    
    // 更新UI
    updateTreeEnergyBar();
    updateTreeProgress();
    
    // 播放升级动画
    playEmoji('🌱', '树木升级啦！');
}

// 添加新树
function addNewTree() {
    // 创建新的树索引
    currentTreeIndex++;
    treeEnergyValues[currentTreeIndex] = 0;
    treeStages[currentTreeIndex] = 1;
    
    // 使用当前主题的第一阶段图片路径
    const correctPath = `${THEMES[currentTheme].path}第一阶段的成长图.png`;
    
    // 创建新的树木容器
    const treeContainer = document.createElement('div');
    treeContainer.className = 'tree-container';
    treeContainer.id = `tree-${currentTreeIndex + 1}`;
    
    // 使用正确的图片路径
    const initialHTML = `
        <div class="tree">
            <!-- ${THEMES[currentTheme].name}主题：第一阶段成长图 -->
            <img src="${correctPath}" id="tree-${currentTreeIndex + 1}-img" alt="小树" class="tree-image">
        </div>
        <div class="tree-energy-bar">
            <div id="tree-${currentTreeIndex + 1}-energy-fill" class="tree-energy-fill"></div>
        </div>
        <div class="tree-progress">
            <span id="tree-${currentTreeIndex + 1}-progress">0/${SUNSHINE_PER_STAGE}</span>
        </div>
    `;
    
    // 设置初始HTML
    treeContainer.innerHTML = initialHTML;
    
    // 添加到森林容器
    document.querySelector('.forest-container').appendChild(treeContainer);
    
    // 更新树木能量值
    updateTreeEnergyBar();
}

// 播放表情动画（代替音效）
function playEmoji(emoji, text) {
    statusEmoji.textContent = emoji;
    statusText.textContent = text;
    
    // 添加动画效果
    statusEmoji.classList.add('emoji-animation');
    statusText.classList.add('text-animation');
    
    // 动画结束后移除类
    setTimeout(() => {
        statusEmoji.classList.remove('emoji-animation');
        statusText.classList.remove('text-animation');
    }, 1000);
}

// 设置图片预加载
function preloadImages() {
    // 预加载所有主题的所有阶段图片
    Object.keys(THEMES).forEach(themeName => {
        const theme = THEMES[themeName];
        for (let i = 1; i <= TREE_STAGES; i++) {
            const stageText = getStageText(i);
            const img = new Image();
            const path = `${theme.path}第${stageText}阶段的成长图.png`;
            img.src = path;
            
            img.onerror = function() {
                console.error(`预加载 ${path} 失败`);
            };
            
            img.onload = function() {
                console.log(`预加载 ${path} 成功`);
            };
        }
    });
}

// 重置所有树
function resetTrees() {
    // 停止录音
    if (isRecording) {
        stopRecording();
    }
    
    // 隐藏警告
    hideWarning();
    
    // 重置计时器
    resetTimer();
    
    // 重置所有变量
    currentTreeIndex = 0;
    grownTreesCount = 0;
    treeStages = [1];
    treeEnergyValues = [0];
    
    // 重置火焰能量
    energyValue = 0;
    updateEnergyBar();
    
    // 重置累计火焰数
    sunshineCount = 0;
    sunshineCountElement.textContent = '0';
    
    // 重置状态变量
    isBelowThreshold = false;
    window.lastTreeCheckTime = null;
    
    // 清空森林容器
    const forestContainer = document.querySelector('.forest-container');
    forestContainer.innerHTML = '';
    
    // 添加第一棵树
    addNewTree();
    
    // 播放重置动画
    playEmoji('🌱', '重置成功');
    
    // 重置能量递减时间
    lastEnergyDecrementTime = 0;
}

// 重置计时器
function resetTimer() {
    // 重置计时变量
    loudTotalTime = 0;
    loudStartTime = null;
    isLoud = false;
    
    // 清除计时器
    if (loudTimerInterval) {
        clearInterval(loudTimerInterval);
        loudTimerInterval = null;
    }
    
    // 更新显示
    quietTimeElement.textContent = '00:00:00';
}

// 停止录音
function stopRecording() {
    if (!isRecording) return;
    
    // 停止音频分析
    cancelAnimationFrame(animationFrameId);
    
    // 关闭麦克风
    if (microphone && audioContext) {
        microphone.disconnect();
        audioContext.close();
    }
    
    // 更新UI
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    isRecording = false;
    
    // 停止安静计时
    stopQuietTimer();
}

// 开始大声计时
function startLoudTimer() {
    isLoud = true;
    loudStartTime = new Date();
    
    // 清除之前的计时器
    if (loudTimerInterval) {
        clearInterval(loudTimerInterval);
    }
    
    // 设置每秒更新一次计时显示
    loudTimerInterval = setInterval(updateLoudTime, 1000);
}

// 停止大声计时
function stopLoudTimer() {
    if (isLoud) {
        isLoud = false;
        // 计算并累加大声时间
        if (loudStartTime) {
            loudTotalTime += new Date() - loudStartTime;
            loudStartTime = null;
        }
        
        // 清除计时器
        if (loudTimerInterval) {
            clearInterval(loudTimerInterval);
            loudTimerInterval = null;
        }
        
        // 更新显示的总时间
        updateLoudTime();
    }
}

// 更新大声时间显示
function updateLoudTime() {
    let totalMilliseconds = loudTotalTime;
    
    // 如果当前处于大声状态，加上当前阶段的时
    if (isLoud && loudStartTime) {
        totalMilliseconds += new Date() - loudStartTime;
    }
    
    // 转换为时分秒格式
    const totalSeconds = Math.floor(totalMilliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // 格式化为 HH:MM:SS
    quietTimeElement.textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 初始化音效
function initReminders() {
    const reminderContainer = document.getElementById('reminder-sounds');
    
    // 清空容器
    reminderContainer.innerHTML = '';
    
    // 创建音频元素
    for (let i = 1; i <= 5; i++) { // 现在支持5个音效文件
        const audio = document.createElement('audio');
        audio.id = `reminder-${i}`;
        audio.preload = 'auto';
        
        const source = document.createElement('source');
        source.src = `sounds/reminders/音频${i}.mp3`;
        source.type = 'audio/mp3';
        
        audio.appendChild(source);
        reminderContainer.appendChild(audio);
        
        // 添加加载事件监听
        audio.addEventListener('canplaythrough', () => {
            if (!reminderSounds.includes(audio)) {
                reminderSounds.push(audio);
                console.log(`音效 ${i} 加载完成`);
            }
        });
        
        // 添加错误处理
        audio.addEventListener('error', (e) => {
            console.error(`音效 ${i} 加载失败:`, e);
        });
    }
}

// 随机播放提醒音效
function playRandomReminder() {
    const now = Date.now();
    
    console.log("尝试播放提醒音效");
    
    // 如果声音已经高于阈值，不需要播放
    if (!isBelowThreshold) {
        console.log("声音高于阈值，不播放提醒音效");
        return;
    }
    
    // 检查是否有可用的音频
    if (reminderSounds.length === 0) {
        console.warn('没有可用的提醒音频');
        return;
    }
    
    // 如果有正在播放的提醒，停止它，但保持警告图显示
    if (currentPlayingReminder) {
        console.log("停止当前播放的提醒，但保持警告图显示");
        
        try {
            // 停止播放
            currentPlayingReminder.pause();
            currentPlayingReminder.currentTime = 0;
            
            // 如果有保存的回调函数，移除事件监听器
            if (currentPlayingReminder.onEndedCallback) {
                currentPlayingReminder.removeEventListener('ended', currentPlayingReminder.onEndedCallback);
            }
        } catch (e) {
            console.error("停止音频时出错:", e);
        }
        
        // 清空当前播放的提醒
        currentPlayingReminder = null;
    } else {
        // 如果没有正在播放的提醒，显示低音量警告图片
        showLowVolumeWarning();
    }
    
    // 随机选择一个音频
    const randomIndex = Math.floor(Math.random() * reminderSounds.length);
    currentPlayingReminder = reminderSounds[randomIndex];
    console.log("选择播放音频: " + (randomIndex + 1));
    
    // 定义音频结束时的回调函数
    function onAudioEnded() {
        console.log("音频播放结束，检查是否需要继续循环");
        
        // 如果声音仍然低于阈值，则重新设置计时器再次播放
        if (isBelowThreshold) {
            console.log("声音仍然低于阈值，3秒后再次播放提醒");
            // 重新设置计时器，3秒后再次播放
            // 注意：不隐藏警告图，保持显示直到下一个音频播放前
            lowVolumeTimeout = setTimeout(() => {
                playRandomReminder();
            }, LOW_VOLUME_DELAY);
        } else {
            console.log("声音已恢复，停止提醒循环");
            // 只有当声音恢复正常时才隐藏警告图
            hideLowVolumeWarning();
        }
    }
    
    // 移除之前可能存在的事件监听器
    currentPlayingReminder.removeEventListener('ended', currentPlayingReminder.onEndedCallback);
    
    // 存储回调函数以便后续移除
    currentPlayingReminder.onEndedCallback = onAudioEnded;
    
    // 添加监听器
    currentPlayingReminder.addEventListener('ended', onAudioEnded);
    
    // 确保音频可以播放
    currentPlayingReminder.load();
    
    // 播放选中的音频
    let playPromise = currentPlayingReminder.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log("音频开始播放");
            
            // 为确保ended事件能被触发，设置音频时长检查
            setTimeout(() => {
                // 检查音频是否仍在播放
                if (currentPlayingReminder && !currentPlayingReminder.paused) {
                    // 检查是否接近结束
                    if (currentPlayingReminder.duration > 0 && 
                        (currentPlayingReminder.duration - currentPlayingReminder.currentTime) < 0.5) {
                        console.log("手动触发音频结束处理");
                        onAudioEnded();
                    }
                }
            }, 5000); // 5秒后检查，应该足够大多数提醒音效播放完毕
            
        }).catch(e => {
            console.error('播放提醒音频失败:', e);
            currentPlayingReminder = null;
            
            // 播放失败也设置定时器尝试下一次播放，但不隐藏警告图
            if (isBelowThreshold) {
                lowVolumeTimeout = setTimeout(() => {
                    playRandomReminder();
                }, LOW_VOLUME_DELAY);
            } else {
                // 只有声音恢复时才隐藏警告图
                hideLowVolumeWarning();
            }
        });
    }
    
    // 更新最后提醒时间
    lastReminderTime = now;
}

// 停止当前播放的提醒音频
function stopCurrentReminder() {
    if (currentPlayingReminder) {
        console.log("停止当前播放的提醒");
        
        try {
            // 停止播放
            currentPlayingReminder.pause();
            currentPlayingReminder.currentTime = 0;
            
            // 如果有保存的回调函数，移除事件监听器
            if (currentPlayingReminder.onEndedCallback) {
                currentPlayingReminder.removeEventListener('ended', currentPlayingReminder.onEndedCallback);
            }
        } catch (e) {
            console.error("停止音频时出错:", e);
        }
        
        // 清空当前播放的提醒
        currentPlayingReminder = null;
        
        // 不再自动隐藏警告图，让updateVolume函数根据声音状态控制
    }
}

// 减少能量
function decrementEnergy() {
    // 使用基于时间的减少，而不是每帧减少
    const now = Date.now();
    
    // 如果是首次调用，记录当前时间
    if (lastEnergyDecrementTime === 0) {
        lastEnergyDecrementTime = now;
        return;
    }
    
    // 计算自上次减少后经过的时间（毫秒）
    const deltaTime = now - lastEnergyDecrementTime;
    
    // 计算在这段时间内应该减少的能量
    // 每秒应减少的能量 = 100 / 火焰生成时间（秒）
    // 这段时间内应减少的能量 = 每秒减少的能量 * (deltaTime / 1000)
    const energyDecrement = (100 / flameGenerationSpeed) * (deltaTime / 1000);
    
    // 减少能量
    energyValue -= energyDecrement;
    
    // 记录当前时间，用于下次计算
    lastEnergyDecrementTime = now;
    
    // 确保能量不会小于0
    if (energyValue < 0) {
        // 重置能量值为最大值，表示准备减少一个火焰
        energyValue = ENERGY_MAX;
        
        // 当能量降为0时，减少累计火焰数
        if (sunshineCount > 0) {
            // 减少火焰数
            sunshineCount--;
            sunshineCountElement.textContent = sunshineCount;
            
            // 记录火焰数减少日志
            const timePerFlame = flameGenerationSpeed.toFixed(1);
            console.log(`===== 火焰数减少 =====`);
            console.log(`当前累计火焰数: ${sunshineCount}`);
            console.log(`火焰减少速率: ${timePerFlame}秒/个`);
            console.log(`本次减少间隔: ${(deltaTime/1000).toFixed(2)}秒`);
            console.log(`预计下一个火焰减少时间: ${timePerFlame}秒后`);
            
            // 同时减少当前树的能量
            decrementTreeEnergy();
        } else {
            // 如果火焰数已经为0，则重置能量值为0
            energyValue = 0;
        }
    }
    
    // 更新能量条显示
    updateEnergyBar();
}

// 减少树木能量
function decrementTreeEnergy() {
    // 数组边界检查
    if (currentTreeIndex < 0 || currentTreeIndex >= treeEnergyValues.length) {
        console.error(`树木索引错误: ${currentTreeIndex}, 数组长度: ${treeEnergyValues.length}`);
        return;
    }
    
    // 只有当火焰数减少时，才减少树木能量
    // 减少当前树的能量
    if (treeEnergyValues[currentTreeIndex] > 0) {
        // 当前树还有能量，直接减少一点能量
        treeEnergyValues[currentTreeIndex]--;
        
        // 记录树木能量减少日志
        console.log(`树木能量减少: 第${currentTreeIndex + 1}棵树, 阶段${treeStages[currentTreeIndex]}, 剩余能量${treeEnergyValues[currentTreeIndex]}/${SUNSHINE_PER_STAGE}`);
        
        updateTreeEnergyBar();
        updateTreeProgress();
    } else {
        // 当前树能量已为0，需要降级树木
        if (treeStages[currentTreeIndex] > 1) {
            // 当前树还有降级空间
            treeStages[currentTreeIndex]--;
            
            // 记录树木降级日志
            console.log(`===== 树木降级 =====`);
            console.log(`第${currentTreeIndex + 1}棵树从阶段${treeStages[currentTreeIndex] + 1}降级到阶段${treeStages[currentTreeIndex]}`);
            
            // 更新树木图片
            const treeImage = document.getElementById(`tree-${currentTreeIndex + 1}-img`);
            if (!treeImage) {
                console.error(`未找到树木图片元素: tree-${currentTreeIndex + 1}-img`);
                return;
            }
            
            // 获取正确的阶段文字
            const stageText = getStageText(treeStages[currentTreeIndex]);
            
            // 设置回退后的图片
            try {
                // 直接使用正确的文件命名格式，确保使用当前主题路径
                const correctPath = `${THEMES[currentTheme].path}第${stageText}阶段的成长图.png`;
                
                console.log(`尝试加载图片: ${correctPath}`);
                treeImage.src = correctPath;
                console.log(`树木回退到阶段: ${treeStages[currentTreeIndex]}`);
            } catch (e) {
                console.error("设置树木图片失败:", e);
                treeImage.src = `${THEMES[currentTheme].path}第一阶段的成长图.png`; // 使用备用路径
            }
            
            // 播放回退动画 - 更新提示文本
            playEmoji('😢', `声音太小，${THEMES[currentTheme].name}失去能量啦！`);
            
            // 设置回退后树木能量为满值
            treeEnergyValues[currentTreeIndex] = SUNSHINE_PER_STAGE;
            // 立即再次减少一点能量
            treeEnergyValues[currentTreeIndex]--;
            
            console.log(`设置回退后能量: ${treeEnergyValues[currentTreeIndex]}/${SUNSHINE_PER_STAGE}`);
            
            updateTreeEnergyBar();
            updateTreeProgress();
        } else if (currentTreeIndex > 0) {
            // 当前树已经是第一阶段且能量为0，需要消失并回到上一棵树
            
            // 记录树木消失日志
            console.log(`===== 树木消失 =====`);
            console.log(`第${currentTreeIndex + 1}棵树将被移除，切换到第${currentTreeIndex}棵树`);
            
            // 移除当前树
            const currentTree = document.getElementById(`tree-${currentTreeIndex + 1}`);
            if (currentTree) {
                // 添加淡出动画
                currentTree.style.transition = 'opacity 0.5s ease-out';
                currentTree.style.opacity = '0';
                
                // 等待动画完成后移除元素
                setTimeout(() => {
                    if (currentTree.parentNode) {
                        currentTree.parentNode.removeChild(currentTree);
                        console.log(`第${currentTreeIndex + 1}棵树已被移除`);
                        
                        // 从数组中移除当前树的数据
                        treeEnergyValues.splice(currentTreeIndex + 1, 1);
                        treeStages.splice(currentTreeIndex + 1, 1);
                        
                        console.log(`从数组中移除树木数据，当前数组长度: ${treeEnergyValues.length}`);
                    }
                }, 500);
            } else {
                console.error(`未找到树木元素: tree-${currentTreeIndex + 1}`);
            }
            
            // 切换到上一棵树
            currentTreeIndex--;
            
            // 检查数组边界
            if (currentTreeIndex < 0 || currentTreeIndex >= treeEnergyValues.length) {
                console.error("树木索引超出范围，重置为0");
                currentTreeIndex = 0;
            }
            
            console.log(`当前活跃树木索引: ${currentTreeIndex}`);
            
            // 更新树木能量
            updateTreeEnergyBar();
            updateTreeProgress();
            
            // 播放树木消失动画
            playEmoji('💔', '声音太小，哪吒失去了一棵树！');
        } else {
            // 已经是第一棵树的第一阶段，且能量为0，保持最低状态
            console.log(`已经达到最低状态，第1棵树处于第1阶段能量为0，无法继续减少`);
            // 确保能量不会小于0
            treeEnergyValues[currentTreeIndex] = 0;
            updateTreeEnergyBar();
            updateTreeProgress();
        }
    }
}

// 检查音频状态
function checkAudioStatus() {
    console.log("检查音频状态...");
    console.log("已加载的音效数量: " + reminderSounds.length);
    
    if (reminderSounds.length === 0) {
        console.warn("警告: 没有加载任何音效!");
        // 尝试重新初始化音效
        setTimeout(() => {
            console.log("尝试重新初始化音效...");
            initReminders();
            
            // 检查是否成功加载
            setTimeout(() => {
                if (reminderSounds.length === 0) {
                    console.error("重新加载音效失败!");
                } else {
                    console.log("重新加载成功，加载了 " + reminderSounds.length + " 个音效");
                }
            }, 2000);
        }, 1000);
    } else {
        console.log("音效加载正常");
        // 检查每个音效的状态
        reminderSounds.forEach((audio, index) => {
            console.log(`音效 ${index + 1}: readyState=${audio.readyState}, duration=${audio.duration}`);
        });
    }
}

// 预加载警告音效
function preloadWarningSound() {
    if (warningSound) {
        // 设置音频加载事件
        warningSound.addEventListener('canplaythrough', () => {
            console.log('警告音效加载完成');
        });
        
        // 设置错误处理
        warningSound.addEventListener('error', (e) => {
            console.error('警告音效加载失败:', e);
        });
        
        // 强制加载
        warningSound.load();
    } else {
        console.warn('未找到警告音效元素');
    }
}

// 创建低音量警告元素
function createLowVolumeWarning() {
    // 检查图片是否存在
    const testImg = new Image();
    testImg.onload = function() {
        console.log("warning2.png 图片加载成功");
    };
    testImg.onerror = function() {
        console.error("warning2.png 图片加载失败，请检查路径");
    };
    testImg.src = 'images/warning2.png';

    // 查找已有的警告元素（如果在HTML中已有）
    let existingWarning = document.querySelector('.low-volume-warning');
    
    if (existingWarning) {
        // 如果HTML中已有元素，直接使用
        lowVolumeWarningElement = existingWarning;
        
        // 确保图片有透明背景
        const imgElement = existingWarning.querySelector('img');
        if (imgElement) {
            imgElement.style.background = 'transparent';
        }
        
        // 设置初始变换属性
        existingWarning.style.transform = 'translate(-50%, -50%) scale(0.8)';
        existingWarning.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        console.log("使用HTML中已存在的低音量警告元素");
        return;
    }
    
    // 创建容器元素
    lowVolumeWarningElement = document.createElement('div');
    lowVolumeWarningElement.className = 'low-volume-warning';
    lowVolumeWarningElement.style.position = 'fixed';
    lowVolumeWarningElement.style.top = '50%';
    lowVolumeWarningElement.style.left = '50%';
    lowVolumeWarningElement.style.transform = 'translate(-50%, -50%) scale(0.8)';
    lowVolumeWarningElement.style.zIndex = '1000';
    lowVolumeWarningElement.style.display = 'none';
    lowVolumeWarningElement.style.opacity = '0';
    lowVolumeWarningElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    lowVolumeWarningElement.style.background = 'transparent';
    
    // 创建图片元素
    const img = document.createElement('img');
    img.src = 'images/warning2.png';
    img.alt = '音量过低警告';
    img.style.width = '300px'; // 增大图片尺寸
    img.style.height = 'auto';
    img.style.background = 'transparent'; // 确保图片背景透明
    
    // 创建备用文本，以防图片加载失败
    const fallbackText = document.createElement('div');
    fallbackText.textContent = '声音太小了，请大声朗读！';
    fallbackText.style.color = 'red';
    fallbackText.style.fontSize = '24px';
    fallbackText.style.fontWeight = 'bold';
    fallbackText.style.textAlign = 'center';
    fallbackText.style.marginTop = '10px';
    fallbackText.style.background = 'transparent';
    
    // 添加元素到容器
    lowVolumeWarningElement.appendChild(img);
    lowVolumeWarningElement.appendChild(fallbackText);
    
    // 添加到文档
    document.body.appendChild(lowVolumeWarningElement);
    
    console.log("低音量警告元素已创建");
}

// 显示低音量警告
function showLowVolumeWarning() {
    if (!lowVolumeWarningElement) {
        console.error("低音量警告元素不存在，尝试重新创建");
        createLowVolumeWarning();
    }
    
    if (lowVolumeWarningElement) {
        console.log("显示低音量警告");
        
        // 确保元素可见
        lowVolumeWarningElement.style.display = 'block';
        
        // 使用requestAnimationFrame确保transition生效
        requestAnimationFrame(() => {
            lowVolumeWarningElement.style.opacity = '0.95'; // 提高透明度使其更明显
            // 添加一个放大效果
            lowVolumeWarningElement.style.transform = 'translate(-50%, -50%) scale(1.05)';
            
            // 添加脉动动画
            lowVolumeWarningElement.classList.add('warning-pulse');
        });
    } else {
        console.error("无法显示低音量警告：元素仍不存在");
    }
}

// 隐藏低音量警告
function hideLowVolumeWarning() {
    if (lowVolumeWarningElement) {
        console.log("隐藏低音量警告");
        
        // 添加淡出效果
        lowVolumeWarningElement.style.opacity = '0';
        // 添加缩小效果
        lowVolumeWarningElement.style.transform = 'translate(-50%, -50%) scale(0.8)';
        
        // 等待过渡完成后隐藏元素
        setTimeout(() => {
            lowVolumeWarningElement.style.display = 'none';
        }, 500);
    }
}

// 当页面加载完成时初始化
window.addEventListener('load', () => {
    init();
    preloadImages();
    
    // 添加CSS动画效果
    const style = document.createElement('style');
    style.textContent = `
        .emoji-animation {
            animation: pop 0.5s ease-in-out;
        }
        
        .text-animation {
            animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes pop {
            0% { transform: scale(1); }
            50% { transform: scale(1.5); }
            100% { transform: scale(1); }
        }
        
        @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        
        /* 警告图脉动动画 */
        @keyframes warningPulse {
            0% { transform: translate(-50%, -50%) scale(1.05); }
            50% { transform: translate(-50%, -50%) scale(1.15); }
            100% { transform: translate(-50%, -50%) scale(1.05); }
        }
        
        .warning-pulse {
            animation: warningPulse 1s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);
    
    // 等待5秒后检查音频状态，确保有足够的时间加载
    setTimeout(checkAudioStatus, 5000);
    
    // 检查关键图片是否正确加载
    checkImagesLoaded();
});

// 检查关键图片是否正确加载
function checkImagesLoaded() {
    console.log("开始检查关键图片加载状态...");
    
    // 检查警告图片和当前主题的所有阶段图片
    const imagesToCheck = [
        { src: 'images/warning.svg', name: '大声警告图片' },
        { src: 'images/warning2.png', name: '低音量警告图片' },
        { src: `${THEMES[currentTheme].path}第一阶段的成长图.png`, name: `${THEMES[currentTheme].name}第1阶段图片` },
        { src: `${THEMES[currentTheme].path}第二阶段的成长图.png`, name: `${THEMES[currentTheme].name}第2阶段图片` },
        { src: `${THEMES[currentTheme].path}第三阶段的成长图.png`, name: `${THEMES[currentTheme].name}第3阶段图片` }
    ];
    
    imagesToCheck.forEach(imageInfo => {
        const img = new Image();
        img.onload = function() {
            console.log(`✅ ${imageInfo.name} (${imageInfo.src}) 加载成功！尺寸: ${img.width}x${img.height}`);
        };
        img.onerror = function() {
            console.error(`❌ ${imageInfo.name} (${imageInfo.src}) 加载失败！请检查路径和文件是否存在`);
            
            // 如果是低音量警告图片加载失败，尝试使用备用路径
            if (imageInfo.src === 'images/warning2.png') {
                console.log("尝试其他可能的路径...");
                
                // 尝试不同路径
                const alternativePaths = [
                    'images/warning2.png',  // 原路径
                    './images/warning2.png', // 相对路径
                    '/images/warning2.png',  // 绝对路径
                    'warning2.png'           // 当前目录
                ];
                
                alternativePaths.forEach(path => {
                    if (path !== imageInfo.src) {
                        const altImg = new Image();
                        altImg.onload = function() {
                            console.log(`✅ 成功使用备用路径加载低音量警告图片: ${path}`);
                            // 更新页面上所有低音量警告图片的src
                            document.querySelectorAll('.low-volume-warning img').forEach(img => {
                                img.src = path;
                            });
                        };
                        altImg.onerror = function() {
                            console.log(`❌ 备用路径 ${path} 加载失败`);
                        };
                        altImg.src = path;
                    }
                });
            }
        };
        img.src = imageInfo.src;
    });
}

// 获取数字对应的中文文字（一、二、三）
function getStageText(stage) {
    switch (stage) {
        case 1: return "一";
        case 2: return "二";
        case 3: return "三";
        case 4: return "四";
        case 5: return "五";
        default: return "一";
    }
} 

// 初始化主题切换按钮事件
function initThemes() {
    // 为每个主题按钮添加事件监听
    document.getElementById('theme-nezha').addEventListener('click', () => switchTheme('nezha'));
    document.getElementById('theme-shijiNiangniang').addEventListener('click', () => switchTheme('shijiNiangniang'));
    document.getElementById('theme-aoBing').addEventListener('click', () => switchTheme('aoBing'));
}

// 加载保存的主题
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('current-theme');
    if (savedTheme && THEMES[savedTheme]) {
        switchTheme(savedTheme, true); // 第二个参数表示静默切换，避免播放提示
    }
}

// 切换主题
function switchTheme(themeName, silent = false) {
    if (!THEMES[themeName] || themeName === currentTheme) return;
    
    // 更新全局变量
    const oldTheme = currentTheme;
    currentTheme = themeName;
    
    // 保存用户选择
    localStorage.setItem('current-theme', themeName);
    
    // 更新按钮状态
    updateThemeButtons();
    
    // 更新文档主题类
    updateDocumentThemeClass();
    
    // 更新所有树木图片
    updateTreeImages();
    
    // 更新介绍文本和能量元素名称
    updateThemeText();
    
    // 显示主题切换提示
    if (!silent) {
        playEmoji('🎨', `切换到${THEMES[themeName].name}主题！现在开始收集${THEMES[themeName].elementName}能量！`);
    }
    
    console.log(`主题从 ${THEMES[oldTheme].name} 切换到 ${THEMES[themeName].name}`);
}

// 更新主题按钮状态
function updateThemeButtons() {
    // 移除所有按钮的活动状态
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('theme-btn-active');
    });
    
    // 为当前主题按钮添加活动状态
    const activeBtn = document.getElementById(`theme-${currentTheme}`);
    if (activeBtn) {
        activeBtn.classList.add('theme-btn-active');
    }
}

// 更新文档主题CSS类
function updateDocumentThemeClass() {
    // 移除所有主题类
    document.body.classList.remove('theme-shijiNiangniang', 'theme-aoBing');
    
    // 添加当前主题类（如果不是默认主题）
    if (THEMES[currentTheme].themeClass) {
        document.body.classList.add(THEMES[currentTheme].themeClass);
    }
}

// 更新所有树木图片
function updateTreeImages() {
    // 获取当前所有树木图片
    const treeImages = document.querySelectorAll('.tree-image');
    
    // 遍历每个树图片，更新为当前主题的路径
    treeImages.forEach((img, index) => {
        const treeId = img.id;
        const treeNumber = parseInt(treeId.split('-')[1]);
        const treeIndex = treeNumber - 1;
        const stage = treeStages[treeIndex] || 1;
        const stageText = getStageText(stage);
        
        // 创建新路径
        const newPath = `${THEMES[currentTheme].path}第${stageText}阶段的成长图.png`;
        
        console.log(`更新树 #${treeNumber} 图片：${img.src} → ${newPath}`);
        img.src = newPath;
    });
}

// 更新主题相关的文本内容
function updateThemeText() {
    // 更新介绍文本
    const themeIntroText = document.getElementById('theme-intro-text');
    if (themeIntroText) {
        if (currentTheme === 'nezha') {
            themeIntroText.textContent = `哪吒需要你的热情，让我们大声喊出来，用我们的声音为哪吒提供火焰能量！`;
        } else if (currentTheme === 'shijiNiangniang') {
            themeIntroText.textContent = `石矶娘娘需要你的力量，让我们大声朗读，用我们的声音为她提供石头能量！`;
        } else if (currentTheme === 'aoBing') {
            themeIntroText.textContent = `敖丙需要你的清凉，让我们大声朗读，用我们的声音为他提供水滴能量！`;
        }
    }
    
    // 更新能量标题
    const energyTitle = document.getElementById('energy-title');
    if (energyTitle) {
        energyTitle.textContent = THEMES[currentTheme].elementName;
    }
    
    // 更新所有能量元素名称
    const elementNames = document.querySelectorAll('[id^="energy-element-name"]');
    elementNames.forEach(element => {
        element.textContent = THEMES[currentTheme].elementName;
    });
}
