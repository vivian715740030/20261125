import * as THREE from "three"; // 從 importmap 載入 Three.js 0.160 模組

const root = document.querySelector("#scene-root"); // 取得 Three.js 畫布容器
const scene = new THREE.Scene(); // 建立浮島公園 3D 場景
scene.background = new THREE.Color("#d9eff1"); // 設定天空與水面相融的淡藍背景
scene.fog = new THREE.Fog("#d9eff1", 42, 100); // 使用淡藍霧氣柔化遠景邊界
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); // 建立具抗鋸齒的 WebGL 繪圖器
renderer.setPixelRatio(1); // 以視窗 CSS 像素繪製 3D 場景以減少 GPU 填充與抗鋸齒負擔
renderer.shadowMap.enabled = true; // 啟用柔和陰影
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 使用柔邊陰影演算法
renderer.outputColorSpace = THREE.SRGBColorSpace; // 使用正確的 sRGB 顯示色彩
renderer.toneMapping = THREE.ACESFilmicToneMapping; // 套用柔和的電影色調映射
renderer.toneMappingExposure = 1.12; // 微調場景整體曝光
root.appendChild(renderer.domElement); // 將 WebGL 畫布放入場景容器

const camera = new THREE.OrthographicCamera(-16, 16, 16, -16, 0.1, 150); // 建立正交攝影機呈現斜俯視畫面
const initialCameraPosition = new THREE.Vector3(24, 31, 28); // 設定右上方斜俯視的初始鏡頭位置
const target = new THREE.Vector3(0, 0, 0); // 設定攝影機對準場景中心
const orbitRadius = initialCameraPosition.length(); // 固定攝影機繞行時與觀察目標的距離
const initialOrbit = new THREE.Spherical().setFromVector3(initialCameraPosition); // 將初始鏡頭偏移轉為球面座標
let targetAzimuth = initialOrbit.theta; // 記錄滑鼠旋轉所控制的水平方位角
let targetPolar = initialOrbit.phi; // 記錄滑鼠旋轉所控制的垂直極角
let orbitAzimuth = initialOrbit.theta; // 儲存平滑更新中的水平方位角
let orbitPolar = initialOrbit.phi; // 儲存平滑更新中的垂直極角
camera.position.copy(initialCameraPosition); // 將攝影機移至預設觀賞位置
camera.lookAt(target); // 讓攝影機朝向浮島群中心
camera.updateProjectionMatrix(); // 更新攝影機投影矩陣
const screenRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); // 建立依攝影機即時方向更新的畫面向右向量
screenRight.y = 0; // 移除畫面向右方向的垂直分量
screenRight.normalize(); // 正規化畫面向右的地面方向
const screenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion); // 建立依攝影機即時方向更新的畫面向上向量
screenUp.y = 0; // 移除畫面向上方向的垂直分量
screenUp.normalize(); // 正規化畫面向上的地面方向
const cameraOffset = new THREE.Vector3(); // 重複使用攝影機球面偏移以避免每影格建立暫存向量

const ambient = new THREE.HemisphereLight("#f4ffff", "#91a9a4", 2.15); // 建立明亮柔和的天空環境光
scene.add(ambient); // 將環境光加入場景
const sunlight = new THREE.DirectionalLight("#fff1d2", 3.2); // 建立暖色午後方向光
sunlight.position.set(-14, 28, 17); // 設定陽光由畫面左上方照入
sunlight.castShadow = true; // 讓方向光投射平台與物件陰影
sunlight.shadow.mapSize.set(512, 512); // 以柔和陰影與較小貼圖降低低階裝置的即時繪圖負擔
sunlight.shadow.camera.left = -26; // 設定陰影攝影機左側範圍
sunlight.shadow.camera.right = 26; // 設定陰影攝影機右側範圍
sunlight.shadow.camera.top = 26; // 設定陰影攝影機上側範圍
sunlight.shadow.camera.bottom = -26; // 設定陰影攝影機下側範圍
sunlight.shadow.bias = -0.00035; // 減少陰影表面產生的瑕疵
sunlight.shadow.radius = 3; // 以適度柔化陰影兼顧畫面品質與繪製效能
scene.add(sunlight); // 將方向光加入場景

const materials = { // 集中管理場景共用材質
  water: new THREE.MeshStandardMaterial({ color: "#a9dce1", roughness: 0.42, metalness: 0.04 }), // 淡藍水面材質
  base: new THREE.MeshStandardMaterial({ color: "#40565a", roughness: 0.86 }), // 平台深色防撞底座材質
  deck: new THREE.MeshStandardMaterial({ color: "#d8c49b", roughness: 0.78 }), // 平台淺木色面板材質
  plank: new THREE.MeshStandardMaterial({ color: "#c4ae83", roughness: 0.85 }), // 木板接縫裝飾材質
  yellow: new THREE.MeshStandardMaterial({ color: "#efbf47", roughness: 0.56 }), // 欄杆與警示條黃色材質
  black: new THREE.MeshStandardMaterial({ color: "#26383a", roughness: 0.78 }), // 警示條深色材質
  trunk: new THREE.MeshStandardMaterial({ color: "#75513c", roughness: 0.92 }), // 樹幹與長椅木材材質
  leafA: new THREE.MeshStandardMaterial({ color: "#6d9d77", roughness: 0.94 }), // 淺綠樹冠材質
  leafB: new THREE.MeshStandardMaterial({ color: "#85b387", roughness: 0.94 }), // 亮綠樹冠材質
  leafC: new THREE.MeshStandardMaterial({ color: "#547f67", roughness: 0.94 }), // 深綠樹冠材質
  metal: new THREE.MeshStandardMaterial({ color: "#526e70", roughness: 0.52, metalness: 0.32 }), // 長椅與路燈金屬材質
  lamp: new THREE.MeshStandardMaterial({ color: "#fff1bd", emissive: "#efbd58", emissiveIntensity: 1.8, roughness: 0.35 }) // 路燈發光燈罩材質
}; // 結束共用材質設定

const water = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), materials.water); // 建立寬廣淡藍色水面
water.rotation.x = -Math.PI / 2; // 將平面旋轉為水平水面
water.position.y = -0.42; // 將水面放在浮島底座下方
water.receiveShadow = true; // 讓水面承接物件投影
scene.add(water); // 將水面加入場景

const shadowGroup = new THREE.Group(); // 建立集中管理路燈的群組
scene.add(shadowGroup); // 將路燈群組放入場景
const platformCenters = [[0, 0], [-11, -11], [11, -11], [-11, 11], [11, 11]]; // 設定中央與四角共五座平台的位置
const platformSize = 7.4; // 設定方形平台的邊長
const platformTop = 0.46; // 設定平台木質表面的高度
const playerRadius = 0.27; // 設定角色行走時使用的水平碰撞半徑
const walkableAreas = []; // 儲存平台、橋面與轉角踏台的可行走範圍
const pickableSurfaces = []; // 儲存供滑鼠 Raycaster 點選的透明地面
const obstacles = []; // 儲存樹木、長椅與路燈的圓形障礙物
const raycaster = new THREE.Raycaster(); // 建立滑鼠點擊地面使用的射線投射器

function registerWalkableArea(area, width, length, angle = 0) { // 登記可行走範圍並建立對應的地面點選平面
  const pickGeometry = new THREE.PlaneGeometry(width, length); // 建立與可行走表面尺寸相符的平面幾何
  pickGeometry.rotateX(-Math.PI / 2); // 將平面幾何旋轉至水平地面方向
  pickGeometry.rotateY(angle); // 依橋梁朝向旋轉點選平面幾何
  const pickMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, colorWrite: false, depthWrite: false, side: THREE.DoubleSide }); // 建立不顯示但可供 Raycaster 擷取的材質
  const pickSurface = new THREE.Mesh(pickGeometry, pickMaterial); // 建立透明可點選地面網格
  pickSurface.position.set(area.x, area.y + 0.025, area.z); // 將點選平面放在實際地面稍上方
  pickSurface.userData.walkable = true; // 標記此網格為可行走地面
  scene.add(pickSurface); // 將透明地面加入場景以供射線投射
  area.angle = angle; // 記錄旋轉矩形的方向供行走碰撞判斷
  area.pickSurface = pickSurface; // 記錄此區域對應的滑鼠點選網格
  walkableAreas.push(area); // 將可行走範圍加入場景資料
  pickableSurfaces.push(pickSurface); // 將地面網格加入滑鼠射線目標
} // 結束可行走範圍登記

function registerObstacle(parent, x, z, radius) { // 將平台區域內的障礙物位置換算至世界座標
  const worldPosition = parent.localToWorld(new THREE.Vector3(x, 0, z)); // 將物件區域座標轉換成世界座標
  const obstacle = { x: worldPosition.x, z: worldPosition.z, radius }; // 建立障礙物中心與碰撞半徑資料
  obstacles.push(obstacle); // 儲存障礙物供角色碰撞檢查使用
  return obstacle; // 回傳碰撞資料供移動中的路人更新位置
} // 結束障礙物登記

function getWalkableAreaAt(x, z) { // 尋找指定世界座標下的可行走地面區域
  let bestArea = null; // 儲存目前找到的最高可行走表面
  for (const area of walkableAreas) { // 依序檢查每一座平台、橋梁與轉角踏台
    const dx = x - area.x; // 計算位置相對區域中心的水平差
    const dz = z - area.z; // 計算位置相對區域中心的縱深差
    const localX = Math.cos(area.angle) * dx - Math.sin(area.angle) * dz; // 將位置換算為旋轉區域的本地水平座標
    const localZ = Math.sin(area.angle) * dx + Math.cos(area.angle) * dz; // 將位置換算為旋轉區域的本地縱深座標
    if (Math.abs(localX) <= area.halfWidth && Math.abs(localZ) <= area.halfLength && (!bestArea || area.y > bestArea.y)) bestArea = area; // 選取包含該位置且高度最高的地面區域
  } // 結束地面區域搜尋
  return bestArea; // 回傳最高地面或以空值表示水面與場景外
} // 結束地面區域搜尋

function isPositionBlocked(x, z, ignoredObstacle = null) { // 檢查角色位置是否與任何場景物件碰撞
  return obstacles.some((obstacle) => obstacle !== ignoredObstacle && Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.radius + playerRadius); // 以角色與障礙物半徑和判定圓形碰撞並略過自身
} // 結束障礙物碰撞檢查

function getGroundHeightAt(x, z, ignoredObstacle = null) { // 取得角色所在平台或橋面的高度
  const area = getWalkableAreaAt(x, z); // 尋找角色腳下的可行走區域
  return area && !isPositionBlocked(x, z, ignoredObstacle) ? area.y : null; // 只回傳未被障礙物阻擋的地面高度
} // 結束地面高度查詢

const gridMinimum = -16; // 設定導航網格在世界座標中的最小邊界
const gridStep = 0.32; // 設定路徑導航格點之間的距離
const gridSize = 101; // 設定導航網格每個方向的格點數量
const gridCount = gridSize * gridSize; // 計算導航網格總格點數量
const gridOffsets = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]; // 設定導航網格的四向與斜向鄰居
const stampPoints = [ // 設定五個分布在不同浮島上的集章地點
  { number: "01", name: "中央花園", description: "從中央花園出發，聽水波輕輕拍打浮島邊緣。", position: [-2.8, platformTop + 0.045, 1.9], radius: 0.7 }, // 設定中央浮島的花園集章點
  { number: "02", name: "樹蔭步道", description: "在樹蔭下稍作休息，感受島上的微風。", position: [-13, platformTop + 0.045, -13], radius: 0.7 }, // 設定左上浮島的樹蔭集章點
  { number: "03", name: "湖畔長椅", description: "坐在湖畔長椅旁，欣賞淡藍水面上的倒影。", position: [9.3, platformTop + 0.045, -8.6], radius: 0.7 }, // 設定右上浮島的湖畔集章點
  { number: "04", name: "微風小徑", description: "沿著微風小徑漫步，聽見樹葉沙沙作響。", position: [-8.4, platformTop + 0.045, 13.5], radius: 0.7 }, // 設定左下浮島的微風集章點
  { number: "05", name: "日光碼頭", description: "抵達日光碼頭，完成這趟水上公園探索。", position: [13.5, platformTop + 0.045, 13.5], radius: 0.7 } // 設定右下浮島的日光集章點
]; // 結束五個集章地點設定

function gridCoordinates(index) { // 將一維導航索引換算回世界座標
  const column = index % gridSize; // 取得格點的水平欄位
  const row = Math.floor(index / gridSize); // 取得格點的縱深列位
  return { x: gridMinimum + column * gridStep, z: gridMinimum + row * gridStep }; // 回傳格點中心的世界座標
} // 結束導航索引轉換

function nearestWalkableNode(position, walkableMap) { // 尋找最接近指定世界座標的安全地面格點
  let nearest = -1; // 記錄目前最近格點的索引
  let nearestDistance = Infinity; // 記錄最近格點與目標之間的距離
  for (let index = 0; index < gridCount; index += 1) { // 搜尋整張導航網格中的安全格點
    if (!walkableMap[index]) continue; // 略過水面或障礙物所在的格點
    const point = gridCoordinates(index); // 取得候選格點的世界座標
    const distance = Math.hypot(position.x - point.x, position.z - point.z); // 計算候選格點與目標的平面距離
    if (distance < nearestDistance) { nearest = index; nearestDistance = distance; } // 更新最近的安全格點
  } // 結束最近格點搜尋
  return nearestDistance <= 1.15 ? nearest : -1; // 只接受靠近目標的格點以避免點選到水面
} // 結束最近安全格點搜尋

function segmentIsWalkable(start, end) { // 檢查兩個導航點之間的直線是否全程安全
  const distance = Math.hypot(end.x - start.x, end.z - start.z); // 計算路徑線段的水平長度
  const sampleCount = Math.max(1, Math.ceil(distance / 0.12)); // 依距離切分密集的碰撞檢查點
  for (let sample = 0; sample <= sampleCount; sample += 1) { // 沿路徑逐點檢查地面與障礙物
    const amount = sample / sampleCount; // 計算目前檢查點的線性插值比例
    const x = start.x + (end.x - start.x) * amount; // 計算目前檢查點的水平座標
    const z = start.z + (end.z - start.z) * amount; // 計算目前檢查點的縱深座標
    if (getGroundHeightAt(x, z) === null) return false; // 遇到水面或物件碰撞時拒絕此直線路徑
  } // 結束路徑線段檢查
  return true; // 整條路徑皆在安全地面上時允許通行
} // 結束直線路徑安全檢查

function findWalkPath(startPosition, destination) { // 使用八方向導航網格規劃平台與橋面上的路徑
  const walkableMap = new Uint8Array(gridCount); // 建立記錄每個導航格點可通行狀態的陣列
  for (let index = 0; index < gridCount; index += 1) { // 逐一判斷所有導航格點是否位於安全地面
    const point = gridCoordinates(index); // 取得目前格點的世界座標
    walkableMap[index] = getGroundHeightAt(point.x, point.z) === null ? 0 : 1; // 將地面與障礙物檢查結果寫入導航網格
  } // 結束安全格點建置
  const startIndex = nearestWalkableNode(startPosition, walkableMap); // 找到角色目前位置附近的導航格點
  const goalIndex = nearestWalkableNode(destination, walkableMap); // 找到滑鼠點選目的地附近的導航格點
  if (startIndex < 0 || goalIndex < 0) return null; // 起點或終點不在安全步行範圍時回傳無路徑
  const previous = new Int32Array(gridCount); // 建立路徑回溯用的前置格點陣列
  previous.fill(-2); // 以負二標記尚未搜尋的導航格點
  previous[startIndex] = -1; // 以負一標記路徑搜尋的起點
  const queue = new Int32Array(gridCount); // 建立廣度優先搜尋用的固定容量佇列
  let queueStart = 0; // 設定待搜尋佇列的讀取位置
  let queueEnd = 0; // 設定待搜尋佇列的寫入位置
  queue[queueEnd] = startIndex; // 將起點加入待搜尋佇列
  queueEnd += 1; // 前移佇列寫入位置
  while (queueStart < queueEnd && previous[goalIndex] === -2) { // 逐步搜尋直到抵達目標或沒有其他可達格點
    const current = queue[queueStart]; // 讀取下一個待搜尋格點
    queueStart += 1; // 前移佇列讀取位置
    const column = current % gridSize; // 取得目前格點的水平欄位
    const row = Math.floor(current / gridSize); // 取得目前格點的縱深列位
    for (const [offsetX, offsetZ] of gridOffsets) { // 逐一檢查八個相鄰格點
      const nextColumn = column + offsetX; // 計算鄰居的水平欄位
      const nextRow = row + offsetZ; // 計算鄰居的縱深列位
      if (nextColumn < 0 || nextColumn >= gridSize || nextRow < 0 || nextRow >= gridSize) continue; // 略過導航網格邊界外的鄰居
      const next = nextRow * gridSize + nextColumn; // 將鄰居欄列換算成一維索引
      if (!walkableMap[next] || previous[next] !== -2) continue; // 略過不可通行或已搜尋過的格點
      if (offsetX !== 0 && offsetZ !== 0 && (!walkableMap[row * gridSize + nextColumn] || !walkableMap[nextRow * gridSize + column])) continue; // 避免斜向穿過平台外緣或障礙物角落
      previous[next] = current; // 記錄抵達鄰居的前一個格點
      queue[queueEnd] = next; // 將可行鄰居加入搜尋佇列
      queueEnd += 1; // 前移佇列寫入位置
    } // 結束相鄰格點搜尋
  } // 結束廣度優先路徑搜尋
  if (previous[goalIndex] === -2) return null; // 目標與角色目前所在的浮島無連通路徑時回傳無路徑
  const reversedPath = []; // 建立由終點回溯到起點的路徑格點
  for (let index = goalIndex; index >= 0; index = previous[index]) { // 沿著前置格點回溯完整路徑
    reversedPath.push(gridCoordinates(index)); // 保存目前格點的世界座標
    if (index === startIndex) break; // 回溯到起點後停止
  } // 結束路徑回溯
  reversedPath.reverse(); // 將路徑順序反轉成由起點前往終點
  reversedPath[0] = { x: startPosition.x, z: startPosition.z }; // 將格點起點替換為角色的精確目前位置
  const smoothPath = []; // 建立移除不必要轉角後的平滑路徑
  let currentIndex = 0; // 設定路徑簡化目前所在的節點
  while (currentIndex < reversedPath.length - 1) { // 盡可能以較長安全直線合併連續導航格點
    let farthestIndex = currentIndex + 1; // 預設前進至下一個相鄰導航格點
    for (let candidate = currentIndex + 2; candidate < reversedPath.length; candidate += 1) { // 從遠至近檢查後續路徑節點
      if (segmentIsWalkable(reversedPath[currentIndex], reversedPath[candidate])) farthestIndex = candidate; // 記錄可直達的最遠路徑節點
      else break; // 遇到阻擋或水面後停止向更遠節點檢查
    } // 結束路徑直線簡化搜尋
    smoothPath.push(reversedPath[farthestIndex]); // 將每段直線的最遠安全目標加入新路徑
    currentIndex = farthestIndex; // 從新路徑節點繼續簡化剩餘路徑
  } // 結束平滑路徑建立
  return smoothPath; // 回傳由起點通往目標的安全平滑路徑
} // 結束導航路徑規劃

function createCapsuleGeometry(radius, length, capSegments = 4, radialSegments = 8) { // 以 Three.js 核心旋轉幾何建立膠囊外形
  const points = []; // 建立膠囊截面輪廓點陣列
  for (let index = 0; index <= capSegments; index += 1) { // 由下方極點逐段建立下半球輪廓
    const angle = -Math.PI / 2 + (Math.PI / 2) * (index / capSegments); // 計算下半球截面角度
    points.push(new THREE.Vector2(radius * Math.cos(angle), -length / 2 + radius * Math.sin(angle))); // 加入下半球截面點
  } // 結束下半球截面建立
  points.push(new THREE.Vector2(radius, length / 2)); // 加入圓柱頂端與上半球的交界點
  for (let index = 1; index <= capSegments; index += 1) { // 由圓柱頂端逐段建立上半球輪廓
    const angle = (Math.PI / 2) * (index / capSegments); // 計算上半球截面角度
    points.push(new THREE.Vector2(radius * Math.cos(angle), length / 2 + radius * Math.sin(angle))); // 加入上半球截面點
  } // 結束上半球截面建立
  return new THREE.LatheGeometry(points, radialSegments); // 繞垂直軸旋轉截面並回傳完整膠囊幾何
} // 結束膠囊幾何建立工具

function makeChibi(params = {}) { // 建立可設定服裝與裝備的 Q 版角色
  const { shirtColor = "#e88b68", hairColor = "#574136", accessoryColor = "#efbf47", hairstyle = "short", helmet = false, backpack = false, glasses = false, scarf = false, pet = false, customizable = false, scale = 0.42, position = [0, platformTop, 0], rotationY = 0 } = params; // 讀取外觀、髮型、配件與擺放參數
  const group = new THREE.Group(); // 建立角色根群組供定位、旋轉與縮放
  group.position.set(position[0], position[1], position[2]); // 將角色根群組放到指定場景座標
  group.rotation.y = rotationY; // 設定角色面向方向
  group.scale.setScalar(scale); // 以單一比例縮放整個角色
  const skinMaterial = new THREE.MeshStandardMaterial({ color: "#f1c39f", roughness: 0.78 }); // 建立柔和膚色材質
  const shirtMaterial = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.82 }); // 依參數建立上衣材質
  const pantsMaterial = new THREE.MeshStandardMaterial({ color: "#536e79", roughness: 0.88 }); // 建立深藍灰色褲子材質
  const hairMaterial = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 }); // 依參數建立頭髮材質
  const helmetMaterial = new THREE.MeshStandardMaterial({ color: accessoryColor, roughness: 0.62 }); // 依角色配件色建立安全帽材質
  const packMaterial = new THREE.MeshStandardMaterial({ color: accessoryColor, roughness: 0.88 }); // 依角色配件色建立背包材質
  const shoeMaterial = new THREE.MeshStandardMaterial({ color: "#f2eee2", roughness: 0.82 }); // 建立鞋子淺色材質
  const darkMaterial = new THREE.MeshStandardMaterial({ color: "#3d4d4d", roughness: 0.72 }); // 建立眼睛與小型配件材質
  const appearanceLayers = {}; // 儲存可即時顯示或隱藏的角色配件群組
  const limbGeometry = createCapsuleGeometry(0.15, 0.56, 4, 8); // 建立共用膠囊幾何供四肢重複使用
  const bodyGeometry = createCapsuleGeometry(0.34, 0.96, 5, 10); // 建立身高約為頭部一點五倍的膠囊身體
  const headGeometry = new THREE.SphereGeometry(0.55, 16, 12); // 建立球形頭部幾何
  const head = new THREE.Mesh(headGeometry, skinMaterial); // 以球體建立角色頭部
  head.position.set(0, 3.1, 0); // 將頭部置於身體頂端並與身體略微重疊
  head.castShadow = true; // 讓頭部投射陰影
  head.receiveShadow = true; // 讓頭部承接柔和陰影
  group.add(head); // 將頭部加入角色根群組
  const body = new THREE.Mesh(bodyGeometry, shirtMaterial); // 以膠囊建立角色上衣與軀幹
  body.position.set(0, 1.95, 0); // 將軀幹置於髖部與頭部之間
  body.castShadow = true; // 讓軀幹投射陰影
  body.receiveShadow = true; // 讓軀幹承接柔和陰影
  group.add(body); // 將軀幹加入角色根群組
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.58, 12, 8), hairMaterial); // 以低多邊形球體製作頭頂髮型
  hair.position.set(0, 3.48, -0.03); // 將頭髮放在頭頂並稍微往後
  hair.scale.set(1, 0.58, 0.94); // 壓扁頭髮球體形成髮帽輪廓
  hair.castShadow = true; // 讓頭髮投射陰影
  group.add(hair); // 將頭髮加入角色根群組
  const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 7), hairMaterial); // 建立額前瀏海球團
  fringe.position.set(0, 3.18, 0.46); // 將瀏海放在頭部前側
  fringe.scale.set(1.35, 0.48, 0.5); // 將瀏海調整為扁平弧形
  fringe.castShadow = true; // 讓瀏海投射陰影
  group.add(fringe); // 將瀏海加入角色根群組
  if (hairstyle === "bob" || hairstyle === "long") { // 依髮型選擇建立兩側垂落的頭髮
    for (const side of [-1, 1]) { // 在頭部左右兩側各建立一束頭髮
      const lock = new THREE.Mesh(new THREE.SphereGeometry(0.29, 9, 7), hairMaterial); // 以低多邊形球體製作側邊髮束
      lock.position.set(side * 0.43, hairstyle === "long" ? 2.75 : 2.98, -0.02); // 依短鮑伯或長髮設定髮束高度
      lock.scale.set(0.72, hairstyle === "long" ? 1.65 : 1.08, 0.78); // 依髮型調整髮束垂落長度
      lock.castShadow = true; // 讓側邊頭髮投射陰影
      group.add(lock); // 將側邊髮束加入角色根群組
    } // 結束兩側髮束建立
  } // 結束鮑伯與長髮造型
  if (hairstyle === "ponytail") { // 依髮型選擇建立後方馬尾
    const ponytail = new THREE.Mesh(new THREE.SphereGeometry(0.3, 9, 7), hairMaterial); // 以低多邊形球體製作馬尾髮束
    ponytail.position.set(0, 3.08, -0.53); // 將馬尾接在頭部後方
    ponytail.scale.set(0.72, 1.55, 0.78); // 將馬尾調整為垂落外形
    ponytail.castShadow = true; // 讓馬尾投射陰影
    group.add(ponytail); // 將馬尾加入角色根群組
  } // 結束馬尾造型
  if (hairstyle === "bun") { // 依髮型選擇建立頭頂丸子
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.27, 9, 7), hairMaterial); // 以低多邊形球體製作丸子頭
    bun.position.set(0, 3.83, -0.06); // 將丸子頭放在頭頂後側
    bun.castShadow = true; // 讓丸子頭投射陰影
    group.add(bun); // 將丸子頭加入角色根群組
  } // 結束丸子頭造型
  for (const eyeX of [-0.19, 0.19]) { // 在臉部兩側配置一對眼睛
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), darkMaterial); // 建立圓潤的深色眼睛
    eye.position.set(eyeX, 3.04, 0.505); // 將眼睛放在頭部正面
    eye.scale.set(0.78, 1.15, 0.55); // 微調眼睛比例讓表情簡潔可愛
    group.add(eye); // 將眼睛加入角色根群組
  } // 結束眼睛配置
  if (glasses || customizable) { // 依參數或自訂模式建立眼鏡配件群組
    const glassesGroup = new THREE.Group(); // 建立可顯示或隱藏的眼鏡群組
    glassesGroup.visible = glasses; // 依初始設定控制眼鏡群組顯示
    const glassesMaterial = new THREE.MeshStandardMaterial({ color: "#35474c", roughness: 0.48, metalness: 0.24 }); // 建立深色眼鏡框材質
    for (const eyeX of [-0.19, 0.19]) { // 在左右眼前方各建立一個眼鏡框
      const lensFrame = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.025, 5, 12), glassesMaterial); // 以圓環幾何製作低多邊形鏡框
      lensFrame.position.set(eyeX, 3.04, 0.53); // 將鏡框放在角色眼睛前方
      glassesGroup.add(lensFrame); // 將鏡框加入眼鏡群組
    } // 結束鏡框建立
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.035), glassesMaterial); // 建立連接左右鏡框的鼻樑
    bridge.position.set(0, 3.04, 0.53); // 將眼鏡鼻樑放在臉部中央
    glassesGroup.add(bridge); // 將鼻樑加入眼鏡群組
    group.add(glassesGroup); // 將眼鏡群組加入角色根群組
    appearanceLayers.glasses = glassesGroup; // 保存眼鏡群組供造型設定切換
  } // 結束眼鏡配件
  if (scarf || customizable) { // 依參數或自訂模式建立圍巾配件群組
    const scarfGroup = new THREE.Group(); // 建立可顯示或隱藏的圍巾群組
    scarfGroup.visible = scarf; // 依初始設定控制圍巾群組顯示
    const scarfMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 7), helmetMaterial); // 以扁平球體製作彩色圍巾
    scarfMesh.position.set(0, 2.62, 0.02); // 將圍巾放在頭部與上衣之間
    scarfMesh.scale.set(1.15, 0.38, 0.9); // 將圍巾調整為環繞脖子的扁平外形
    scarfGroup.add(scarfMesh); // 將圍巾加入圍巾群組
    group.add(scarfGroup); // 將圍巾群組加入角色根群組
    appearanceLayers.scarf = scarfGroup; // 保存圍巾群組供造型設定切換
  } // 結束圍巾配件
  const armJoints = []; // 儲存左右手臂的肩關節群組
  for (const side of [-1, 1]) { // 建立左右手臂及各自的肩關節
    const shoulder = new THREE.Group(); // 建立可擺動的肩關節樞紐
    shoulder.position.set(side * 0.49, 2.56, 0); // 將肩關節定位於身體兩側
    const arm = new THREE.Mesh(limbGeometry, skinMaterial); // 以膠囊幾何建立手臂
    arm.position.y = -0.43; // 讓手臂從肩關節自然向下垂
    arm.rotation.z = side * -0.18; // 讓手臂稍微朝外張開
    arm.castShadow = true; // 讓手臂投射陰影
    arm.receiveShadow = true; // 讓手臂承接柔和陰影
    shoulder.add(arm); // 將手臂膠囊掛在肩關節群組上
    const cuff = new THREE.Mesh(new THREE.SphereGeometry(0.155, 8, 6), shirtMaterial); // 建立上衣袖口的圓潤接合處
    cuff.position.set(0, -0.15, 0); // 將袖口放在肩部附近
    shoulder.add(cuff); // 將袖口掛在肩關節群組上
    group.add(shoulder); // 將肩關節掛到角色根群組
    armJoints.push(shoulder); // 保存肩關節供步行動畫控制
  } // 結束左右手臂建立
  const legJoints = []; // 儲存左右腿部的髖關節群組
  for (const side of [-1, 1]) { // 建立左右腿部及各自的髖關節
    const hip = new THREE.Group(); // 建立可擺動的髖關節樞紐
    hip.position.set(side * 0.22, 1.1, 0); // 將髖關節定位於軀幹下緣
    const leg = new THREE.Mesh(limbGeometry, pantsMaterial); // 以膠囊幾何建立褲腿
    leg.position.y = -0.47; // 讓腿部從髖關節自然向下延伸
    leg.castShadow = true; // 讓腿部投射陰影
    leg.receiveShadow = true; // 讓腿部承接柔和陰影
    hip.add(leg); // 將褲腿膠囊掛在髖關節群組上
    const shoe = new THREE.Mesh(createCapsuleGeometry(0.14, 0.12, 3, 8), shoeMaterial); // 以小型膠囊建立圓潤鞋子
    shoe.position.set(0, -0.94, 0.075); // 將鞋子放在腿部最下方並微微朝前
    shoe.rotation.x = Math.PI / 2; // 將鞋子膠囊轉為前後延伸方向
    shoe.castShadow = true; // 讓鞋子投射陰影
    hip.add(shoe); // 將鞋子掛在髖關節群組上
    group.add(hip); // 將髖關節掛到角色根群組
    legJoints.push(hip); // 保存髖關節供步行動畫控制
  } // 結束左右腿部建立
  if (helmet || customizable) { // 依參數或自訂模式建立安全帽配件群組
    const helmetGroup = new THREE.Group(); // 建立可顯示或隱藏的安全帽群組
    helmetGroup.visible = helmet; // 依初始設定控制安全帽群組顯示
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), helmetMaterial); // 以半球幾何製作安全帽帽殼
    shell.position.set(0, 3.54, 0); // 將帽殼放在頭部上方
    shell.castShadow = true; // 讓安全帽投射陰影
    helmetGroup.add(shell); // 將安全帽帽殼加入安全帽群組
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.61, 0.08, 12), helmetMaterial); // 建立安全帽帽簷
    brim.position.set(0, 3.49, 0.04); // 將帽簷放在帽殼下緣
    brim.castShadow = true; // 讓安全帽帽簷投射陰影
    helmetGroup.add(brim); // 將帽簷加入安全帽群組
    group.add(helmetGroup); // 將安全帽群組加入角色根群組
    appearanceLayers.helmet = helmetGroup; // 保存安全帽群組供造型設定切換
  } // 結束安全帽選擇
  if (backpack || customizable) { // 依參數或自訂模式建立書包配件群組
    const backpackGroup = new THREE.Group(); // 建立可顯示或隱藏的書包群組
    backpackGroup.visible = backpack; // 依初始設定控制書包群組顯示
    const pack = new THREE.Mesh(createCapsuleGeometry(0.23, 0.45, 4, 8), packMaterial); // 以膠囊建立柔和圓角背包
    pack.position.set(0, 2.05, -0.39); // 將背包放在角色軀幹背面
    pack.castShadow = true; // 讓背包投射陰影
    pack.receiveShadow = true; // 讓背包承接柔和陰影
    backpackGroup.add(pack); // 將背包加入書包群組
    for (const strapX of [-0.24, 0.24]) { // 在肩膀兩側配置背包肩帶
      const strap = new THREE.Mesh(createCapsuleGeometry(0.045, 0.52, 3, 6), packMaterial); // 建立細長膠囊肩帶
      strap.position.set(strapX, 2.24, -0.25); // 讓肩帶沿身體後側延伸
      strap.rotation.z = strapX * -1.3; // 讓左右肩帶分別斜向肩部
      strap.castShadow = true; // 讓肩帶投射陰影
      backpackGroup.add(strap); // 將肩帶加入書包群組
    } // 結束背包肩帶配置
    group.add(backpackGroup); // 將書包群組加入角色根群組
    appearanceLayers.backpack = backpackGroup; // 保存書包群組供造型設定切換
  } // 結束背包選擇
  const petLegJoints = []; // 儲存寵物四肢供待機步態控制
  if (pet || customizable) { // 依參數或自訂模式建立跟隨寵物
    const petGroup = new THREE.Group(); // 建立跟隨角色的寵物群組
    petGroup.visible = pet; // 依初始設定控制寵物群組顯示
    petGroup.position.set(0.82, 0.02, -0.02); // 將寵物安排在角色身側
    group.add(petGroup); // 將寵物加入角色根群組使其跟隨移動
    const petFur = new THREE.MeshStandardMaterial({ color: "#d9a875", roughness: 0.9 }); // 建立寵物暖棕色毛皮材質
    const petCream = new THREE.MeshStandardMaterial({ color: "#f0d7b1", roughness: 0.9 }); // 建立寵物奶油色口鼻與腳掌材質
    const petBody = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48, 1), petFur); // 以低多邊形球體製作寵物身體
    petBody.position.set(0, 0.78, 0); // 將寵物身體放在腿部上方
    petBody.scale.set(1.25, 0.82, 0.78); // 將身體調整為小狗的圓潤比例
    petBody.castShadow = true; // 讓寵物身體投射柔和陰影
    petGroup.add(petBody); // 將寵物身體加入寵物群組
    const petHead = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), petFur); // 以低多邊形球體製作寵物頭部
    petHead.position.set(0, 1.02, 0.42); // 將頭部朝角色前方抬起
    petHead.castShadow = true; // 讓寵物頭部投射陰影
    petGroup.add(petHead); // 將寵物頭部加入寵物群組
    const petMuzzle = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 1), petCream); // 建立寵物淺色口鼻
    petMuzzle.position.set(0, 0.91, 0.7); // 將口鼻放在寵物臉部前方
    petMuzzle.scale.set(1, 0.72, 0.8); // 將口鼻調整為扁圓外形
    petGroup.add(petMuzzle); // 將寵物口鼻加入寵物群組
    for (const earSide of [-1, 1]) { // 在寵物頭部兩側建立垂耳
      const ear = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), petFur); // 以低多邊形球體製作垂耳
      ear.position.set(earSide * 0.25, 1.22, 0.35); // 將耳朵放在頭部兩側
      ear.scale.set(0.72, 1.35, 0.7); // 將耳朵塑造成下垂外型
      petGroup.add(ear); // 將垂耳加入寵物群組
    } // 結束寵物垂耳建立
    const petNose = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), darkMaterial); // 建立寵物深色鼻頭
    petNose.position.set(0, 0.98, 0.86); // 將鼻頭放在口鼻前端
    petGroup.add(petNose); // 將鼻頭加入寵物群組
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 5, 12), helmetMaterial); // 以圓環製作寵物彩色項圈
    collar.position.set(0, 0.86, 0.34); // 將項圈環繞寵物脖子
    collar.rotation.x = Math.PI / 2; // 將項圈旋轉至寵物脖子方向
    petGroup.add(collar); // 將項圈加入寵物群組
    for (const legX of [-0.27, 0.27]) { // 在寵物身體左右兩側建立前後腿
      for (const legZ of [-0.22, 0.22]) { // 在寵物身體前後位置建立腿部關節
        const legJoint = new THREE.Group(); // 建立可擺動的寵物腿關節
        legJoint.position.set(legX, 0.5, legZ); // 將腿關節接到寵物身體下方
        const leg = new THREE.Mesh(createCapsuleGeometry(0.095, 0.3, 3, 7), petCream); // 以膠囊製作寵物短腿
        leg.position.y = -0.16; // 讓腿部從關節向下延伸
        leg.castShadow = true; // 讓寵物腿部投射陰影
        legJoint.add(leg); // 將腿部掛在寵物關節上
        petGroup.add(legJoint); // 將寵物腿關節加入寵物群組
        petLegJoints.push(legJoint); // 保存寵物腿關節供動畫控制
      } // 結束寵物前後腿配置
    } // 結束寵物左右腿配置
    const tail = new THREE.Mesh(createCapsuleGeometry(0.07, 0.32, 3, 6), petFur); // 以核心膠囊幾何製作向上翹起的寵物尾巴
    tail.position.set(0, 1.08, -0.48); // 將尾巴接在寵物身體後端
    tail.rotation.x = -0.8; // 讓尾巴朝上並略微向後
    petGroup.add(tail); // 將尾巴加入寵物群組
    appearanceLayers.pet = petGroup; // 保存寵物群組供造型設定切換
  } // 結束寵物建立
  const badge = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), helmet ? helmetMaterial : shoeMaterial); // 建立胸前小型識別徽章
  badge.position.set(0.19, 2.08, 0.31); // 將徽章放在上衣胸前
  group.add(badge); // 將徽章加入角色根群組
  scene.add(group); // 將完整角色加入 Three.js 場景
  return { group, armJoints, legJoints, petLegJoints, appearanceMaterials: { shirt: shirtMaterial, accessories: [helmetMaterial, packMaterial] }, appearanceLayers }; // 回傳角色群組、動畫關節、材質與可切換配件群組
} // 結束 Q 版角色建立函式

function animateWalk(chibi, time, amplitude = 0.48, frequency = 5) { // 以正弦波驅動角色四肢前後擺動
  const phase = time * frequency; // 將經過時間換算為步行擺動相位
  for (let index = 0; index < chibi.armJoints.length; index += 1) { // 逐一更新左右肩關節的擺動角度
    chibi.armJoints[index].rotation.x = Math.sin(phase + index * Math.PI) * amplitude; // 讓左右手臂以相反節奏前後擺動
  } // 結束手臂步行擺動
  for (let index = 0; index < chibi.legJoints.length; index += 1) { // 逐一更新左右髖關節的擺動角度
    chibi.legJoints[index].rotation.x = Math.sin(phase + index * Math.PI + Math.PI) * amplitude * 0.78; // 讓左右腿與手臂反向交替前後擺動
  } // 結束腿部步行擺動
  for (let index = 0; index < chibi.petLegJoints.length; index += 1) { // 逐一更新寵物四肢的交替步態
    chibi.petLegJoints[index].rotation.x = Math.sin(phase * 0.8 + (index % 2) * Math.PI) * amplitude * 0.55; // 讓寵物腿部隨角色步伐輕柔擺動
  } // 結束寵物步行擺動
} // 結束步行動畫函式

function addBox(parent, size, position, material, rotationY = 0, rotationZ = 0) { // 建立並放置陰影方塊
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material); // 建立指定尺寸的方塊網格
  mesh.position.set(position[0], position[1], position[2]); // 設定方塊在場景中的位置
  mesh.rotation.y = rotationY; // 設定方塊水平旋轉角度
  mesh.rotation.z = rotationZ; // 設定方塊斜向旋轉角度
  mesh.castShadow = true; // 讓方塊投射柔和陰影
  mesh.receiveShadow = true; // 讓方塊表面承接其他物件陰影
  parent.add(mesh); // 將方塊加入指定物件群組
  return mesh; // 回傳網格供後續操作
} // 結束方塊建立工具

function addCylinder(parent, radiusTop, radiusBottom, height, position, material, sides = 8) { // 建立低多邊形圓柱網格
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides), material); // 建立指定分段數的圓柱
  mesh.position.set(position[0], position[1], position[2]); // 設定圓柱在場景中的位置
  mesh.castShadow = true; // 讓圓柱投射柔和陰影
  mesh.receiveShadow = true; // 讓圓柱表面承接陰影
  parent.add(mesh); // 將圓柱加入指定物件群組
  return mesh; // 回傳網格供後續操作
} // 結束圓柱建立工具

function addSphere(parent, radius, position, material, scale = [1, 1, 1], detail = 1) { // 建立低多邊形球體網格
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, detail), material); // 以低面數二十面體製作球形物件
  mesh.position.set(position[0], position[1], position[2]); // 設定球體在場景中的位置
  mesh.scale.set(scale[0], scale[1], scale[2]); // 調整球體外型比例
  mesh.castShadow = true; // 讓球體投射柔和陰影
  mesh.receiveShadow = true; // 讓球體表面承接陰影
  parent.add(mesh); // 將球體加入指定物件群組
  return mesh; // 回傳網格供後續操作
} // 結束球體建立工具

function addTree(parent, x, z, scale = 1) { // 以圓柱與低多邊形球體組成一棵樹
  const tree = new THREE.Group(); // 建立樹木物件群組
  tree.position.set(x, platformTop, z); // 將樹木放在平台表面
  parent.add(tree); // 將樹木群組加入指定平台
  registerObstacle(parent, x, z, 0.62 * scale); // 將樹幹與樹冠底部登記為可碰撞障礙
  addCylinder(tree, 0.2 * scale, 0.3 * scale, 1.45 * scale, [0, 0.72 * scale, 0], materials.trunk, 7); // 以圓柱製作略帶錐度的樹幹
  addSphere(tree, 0.85 * scale, [0, 1.8 * scale, 0], materials.leafA, [0.95, 1.05, 0.9], 1); // 製作樹冠中央的淺綠球團
  addSphere(tree, 0.64 * scale, [-0.48 * scale, 1.65 * scale, 0.12 * scale], materials.leafB, [1, 0.92, 0.92], 1); // 製作樹冠左側的亮綠球團
  addSphere(tree, 0.66 * scale, [0.44 * scale, 1.62 * scale, -0.12 * scale], materials.leafC, [0.95, 0.98, 1], 1); // 製作樹冠右側的深綠球團
  addSphere(tree, 0.56 * scale, [0.04 * scale, 2.28 * scale, 0.03 * scale], materials.leafB, [0.94, 0.9, 0.95], 1); // 製作樹冠頂端的亮綠球團
} // 結束低多邊形樹木製作

function addBench(parent, x, z, rotation = 0) { // 以方塊與圓柱組成公園長椅
  const bench = new THREE.Group(); // 建立長椅物件群組
  bench.position.set(x, platformTop, z); // 將長椅放在平台表面
  bench.rotation.y = rotation; // 調整長椅朝向
  parent.add(bench); // 將長椅群組加入指定平台
  registerObstacle(parent, x, z, 0.82); // 將長椅登記為可繞行的碰撞障礙
  for (let index = 0; index < 3; index += 1) { // 逐一排列三片椅座木板
    addBox(bench, [2.05, 0.12, 0.2], [0, 0.58, -0.18 + index * 0.2], materials.trunk); // 以細長木方塊製作椅座
  } // 結束椅座木板排列
  addBox(bench, [2.05, 0.14, 0.18], [0, 1.02, -0.39], materials.trunk); // 以長方木板製作椅背
  for (const legX of [-0.72, 0.72]) { // 在椅子兩側各安裝一組金屬椅腳
    addCylinder(bench, 0.065, 0.08, 0.57, [legX, 0.29, 0], materials.metal, 7); // 以細圓柱製作椅腳
    addCylinder(bench, 0.055, 0.07, 0.64, [legX, 0.72, -0.34], materials.metal, 7); // 以斜向圓柱製作椅背支架
  } // 結束長椅支架製作
} // 結束長椅製作

function addLantern(parent, x, z) { // 以圓柱與球體組成低多邊形路燈
  const lantern = new THREE.Group(); // 建立路燈物件群組
  lantern.position.set(x, platformTop, z); // 將路燈底部定位於平台表面
  parent.add(lantern); // 將路燈加入指定平台
  registerObstacle(parent, x, z, 0.31); // 將路燈立柱登記為可繞行的碰撞障礙
  addCylinder(lantern, 0.09, 0.13, 2.65, [0, 1.32, 0], materials.metal, 8); // 以金屬圓柱製作路燈燈柱
  addCylinder(lantern, 0.13, 0.17, 0.12, [0, 2.65, 0], materials.yellow, 8); // 以金色圓柱製作燈罩底座
  addSphere(lantern, 0.27, [0, 2.91, 0], materials.lamp, [1, 0.82, 1], 1); // 以發光低多邊形球體製作燈罩
  addSphere(lantern, 0.36, [0, 2.91, 0], new THREE.MeshBasicMaterial({ color: "#ffe8a6", transparent: true, opacity: 0.13 }), [1, 0.8, 1], 1); // 以透明球體營造柔和燈光光暈
  shadowGroup.add(lantern); // 將路燈加入可切換的燈光群組
} // 結束路燈製作

function addPlatform(centerX, centerZ, index) { // 建立帶有黃黑警示條的方形浮島
  const platform = new THREE.Group(); // 建立平台物件群組
  platform.position.set(centerX, 0, centerZ); // 設定平台在水面上的位置
  scene.add(platform); // 將平台加入公園場景
  registerWalkableArea({ kind: "platform", x: centerX, y: platformTop, z: centerZ, halfWidth: platformSize / 2 - playerRadius, halfLength: platformSize / 2 - playerRadius }, platformSize - 0.12, platformSize - 0.12); // 登記平台安全範圍並建立平台點選平面
  addBox(platform, [platformSize, 0.82, platformSize], [0, 0.02, 0], materials.base); // 以深色方塊製作浮島側面底座
  addBox(platform, [platformSize - 0.12, 0.2, platformSize - 0.12], [0, platformTop - 0.1, 0], materials.deck); // 以淺木色方塊製作平台表面
  for (let plankIndex = -3; plankIndex <= 3; plankIndex += 1) { // 在平台表面繪製細緻木板接縫
    addBox(platform, [0.025, 0.012, platformSize - 0.35], [plankIndex * 0.9, platformTop + 0.006, 0], materials.plank); // 以細條標示平行木板間隙
  } // 結束平台表面木板接縫
  const stripeCount = 15; // 設定每面平台側邊警示條的數量
  for (let side = 0; side < 4; side += 1) { // 逐一裝飾平台的四個側面
    for (let stripe = 0; stripe < stripeCount; stripe += 1) { // 沿每個平台側面排列交錯色條
      const offset = (stripe - (stripeCount - 1) / 2) * 0.49; // 計算斜條在側面上的平均間距
      const stripeMaterial = stripe % 2 === 0 ? materials.yellow : materials.black; // 交錯選用警示黃與深色材質
      let x = offset; // 預設將警示條放在平台前側
      let z = platformSize / 2 + 0.01; // 將警示條貼近平台前側外緣
      if (side === 1) { x = -offset; z = -platformSize / 2 - 0.01; } // 設定平台後側警示條位置
      if (side === 2) { x = platformSize / 2 + 0.01; z = offset; } // 設定平台右側警示條位置
      if (side === 3) { x = -platformSize / 2 - 0.01; z = -offset; } // 設定平台左側警示條位置
      const diagonal = side < 2 ? Math.PI / 6 : Math.PI / 2 - Math.PI / 6; // 依側面方向調整警示條斜角
      addBox(platform, [0.42, 0.9, 0.055], [x, 0.01, z], stripeMaterial, 0, diagonal); // 以斜向長方塊貼出黃黑警示條紋
    } // 結束單側警示條排列
  } // 結束四側警示條裝飾
  if (index === 0) { // 為中央平台配置主要休憩空間
    addTree(platform, -1.85, -1.75, 0.82); // 在中央平台左後方種植低多邊形樹
    addBench(platform, 1.25, 1.6, -Math.PI / 4); // 在中央平台右前方配置木質長椅
    addLantern(platform, 2.25, -1.75); // 在中央平台配置一盞金色路燈
  } else if (index === 1) { // 為左後方平台配置主要景觀樹
    addTree(platform, 0, 0, 1.22); // 在左後方平台中央種植高大的低多邊形樹
    addBench(platform, -1.45, 1.85, Math.PI / 5); // 在左後方平台配置休憩長椅
    addLantern(platform, 2.15, 1.9); // 在左後方平台配置金色路燈
  } else if (index === 2) { // 為右後方平台配置另一組休憩設施
    addTree(platform, -1.8, -1.4, 0.92); // 在右後方平台種植裝飾樹木
    addBench(platform, 1.3, 1.55, -Math.PI / 5); // 在右後方平台配置長椅
    addLantern(platform, 2.2, -1.8); // 在右後方平台配置金色路燈
  } else if (index === 3) { // 為左前方平台配置另一座樹木島
    addTree(platform, 1.6, 1.3, 1.08); // 在左前方平台種植低多邊形樹
    addBench(platform, -1.65, -1.7, Math.PI / 3); // 在左前方平台配置斜向長椅
    addLantern(platform, -2.05, 1.9); // 在左前方平台配置金色路燈
  } else { // 為右前方平台配置最後一組休憩設施
    addTree(platform, 1.7, -1.45, 0.96); // 在右前方平台種植低多邊形樹
    addBench(platform, -1.55, 1.65, -Math.PI / 3); // 在右前方平台配置斜向長椅
    addLantern(platform, -2.1, -1.9); // 在右前方平台配置金色路燈
  } // 結束各平台特色配置
} // 結束方形浮島建立

function addBridge(start, end) { // 建立兩座平台間帶黃色欄杆的橋
  const dx = end[0] - start[0]; // 計算橋梁在 X 軸方向的長度
  const dz = end[1] - start[1]; // 計算橋梁在 Z 軸方向的長度
  const length = Math.hypot(dx, dz); // 計算橋梁中心線總長度
  const angle = Math.atan2(dx, dz); // 計算橋梁沿水平方向的旋轉角度
  const centerX = (start[0] + end[0]) / 2; // 計算橋梁中心點的 X 座標
  const centerZ = (start[1] + end[1]) / 2; // 計算橋梁中心點的 Z 座標
  const bridge = new THREE.Group(); // 建立橋面與欄杆的群組
  bridge.position.set(centerX, 0, centerZ); // 將橋梁放在相鄰平台的中央
  bridge.rotation.y = angle; // 讓橋梁朝向連接的平台
  scene.add(bridge); // 將橋梁加入場景
  registerWalkableArea({ kind: "bridge", x: centerX, y: 0.61, z: centerZ, halfWidth: 1.325 - playerRadius, halfLength: length / 2 + playerRadius + 0.22 }, 2.65, length + 0.16, angle); // 登記橋面安全走道與方向
  addBox(bridge, [2.65, 0.28, length + 0.16], [0, 0.47, 0], materials.deck); // 以木色方塊製作懸浮橋面
  addBox(bridge, [2.73, 0.16, length + 0.2], [0, 0.24, 0], materials.base); // 以深色方塊製作橋面底座
  for (let railSide = -1; railSide <= 1; railSide += 2) { // 在橋梁兩側各安裝一排黃色護欄
    const railX = railSide * 1.23; // 設定欄杆距離橋面中心的位置
    addBox(bridge, [0.11, 0.12, length + 0.08], [railX, 1.48, 0], materials.yellow); // 以細長方塊製作連續黃色上扶手
    addBox(bridge, [0.075, 0.09, length + 0.08], [railX, 0.88, 0], materials.yellow); // 以細長方塊製作黃色下扶手
    const postCount = Math.max(2, Math.floor(length / 1.15)); // 依橋梁長度計算欄杆立柱數量
    for (let postIndex = 0; postIndex <= postCount; postIndex += 1) { // 均勻排列黃色欄杆立柱
      const postZ = -length / 2 + (length * postIndex) / postCount; // 計算欄杆立柱沿橋面的座標
      addCylinder(bridge, 0.075, 0.09, 1.16, [railX, 1.15, postZ], materials.yellow, 7); // 以圓柱製作亮黃色護欄支柱
    } // 結束單側欄杆立柱排列
  } // 結束橋梁兩側護欄
  for (let index = -2; index <= 2; index += 1) { // 在橋面上排列規律的防滑木板接縫
    addBox(bridge, [2.52, 0.018, 0.035], [0, 0.622, index * (length / 5)], materials.plank); // 以木色細條點綴橋面
  } // 結束橋面防滑裝飾
} // 結束黃色欄杆橋梁建立

for (let index = 0; index < platformCenters.length; index += 1) { // 依序建立五座方形浮島
  addPlatform(platformCenters[index][0], platformCenters[index][1], index); // 放置浮島並配置各自的公園設施
} // 結束五座浮島建立
for (let index = 1; index < platformCenters.length; index += 1) { // 讓四座外圍浮島各自連接中央平台
  const directionX = Math.sign(platformCenters[index][0]); // 計算外圍平台的水平方向
  const directionZ = Math.sign(platformCenters[index][1]); // 計算外圍平台的縱深方向
  const start = [directionX * (platformSize / 2 - 0.02), directionZ * (platformSize / 2 - 0.02)]; // 計算中央平台靠近角落的橋頭位置
  const end = [platformCenters[index][0] - directionX * (platformSize / 2 - 0.02), platformCenters[index][1] - directionZ * (platformSize / 2 - 0.02)]; // 計算外圍平台的橋頭位置
  if (directionX === directionZ) { // 對角線方位需要用水平與垂直兩段橋梁轉接
    const cornerX = platformCenters[index][0] - directionX * (platformSize / 2 - 0.02); // 計算轉角的水平座標
    const cornerZ = directionZ * (platformSize / 2 - 0.02); // 計算轉角的縱深座標
    addBridge(start, [cornerX, start[1]]); // 建立第一段通往轉角的橋梁
    addBridge([cornerX, cornerZ], end); // 建立第二段通往外圍浮島的橋梁
    const joint = new THREE.Group(); // 建立橋梁轉角的小型平台群組
    joint.position.set(cornerX, 0, cornerZ); // 將轉角平台定位於兩段橋梁交會處
    scene.add(joint); // 將轉角平台加入公園場景
    registerWalkableArea({ kind: "joint", x: cornerX, y: 0.61, z: cornerZ, halfWidth: 1.34 - playerRadius, halfLength: 1.34 - playerRadius }, 2.68, 2.68); // 登記橋梁轉角踏台的安全行走範圍
    addBox(joint, [2.68, 0.28, 2.68], [0, 0.47, 0], materials.deck); // 以方塊製作轉角處的連接踏台
    addBox(joint, [2.76, 0.16, 2.76], [0, 0.24, 0], materials.base); // 以深色方塊製作轉角踏台底座
  } else { // 另一組對角浮島直接以斜向橋梁連接
    addBridge(start, end); // 建立斜向連接橋梁與護欄
  } // 結束依方向選擇橋梁路徑
} // 結束外圍浮島橋梁連接

const visitorStart = { position: [-1.45, platformTop, 2.55], rotationY: -0.18 }; // 保存玩家角色的初始位置與朝向
let characterAppearance = { shirtColor: "#e88b68", accessoryColor: "#efbf47", accessory: "helmet", backpack: true, pet: false }; // 保存玩家目前選擇的服裝與配件
let parkVisitor = makeChibi({ ...visitorStart, ...characterAppearance, helmet: true, customizable: true, scale: 0.58 }); // 在中央浮島建立可即時切換配件的自訂角色
let characterName = "小島探險家"; // 設定玩家角色預設顯示名稱
function applyCharacterAppearance(options) { // 依控制面板選項更新玩家角色外觀
  characterAppearance = { ...characterAppearance, ...options }; // 保留未被修改的外觀設定並套用新選項
  parkVisitor.appearanceMaterials.shirt.color.set(characterAppearance.shirtColor); // 即時更新上衣材質顏色
  for (const material of parkVisitor.appearanceMaterials.accessories) material.color.set(characterAppearance.accessoryColor); // 同步更新角色配件與背包顏色
  parkVisitor.appearanceLayers.helmet.visible = characterAppearance.accessory === "helmet"; // 依選擇顯示或隱藏安全帽
  parkVisitor.appearanceLayers.glasses.visible = characterAppearance.accessory === "glasses"; // 依選擇顯示或隱藏眼鏡
  parkVisitor.appearanceLayers.scarf.visible = characterAppearance.accessory === "scarf"; // 依選擇顯示或隱藏圍巾
  parkVisitor.appearanceLayers.backpack.visible = characterAppearance.backpack; // 依勾選狀態顯示或隱藏背包
  parkVisitor.appearanceLayers.pet.visible = characterAppearance.pet; // 依勾選狀態顯示或隱藏寵物
} // 結束玩家角色外觀更新
function setCharacterName(name) { // 更新玩家角色的顯示名稱
  characterName = name.trim().slice(0, 16); // 去除名稱前後空白並限制為十六個字元
} // 結束玩家名稱更新
const visitorSpots = [[[-2.8, -0.1], [0.2, -2.75]], [[-2.7, 0.6], [2.65, -2.4]], [[-0.3, 2.7], [2.7, 0.1]], [[-0.2, -2.8], [2.8, -1.5]], [[2.8, 0.1], [0.5, -2.8]]]; // 為五座浮島各安排兩個避開設施的訪客位置
const visitorShirtColors = ["#e58b72", "#72a6c2", "#e7b957", "#9b82b7", "#73a988", "#d8799a", "#d48b52", "#6689bd", "#a9a35f", "#cf6f5c"]; // 設定訪客上衣可隨機挑選的多彩色票
const visitorHairColors = ["#382d2a", "#60432f", "#9a633d", "#332f46", "#805347", "#bd8b45", "#3d5148", "#6b485e"]; // 設定訪客頭髮可隨機挑選的色票
const visitorAccessoryColors = ["#e9b84e", "#d96f58", "#5a9c91", "#7488c2", "#d4779d", "#7c9a5c"]; // 設定安全帽、背包與圍巾可隨機挑選的色票
const visitorHairstyles = ["short", "bob", "ponytail", "bun", "long"]; // 列出訪客可隨機採用的五種髮型
const visitorAccessorySets = [{ helmet: true }, { backpack: true }, { glasses: true }, { scarf: true }, { backpack: true, glasses: true }, { helmet: true, backpack: true }]; // 設定安全帽、背包、眼鏡與圍巾的隨機搭配
const chooseRandom = (items) => items[Math.floor(Math.random() * items.length)]; // 從指定設計選項中隨機挑選一項
const pedestrians = []; // 儲存島上路人及其各自的漫遊狀態
for (let islandIndex = 0; islandIndex < platformCenters.length; islandIndex += 1) { // 逐座浮島建立兩位外觀隨機的訪客
  for (const [localX, localZ] of visitorSpots[islandIndex]) { // 逐一讀取目前浮島的兩個訪客位置
    const [centerX, centerZ] = platformCenters[islandIndex]; // 讀取目前浮島的世界座標中心
    const accessorySet = chooseRandom(visitorAccessorySets); // 隨機選擇訪客身上的配件組合
    const visitor = makeChibi({ shirtColor: chooseRandom(visitorShirtColors), hairColor: chooseRandom(visitorHairColors), accessoryColor: chooseRandom(visitorAccessoryColors), hairstyle: chooseRandom(visitorHairstyles), ...accessorySet, scale: 0.34, position: [centerX + localX, platformTop, centerZ + localZ], rotationY: Math.random() * Math.PI * 2 }); // 以隨機服裝、髮型與配件建立島上訪客
    visitor.group.traverse((object) => { object.castShadow = false; }); // 關閉小型靜態訪客的陰影投射以減少即時陰影繪製負擔
    const obstacle = registerObstacle(scene, centerX + localX, centerZ + localZ, 0.34); // 將訪客登記為可移動的碰撞障礙
    pedestrians.push({ visitor, centerX, centerZ, obstacle, targetX: centerX + localX, targetZ: centerZ + localZ, pauseSeconds: Math.random() * 1.6, stuckSeconds: 0, walking: false }); // 保存路人所在島嶼、碰撞體與錯開的初始移動時間
  } // 結束目前浮島的訪客建立
} // 結束五座浮島訪客配置
const clock = new THREE.Clock(); // 建立水面與角色動畫使用的場景時鐘
const currentPath = []; // 儲存滑鼠點擊後規劃出的角色移動路徑
const moveDirection = new THREE.Vector3(); // 暫存方向鍵換算後的場景移動方向
let targetZoom = 1; // 儲存縮放控制所指定的正交攝影機目標倍率
let isWalking = false; // 記錄公仔目前是否實際移動

function tryMoveTo(x, z) { // 只有在平台或橋面上且沒有撞到物件時才移動角色
  const groundHeight = getGroundHeightAt(x, z); // 查詢新座標是否有未被障礙物阻擋的地面
  if (groundHeight === null) return false; // 水面、平台外與物件碰撞都禁止角色進入
  parkVisitor.group.position.set(x, groundHeight, z); // 將角色移到安全地面並同步橋面高度
  return true; // 回報角色成功移動至指定座標
} // 結束安全移動位置檢查

function moveCharacter(dx, dz) { // 以小步長移動角色並在碰撞時沿障礙邊緣滑行
  const distance = Math.hypot(dx, dz); // 計算本影格的總移動距離
  if (distance === 0) return false; // 沒有移動輸入時直接回報未移動
  const steps = Math.max(1, Math.ceil(distance / 0.08)); // 將移動切成細小步長防止穿越窄橋或障礙物
  const stepX = dx / steps; // 計算每一小步的水平位移
  const stepZ = dz / steps; // 計算每一小步的縱深位移
  let moved = false; // 記錄此影格是否至少成功移動一次
  for (let step = 0; step < steps; step += 1) { // 逐小步執行地面與碰撞檢查
    const startX = parkVisitor.group.position.x; // 保存目前位置以供沿牆滑行判斷
    const startZ = parkVisitor.group.position.z; // 保存目前位置以供沿牆滑行判斷
    if (tryMoveTo(startX + stepX, startZ + stepZ)) { moved = true; continue; } // 直線可通行時直接前進
    const xAllowed = getGroundHeightAt(startX + stepX, startZ) !== null; // 檢查只移動水平分量是否可行
    const zAllowed = getGroundHeightAt(startX, startZ + stepZ) !== null; // 檢查只移動縱深分量是否可行
    if (!xAllowed && !zAllowed) break; // 兩個方向皆被阻擋時停在障礙邊緣
    const xProgress = xAllowed ? stepX * moveDirection.x : -1; // 計算水平滑行方向沿移動目標的有效進度
    const zProgress = zAllowed ? stepZ * moveDirection.z : -1; // 計算縱深滑行方向沿移動目標的有效進度
    if (xAllowed && (!zAllowed || xProgress >= zProgress)) { tryMoveTo(startX + stepX, startZ); moved = true; } // 優先沿可行的水平方向滑過障礙邊緣
    else { tryMoveTo(startX, startZ + stepZ); moved = true; } // 沿可行的縱深方向滑過障礙邊緣
  } // 結束本影格逐步移動
  return moved; // 回報本影格角色是否成功移動
} // 結束含碰撞滑行的角色移動

function updateVisitor(deltaSeconds, input, time) { // 更新方向鍵控制、滑鼠路徑與角色步行動畫
  const hasKeyboardInput = input.x !== 0 || input.y !== 0; // 判斷目前是否有方向鍵或 WASD 輸入
  if (hasKeyboardInput) { // 有鍵盤操作時以直接控制優先
    currentPath.length = 0; // 清除先前點選地面所建立的自動路徑
    moveDirection.copy(screenRight).multiplyScalar(input.x).addScaledVector(screenUp, input.y).normalize(); // 將畫面座標方向換算為斜視鏡頭下的世界移動方向
    const startX = parkVisitor.group.position.x; // 保存角色本影格開始時的水平位置
    const startZ = parkVisitor.group.position.z; // 保存角色本影格開始時的縱深位置
    isWalking = moveCharacter(moveDirection.x * 2.8 * deltaSeconds, moveDirection.z * 2.8 * deltaSeconds); // 以固定速度沿安全地面移動並處理碰撞滑行
    if (isWalking) parkVisitor.group.rotation.y = Math.atan2(parkVisitor.group.position.x - startX, parkVisitor.group.position.z - startZ); // 讓角色面向實際移動方向
  } else if (currentPath.length > 0) { // 沒有鍵盤輸入時沿滑鼠指定路徑前進
    const waypoint = currentPath[0]; // 讀取目前路徑中的下一個目標點
    const dx = waypoint.x - parkVisitor.group.position.x; // 計算目標點的水平方向與距離
    const dz = waypoint.z - parkVisitor.group.position.z; // 計算目標點的縱深方向與距離
    const distance = Math.hypot(dx, dz); // 計算角色到下一個路徑點的直線距離
    if (distance < 0.14) currentPath.shift(); // 抵達目前路徑點附近時切換至下一個路徑點
    if (currentPath.length > 0) { // 確認仍有尚未抵達的路徑點
      const next = currentPath[0]; // 重新取得目前有效的目標點
      moveDirection.set(next.x - parkVisitor.group.position.x, 0, next.z - parkVisitor.group.position.z).normalize(); // 計算朝向下一路徑點的世界方向
      isWalking = moveCharacter(moveDirection.x * 2.8 * deltaSeconds, moveDirection.z * 2.8 * deltaSeconds); // 沿安全路徑前進並處理碰撞滑行
      if (isWalking) parkVisitor.group.rotation.y = Math.atan2(moveDirection.x, moveDirection.z); // 讓角色面向自動導航方向
    } else { isWalking = false; } // 抵達最後路徑點後停止步行動畫
  } else { isWalking = false; } // 沒有鍵盤或自動導航輸入時讓角色站立
  collectNearbyStamps(); // 每影格檢查角色是否踩進新的地面集章圈
  animateWalk(parkVisitor, time, isWalking ? 0.48 : 0); // 以正弦步態擺動四肢並在停止時收回步態
} // 結束角色輸入與步行更新

function choosePedestrianDestination(pedestrian) { // 在路人所在浮島內隨機選擇安全目的地
  for (let attempt = 0; attempt < 36; attempt += 1) { // 增加安全目標抽樣次數以降低路人找不到路而停住的機率
    const angle = Math.random() * Math.PI * 2; // 隨機選取路人的下一段行走方向
    const distance = 1.1 + Math.random() * 0.7; // 將每段路程限制在容易看見且能於短時間走完的距離
    const x = pedestrian.visitor.group.position.x + Math.cos(angle) * distance; // 以路人目前位置計算附近的水平目標座標
    const z = pedestrian.visitor.group.position.z + Math.sin(angle) * distance; // 以路人目前位置計算附近的縱深目標座標
    if (Math.abs(x - pedestrian.centerX) > 3.05 || Math.abs(z - pedestrian.centerZ) > 3.05) continue; // 確保目標仍位於所屬浮島的可行走範圍內
    if (getGroundHeightAt(x, z, pedestrian.obstacle) === null) continue; // 略過平台外、水面與其他角色或設施所在位置
    pedestrian.targetX = x; // 設定路人新的漫遊水平目標
    pedestrian.targetZ = z; // 設定路人新的漫遊縱深目標
    pedestrian.pauseSeconds = 0; // 取消休息時間並開始前往新目標
    pedestrian.stuckSeconds = 0; // 清除先前移動受阻的計時
    return true; // 回報成功找到島內可行走目標
  } // 結束安全漫遊目標搜尋
  pedestrian.pauseSeconds = 0.2 + Math.random() * 0.3; // 找不到安全目的地時快速再次嘗試
  return false; // 回報目前未找到安全漫遊目標
} // 結束路人漫遊目標選擇

function updatePedestrians(deltaSeconds, time) { // 更新路人在所屬浮島內的隨機漫遊與步行動畫
  for (let pedestrianIndex = 0; pedestrianIndex < pedestrians.length; pedestrianIndex += 1) { // 逐一更新十位島上路人
    const pedestrian = pedestrians[pedestrianIndex]; // 讀取目前更新的路人與漫遊狀態
    if (pedestrian.pauseSeconds > 0) { // 路人抵達目的地後先自然停留片刻
      pedestrian.pauseSeconds -= deltaSeconds; // 倒數路人目前的休息時間
      pedestrian.walking = false; // 停止路人步行姿態
      if (pedestrian.pauseSeconds <= 0) choosePedestrianDestination(pedestrian); // 休息結束後挑選下一個島內目的地
    } else { // 路人正在前往隨機漫遊目標
      const position = pedestrian.visitor.group.position; // 取得路人的目前世界座標
      const dx = pedestrian.targetX - position.x; // 計算路人到目標的水平距離
      const dz = pedestrian.targetZ - position.z; // 計算路人到目標的縱深距離
      const distance = Math.hypot(dx, dz); // 計算路人到目標的平面距離
      if (distance < 0.16) { // 路人抵達隨機目的地後開始停留
        pedestrian.pauseSeconds = 0.8 + Math.random() * 0.4; // 短暫停留後出發，讓每段行走約每兩秒發生一次
        pedestrian.walking = false; // 抵達後停止步行動畫
      } else { // 尚未抵達時嘗試向目的地移動
        const stepDistance = Math.min(distance, 1.5 * deltaSeconds); // 以較清楚的步行速度移動並避免越過目的地
        const stepX = (dx / distance) * stepDistance; // 計算本影格的水平移動量
        const stepZ = (dz / distance) * stepDistance; // 計算本影格的縱深移動量
        let nextX = position.x + stepX; // 預先計算直線移動後的水平座標
        let nextZ = position.z + stepZ; // 預先計算直線移動後的縱深座標
        let groundHeight = getGroundHeightAt(nextX, nextZ, pedestrian.obstacle); // 檢查直線移動是否仍在安全地面
        if (groundHeight === null) { // 遇到設施或其他路人時嘗試沿障礙邊緣滑行
          groundHeight = getGroundHeightAt(nextX, position.z, pedestrian.obstacle); // 優先測試只移動水平分量的滑行位置
          if (groundHeight !== null) nextZ = position.z; // 水平分量可通行時保留原有縱深座標
          else { // 水平方向受阻時改測縱深分量
            groundHeight = getGroundHeightAt(position.x, nextZ, pedestrian.obstacle); // 測試只移動縱深分量的滑行位置
            if (groundHeight !== null) nextX = position.x; // 縱深分量可通行時保留原有水平座標
          } // 結束障礙邊緣滑行判斷
        } // 結束路人地面與碰撞檢查
        if (groundHeight === null) { // 目前方向無法通行時累計受阻時間
          pedestrian.stuckSeconds += deltaSeconds; // 更新路人連續受阻時間
          pedestrian.walking = false; // 受阻時停止步行動畫
          if (pedestrian.stuckSeconds > 0.45) choosePedestrianDestination(pedestrian); // 長時間受阻時重新挑選隨機目標
        } else { // 移動路徑可通行時更新路人位置
          const previousX = position.x; // 保存路人移動前的水平座標
          const previousZ = position.z; // 保存路人移動前的縱深座標
          position.set(nextX, groundHeight, nextZ); // 將路人移至通行位置並同步地面高度
          pedestrian.obstacle.x = nextX; // 同步更新路人碰撞體的水平座標
          pedestrian.obstacle.z = nextZ; // 同步更新路人碰撞體的縱深座標
          const movedX = nextX - previousX; // 計算路人本影格實際移動的水平距離
          const movedZ = nextZ - previousZ; // 計算路人本影格實際移動的縱深距離
          pedestrian.visitor.group.rotation.y = Math.atan2(movedX, movedZ); // 讓路人面向實際行走方向
          pedestrian.walking = Math.hypot(movedX, movedZ) > 0; // 依本影格是否實際移動設定步行狀態
          pedestrian.stuckSeconds = 0; // 移動成功後重設受阻計時
        } // 結束路人位置更新
      } // 結束路人目的地判斷
    } // 結束路人漫遊更新
    animateWalk(pedestrian.visitor, time + pedestrianIndex * 0.7, pedestrian.walking ? 0.4 : 0); // 依行走狀態播放錯開的正弦步態
  } // 結束所有島上路人更新
} // 結束路人漫遊與步行動畫

function setDestinationFromScreen(x, y, width, height) { // 以 Three.js Raycaster 將滑鼠畫面座標投射到可行走地面
  raycaster.setFromCamera(new THREE.Vector2((x / width) * 2 - 1, 1 - (y / height) * 2), camera); // 將畫布座標換算成攝影機視錐中的射線
  const intersections = raycaster.intersectObjects(pickableSurfaces, false); // 僅測試平台、橋面與轉角踏台的透明點選平面
  if (intersections.length === 0) return false; // 點擊水面或場景外時不設定移動目標
  const hit = intersections[0].point; // 取出射線命中的最近地面位置
  const path = findWalkPath(parkVisitor.group.position, hit); // 規劃繞過樹木與設施的安全步行路線
  if (!path) { currentPath.length = 0; return false; } // 沒有連通安全路徑時停止目前導航並回報失敗
  currentPath.splice(0, currentPath.length, ...path); // 以新路徑取代目前自動導航路線
  return true; // 回報成功設定地面點選移動目標
} // 結束地面點選導航

for (const stamp of stampPoints) { // 依序在五個地點建立地面集章圓圈
  const markerMaterial = new THREE.MeshBasicMaterial({ color: "#f29b55", transparent: true, opacity: 0.78, depthWrite: false, side: THREE.DoubleSide }); // 建立醒目的半透明橘色集章材質
  const marker = new THREE.Mesh(new THREE.CircleGeometry(stamp.radius, 40), markerMaterial); // 以圓形平面建立地面集章區域
  marker.rotation.x = -Math.PI / 2; // 將集章圓圈旋轉成水平地面方向
  marker.position.set(stamp.position[0], stamp.position[1], stamp.position[2]); // 將集章圓圈放在指定平台表面
  marker.renderOrder = 1; // 讓透明集章圈在地面上方穩定顯示
  scene.add(marker); // 將集章圓圈加入 Three.js 場景
  stamp.position3D = new THREE.Vector3(stamp.position[0], stamp.position[1], stamp.position[2]); // 建立供投影與距離判定使用的三維座標
  stamp.marker = marker; // 保存地面圓圈以便蓋章時更新顏色
  stamp.collected = false; // 初始化此地點尚未完成集章
} // 結束五個地面集章點建立

function collectNearbyStamps() { // 檢查角色是否進入尚未收集的集章圓圈
  for (const stamp of stampPoints) { // 逐一檢查五個集章地點
    if (stamp.collected) continue; // 略過已完成並變色的集章地點
    const distance = Math.hypot(parkVisitor.group.position.x - stamp.position[0], parkVisitor.group.position.z - stamp.position[2]); // 計算角色與集章中心的平面距離
    if (distance > stamp.radius - playerRadius * 0.35) continue; // 只有角色踏入圓圈內時才完成集章
    stamp.collected = true; // 標記此地點已成功蓋章
    stamp.marker.material.color.set("#72b78d"); // 將已完成的地面圓圈改為清新的綠色
    currentDescription = stamp; // 更新畫面下方顯示的地點說明
  } // 結束集章狀態更新
} // 結束角色自動集章檢查

let currentDescription = null; // 儲存最近完成集章的地點說明

function goToStamp(index) { // 點選 p5 標籤後規劃前往指定集章地點
  const stamp = stampPoints[index]; // 讀取標籤對應的集章地點
  if (!stamp) return false; // 無效的集章索引不啟動導航
  const path = findWalkPath(parkVisitor.group.position, { x: stamp.position[0], z: stamp.position[2] }); // 使用安全導航網格規劃前往集章圈的路徑
  if (!path) return false; // 地點無法由目前位置安全抵達時回報失敗
  currentPath.splice(0, currentPath.length, ...path); // 以集章地點路徑取代目前自動導航目標
  return true; // 回報成功設定集章地點導航
} // 結束集章標籤導航

function getStampScreenPosition(index, width, height) { // 將世界座標中的集章點轉成 p5 畫布上的標籤位置
  const stamp = stampPoints[index]; // 讀取要投影的集章點
  if (!stamp) return null; // 無效索引不產生畫布標籤座標
  const projected = new THREE.Vector3(stamp.position[0], stamp.position[1] + 1.2, stamp.position[2]).project(camera); // 將集章點上方的位置投影到攝影機畫面
  if (projected.z < -1 || projected.z > 1) return null; // 略過攝影機視錐以外或鏡頭後方的地點
  return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 }; // 回傳 p5 畫布使用的像素座標
} // 結束集章標籤畫面投影

function getCharacterNameScreenPosition(width, height) { // 將玩家角色頭部上方投影至 p5 畫布座標
  const headPosition = parkVisitor.group.position.clone(); // 複製角色世界位置避免修改角色本身座標
  headPosition.y += 4.15 * parkVisitor.group.scale.y; // 將名稱標籤位置提升至角色頭部上方
  const projected = headPosition.project(camera); // 依目前相機方向與縮放投影角色位置
  if (projected.z < -1 || projected.z > 1) return null; // 角色位於攝影機視錐外時不顯示名稱
  return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2, name: characterName }; // 回傳名稱與畫布像素座標
} // 結束玩家名稱標籤投影

function resize() { // 依據視窗尺寸更新渲染器與正交攝影機
  const width = window.innerWidth; // 取得目前視窗寬度
  const height = window.innerHeight; // 取得目前視窗高度
  const aspect = width / height; // 計算視窗寬高比例
  const viewHeight = 38; // 設定正交攝影機的預設垂直視野
  camera.left = (-viewHeight * aspect) / 2; // 依視窗比例設定攝影機左側範圍
  camera.right = (viewHeight * aspect) / 2; // 依視窗比例設定攝影機右側範圍
  camera.top = viewHeight / 2; // 設定攝影機上側範圍
  camera.bottom = -viewHeight / 2; // 設定攝影機下側範圍
  camera.updateProjectionMatrix(); // 更新攝影機投影矩陣
  renderer.setSize(width, height); // 調整 WebGL 畫布尺寸
} // 結束視窗尺寸更新
window.addEventListener("resize", resize); // 監聽視窗改變並重新配置場景畫布
resize(); // 以目前視窗尺寸初始化渲染器

window.parkScene = { // 將有限且明確的場景操作介面提供給 p5.js
  tick(deltaSeconds, input) { // 由 p5.js draw 主迴圈統一更新角色、攝影機與 Three.js 畫面
    const time = clock.getElapsedTime(); // 取得場景執行累積時間供水面與步態動畫使用
    water.position.y = -0.42 + Math.sin(time * 0.55) * 0.025; // 讓淡藍水面以極小幅度柔和起伏
    const orbitBlend = 1 - Math.exp(-7 * deltaSeconds); // 計算水平與垂直鏡頭旋轉的平滑插值比例
    orbitAzimuth += Math.atan2(Math.sin(targetAzimuth - orbitAzimuth), Math.cos(targetAzimuth - orbitAzimuth)) * orbitBlend; // 平滑更新攝影機水平方位角
    orbitPolar += (targetPolar - orbitPolar) * orbitBlend; // 平滑更新攝影機俯仰極角
    updateVisitor(deltaSeconds, input, time); // 更新方向鍵、點擊導航與角色行走動畫
    updatePedestrians(deltaSeconds, time); // 更新島上路人的隨機島內漫遊與步行動作
    const previousZoom = camera.zoom; // 保存本影格縮放倍率以判斷是否需要更新投影矩陣
    camera.zoom += (targetZoom - camera.zoom) * (1 - Math.exp(-8 * deltaSeconds)); // 以指數緩動平滑完成放大與縮小過渡
    if (Math.abs(camera.zoom - previousZoom) > 0.00001) camera.updateProjectionMatrix(); // 縮放倍率改變時即時更新正交投影矩陣
    cameraOffset.setFromSpherical(new THREE.Spherical(orbitRadius, orbitPolar, orbitAzimuth)); // 依目前球面角度計算攝影機環繞偏移
    camera.position.copy(target).add(cameraOffset); // 讓攝影機以平滑俯仰與方位角固定環繞中央花園
    camera.lookAt(target); // 持續讓攝影機朝向中央花園旋轉中心
    camera.updateMatrixWorld(); // 更新攝影機世界矩陣供 Raycaster 取得最新視角
    screenRight.set(1, 0, 0).applyQuaternion(camera.quaternion); // 依旋轉後的鏡頭更新畫面向右方向
    screenRight.y = 0; // 移除畫面向右方向的垂直分量
    screenRight.normalize(); // 正規化目前畫面向右的地面方向
    screenUp.set(0, 1, 0).applyQuaternion(camera.quaternion); // 依旋轉後的鏡頭更新畫面向上方向
    screenUp.y = 0; // 移除畫面向上方向的垂直分量
    screenUp.normalize(); // 正規化目前畫面向上的地面方向
    renderer.render(scene, camera); // 由 p5.js 主迴圈呼叫 Three.js 繪製場景
  }, // 結束 p5.js 場景主迴圈更新
  orbitBy(deltaX, deltaY) { // 依滑鼠拖曳移動鏡頭方位與俯仰角
    targetAzimuth -= deltaX * 0.006; // 水平拖曳時環繞觀察目標旋轉攝影機
    targetPolar = THREE.MathUtils.clamp(targetPolar + deltaY * 0.006, THREE.MathUtils.degToRad(15), THREE.MathUtils.degToRad(75)); // 限制鏡頭最低仰角為水平線上方十五度
  }, // 結束滑鼠拖曳環繞
  setLanterns(enabled) { shadowGroup.visible = enabled; }, // 顯示或隱藏所有路燈群組
  setDestinationFromScreen, // 提供使用 Raycaster 將畫布點擊位置轉換成導航目標的函式
  goToStamp, // 提供 p5 標籤點擊後前往指定集章地點的路徑導航
  getStampScreenPosition, // 提供 p5 取得集章標籤的即時畫布座標
  getCharacterNameScreenPosition, // 提供 p5 取得角色姓名標籤的即時畫布座標
  setCharacterName, // 提供 p5 介面更新玩家角色名稱的入口
  getStampStatus() { return { stamps: stampPoints, description: currentDescription, complete: stampPoints.every((stamp) => stamp.collected) }; }, // 提供集章進度與說明狀態
  makeChibi, // 提供可重複建立自訂角色的函式
  setCharacterAppearance: applyCharacterAppearance, // 提供 p5 介面即時更新玩家外觀的入口
  animateWalk, // 提供可重複使用的正弦步態動畫函式
  setZoom(percent) { // 依照面板數值調整正交攝影機縮放
    const clampedPercent = Math.max(72, Math.min(132, percent)); // 限制縮放百分比在介面允許範圍
    targetZoom = clampedPercent / 100; // 將百分比換算成正交攝影機目標倍率並確保數值越大畫面越放大
  }, // 結束鏡頭縮放操作
  resetView() { // 將鏡頭重設至初始斜俯視角度
    currentPath.length = 0; // 停止目前的滑鼠點選自動導航
    target.set(0, 0, 0); // 將鏡頭跟隨目標重設回場景中心
    targetAzimuth = initialOrbit.theta; // 將水平方位角重設為初始視角
    targetPolar = initialOrbit.phi; // 將俯仰角重設為初始視角
    orbitAzimuth = initialOrbit.theta; // 立即還原攝影機水平方位角
    orbitPolar = initialOrbit.phi; // 立即還原攝影機俯仰角
    camera.position.copy(initialCameraPosition); // 還原鏡頭初始位置
    camera.zoom = 1; // 立即還原預設鏡頭倍率
    targetZoom = 1; // 清除尚未完成的縮放動畫目標
    camera.lookAt(target); // 重新將鏡頭對準場景中心
    screenRight.set(1, 0, 0).applyQuaternion(camera.quaternion); // 還原方向鍵的初始畫面向右基準
    screenRight.y = 0; // 移除畫面向右方向的垂直分量
    screenRight.normalize(); // 正規化初始畫面向右方向
    screenUp.set(0, 1, 0).applyQuaternion(camera.quaternion); // 還原方向鍵的初始畫面向上基準
    screenUp.y = 0; // 移除畫面向上方向的垂直分量
    screenUp.normalize(); // 正規化初始畫面向上方向
    camera.updateProjectionMatrix(); // 更新重設後的攝影機投影矩陣
  } // 結束鏡頭重設操作
}; // 結束提供給 p5.js 的場景操作介面

if (typeof window.createParkController !== "function") throw new Error("p5.js 場景控制器尚未載入"); // 明確回報缺少 p5.js 實例模式控制器
window.parkController = window.createParkController(window.parkScene); // 啟動以 p5.js draw 為主迴圈的浮島公園控制器
