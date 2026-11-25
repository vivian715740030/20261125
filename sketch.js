window.createParkController = function (parkScene) { // 提供場景啟動器以 p5.js 實例模式作為唯一主迴圈
  return new p5((p) => { // 建立獨立的 p5.js 實例避免依賴全域模式
    let zoomSlider; // 保存場景縮放滑桿以供重設視角時更新
    let zoomValue; // 保存縮放數值標籤以供即時更新
    let lanternButton; // 保存路燈切換按鈕以更新其狀態
    let shirtColorPicker; // 保存上衣顏色選擇器
    let accessoryColorPicker; // 保存配件顏色選擇器
    let accessorySelect; // 保存配件類型選擇器
    let backpackToggle; // 保存背包開關
    let petToggle; // 保存寵物開關
    let characterNameInput; // 保存玩家角色名稱輸入欄
    let lightsOn = true; // 記錄目前路燈的開關狀態
    let stampLabelHits = []; // 保存五個集章標籤的即時點擊範圍
    let zoomPercent = 100; // 記錄縮放控制目前的百分比
    let pointerStart = null; // 儲存滑鼠按下位置以區分點擊與鏡頭拖曳
    let pointerDragged = false; // 記錄目前操作是否已進入鏡頭旋轉拖曳
    let lastPointer = null; // 儲存最近滑鼠座標以計算鏡頭旋轉增量

    p.setup = function () { // 初始化 p5.js 畫布與場景介面
      p.pixelDensity(1); // 將介面畫布限制為每個 CSS 像素一個繪圖像素以減少高解析螢幕負載
      const canvas = p.createCanvas(p.windowWidth, p.windowHeight); // 建立覆蓋全視窗的透明互動畫布
      canvas.parent("ui-root"); // 將 p5.js 畫布放進操作介面容器
      canvas.elt.style.pointerEvents = "auto"; // 讓畫布接收地面點擊與鍵盤焦點
      canvas.elt.style.cursor = "grab"; // 提示使用者可以拖曳旋轉攝影機
      window.addEventListener("wheel", handleWheel, { passive: false }); // 在視窗層級接收滑鼠滾輪以免畫布事件被介面遮罩攔截
      createInterface(p); // 建立繁體中文場景控制元件
    }; // 結束畫布初始化

    p.draw = function () { // 以 p5.js draw 作為場景唯一的逐影格主迴圈
      p.clear(); // 清除畫布但保留透明背景與 Three.js 場景
      const input = { x: 0, y: 0 }; // 初始化依畫面方向定義的移動輸入
      if (p.keyIsDown(p.LEFT_ARROW) || p.keyIsDown(65)) input.x -= 1; // 將左方向鍵與 A 鍵轉成畫面向左輸入
      if (p.keyIsDown(p.RIGHT_ARROW) || p.keyIsDown(68)) input.x += 1; // 將右方向鍵與 D 鍵轉成畫面向右輸入
      if (p.keyIsDown(p.UP_ARROW) || p.keyIsDown(87)) input.y += 1; // 將上方向鍵與 W 鍵轉成畫面向上輸入
      if (p.keyIsDown(p.DOWN_ARROW) || p.keyIsDown(83)) input.y -= 1; // 將下方向鍵與 S 鍵轉成畫面向下輸入
      parkScene.tick(Math.min(p.deltaTime / 1000, 0.05), input); // 用 p5.js 單一主迴圈更新角色、攝影機與 Three.js 畫面
      drawStampLabels(p); // 在地圖上方繪製由 p5.js 即時投影的白色集章標籤
      drawCharacterName(p); // 在玩家角色頭部上方繪製自訂姓名標籤
      drawStampProgress(p); // 顯示已完成集章數量與目前地點說明
      p.noStroke(); // 關閉狀態提示圖形的邊框
      p.fill(255, 255, 255, 175); // 設定柔和的白色狀態點
      p.circle(44, p.height - 48, 6); // 在左下角繪製即時場景狀態點
    }; // 結束每影格主迴圈

    p.keyPressed = function () { // 避免方向鍵操作時觸發瀏覽器頁面捲動
    if (document.activeElement instanceof HTMLElement && document.activeElement.matches("input, select, textarea")) return true; // 輸入欄取得焦點時保留文字編輯與選單鍵盤操作
    if ([p.LEFT_ARROW, p.RIGHT_ARROW, p.UP_ARROW, p.DOWN_ARROW].includes(p.keyCode)) return false; // 攔截四個方向鍵的預設捲動行為
      return true; // 允許其他按鍵維持瀏覽器預設行為
    }; // 結束鍵盤事件處理

    p.mousePressed = function () { // 記錄滑鼠按下位置並等待判斷點擊或旋轉
      if (isControlPointerEvent()) return true; // 控制面板收到滑鼠事件時允許原生控件取得焦點與開啟選單
      pointerStart = { x: p.mouseX, y: p.mouseY }; // 保存本次操作的初始畫布座標
      lastPointer = { x: p.mouseX, y: p.mouseY }; // 初始化鏡頭旋轉拖曳的上一個座標
      pointerDragged = false; // 將本次操作初始化為尚未拖曳
      return false; // 阻止滑鼠按下觸發瀏覽器預設行為
    }; // 結束滑鼠按下處理

    p.mouseDragged = function () { // 以滑鼠左鍵拖曳旋轉攝影機並環顧場景
      if (!pointerStart || p.mouseButton !== p.LEFT) return false; // 沒有畫布起點或不是左鍵拖曳時不旋轉
      const dragDistance = Math.hypot(p.mouseX - pointerStart.x, p.mouseY - pointerStart.y); // 計算滑鼠與起點之間的拖曳距離
      if (dragDistance > 4) pointerDragged = true; // 超過四像素才將本次手勢判定為鏡頭旋轉
      if (pointerDragged && lastPointer) { // 只有真正拖曳時才更新鏡頭方位
        parkScene.orbitBy(p.mouseX - lastPointer.x, p.mouseY - lastPointer.y); // 將拖曳增量傳給攝影機環繞控制
        p.cursor("grabbing"); // 顯示目前正在旋轉鏡頭的游標
      } // 結束鏡頭拖曳更新
      lastPointer = { x: p.mouseX, y: p.mouseY }; // 保存最新座標供下一影格計算拖曳量
      return false; // 阻止拖曳觸發瀏覽器預設選取行為
    }; // 結束滑鼠拖曳旋轉

    p.mouseReleased = function () { // 滑鼠放開時只在沒有拖曳的情況下處理點選
      if (isControlPointerEvent()) { pointerStart = null; lastPointer = null; pointerDragged = false; return true; } // 面板控件操作不觸發場景點選並保留原生控件行為
      if (pointerStart && !pointerDragged && p.mouseButton === p.LEFT) handleSceneClick(p); // 未拖曳時才執行標籤導航或 Raycaster 地面點選
      pointerStart = null; // 清除本次滑鼠操作起點
      lastPointer = null; // 清除上次拖曳座標
      pointerDragged = false; // 將操作狀態重設為未拖曳
      p.cursor("grab"); // 還原可拖曳旋轉的游標
      return false; // 阻止放開滑鼠觸發瀏覽器預設行為
    }; // 結束滑鼠放開處理

    function isControlPointerEvent() { // 判斷 p5 收到的滑鼠事件是否來自 HTML 控制面板
      const eventTarget = p.mouseEvent?.target; // 取得原生滑鼠事件的實際目標元素
      return eventTarget instanceof Element && Boolean(eventTarget.closest(".character-card, .control-card")); // 控制卡內保留瀏覽器原生輸入與選單行為
    } // 結束控制面板滑鼠事件判斷

    function handleSceneClick(instance) { // 將未拖曳的滑鼠點擊分派給集章標籤或地面導航
      const clickedLabel = stampLabelHits.find((label) => instance.mouseX >= label.left && instance.mouseX <= label.right && instance.mouseY >= label.top && instance.mouseY <= label.bottom); // 優先判斷是否點擊集章標籤
      if (clickedLabel) { parkScene.goToStamp(clickedLabel.index); return; } // 點選標籤後立刻規劃前往該集章點
      if (instance.mouseX >= 30 && instance.mouseX <= 236 && instance.mouseY >= 115 && instance.mouseY <= 185) return; // 點擊左上角進度卡片時不把卡片位置當作地面目的地
      const stampStatus = parkScene.getStampStatus(); // 取得目前顯示的集章說明與完成狀態
      const descriptionTop = instance.height - (instance.width < 600 ? 205 : 110); // 計算畫面下方地點說明卡片的上緣
      if (stampStatus.description && instance.mouseX >= 30 && instance.mouseX <= 420 && instance.mouseY >= descriptionTop && instance.mouseY <= descriptionTop + 72) return; // 點擊地點說明時不把說明卡位置當作地面目的地
      const completionTop = Math.max(205, instance.height * 0.28); // 計算全部集章完成提示卡片的上緣
      if (stampStatus.complete && instance.mouseX >= instance.width / 2 - 180 && instance.mouseX <= instance.width / 2 + 180 && instance.mouseY >= completionTop && instance.mouseY <= completionTop + 68) return; // 點擊完成提示時不把提示卡位置當作地面目的地
      if (eventTargetIsCharacterCard(instance)) return; // 點擊角色外觀面板時不把面板位置當作地面目的地
      parkScene.setDestinationFromScreen(instance.mouseX, instance.mouseY, instance.width, instance.height); // 以 Raycaster 設定滑鼠點擊的可行走目標
    } // 結束場景點擊分派

    function eventTargetIsCharacterCard(instance) { // 判斷目前按下位置是否落在角色自訂面板內
      const card = instance.select(".character-card"); // 取得角色外觀控制面板
      if (!card) return false; // 尚未建立面板時不攔截場景點擊
      const bounds = card.elt.getBoundingClientRect(); // 取得角色面板在視窗中的顯示範圍
      return instance.mouseX >= bounds.left && instance.mouseX <= bounds.right && instance.mouseY >= bounds.top && instance.mouseY <= bounds.bottom; // 判斷畫布座標是否位於面板範圍
    } // 結束面板點擊範圍判斷

    function handleWheel(event) { // 在全視窗接收滾輪並同步縮放數值與場景
      if (event.target instanceof Element && event.target.closest(".control-card")) return; // 保留縮放控制卡內滑桿與按鈕的原生滾輪行為
      if (event.deltaY === 0) return; // 略過沒有垂直滾動量的事件
      event.preventDefault(); // 阻止頁面捲動，讓滾輪專用於場景縮放
      setZoomPercent(zoomPercent + (event.deltaY < 0 ? 6 : -6)); // 依滾輪方向平滑放大或縮小場景
    } // 結束全視窗滾輪縮放處理

    p.windowResized = function () { // 視窗尺寸改變時同步調整 p5.js 畫布
      p.resizeCanvas(p.windowWidth, p.windowHeight); // 讓互動畫布繼續覆蓋全視窗
    }; // 結束視窗尺寸同步

    function drawStampLabels(instance) { // 使用 p5.js 繪製浮在五個地點上方的白色膠囊標籤
      const status = parkScene.getStampStatus(); // 取得各集章點目前是否已完成的狀態
      stampLabelHits = []; // 清除上一影格的標籤點擊範圍
      instance.textFont("Microsoft JhengHei, sans-serif"); // 使用支援繁體中文的系統字型
      instance.textSize(12); // 設定標籤文字大小
      instance.textAlign(instance.LEFT, instance.CENTER); // 將標籤文字設定為左側垂直置中
      for (let index = 0; index < status.stamps.length; index += 1) { // 逐一投影並繪製五個集章地點標籤
        const stamp = status.stamps[index]; // 讀取目前標籤對應的地點資訊
        const position = parkScene.getStampScreenPosition(index, instance.width, instance.height); // 取得地點標籤的即時畫面位置
        if (!position || position.x < -90 || position.x > instance.width + 90 || position.y < -40 || position.y > instance.height + 40) continue; // 略過目前畫面之外的標籤
        const labelWidth = Math.max(112, instance.textWidth(`${stamp.number}　${stamp.name}`) + 35); // 依編號與地名文字長度計算膠囊寬度
        const labelHeight = 32; // 設定白色膠囊標籤的高度
        const controlLeft = instance.width - 290; // 計算右下角控制卡左側遮擋邊界
        const controlTop = instance.height - 230; // 計算右下角控制卡上側遮擋邊界
        let labelX = position.x; // 先以集章圈上方投影位置作為標籤水平座標
        let labelY = position.y; // 先以集章圈上方投影位置作為標籤垂直座標
        if (labelX + labelWidth / 2 > 30 && labelX - labelWidth / 2 < 236 && labelY + labelHeight / 2 > 115 && labelY - labelHeight / 2 < 185) labelX = 244 + labelWidth / 2 + 8; // 避開左上角集章進度卡片遮擋
        if (labelX + labelWidth / 2 > controlLeft && labelY + labelHeight / 2 > controlTop) labelX = Math.max(labelWidth / 2 + 8, controlLeft - labelWidth / 2 - 8); // 遇到控制卡遮擋時將標籤移到控制卡左側
        const left = labelX - labelWidth / 2; // 計算膠囊標籤左側畫布座標
        const top = labelY - labelHeight / 2; // 計算膠囊標籤上側畫布座標
        instance.noStroke(); // 關閉標籤形狀外框
        instance.fill(52, 79, 75, 35); // 設定柔和的標籤陰影顏色
        instance.rect(left, top + 3, labelWidth, labelHeight, 16); // 繪製白色膠囊下方的柔和陰影
        instance.fill(255, 255, 255, 245); // 設定明亮不透明的白色膠囊背景
        instance.rect(left, top, labelWidth, labelHeight, 16); // 繪製顯示於地點上方的白色膠囊
        instance.fill(stamp.collected ? "#65a981" : "#e58e4a"); // 已完成地點使用綠色，未完成地點使用橘色編號
        instance.textAlign(instance.CENTER, instance.CENTER); // 將集章編號置中顯示
        instance.text(stamp.collected ? "✓" : stamp.number, left + 21, labelY); // 顯示完成勾號或兩位數地點編號
        instance.fill("#4a6262"); // 設定地點名稱的深灰綠色文字
        instance.textAlign(instance.LEFT, instance.CENTER); // 讓地點名稱由編號右側開始排列
        instance.text(stamp.name, left + 40, labelY); // 繪製集章地點繁體中文名稱
        stampLabelHits.push({ index, left, right: left + labelWidth, top, bottom: top + labelHeight }); // 儲存標籤點擊範圍供滑鼠事件使用
      } // 結束所有地點標籤繪製
    } // 結束 p5.js 集章標籤繪製

    function drawStampProgress(instance) { // 繪製左上角集章進度與畫面下方地點說明
      const status = parkScene.getStampStatus(); // 取得集章總數、完成狀態與最近地點說明
      const collectedCount = status.stamps.filter((stamp) => stamp.collected).length; // 計算目前已完成的地點數量
      instance.noStroke(); // 關閉進度卡與說明卡的邊框
      instance.fill(45, 70, 70, 28); // 設定卡片下方柔和陰影色
      instance.rect(30, 118, 206, 70, 18); // 繪製左上角進度卡片陰影
      instance.fill(249, 253, 250, 238); // 設定白綠色半透明卡片背景
      instance.rect(30, 115, 206, 70, 18); // 顯示左上角集章進度卡片
      instance.fill("#3c5a5d"); // 設定進度標題的深色文字
      instance.textAlign(instance.LEFT, instance.CENTER); // 將進度資訊排列為左側對齊
      instance.textSize(12); // 設定進度標題文字大小
      instance.text("浮島探索集章", 46, 137); // 顯示集章活動標題
      instance.fill("#719089"); // 設定集章數量的柔和綠色文字
      instance.textSize(11); // 設定集章數量文字大小
      instance.text(`${collectedCount} / ${status.stamps.length} 個地點完成`, 46, 164); // 即時顯示已完成數量與集章總數
      if (collectedCount > 0) { // 已蓋至少一個章時顯示最近地點的介紹
        const cardWidth = Math.min(390, instance.width - 32); // 依視窗寬度計算下方說明卡片尺寸
        const cardLeft = 30; // 將地點說明卡放在畫面左下方以避開右側控制項
        const cardTop = instance.height - (instance.width < 600 ? 205 : 110); // 在窄螢幕上將說明卡上移避免遮住控制面板
        instance.fill(45, 70, 70, 30); // 設定地點說明卡片陰影
        instance.rect(cardLeft, cardTop + 3, cardWidth, 72, 18); // 繪製說明卡片的柔和陰影
        instance.fill(249, 253, 250, 244); // 設定說明卡片的白綠色底
        instance.rect(cardLeft, cardTop, cardWidth, 72, 18); // 繪製最近完成集章的地點說明卡
        instance.fill("#67a783"); // 設定地點名稱的集章綠色
        instance.textSize(12); // 設定地點名稱文字大小
        instance.text(`${status.description.number}　${status.description.name}`, cardLeft + 17, cardTop + 22); // 顯示目前地點編號與名稱
        instance.fill("#617a79"); // 設定地點介紹的柔和深灰文字
        instance.textSize(11); // 設定地點介紹文字大小
        instance.text(status.description.description, cardLeft + 17, cardTop + 49); // 顯示完成此地點後的繁體中文說明
      } // 結束地點說明卡顯示
      if (status.complete) { // 五個地點全部完成時顯示探索完成訊息
        const cardWidth = Math.min(360, instance.width - 32); // 依照視窗寬度調整完成訊息卡片
        const cardLeft = (instance.width - cardWidth) / 2; // 將完成訊息卡片水平置中
        const cardTop = Math.max(205, instance.height * 0.28); // 將完成訊息放在畫面中央偏上位置
        instance.fill(44, 75, 61, 225); // 設定深綠色完成提示背景
        instance.rect(cardLeft, cardTop, cardWidth, 68, 20); // 繪製完成訊息圓角卡片
        instance.fill("#ffffff"); // 設定完成文字為白色
        instance.textAlign(instance.CENTER, instance.CENTER); // 將完成訊息置中
        instance.textSize(16); // 設定完成標題文字大小
        instance.text("五座浮島全部集章完成！", instance.width / 2, cardTop + 25); // 顯示集滿五個地點的完成訊息
        instance.textSize(11); // 設定完成副標文字大小
        instance.text("謝謝你一起探索水上公園", instance.width / 2, cardTop + 49); // 顯示溫暖的探索結束訊息
      } // 結束全部集章完成提示
    } // 結束 p5.js 進度與地點說明繪製

    function drawCharacterName(instance) { // 以 p5.js 在角色頭部上方顯示姓名標籤
      const position = parkScene.getCharacterNameScreenPosition(instance.width, instance.height); // 取得角色姓名標籤的即時投影位置
      if (!position || !position.name) return; // 角色在畫面外或名稱空白時不顯示標籤
      instance.textFont("Microsoft JhengHei, sans-serif"); // 使用繁體中文介面字體
      instance.textSize(11); // 設定姓名標籤字體大小
      const labelWidth = Math.max(70, instance.textWidth(position.name) + 24); // 依名稱長度計算膠囊標籤寬度
      const labelX = Math.max(labelWidth / 2 + 8, Math.min(instance.width - labelWidth / 2 - 8, position.x)); // 將姓名標籤限制在畫布水平範圍內
      const labelY = Math.max(18, position.y); // 避免標籤超出畫布頂端
      instance.noStroke(); // 關閉姓名標籤邊框
      instance.fill(52, 79, 75, 38); // 設定柔和的標籤陰影顏色
      instance.rect(labelX - labelWidth / 2, labelY - 13, labelWidth, 27, 14); // 繪製膠囊標籤下方柔和陰影
      instance.fill(255, 255, 255, 242); // 設定姓名標籤白色背景
      instance.rect(labelX - labelWidth / 2, labelY - 16, labelWidth, 27, 14); // 繪製角色頭部上方的白色姓名膠囊
      instance.fill("#496267"); // 設定姓名文字顏色
      instance.textAlign(instance.CENTER, instance.CENTER); // 將角色名稱置中顯示
      instance.text(position.name, labelX, labelY - 2); // 繪製使用者自訂的角色名稱
    } // 結束玩家姓名標籤繪製

    function setZoomPercent(value) { // 同步更新縮放數值、滑桿與 Three.js 鏡頭目標
      zoomPercent = Math.max(72, Math.min(132, value)); // 將縮放比例限制在滑桿允許範圍
      zoomSlider.value(zoomPercent); // 同步設定縮放滑桿位置
      zoomValue.html(`${zoomPercent}%`); // 更新畫面顯示的縮放百分比
      parkScene.setZoom(zoomPercent); // 將縮放目標交給 Three.js 平滑過渡
    } // 結束縮放比例同步

    function createInterface(instance) { // 建立 p5.js 實例模式的 DOM 控制面板
      const root = instance.select("#ui-root"); // 取得操作介面的根容器
      const topbar = instance.createDiv("").addClass("topbar").parent(root); // 建立場景頂端資訊列
      const brand = instance.createDiv("").addClass("brand").parent(topbar); // 建立浮島公園品牌卡片
      instance.createDiv("✦").addClass("brand-mark").parent(brand); // 建立金黃色星形品牌標記
      const brandCopy = instance.createDiv("").addClass("brand-copy").parent(brand); // 建立主標與副標容器
      instance.createDiv("浮島公園").addClass("brand-title").parent(brandCopy); // 顯示繁體中文場景名稱
      instance.createDiv("ISLAND PARK · 01").addClass("brand-subtitle").parent(brandCopy); // 顯示場景英文識別副標
      instance.createDiv("方向鍵移動　·　拖曳旋轉　·　滾輪縮放").addClass("hint").parent(topbar); // 顯示移動、旋轉與縮放操作方式
      instance.createDiv("FLOATING GARDEN　/　五座水上綠洲").addClass("footer-note").parent(root); // 顯示場景主題與島嶼數量
      const card = instance.createDiv("").addClass("control-card").parent(root); // 建立場景操作卡片
      const heading = instance.createDiv("").addClass("card-heading").parent(card); // 建立控制卡標題列
      instance.createDiv("場景控制").addClass("card-title").parent(heading); // 顯示控制卡標題
      instance.createDiv("● 已連線").addClass("live-pill").parent(heading); // 顯示場景運作狀態
      const zoomLabel = instance.createDiv("").addClass("control-label").parent(card); // 建立縮放標籤列
      instance.createSpan("場景縮放").parent(zoomLabel); // 顯示縮放控制名稱
      zoomValue = instance.createSpan("100%").parent(zoomLabel); // 建立即時縮放比例文字
      const zoomControls = instance.createDiv("").addClass("zoom-controls").parent(card); // 建立縮小按鈕、滑桿與放大按鈕的排列列
      const zoomOutButton = instance.createButton("−").addClass("zoom-step-button").attribute("aria-label", "縮小場景").parent(zoomControls); // 建立場景縮小按鈕
      zoomSlider = instance.createSlider(72, 132, 100, 1).addClass("zoom-slider").parent(zoomControls); // 建立場景縮放滑桿
      const zoomInButton = instance.createButton("+").addClass("zoom-step-button").attribute("aria-label", "放大場景").parent(zoomControls); // 建立場景放大按鈕
      zoomSlider.input(() => { // 監聽滑桿變化並更新鏡頭
        zoomPercent = Number(zoomSlider.value()); // 取得目前滑桿數值
        zoomValue.html(`${zoomPercent}%`); // 即時顯示目前縮放百分比
        parkScene.setZoom(zoomPercent); // 將縮放比例傳給 Three.js 平滑鏡頭
      }); // 結束縮放滑桿事件
      zoomOutButton.mousePressed(() => setZoomPercent(zoomPercent - 8)); // 點擊縮小按鈕時降低場景縮放比例
      zoomInButton.mousePressed(() => setZoomPercent(zoomPercent + 8)); // 點擊放大按鈕時提高場景縮放比例
      const buttons = instance.createDiv("").addClass("button-row").parent(card); // 建立按鈕排列容器
      lanternButton = instance.createButton("☼　燈光：開").addClass("ui-button is-active").parent(buttons); // 建立路燈切換按鈕
      lanternButton.mousePressed(() => { // 監聽路燈切換操作
        lightsOn = !lightsOn; // 反轉路燈開關狀態
        parkScene.setLanterns(lightsOn); // 更新 Three.js 場景中的路燈
        lanternButton.html(lightsOn ? "☼　燈光：開" : "☼　燈光：關"); // 更新按鈕顯示文字
        lanternButton.toggleClass("is-active", lightsOn); // 更新按鈕的啟用樣式
      }); // 結束路燈按鈕事件
      const resetButton = instance.createButton("⌂　重設視角").addClass("ui-button").parent(buttons); // 建立重設鏡頭按鈕
      resetButton.mousePressed(() => { // 監聽重設視角操作
        zoomPercent = 100; // 將縮放狀態復原至預設比例
        zoomSlider.value(100); // 將滑桿復原至預設縮放比例
        zoomValue.html("100%"); // 將縮放文字復原至預設比例
        parkScene.resetView(); // 將 Three.js 攝影機復原至初始位置
      }); // 結束重設視角按鈕事件
      createCharacterControls(instance, root); // 建立服裝、配件、寵物與背包自訂面板
    } // 結束操作介面建立

    function updateCharacterAppearance() { // 將控制面板目前選項即時套用到玩家角色
      const accessory = accessorySelect.value(); // 讀取目前選擇的頭部或頸部配件
      parkScene.setCharacterAppearance({ shirtColor: shirtColorPicker.value(), accessoryColor: accessoryColorPicker.value(), accessory, backpack: backpackToggle.checked(), pet: petToggle.checked() }); // 將服裝、配件顏色、背包與寵物設定送至 Three.js 場景
    } // 結束玩家外觀更新

    function createCharacterControls(instance, root) { // 建立可直接操作的玩家角色外觀面板
      const card = instance.createDiv("").addClass("character-card").parent(root); // 建立固定在畫面上的角色自訂卡片
      card.elt.style.zIndex = "4"; // 確保角色面板與原生控件高於互動畫布
      card.elt.style.pointerEvents = "auto"; // 讓角色面板控件穩定接收滑鼠與觸控事件
      for (const eventName of ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "touchstart", "touchend"]) card.elt.addEventListener(eventName, (event) => event.stopPropagation()); // 將控制卡操作留在 DOM 面板，避免 p5 畫布攔截瀏覽器預設焦點行為
      const heading = instance.createDiv("").addClass("card-heading").parent(card); // 建立角色面板標題列
      instance.createDiv("角色造型").addClass("card-title").parent(heading); // 顯示玩家角色造型標題
      instance.createDiv("即時套用").addClass("live-pill").parent(heading); // 提示外觀選項會立即套用
      const nameLabel = instance.createDiv("角色名字").addClass("character-label").parent(card); // 顯示角色名稱欄位標籤
      characterNameInput = instance.createInput("小島探險家").addClass("character-name-input").attribute("maxlength", "16").attribute("aria-label", "角色名字").parent(nameLabel); // 建立最多十六字的角色名稱輸入欄
      characterNameInput.elt.addEventListener("input", (event) => { event.stopPropagation(); parkScene.setCharacterName(characterNameInput.value()); }); // 以原生輸入事件即時更新場景姓名標籤
      const shirtLabel = instance.createDiv("上衣顏色").addClass("character-label").parent(card); // 顯示上衣顏色欄位標籤
      shirtColorPicker = instance.createColorPicker("#e88b68").addClass("character-color").parent(shirtLabel); // 建立玩家上衣顏色選擇器
      shirtColorPicker.elt.addEventListener("input", (event) => { event.stopPropagation(); updateCharacterAppearance(); }); // 以原生顏色輸入事件更新角色上衣
      const accessoryColorLabel = instance.createDiv("配件顏色").addClass("character-label").parent(card); // 顯示配件顏色欄位標籤
      accessoryColorPicker = instance.createColorPicker("#efbf47").addClass("character-color").parent(accessoryColorLabel); // 建立安全帽、背包或圍巾的顏色選擇器
      accessoryColorPicker.elt.addEventListener("input", (event) => { event.stopPropagation(); updateCharacterAppearance(); }); // 以原生顏色輸入事件更新角色配件
      const accessoryLabel = instance.createDiv("配件").addClass("character-label").parent(card); // 顯示配件類型欄位標籤
      accessorySelect = instance.createSelect().addClass("character-select").attribute("aria-label", "配件選擇").parent(accessoryLabel); // 建立玩家配件類型選擇器並提供螢幕閱讀器標籤
      accessorySelect.option("不使用配件", "none"); // 提供不配戴配件的選項
      accessorySelect.option("安全帽", "helmet"); // 提供安全帽選項
      accessorySelect.option("眼鏡", "glasses"); // 提供眼鏡選項
      accessorySelect.option("圍巾", "scarf"); // 提供圍巾選項
      accessorySelect.selected("helmet"); // 將預設配件設定為安全帽
      accessorySelect.elt.addEventListener("change", (event) => { event.stopPropagation(); updateCharacterAppearance(); }); // 以原生選擇變更事件套用配件造型
      backpackToggle = instance.createCheckbox("背上書包", true).addClass("character-toggle").parent(card); // 建立書包攜帶切換選項
      backpackToggle.elt.addEventListener("change", (event) => { event.stopPropagation(); updateCharacterAppearance(); }); // 以原生勾選事件切換書包
      petToggle = instance.createCheckbox("攜帶寵物", false).addClass("character-toggle").parent(card); // 建立寵物攜帶切換選項
      petToggle.elt.addEventListener("change", (event) => { event.stopPropagation(); updateCharacterAppearance(); }); // 以原生勾選事件切換寵物
    } // 結束玩家角色面板建立
  }, "ui-root"); // 將 p5.js 實例掛載至操作介面容器
}; // 結束場景控制器啟動器
