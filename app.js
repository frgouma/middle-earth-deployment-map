const svg = document.getElementById("map");
const councilObject = document.getElementById("council-map");
const routeDefs = document.getElementById("route-defs");
const routesLayer = document.getElementById("routes-layer");
const markersLayer = document.getElementById("markers-layer");

const chapterSelect = document.getElementById("chapter-select");
const playStoryButton = document.getElementById("play-story");
const playPauseButton = document.getElementById("play-pause");
const stopPlaybackButton = document.getElementById("stop-playback");
const councilDownloadLink = document.getElementById("download-council-svg");
const waypointLog = document.getElementById("waypoint-log");
const undoWaypointButton = document.getElementById("undo-waypoint");
const clearWaypointsButton = document.getElementById("clear-waypoints");
const copyWaypointsButton = document.getElementById("copy-waypoints");

const MAP_WIDTH = 4266.6665;
const MAP_HEIGHT = 3200;
const VIEW_ASPECT = MAP_HEIGHT / MAP_WIDTH;
const MARKER_REFERENCE_WIDTH = 1250;
const COMPACT_LABEL_VIEW_WIDTH = 3000;
const CAMERA_POSITION_KEYFRAMES = 5;
const SUMMARY_CHAPTER_NUMBER = 13;
const EPILOGUE_STATE = "14";

const fullView = {
  x: 0,
  y: 0,
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
};

function centeredView(x, y, width) {
  const height = width * VIEW_ASPECT;
  return {
    x: x - width / 2,
    y: y - height / 2,
    width,
    height,
  };
}

function readSvgViewBox(root) {
  const baseView = root.viewBox?.baseVal;

  if (baseView && baseView.width > 0 && baseView.height > 0) {
    return {
      x: baseView.x,
      y: baseView.y,
      width: baseView.width,
      height: baseView.height,
    };
  }

  const values = (root.getAttribute("viewBox") || "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);

  if (
    values.length !== 4 ||
    !values.every(Number.isFinite) ||
    values[2] <= 0 ||
    values[3] <= 0
  ) return null;

  return {
    x: values[0],
    y: values[1],
    width: values[2],
    height: values[3],
  };
}

const locations = {
  1: {
    roman: "I",
    title: "The Council of CIT",
    x: 2069.5,
    y: 846.9,
    view: centeredView(2069.5, 846.9, 950),
  },
  2: {
    roman: "II",
    title: "Concerning Docker",
    x: 1095.9,
    y: 880.2,
    view: centeredView(1095.9, 880.2, 950),
  },
  3: {
    roman: "III",
    title: "An Unexpected Container",
    x: 3014.4,
    y: 2144.1,
    view: centeredView(3014.4, 2144.1, 950),
  },
  4: {
    roman: "IV",
    title: "The Grey Havens of Harbor",
    x: 748.2,
    y: 847.0,
    view: centeredView(748.2, 847.0, 950),
  },
  5: {
    roman: "V",
    title: "Riddles in the Cluster",
    x: 1303.4,
    y: 1018.9,
    view: centeredView(1303.4, 1018.9, 950),
  },
  6: {
    roman: "VI",
    title: "The Balrog of Database Connectivity",
    x: 1940.8,
    y: 1570.8,
    view: centeredView(1940.8, 1570.8, 950),
  },
  7: {
    roman: "VII",
    title: "The Entmoot of Migration Warnings",
    x: 2082.5,
    y: 1659.3,
    view: centeredView(2082.5, 1659.3, 950),
  },
  8: {
    roman: "VIII",
    title: "The Mines of Persistence",
    x: 1359.1,
    y: 2227.0,
    view: centeredView(1359.1, 2227.0, 950),
  },
  9: {
    roman: "IX",
    title: "A Long-expected Detour",
    x: 550.9,
    y: 522.7,
    view: centeredView(550.9, 522.7, 950),
  },
  10: {
    roman: "X",
    title: "The Two Containers",
    x: 3654.3,
    y: 1440.8,
    view: centeredView(3654.3, 1440.8, 950),
  },
  11: {
    roman: "XI",
    title: "A Short Cut to Kubernetes",
    x: 2303.5,
    y: 1932.7,
    view: centeredView(2303.5, 1932.7, 950),
  },
  12: {
    roman: "XII",
    title: "The Return of the Pod",
    x: 2694.5,
    y: 2213.3,
    view: centeredView(2694.5, 2213.3, 950),
  },
  13: {
    roman: "XIII",
    title: "The Last Stage",
    x: 1146.1,
    y: 560.1,
    view: centeredView(1146.1, 560.1, 950),
  },
};

const chapters = {
  1: {
    from: 1,
    to: 2,
    duration: 6000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 2069.5, y: 846.9 },
      { x: 1831.5, y: 838.8 },
      { x: 1751.6, y: 841.9 },
      { x: 1710.1, y: 808.7 },
      { x: 1671.8, y: 766.2 },
      { x: 1633.4, y: 699.8 },
      { x: 1588.8, y: 678.8 },
      { x: 1509.9, y: 670.5 },
      { x: 1471.5, y: 701.7 },
      { x: 1427.9, y: 739.0 },
      { x: 1432.1, y: 793.0 },
      { x: 1484.0, y: 815.8 },
      { x: 1525.5, y: 852.1 },
      { x: 1541.0, y: 881.2 },
      { x: 1547.3, y: 911.2 },
      { x: 1518.2, y: 940.3 },
      { x: 1452.8, y: 941.3 },
      { x: 1404.1, y: 939.3 },
      { x: 1380.2, y: 956.9 },
      { x: 1367.8, y: 991.1 },
      { x: 1353.2, y: 1023.3 },
      { x: 1337.7, y: 1065.8 },
      { x: 1286.8, y: 1073.1 },
      { x: 1245.3, y: 1071.0 },
      { x: 1174.8, y: 1033.7 },
      { x: 1143.7, y: 996.3 },
      { x: 1105.3, y: 956.9 },
      { x: 1085.6, y: 921.6 },
      { x: 1095.9, y: 880.2 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.35, width: 1450 },
      { progress: 0.70, width: 1380 },
      { progress: 1.00, width: 950 },
    ],
  },

  2: {
    from: 2,
    to: 3,
    duration: 7000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 1095.9, y: 880.2 },
     { x: 1162.9, y: 866.2 },
      { x: 1216.1, y: 858.7 },
      { x: 1249.8, y: 860.2 },
      { x: 1262.6, y: 901.4 },
      { x: 1288.8, y: 932.2 },
      { x: 1306.8, y: 964.4 },
      { x: 1339.0, y: 1015.4 },
      { x: 1369.0, y: 1077.6 },
      { x: 1364.5, y: 1169.0 },
      { x: 1367.5, y: 1229.7 },
      { x: 1414.0, y: 1252.2 },
      { x: 1506.2, y: 1237.2 },
      { x: 1549.7, y: 1250.7 },
      { x: 1554.9, y: 1293.5 },
      { x: 1620.1, y: 1318.9 },
      { x: 1678.6, y: 1325.7 },
      { x: 1720.6, y: 1310.7 },
      { x: 1730.3, y: 1302.5 },
      { x: 1744.6, y: 1320.4 },
      { x: 1783.6, y: 1310.7 },
      { x: 1839.0, y: 1286.7 },
      { x: 1902.0, y: 1283.7 },
      { x: 1938.7, y: 1302.5 },
      { x: 1986.0, y: 1298.7 },
      { x: 2048.9, y: 1321.2 },
      { x: 2133.6, y: 1324.2 },
      { x: 2171.9, y: 1334.0 },
      { x: 2201.1, y: 1351.2 },
      { x: 2236.3, y: 1365.4 },
      { x: 2260.3, y: 1362.4 },
      { x: 2285.8, y: 1369.2 },
      { x: 2312.0, y: 1366.7 },
      { x: 2359.3, y: 1353.2 },
      { x: 2383.2, y: 1331.4 },
      { x: 2456.7, y: 1289.5 },
      { x: 2491.9, y: 1313.4 },
      { x: 2527.2, y: 1359.9 },
      { x: 2537.7, y: 1425.9 },
      { x: 2548.9, y: 1455.1 },
      { x: 2544.4, y: 1517.3 },
      { x: 2525.7, y: 1545.8 },
      { x: 2495.7, y: 1577.3 },
      { x: 2497.9, y: 1584.8 },
      { x: 2513.7, y: 1617.8 },
      { x: 2496.4, y: 1635.8 },
      { x: 2476.9, y: 1652.3 },
      { x: 2477.7, y: 1673.3 },
      { x: 2491.9, y: 1681.7 },
      { x: 2512.9, y: 1692.9 },
      { x: 2521.2, y: 1723.7 },
      { x: 2512.9, y: 1756.7 },
      { x: 2504.7, y: 1782.9 },
      { x: 2497.2, y: 1824.1 },
      { x: 2502.4, y: 1854.9 },
      { x: 2514.4, y: 1890.1 },
      { x: 2535.4, y: 1911.1 },
      { x: 2545.2, y: 1929.8 },
      { x: 2543.7, y: 1952.3 },
      { x: 2563.1, y: 1998.9 },
      { x: 2574.4, y: 2030.4 },
      { x: 2591.6, y: 2056.0 },
      { x: 2611.9, y: 2082.3 },
      { x: 2635.1, y: 2099.5 },
      { x: 2684.6, y: 2120.5 },
      { x: 2719.1, y: 2125.7 },
      { x: 2736.3, y: 2137.7 },
      { x: 2749.8, y: 2153.5 },
      { x: 2760.3, y: 2195.5 },
      { x: 2758.8, y: 2214.2 },
      { x: 2773.0, y: 2225.4 },
      { x: 2800.8, y: 2226.9 },
      { x: 2833.7, y: 2233.7 },
      { x: 2877.2, y: 2234.4 },
      { x: 2941.7, y: 2219.4 },
      { x: 2994.9, y: 2200.7 },
      { x: 3012.2, y: 2182.0 },
      { x: 3014.4, y: 2144.1 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.20, width: 1550 },
      { progress: 0.45, width: 1750 },
      { progress: 0.72, width: 1700 },
      { progress: 1.00, width: 950 },
    ],
  },

  3: {
    from: 3,
    to: 4,
    duration: 9000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 3014.4, y: 2144.1 },
     { x: 3034.0, y: 2195.7 },
      { x: 3043.4, y: 2244.4 },
      { x: 3052.7, y: 2299.4 },
      { x: 3020.6, y: 2335.7 },
      { x: 2970.7, y: 2350.3 },
      { x: 2942.7, y: 2335.7 },
      { x: 2907.5, y: 2327.4 },
      { x: 2850.4, y: 2312.9 },
      { x: 2818.2, y: 2287.0 },
      { x: 2781.9, y: 2272.5 },
      { x: 2758.1, y: 2256.9 },
      { x: 2728.0, y: 2246.5 },
      { x: 2682.3, y: 2312.9 },
      { x: 2668.8, y: 2356.5 },
      { x: 2638.7, y: 2395.9 },
      { x: 2617.0, y: 2438.5 },
      { x: 2573.4, y: 2461.3 },
      { x: 2511.1, y: 2467.5 },
      { x: 2464.4, y: 2491.4 },
      { x: 2429.2, y: 2490.3 },
      { x: 2387.7, y: 2472.7 },
      { x: 2364.8, y: 2435.3 },
      { x: 2320.2, y: 2462.3 },
      { x: 2290.1, y: 2463.4 },
      { x: 2228.9, y: 2470.6 },
      { x: 2199.9, y: 2460.2 },
      { x: 2169.8, y: 2437.4 },
      { x: 2145.9, y: 2412.1 },
      { x: 2109.6, y: 2391.3 },
      { x: 2078.5, y: 2332.2 },
      { x: 2081.6, y: 2252.3 },
      { x: 2089.9, y: 2213.9 },
      { x: 2101.3, y: 2179.7 },
      { x: 2103.4, y: 2098.0 },
      { x: 2104.4, y: 2054.4 },
      { x: 2103.4, y: 2006.7 },
      { x: 2077.3, y: 1958.7 },
      { x: 2052.6, y: 1935.4 },
      { x: 1982.7, y: 1935.4 },
      { x: 1892.1, y: 1968.3 },
      { x: 1822.1, y: 1987.5 },
      { x: 1625.1, y: 1956.5 },
      { x: 1538.0, y: 1978.3 },
      { x: 1438.2, y: 1907.5 },
      { x: 1396.5, y: 1840.4 },
      { x: 1358.4, y: 1722.5 },
      { x: 1382.0, y: 1651.3 },
      { x: 1507.2, y: 1544.3 },
      { x: 1498.1, y: 1475.3 },
      { x: 1460.0, y: 1413.6 },
      { x: 1421.9, y: 1399.1 },
      { x: 1291.3, y: 1371.5 },
      { x: 1209.6, y: 1358.8 },
      { x: 1149.7, y: 1339.9 },
      { x: 1086.2, y: 1318.1 },
      { x: 941.0, y: 1300.0 },
      { x: 870.3, y: 1319.9 },
      { x: 777.7, y: 1334.5 },
      { x: 750.5, y: 1277.1 },
      { x: 716.0, y: 1153.0 },
      { x: 685.2, y: 1114.5 },
      { x: 685.2, y: 1052.4 },
      { x: 708.8, y: 946.8 },
      { x: 741.4, y: 906.9 },
      { x: 748.2, y: 847.0 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.16, width: 1550 },
      { progress: 0.36, width: 1800 },
      { progress: 0.56, width: 1900 },
      { progress: 0.76, width: 1750 },
      { progress: 0.90, width: 1450 },
      { progress: 1.00, width: 950 },
    ],
  },

  4: {
    from: 4,
    to: 5,
    duration: 4000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 748.2, y: 847.0 },
      { x: 850, y: 730 },
      { x: 1020, y: 760 },
      { x: 1170, y: 900 },
      { x: 1303.4, y: 1018.9 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.28, width: 1400 },
      { progress: 0.58, width: 1400 },
      { progress: 0.82, width: 1325 },
      { progress: 1.00, width: 950 },
    ],
  },

  5: {
    from: 5,
    to: 6,
    duration: 6000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 1305.5, y: 1018.6 },
      { x: 1227.6, y: 1038.2 },
      { x: 1110.4, y: 1068.2 },
      { x: 993.2, y: 1081.0 },
      { x: 969.3, y: 1087.0 },
      { x: 924.8, y: 1134.9 },
      { x: 913.8, y: 1206.7 },
      { x: 965.9, y: 1255.5 },
      { x: 1035.2, y: 1231.5 },
      { x: 1089.9, y: 1163.1 },
      { x: 1150.7, y: 1158.0 },
      { x: 1223.4, y: 1222.1 },
      { x: 1255.9, y: 1289.7 },
      { x: 1287.6, y: 1312.8 },
      { x: 1323.5, y: 1336.7 },
      { x: 1349.2, y: 1349.6 },
      { x: 1403.9, y: 1361.5 },
      { x: 1427.8, y: 1364.1 },
      { x: 1438.2, y: 1353.8 },
      { x: 1450.2, y: 1341.0 },
      { x: 1480.1, y: 1322.2 },
      { x: 1498.1, y: 1300.8 },
      { x: 1528.9, y: 1305.9 },
      { x: 1566.5, y: 1328.2 },
      { x: 1566.5, y: 1381.2 },
      { x: 1575.1, y: 1411.1 },
      { x: 1575.1, y: 1459.0 },
      { x: 1574.2, y: 1565.9 },
      { x: 1568.2, y: 1632.7 },
      { x: 1570.8, y: 1678.8 },
      { x: 1579.6, y: 1691.6 },
      { x: 1599.1, y: 1746.2 },
      { x: 1630.3, y: 1767.0 },
      { x: 1665.5, y: 1764.4 },
      { x: 1751.3, y: 1788.6 },
      { x: 1770.8, y: 1688.4 },
      { x: 1815.1, y: 1641.6 },
      { x: 1845.1, y: 1637.7 },
      { x: 1880.2, y: 1627.3 },
      { x: 1912.8, y: 1620.8 },
      { x: 1940.1, y: 1605.2 },
      { x: 1940.8, y: 1570.8},

    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.28, width: 1400 },
      { progress: 0.58, width: 1400 },
      { progress: 0.82, width: 1325 },
      { progress: 1.00, width: 950 },
    ],
  },

  6: {
    from: 6,
    to: 7,
    duration: 7000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 1941.4, y: 1570.1 },
      { x: 1940.0, y: 1540.4 },
      { x: 1947.9, y: 1502.0 },
      { x: 1957.0, y: 1453.3 },
      { x: 1975.1, y: 1385.5 },
      { x: 1983.0, y: 1360.6 },
      { x: 1992.1, y: 1328.9 },
      { x: 1988.7, y: 1276.9 },
      { x: 1977.3, y: 1230.5 },
      { x: 1974.0, y: 1188.7 },
      { x: 1996.6, y: 1154.7 },
      { x: 2047.5, y: 1149.1 },
      { x: 2095.1, y: 1150.2 },
      { x: 2127.9, y: 1144.5 },
      { x: 2144.9, y: 1091.4 },
      { x: 2163.7, y: 1052.3 },
      { x: 2197.5, y: 1048.4 },
      { x: 2209.3, y: 1036.7 },
      { x: 2260.0, y: 1013.2 },
      { x: 2301.8, y: 1004.1 },
      { x: 2321.3, y: 1027.6 },
      { x: 2340.8, y: 1028.9 },
      { x: 2353.9, y: 1025.0 },
      { x: 2378.6, y: 1052.3 },
      { x: 2392.9, y: 1069.2 },
      { x: 2392.9, y: 1087.4 },
      { x: 2395.5, y: 1108.2 },
      { x: 2398.1, y: 1138.1 },
      { x: 2382.5, y: 1160.2 },
      { x: 2381.2, y: 1184.9 },
      { x: 2351.3, y: 1208.4 },
      { x: 2314.9, y: 1248.7 },
      { x: 2324.0, y: 1270.8 },
      { x: 2308.4, y: 1295.5 },
      { x: 2287.5, y: 1315.0 },
      { x: 2278.4, y: 1355.4 },
      { x: 2281.1, y: 1384.0 },
      { x: 2291.5, y: 1428.2 },
      { x: 2303.2, y: 1443.8 },
      { x: 2324.1, y: 1443.8 },
      { x: 2346.2, y: 1449.0 },
      { x: 2367.0, y: 1469.8 },
      { x: 2381.3, y: 1486.7 },
      { x: 2407.3, y: 1502.3 },
      { x: 2432.0, y: 1506.2 },
      { x: 2438.5, y: 1518.0 },
      { x: 2429.4, y: 1538.8 },
      { x: 2421.6, y: 1558.3 },
      { x: 2421.6, y: 1575.2 },
      { x: 2413.8, y: 1594.7 },
      { x: 2399.5, y: 1623.3 },
      { x: 2356.6, y: 1624.6 },
      { x: 2312.3, y: 1640.2 },
      { x: 2242.1, y: 1688.4 },
      { x: 2196.6, y: 1722.2 },
      { x: 2169.3, y: 1715.7 },
      { x: 2152.3, y: 1707.9 },
      { x: 2115.9, y: 1694.9 },
      { x: 2082.1, y: 1661.0 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.28, width: 1400 },
      { progress: 0.58, width: 1400 },
      { progress: 0.82, width: 1325 },
      { progress: 1.00, width: 950 },
    ],
  },
  7: {
    from: 7,
    to: 8,
    duration: 7000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 2080.1, y: 1666.5 },
      { x: 2055.5, y: 1682.2 },
      { x: 2024.1, y: 1706.8 },
      { x: 2000.4, y: 1722.5 },
      { x: 1976.8, y: 1733.3 },
      { x: 1970.9, y: 1759.9 },
      { x: 1943.4, y: 1778.6 },
      { x: 1932.6, y: 1797.3 },
      { x: 1904.1, y: 1848.4 },
      { x: 1882.4, y: 1866.1 },
      { x: 1868.6, y: 1870.1 },
      { x: 1843.1, y: 1874.0 },
      { x: 1818.5, y: 1875.0 },
      { x: 1811.6, y: 1875.0 },
      { x: 1794.9, y: 1871.0 },
      { x: 1780.1, y: 1875.0 },
      { x: 1767.3, y: 1866.1 },
      { x: 1758.5, y: 1860.2 },
      { x: 1743.7, y: 1858.3 },
      { x: 1732.9, y: 1863.2 },
      { x: 1721.1, y: 1863.2 },
      { x: 1705.4, y: 1879.9 },
      { x: 1646.4, y: 1873.0 },
      { x: 1624.7, y: 1875.0 },
      { x: 1610.9, y: 1865.1 },
      { x: 1607.0, y: 1876.0 },
      { x: 1588.3, y: 1887.8 },
      { x: 1582.4, y: 1907.4 },
      { x: 1581.4, y: 1914.3 },
      { x: 1574.5, y: 1938.9 },
      { x: 1569.6, y: 1956.6 },
      { x: 1548.0, y: 1994.0 },
      { x: 1524.4, y: 2046.1 },
      { x: 1499.8, y: 2086.5 },
      { x: 1499.8, y: 2107.1 },
      { x: 1500.8, y: 2155.3 },
      { x: 1502.7, y: 2191.7 },
      { x: 1488.0, y: 2197.6 },
      { x: 1474.2, y: 2209.4 },
      { x: 1465.4, y: 2226.1 },
      { x: 1448.7, y: 2249.7 },
      { x: 1451.6, y: 2266.4 },
      { x: 1448.7, y: 2279.2 },
      { x: 1432.9, y: 2284.2 },
      { x: 1420.1, y: 2296.0 },
      { x: 1395.5, y: 2301.9 },
      { x: 1375.9, y: 2299.9 },
      { x: 1348.3, y: 2298.9 },
      { x: 1324.7, y: 2306.8 },
      { x: 1294.2, y: 2309.7 },
      { x: 1274.5, y: 2297.9 },
      { x: 1277.4, y: 2277.3 },
      { x: 1290.2, y: 2267.4 },
      { x: 1317.8, y: 2256.6 },
      { x: 1338.4, y: 2246.8 },
      { x: 1361.0, y: 2227.1 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.28, width: 1400 },
      { progress: 0.58, width: 1400 },
      { progress: 0.82, width: 1325 },
      { progress: 1.00, width: 950 },
    ],
  },
  8: {
    from: 8,
    to: 9,
    duration: 6000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 1358.5, y: 2225.9 },
      { x: 1346.1, y: 2155.8 },
      { x: 1331.4, y: 2103.8 },
      { x: 1318.9, y: 2049.5 },
      { x: 1309.9, y: 1995.2 },
      { x: 1286.1, y: 1901.3 },
      { x: 1260.1, y: 1810.8 },
      { x: 1249.9, y: 1748.6 },
      { x: 1204.7, y: 1695.4 },
      { x: 1136.7, y: 1704.5 },
      { x: 1082.5, y: 1732.8 },
      { x: 1023.6, y: 1726.0 },
      { x: 1014.6, y: 1714.7 },
      { x: 1006.7, y: 1687.5 },
      { x: 1007.8, y: 1650.2 },
      { x: 1022.5, y: 1598.1 },
      { x: 1008.9, y: 1521.2 },
      { x: 996.5, y: 1479.4 },
      { x: 949.0, y: 1428.5 },
      { x: 870.9, y: 1403.6 },
      { x: 655.7, y: 1379.8 },
      { x: 617.3, y: 1347.0 },
      { x: 586.7, y: 1265.6 },
      { x: 531.1, y: 1126.7 },
      { x: 528.9, y: 1071.8 },
      { x: 544.3, y: 1025.7 },
      { x: 588.2, y: 990.5 },
      { x: 623.4, y: 981.7 },
      { x: 680.5, y: 929.0 },
      { x: 669.5, y: 885.1 },
      { x: 654.1, y: 874.1 },
      { x: 581.7, y: 869.7 },
      { x: 504.8, y: 856.6 },
      { x: 463.1, y: 828.0 },
      { x: 432.3, y: 795.1 },
      { x: 359.8, y: 766.5 },
      { x: 346.6, y: 727.0 },
      { x: 355.4, y: 683.0 },
      { x: 379.6, y: 630.3 },
      { x: 399.4, y: 593.0 },
      { x: 452.1, y: 562.3 },
      { x: 485.0, y: 540.3 },
      { x: 561.9, y: 524.9 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.28, width: 1400 },
      { progress: 0.58, width: 1400 },
      { progress: 0.82, width: 1325 },
      { progress: 1.00, width: 950 },
    ]
  },
  9: {
    from: 9,
    to: 10,
    duration: 10000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 557.5, y: 535.9 },
      { x: 557.5, y: 478.8 },
      { x: 572.9, y: 439.3 },
      { x: 588.2, y: 417.3 },
      { x: 603.6, y: 386.5 },
      { x: 632.2, y: 338.2 },
      { x: 656.3, y: 294.3 },
      { x: 702.4, y: 250.4 },
      { x: 739.8, y: 232.8 },
      { x: 792.5, y: 210.8 },
      { x: 836.4, y: 177.9 },
      { x: 876.0, y: 208.6 },
      { x: 897.9, y: 221.8 },
      { x: 906.7, y: 261.4 },
      { x: 970.4, y: 257.0 },
      { x: 1009.9, y: 250.4 },
      { x: 1049.5, y: 248.2 },
      { x: 1100.0, y: 261.4 },
      { x: 1121.9, y: 235.0 },
      { x: 1146.1, y: 237.2 },
      { x: 1247.1, y: 235.0 },
      { x: 1295.4, y: 215.2 },
      { x: 1396.5, y: 210.8 },
      { x: 1444.8, y: 193.3 },
      { x: 1576.6, y: 191.1 },
      { x: 1618.3, y: 188.9 },
      { x: 1708.4, y: 195.5 },
      { x: 1829.1, y: 257.0 },
      { x: 1899.4, y: 263.6 },
      { x: 1928.0, y: 283.3 },
      { x: 1985.1, y: 294.3 },
      { x: 2037.8, y: 318.5 },
      { x: 2064.2, y: 366.8 },
      { x: 2147.6, y: 382.2 },
      { x: 2239.9, y: 380.0 },
      { x: 2305.7, y: 384.4 },
      { x: 2327.7, y: 408.5 },
      { x: 2384.8, y: 472.2 },
      { x: 2472.7, y: 518.3 },
      { x: 2536.4, y: 573.2 },
      { x: 2615.4, y: 595.2 },
      { x: 2703.3, y: 615.0 },
      { x: 2694.5, y: 628.1 },
      { x: 2661.5, y: 663.3 },
      { x: 2661.5, y: 696.2 },
      { x: 2681.3, y: 711.6 },
      { x: 2709.9, y: 709.4 },
      { x: 2764.8, y: 722.6 },
      { x: 2819.7, y: 733.6 },
      { x: 2854.8, y: 738.0 },
      { x: 2890.0, y: 801.6 },
      { x: 2942.7, y: 860.9 },
      { x: 2993.2, y: 882.9 },
      { x: 3004.2, y: 926.8 },
      { x: 3041.5, y: 1065.2 },
      { x: 3135.9, y: 1234.3 },
      { x: 3217.2, y: 1473.7 },
      { x: 3278.7, y: 1594.5 },
      { x: 3276.5, y: 1822.9 },
      { x: 3368.7, y: 1833.9 },
      { x: 3507.1, y: 1825.1 },
      { x: 3579.6, y: 1811.9 },
      { x: 3748.7, y: 1702.1 },
      { x: 3759.7, y: 1647.2 },
      { x: 3748.7, y: 1598.9 },
      { x: 3685.0, y: 1566.0 },
      { x: 3669.6, y: 1530.8 },
      { x: 3658.7, y: 1495.7 },
      { x: 3656.5, y: 1443.0 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.28, width: 1400 },
      { progress: 0.58, width: 1400 },
      { progress: 0.82, width: 1325 },
      { progress: 1.00, width: 950 },
    ],
  },
  10: {
    from: 10,
    to: 11,
    duration: 6000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 3656.5, y: 1447.4 },
      { x: 3603.8, y: 1399.0 },
      { x: 3557.6, y: 1399.0 },
      { x: 3450.0, y: 1412.2 },
      { x: 3390.7, y: 1467.1 },
      { x: 3377.5, y: 1511.1 },
      { x: 3373.1, y: 1594.5 },
      { x: 3289.7, y: 1699.9 },
      { x: 3228.2, y: 1726.3 },
      { x: 3114.0, y: 1706.5 },
      { x: 3030.5, y: 1699.9 },
      { x: 2896.5, y: 1691.1 },
      { x: 2815.3, y: 1673.6 },
      { x: 2742.8, y: 1671.4 },
      { x: 2655.0, y: 1695.5 },
      { x: 2615.4, y: 1717.5 },
      { x: 2571.5, y: 1748.2 },
      { x: 2525.4, y: 1796.6 },
      { x: 2492.4, y: 1842.7 },
      { x: 2466.1, y: 1851.5 },
      { x: 2428.7, y: 1860.3 },
      { x: 2378.2, y: 1869.0 },
      { x: 2329.9, y: 1871.2 },
      { x: 2297.0, y: 1895.4 },
      { x: 2303.5, y: 1934.9 },
    ],
    cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.28, width: 1400 },
      { progress: 0.58, width: 1400 },
      { progress: 0.82, width: 1325 },
      { progress: 1.00, width: 950 },
    ],
  },
  11: {
    from: 11,
    to: 12,
    duration: 5000,
    curveTension: 0.5,
    routeWaypoints: [
      { x: 2304.4, y: 1932.2 },
      { x: 2300.5, y: 1954.2 },
      { x: 2301.5, y: 1976.2 },
      { x: 2311.2, y: 2018.7 },
      { x: 2318.1, y: 2030.5 },
      { x: 2333.8, y: 2036.8 },
      { x: 2370.5, y: 2042.2 },
      { x: 2423.3, y: 2064.2 },
      { x: 2477.1, y: 2077.9 },
      { x: 2507.4, y: 2080.3 },
      { x: 2546.0, y: 2085.2 },
      { x: 2589.5, y: 2092.1 },
      { x: 2600.3, y: 2134.6 },
      { x: 2600.8, y: 2181.1 },
      { x: 2630.1, y: 2195.7 },
      { x: 2651.2, y: 2207.5 },
      { x: 2697.1, y: 2215.8 },
    ],
     cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.28, width: 1400 },
      { progress: 0.58, width: 1400 },
      { progress: 0.82, width: 1325 },
      { progress: 1.00, width: 950 },
    ],
  },
  12: {
    from: 12,
    to: 13,
    duration: 10000,
    curveTension: 0.10,
    routeWaypoints: [
      { x: 2696.2, y: 2219.3 },
      { x: 2733.8, y: 2169.8 },
      { x: 2783.2, y: 2175.7 },
      { x: 2807.0, y: 2140.1 },
      { x: 2809.0, y: 2090.7 },
      { x: 2810.9, y: 2029.3 },
      { x: 2824.8, y: 1948.2 },
      { x: 2913.8, y: 1952.2 },
      { x: 3012.7, y: 1950.2 },
      { x: 3091.9, y: 1968.0 },
      { x: 3167.0, y: 1966.0 },
      { x: 3204.6, y: 1839.4 },
      { x: 3194.7, y: 1675.2 },
      { x: 3173.0, y: 1499.1 },
      { x: 3173.0, y: 1269.6 },
      { x: 3167.0, y: 1111.4 },
      { x: 3174.9, y: 986.7 },
      { x: 2927.3, y: 962.0 },
      { x: 2907.5, y: 887.3 },
      { x: 2857.0, y: 878.5 },
      { x: 2786.7, y: 865.3 },
      { x: 2729.6, y: 847.8 },
      { x: 2633.0, y: 834.6 },
      { x: 2534.2, y: 810.4 },
      { x: 2477.1, y: 812.6 },
      { x: 2444.1, y: 810.4 },
      { x: 2343.1, y: 795.1 },
      { x: 2286.0, y: 812.6 },
      { x: 2217.9, y: 817.0 },
      { x: 2112.5, y: 812.6 },
      { x: 2057.6, y: 768.7 },
      { x: 1960.9, y: 713.8 },
      { x: 1877.5, y: 680.9 },
      { x: 1818.2, y: 630.3 },
      { x: 1693.0, y: 586.4 },
      { x: 1541.4, y: 531.5 },
      { x: 1447.0, y: 476.6 },
      { x: 1308.6, y: 434.9 },
      { x: 1255.9, y: 419.5 },
      { x: 1104.4, y: 415.1 },
      { x: 1153.0, y: 561.9 },
    ],
     cameraZoom: [
      { progress: 0.00, width: 950 },
      { progress: 0.28, width: 1400 },
      { progress: 0.58, width: 1400 },
      { progress: 0.82, width: 1325 },
      { progress: 1.00, width: 950 },
    ],
  },
  13: {
    scene: "summary",
  },
};

const navigationOrder = [
  "intro",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
];

const timing = {
  introHold: 2500,
  introZoom: 2000,
  markerReveal: 850,
  startHold: 900,
  overviewToStart: 1400,
  summaryInitialHold: 1500,
  summaryOverview: 4000,
  summaryRouteStartHold: 500,
  summaryJourneyRedraw: 12000,
  summaryFinalHold: 1000,
};

const councilTiming = {
  crossfade: 2200,
  regionMove: 2200,
  clusterHold: 1000,
  finalOverview: 2000,
  questReveal: 900,
  finalHold: 1500,
};

const COUNCIL_TARGET_KEYS = [
  "local-preparation",
  "publishing-kubernetes",
  "live-application",
  "persistent-state",
];
const COUNCIL_TARGET_PADDING = 90;
const COUNCIL_MIN_ZOOM_SCALE = 0.08;
const DRAG_THRESHOLD = 3;

const markerElements = new Map();
const routeElements = new Map();

let compactLabelsActive = null;

let selectedState = "intro";
let view = { ...fullView };
let drag = null;
let waypoints = [];

let animationRun = 0;
let currentFrameId = null;
let currentAnimationResolve = null;
let isAnimating = false;
let isPaused = false;
let isStoryPlaying = false;
let browseOverview = true;

let councilDocument = null;
let councilSvg = null;
let councilFullView = null;
let councilView = null;
let councilQuestRoute = null;
let councilQuestLabel = null;
let councilReadySettled = false;
let resolveCouncilReady;
let councilDrag = null;
let councilInteractionRoot = null;
let suppressCouncilClick = false;

const councilReady = new Promise((resolve) => {
  resolveCouncilReady = resolve;
});

function settleCouncilReady(ready) {
  if (councilReadySettled) return;
  councilReadySettled = true;
  resolveCouncilReady(ready);
}

function initializeCouncilScene() {
  try {
    const documentNode = councilObject.contentDocument;
    const root = documentNode?.documentElement;

    if (!root || root.localName !== "svg") return false;

    const fullView = readSvgViewBox(root);
    if (!fullView) return false;

    councilDocument = documentNode;
    councilSvg = root;
    councilFullView = fullView;
    councilView = { ...fullView };
    councilQuestRoute = councilDocument.querySelector(
      '[data-route-id="quest"]'
    );
    councilQuestLabel = councilDocument.querySelector(
      '[data-route-label-id="quest"]'
    );

    applyCouncilView();
    setCouncilQuestVisible(false);
    installCouncilInteractions();
    return true;
  } catch {
    return false;
  }
}

councilObject.addEventListener("load", () => {
  const ready = initializeCouncilScene();
  settleCouncilReady(ready);

  if (
    ready &&
    selectedState === EPILOGUE_STATE &&
    browseOverview &&
    !isAnimating
  ) {
    renderEpilogueOverview();
  }
});

councilObject.addEventListener("error", () => {
  settleCouncilReady(false);
});

window.setTimeout(() => {
  if (!councilReadySettled && initializeCouncilScene()) {
    settleCouncilReady(true);
  }
}, 0);

window.setTimeout(() => {
  settleCouncilReady(false);
}, 5000);

function stateIsChapter(state) {
  return /^(?:[1-9]|1[0-3])$/.test(String(state));
}

function chapterUsesCouncilScene(chapterNumber) {
  return String(chapterNumber) === EPILOGUE_STATE;
}

function chapterUsesSummaryScene(chapterNumber) {
  return chapters[chapterNumber]?.scene === "summary";
}

function normalizeState(value) {
  const stringValue = String(value ?? "");
  if (stringValue === "all") return String(SUMMARY_CHAPTER_NUMBER);
  return navigationOrder.includes(stringValue) ? stringValue : "intro";
}

function readInitialState() {
  const params = new URLSearchParams(window.location.search);
  const chapter = normalizeState(params.get("chapter"));
  const playParam = params.get("play");
  const play = playParam === "true";
  const playStoryFromUrl = playParam === "story";

  return { chapter, play, playStoryFromUrl };
}

function setUrlState(chapter, play, mode = "replace") {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("chapter", String(chapter));
    url.searchParams.set("play", play ? "true" : "false");

    if (mode === "push") {
      history.pushState({ chapter, play }, "", url);
    } else {
      history.replaceState({ chapter, play }, "", url);
    }
  } catch {
    // History API may be restricted for some local file URLs.
  }
}

function markerScale() {
  return view.width / MARKER_REFERENCE_WIDTH;
}

function setBackdropBounds(backdrop, bbox) {
  const padX = 5;
  const padY = 3;

  backdrop.setAttribute("x", String(bbox.x - padX));
  backdrop.setAttribute("y", String(bbox.y - padY));
  backdrop.setAttribute("width", String(bbox.width + padX * 2));
  backdrop.setAttribute("height", String(bbox.height + padY * 2));
}

function updateMarkerLabels(force = false) {
  const compact = view.width >= COMPACT_LABEL_VIEW_WIDTH;

  if (!force && compact === compactLabelsActive) return;
  compactLabelsActive = compact;

  for (const marker of markerElements.values()) {
    marker.label.textContent = compact
      ? marker.compactText
      : marker.fullText;

    setBackdropBounds(
      marker.backdrop,
      compact ? marker.compactBounds : marker.fullBounds
    );
  }
}

function updateMarkerScales() {
  const scale = markerScale();

  for (const [locationNumber, marker] of markerElements.entries()) {
    const location = locations[locationNumber];
    marker.group.setAttribute(
      "transform",
      `translate(${location.x} ${location.y}) scale(${scale})`
    );
  }
}

function applyView() {
  svg.setAttribute(
    "viewBox",
    `${view.x} ${view.y} ${view.width} ${view.height}`
  );
  updateMarkerScales();
  updateMarkerLabels();
}

function applyCouncilView() {
  if (!councilSvg || !councilView) return;

  councilSvg.setAttribute(
    "viewBox",
    `${councilView.x} ${councilView.y} ` +
      `${councilView.width} ${councilView.height}`
  );
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(value, maximum));
}

function constrainCouncilView(candidate) {
  if (!councilFullView) return candidate;

  const full = councilFullView;
  const aspect = full.height / full.width;
  const minimumWidth = full.width * COUNCIL_MIN_ZOOM_SCALE;
  const width = clamp(candidate.width, minimumWidth, full.width);
  const height = width * aspect;

  return {
    x: clamp(candidate.x, full.x, full.x + full.width - width),
    y: clamp(candidate.y, full.y, full.y + full.height - height),
    width,
    height,
  };
}

function councilPointFromClient(clientX, clientY) {
  const point = councilSvg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(councilSvg.getScreenCTM().inverse());
}

function zoomCouncilAtPoint(point, factor) {
  councilView = constrainCouncilView({
    x: point.x - (point.x - councilView.x) * factor,
    y: point.y - (point.y - councilView.y) * factor,
    width: councilView.width * factor,
    height: councilView.height * factor,
  });
  applyCouncilView();
}

function councilInteractionAllowed() {
  return (
    selectedState === EPILOGUE_STATE &&
    !isAnimating &&
    councilObject.style.pointerEvents !== "none"
  );
}

function installCouncilInteractions() {
  if (!councilSvg || councilInteractionRoot === councilSvg) return;

  councilInteractionRoot = councilSvg;

  councilSvg.addEventListener(
    "wheel",
    (event) => {
      if (!councilInteractionAllowed()) return;

      event.preventDefault();
      zoomCouncilAtPoint(
        councilPointFromClient(event.clientX, event.clientY),
        event.deltaY < 0 ? 0.85 : 1.15
      );
    },
    { passive: false }
  );

  councilSvg.addEventListener("pointerdown", (event) => {
    if (!councilInteractionAllowed()) return;

    councilDrag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startViewX: councilView.x,
      startViewY: councilView.y,
      moved: false,
    };
  });

  councilSvg.addEventListener("pointermove", (event) => {
    if (!councilDrag || councilDrag.pointerId !== event.pointerId) return;

    const dx = event.clientX - councilDrag.x;
    const dy = event.clientY - councilDrag.y;

    if (
      !councilDrag.moved &&
      (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)
    ) {
      councilDrag.moved = true;
      councilSvg.setPointerCapture(event.pointerId);
    }

    if (!councilDrag.moved) return;

    const rect = councilSvg.getBoundingClientRect();
    councilView = constrainCouncilView({
      x: councilDrag.startViewX - dx * (councilView.width / rect.width),
      y: councilDrag.startViewY - dy * (councilView.height / rect.height),
      width: councilView.width,
      height: councilView.height,
    });
    councilSvg.style.cursor = "grabbing";
    event.preventDefault();
    applyCouncilView();
  });

  function endCouncilDrag(event) {
    if (!councilDrag || councilDrag.pointerId !== event.pointerId) return;

    const wasMoved = councilDrag.moved;
    councilDrag = null;
    councilSvg.style.cursor = "";

    if (councilSvg.hasPointerCapture(event.pointerId)) {
      councilSvg.releasePointerCapture(event.pointerId);
    }

    if (wasMoved && event.type === "pointerup") {
      suppressCouncilClick = true;
      window.setTimeout(() => {
        suppressCouncilClick = false;
      }, 0);
    }
  }

  councilSvg.addEventListener("pointerup", endCouncilDrag);
  councilSvg.addEventListener("pointercancel", endCouncilDrag);

  councilSvg.addEventListener(
    "click",
    (event) => {
      if (!suppressCouncilClick) return;
      suppressCouncilClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );
}

function resetCouncilDrag() {
  if (councilDrag && councilSvg?.hasPointerCapture(councilDrag.pointerId)) {
    councilSvg.releasePointerCapture(councilDrag.pointerId);
  }

  councilDrag = null;
  suppressCouncilClick = false;

  if (councilSvg) councilSvg.style.cursor = "";
}

function setSceneOpacities(middleEarthOpacity, councilOpacity) {
  svg.style.opacity = String(middleEarthOpacity);
  councilObject.style.opacity = String(councilOpacity);
}

function setCouncilDownloadVisible(visible) {
  councilDownloadLink.hidden = !visible;
}

function showMiddleEarthScene() {
  resetCouncilDrag();
  setCouncilDownloadVisible(false);
  setSceneOpacities(1, 0);
  svg.style.pointerEvents = "auto";
  councilObject.style.pointerEvents = "none";
  svg.setAttribute("aria-hidden", "false");
  councilObject.setAttribute("aria-hidden", "true");
}

function showCouncilScene(interactive = true) {
  setCouncilDownloadVisible(true);
  setSceneOpacities(0, 1);
  svg.style.pointerEvents = "none";
  councilObject.style.pointerEvents = interactive ? "auto" : "none";
  svg.setAttribute("aria-hidden", "true");
  councilObject.setAttribute("aria-hidden", "false");
}

function showSceneCrossfade(progress) {
  setCouncilDownloadVisible(false);
  setSceneOpacities(1 - progress, progress);
  svg.style.pointerEvents = "none";
  councilObject.style.pointerEvents = "none";
  svg.setAttribute("aria-hidden", "false");
  councilObject.setAttribute("aria-hidden", "false");
}

function setCouncilQuestVisible(visible) {
  if (councilQuestRoute) {
    councilQuestRoute.style.opacity = visible ? "1" : "0";
  }

  if (councilQuestLabel) {
    councilQuestLabel.classList.toggle("route-label-visible", visible);
    councilQuestLabel.style.display = visible ? "inline" : "";
    councilQuestLabel.style.opacity = visible ? "1" : "0";
  }
}

function councilViewForBounds(bounds) {
  const full = councilFullView;
  const aspect = full.height / full.width;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  let width = bounds.width + COUNCIL_TARGET_PADDING * 2;
  let height = bounds.height + COUNCIL_TARGET_PADDING * 2;

  if (height / width < aspect) {
    height = width * aspect;
  } else {
    width = height / aspect;
  }

  width = Math.min(width, full.width);
  height = Math.min(height, full.height);

  const maxX = full.x + full.width - width;
  const maxY = full.y + full.height - height;

  return {
    x: Math.max(full.x, Math.min(centerX - width / 2, maxX)),
    y: Math.max(full.y, Math.min(centerY - height / 2, maxY)),
    width,
    height,
  };
}

function councilTargetViews() {
  if (!councilDocument || !councilFullView) return null;

  const targets = [];

  for (const key of COUNCIL_TARGET_KEYS) {
    const group = councilDocument.querySelector(
      `.cluster-fill[data-element-id="${key}"]`
    );

    if (!group) return null;

    const bounds = group.getBBox();
    if (!(bounds.width > 0 && bounds.height > 0)) return null;

    targets.push(councilViewForBounds(bounds));
  }

  return targets;
}

function formatWaypoint(point) {
  return `{ x: ${point.x.toFixed(1)}, y: ${point.y.toFixed(1)} },`;
}

function renderWaypointLog() {
  waypointLog.value = waypoints.map(formatWaypoint).join("\n");
  waypointLog.scrollTop = waypointLog.scrollHeight;

  undoWaypointButton.disabled = waypoints.length === 0;
  clearWaypointsButton.disabled = waypoints.length === 0;
  copyWaypointsButton.disabled = waypoints.length === 0;
}

function addWaypoint(point) {
  waypoints.push({
    x: Number(point.x.toFixed(1)),
    y: Number(point.y.toFixed(1)),
  });
  renderWaypointLog();
}

function undoWaypoint() {
  if (waypoints.length === 0) return;
  waypoints.pop();
  renderWaypointLog();
}

function clearWaypoints() {
  waypoints = [];
  renderWaypointLog();
}

async function copyWaypoints() {
  if (waypoints.length === 0) return;

  const text = waypoints.map(formatWaypoint).join("\n");
  let copied = false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
  }

  if (!copied) {
    waypointLog.focus();
    waypointLog.select();

    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }

    window.getSelection()?.removeAllRanges();
  }

  const originalText = copyWaypointsButton.textContent;
  copyWaypointsButton.textContent = copied ? "Copied" : "Select";
  window.setTimeout(() => {
    copyWaypointsButton.textContent = originalText;
  }, 1000);
}

function svgPointFromClient(clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}

function easeInOut(t) {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function interpolateView(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    width: a.width + (b.width - a.width) * t,
    height: a.height + (b.height - a.height) * t,
  };
}

function animateProgress(duration, onProgress, runId) {
  return new Promise((resolve) => {
    let elapsed = 0;
    let lastTime = performance.now();

    function finish(completed) {
      if (currentAnimationResolve === finish) {
        currentAnimationResolve = null;
      }
      resolve(completed);
    }

    currentAnimationResolve = finish;

    function frame(now) {
      if (runId !== animationRun) {
        currentFrameId = null;
        finish(false);
        return;
      }

      if (isPaused) {
        lastTime = now;
        currentFrameId = requestAnimationFrame(frame);
        return;
      }

      elapsed += now - lastTime;
      lastTime = now;

      const progress = Math.min(elapsed / duration, 1);
      onProgress(progress);

      if (progress < 1) {
        currentFrameId = requestAnimationFrame(frame);
      } else {
        currentFrameId = null;
        finish(true);
      }
    }

    currentFrameId = requestAnimationFrame(frame);
  });
}

function wait(duration, runId) {
  return animateProgress(duration, () => {}, runId);
}

function animateViewTo(target, duration, runId) {
  const start = { ...view };

  return animateProgress(
    duration,
    (progress) => {
      view = interpolateView(start, target, easeInOut(progress));
      applyView();
    },
    runId
  );
}

function animateCouncilViewTo(target, duration, runId) {
  const start = { ...councilView };

  return animateProgress(
    duration,
    (progress) => {
      councilView = interpolateView(start, target, easeInOut(progress));
      applyCouncilView();
    },
    runId
  );
}

function crossfadeToCouncil(runId) {
  return animateProgress(
    councilTiming.crossfade,
    (progress) => {
      showSceneCrossfade(easeInOut(progress));
    },
    runId
  );
}

async function revealCouncilQuest(runId) {
  if (!councilQuestRoute || !councilQuestLabel) return false;

  councilQuestRoute.style.opacity = "0";
  councilQuestLabel.classList.add("route-label-visible");
  councilQuestLabel.style.display = "inline";
  councilQuestLabel.style.opacity = "0";

  const revealed = await animateProgress(
    councilTiming.questReveal,
    (progress) => {
      const opacity = String(easeInOut(progress));
      councilQuestRoute.style.opacity = opacity;
      councilQuestLabel.style.opacity = opacity;
    },
    runId
  );

  if (!revealed) return false;

  setCouncilQuestVisible(true);
  return wait(councilTiming.finalHold, runId);
}

function zoomAtSvgPoint(point, factor) {
  const nextView = {
    x: point.x - (point.x - view.x) * factor,
    y: point.y - (point.y - view.y) * factor,
    width: view.width * factor,
    height: view.height * factor,
  };

  // This helper is used only by the manual wheel handler. Snap the outward
  // limit to the canonical overview rather than preserving a shifted viewBox.
  view = nextView.width >= fullView.width
    ? { ...fullView }
    : nextView;
  applyView();
}

function splinePath(points, tension) {
  if (points.length < 2) return "";

  const d = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const c1x = p1.x + (p2.x - p0.x) * tension;
    const c1y = p1.y + (p2.y - p0.y) * tension;
    const c2x = p2.x - (p3.x - p1.x) * tension;
    const c2y = p2.y - (p3.y - p1.y) * tension;

    d.push(
      `C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
    );
  }

  return d.join(" ");
}

function chapterHasRoute(chapter) {
  return (
    Array.isArray(chapter?.routeWaypoints) &&
    chapter.routeWaypoints.length >= 2 &&
    Array.isArray(chapter.cameraZoom) &&
    chapter.cameraZoom.length > 0
  );
}

function buildMarkers() {
  for (const [key, location] of Object.entries(locations)) {
    const locationNumber = Number(key);

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("chapter-marker");
    group.dataset.location = String(locationNumber);

    const backdrop = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    backdrop.classList.add("label-backdrop");
    backdrop.setAttribute("rx", "4");
    backdrop.setAttribute("ry", "4");

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.classList.add("anchor-dot");
    dot.setAttribute("cx", "0");
    dot.setAttribute("cy", "0");
    dot.setAttribute("r", "6");

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.classList.add("chapter-label");
    label.setAttribute("x", "14");
    label.setAttribute("y", "6");

    const fullText = `${location.roman} · ${location.title}`;
    const compactText = location.roman;

    label.textContent = fullText;
    group.append(backdrop, dot, label);
    markersLayer.appendChild(group);

    const fullBounds = label.getBBox();
    label.textContent = compactText;
    const compactBounds = label.getBBox();
    label.textContent = fullText;

    markerElements.set(locationNumber, {
      group,
      backdrop,
      label,
      fullText,
      compactText,
      fullBounds,
      compactBounds,
    });

    group.addEventListener("pointerenter", () => {
      if (!compactLabelsActive) return;

      label.textContent = fullText;
      setBackdropBounds(backdrop, fullBounds);
    });

    group.addEventListener("pointerleave", () => {
      if (!compactLabelsActive) return;

      label.textContent = compactText;
      setBackdropBounds(backdrop, compactBounds);
    });
  }

  updateMarkerLabels(true);
}

function buildRoutes() {
  for (const [key, chapter] of Object.entries(chapters)) {
    if (!chapterHasRoute(chapter)) continue;

    const chapterNumber = Number(key);
    const pathData = splinePath(
      chapter.routeWaypoints,
      chapter.curveTension
    );

    const maskId = `route-mask-${chapterNumber}`;

    const mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");
    mask.setAttribute("id", maskId);
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    mask.setAttribute("x", "0");
    mask.setAttribute("y", "0");
    mask.setAttribute("width", String(MAP_WIDTH));
    mask.setAttribute("height", String(MAP_HEIGHT));

    const blackRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    blackRect.setAttribute("x", "0");
    blackRect.setAttribute("y", "0");
    blackRect.setAttribute("width", String(MAP_WIDTH));
    blackRect.setAttribute("height", String(MAP_HEIGHT));
    blackRect.setAttribute("fill", "black");

    const reveal = document.createElementNS("http://www.w3.org/2000/svg", "path");
    reveal.classList.add("route-reveal-path");
    reveal.setAttribute("d", pathData);

    mask.append(blackRect, reveal);
    routeDefs.appendChild(mask);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("journey-path");
    path.setAttribute("d", pathData);
    path.setAttribute("mask", `url(#${maskId})`);
    routesLayer.appendChild(path);

    const length = reveal.getTotalLength();
    reveal.style.strokeDasharray = `${length}`;
    reveal.style.strokeDashoffset = `${length}`;

    routeElements.set(chapterNumber, {
      path,
      reveal,
      length,
    });
  }
}

function setMarkerVisible(locationNumber, visible) {
  const marker = markerElements.get(locationNumber);
  if (!marker) return;
  marker.group.style.display = visible ? "" : "none";
}

function setMarkerOpacity(locationNumber, opacity) {
  const marker = markerElements.get(locationNumber);
  if (!marker) return;
  marker.group.style.opacity = String(opacity);
}

function setRouteState(chapterNumber, state) {
  const route = routeElements.get(chapterNumber);
  if (!route) return;

  if (state === "hidden") {
    route.path.style.display = "none";
    route.reveal.style.strokeDashoffset = `${route.length}`;
  } else {
    route.path.style.display = "";
    route.reveal.style.strokeDashoffset =
      state === "complete" ? "0" : `${route.length}`;
  }
}

function renderIntroductionStart() {
  showMiddleEarthScene();

  for (const number of Object.keys(locations).map(Number)) {
    setMarkerVisible(number, false);
  }

  for (const number of routeElements.keys()) {
    setRouteState(number, "hidden");
  }

  view = { ...fullView };
  chapterSelect.value = "intro";
  applyView();
}

function renderChapterStart(chapterNumber, fullMap) {
  const chapter = chapters[chapterNumber];

  showMiddleEarthScene();

  for (const number of Object.keys(locations).map(Number)) {
    setMarkerVisible(number, number <= chapter.from);
    setMarkerOpacity(number, 1);
  }

  for (const number of routeElements.keys()) {
    setRouteState(
      number,
      number < chapterNumber ? "complete" : "hidden"
    );
  }

  view = fullMap
    ? { ...fullView }
    : { ...locations[chapter.from].view };

  chapterSelect.value = String(chapterNumber);
  applyView();
}

function renderChapterComplete(chapterNumber) {
  const chapter = chapters[chapterNumber];
  if (!chapter || !chapterHasRoute(chapter)) return;

  renderChapterStart(chapterNumber, false);
  setRouteState(chapterNumber, "complete");
  setMarkerVisible(chapter.to, true);
  setMarkerOpacity(chapter.to, 1);
  view = { ...locations[chapter.to].view };
  applyView();
}

function renderCompletedMiddleEarth(targetView, selectedValue) {
  showMiddleEarthScene();

  for (const number of Object.keys(locations).map(Number)) {
    setMarkerVisible(number, true);
    setMarkerOpacity(number, 1);
  }

  for (const number of routeElements.keys()) {
    setRouteState(number, "complete");
  }

  view = { ...targetView };
  chapterSelect.value = selectedValue;
  applyView();
}

function renderSummaryStart() {
  renderCompletedMiddleEarth(
    locations[SUMMARY_CHAPTER_NUMBER].view,
    String(SUMMARY_CHAPTER_NUMBER)
  );
}

function renderSummaryOverview() {
  renderCompletedMiddleEarth(
    fullView,
    String(SUMMARY_CHAPTER_NUMBER)
  );
}

function renderCompleteJourney() {
  renderCompletedMiddleEarth(fullView, "all");
}

function resetCouncilEpilogue() {
  if (!councilFullView) return;

  councilView = { ...councilFullView };
  applyCouncilView();
  setCouncilQuestVisible(false);
}

function renderEpilogueStart() {
  chapterSelect.value = EPILOGUE_STATE;
  resetCouncilEpilogue();
  showMiddleEarthScene();
}

function renderEpilogueOverview() {
  chapterSelect.value = EPILOGUE_STATE;

  if (councilSvg && councilFullView) {
    councilView = { ...councilFullView };
    applyCouncilView();
    setCouncilQuestVisible(true);
    showCouncilScene();
    return;
  }

  showMiddleEarthScene();
  const renderRun = animationRun;

  councilReady.then((ready) => {
    if (
      !ready ||
      renderRun !== animationRun ||
      selectedState !== EPILOGUE_STATE ||
      isAnimating
    ) return;

    councilView = { ...councilFullView };
    applyCouncilView();
    setCouncilQuestVisible(true);
    showCouncilScene();
  });
}

function renderSelectedStart(fullMap) {
  if (selectedState === "intro") {
    renderIntroductionStart();
    return;
  }

  if (selectedState === "all") {
    renderCompleteJourney();
    return;
  }

  if (chapterUsesCouncilScene(Number(selectedState))) {
    if (fullMap) {
      renderEpilogueOverview();
    } else {
      renderEpilogueStart();
    }
    return;
  }

  if (chapterUsesSummaryScene(Number(selectedState))) {
    if (fullMap) {
      renderSummaryOverview();
    } else {
      renderSummaryStart();
    }
    return;
  }

  renderChapterStart(Number(selectedState), fullMap);
}

function cancelPlayback() {
  const restoreSummaryOverview =
    isAnimating && chapterUsesSummaryScene(Number(selectedState));

  animationRun += 1;

  if (currentFrameId) {
    cancelAnimationFrame(currentFrameId);
  }

  currentFrameId = null;

  if (currentAnimationResolve) {
    const resolveAnimation = currentAnimationResolve;
    currentAnimationResolve = null;
    resolveAnimation(false);
  }

  isAnimating = false;
  isPaused = false;
  isStoryPlaying = false;

  if (restoreSummaryOverview) {
    renderSummaryOverview();
    browseOverview = true;
  }
}

function stopPlayback() {
  if (!isAnimating) return;

  const stoppedState = selectedState;
  cancelPlayback();

  if (stoppedState === "intro") {
    renderIntroductionStart();
    view = { ...locations[1].view };
    setMarkerVisible(1, true);
    setMarkerOpacity(1, 1);
    applyView();
    browseOverview = false;
  } else if (chapterUsesCouncilScene(Number(stoppedState))) {
    renderEpilogueOverview();
    browseOverview = true;
  } else if (chapterUsesSummaryScene(Number(stoppedState))) {
    renderSummaryOverview();
    browseOverview = true;
  } else if (stateIsChapter(stoppedState)) {
    renderChapterComplete(Number(stoppedState));
    browseOverview = false;
  }

  setUrlState(stoppedState, false, "replace");
  updateControls();
}

function updateControls() {
  chapterSelect.disabled = isAnimating && !isPaused;
  playStoryButton.disabled = isAnimating;
  stopPlaybackButton.disabled = !isAnimating;

  if (selectedState === "all" && !isStoryPlaying) {
    playPauseButton.disabled = true;
    playPauseButton.textContent = "▶";
    playPauseButton.setAttribute("aria-label", "Play");
    playPauseButton.title = "Play";
    return;
  }

  playPauseButton.disabled = false;

  if (isAnimating && isPaused) {
    playPauseButton.textContent = "▶";
    playPauseButton.setAttribute(
      "aria-label",
      isStoryPlaying ? "Resume story" : "Resume"
    );
    playPauseButton.title = isStoryPlaying ? "Resume story" : "Resume";
  } else if (isAnimating) {
    playPauseButton.textContent = "⏸";
    playPauseButton.setAttribute(
      "aria-label",
      isStoryPlaying ? "Pause story" : "Pause"
    );
    playPauseButton.title = isStoryPlaying ? "Pause story" : "Pause";
  } else {
    playPauseButton.textContent = "▶";
    playPauseButton.setAttribute("aria-label", "Play");
    playPauseButton.title = "Play";
  }
}

function cameraWidthForProgress(chapter, progress) {
  const frames = chapter.cameraZoom;

  if (progress <= frames[0].progress) {
    return frames[0].width;
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    const current = frames[i];
    const next = frames[i + 1];

    if (progress <= next.progress) {
      const localProgress =
        (progress - current.progress) /
        (next.progress - current.progress);

      return current.width +
        (next.width - current.width) * easeInOut(localProgress);
    }
  }

  return frames[frames.length - 1].width;
}

function cameraPositionFramesForChapter(chapterNumber) {
  const route = routeElements.get(chapterNumber);
  const frames = [];

  // Five representative camera positions across the complete rendered route.
  // The red line may contain dozens of detailed waypoints, but the camera only
  // reacts to these few broad positions.
  for (let i = 0; i < CAMERA_POSITION_KEYFRAMES; i += 1) {
    const progress = i / (CAMERA_POSITION_KEYFRAMES - 1);
    const point = route.path.getPointAtLength(route.length * progress);

    frames.push({
      progress,
      x: point.x,
      y: point.y,
    });
  }

  return frames;
}

function cameraCenterForProgress(frames, progress) {
  if (progress <= frames[0].progress) {
    return { x: frames[0].x, y: frames[0].y };
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    const current = frames[i];
    const next = frames[i + 1];

    if (progress <= next.progress) {
      const localProgress =
        (progress - current.progress) /
        (next.progress - current.progress);

      const eased = easeInOut(localProgress);

      return {
        x: current.x + (next.x - current.x) * eased,
        y: current.y + (next.y - current.y) * eased,
      };
    }
  }

  const last = frames[frames.length - 1];
  return { x: last.x, y: last.y };
}

function cameraViewForProgress(chapterNumber, progress, positionFrames) {
  const chapter = chapters[chapterNumber];
  const center = cameraCenterForProgress(positionFrames, progress);
  const width = cameraWidthForProgress(chapter, progress);

  return centeredView(center.x, center.y, width);
}

function revealMarker(locationNumber, runId) {
  setMarkerVisible(locationNumber, true);
  setMarkerOpacity(locationNumber, 0);

  return animateProgress(
    timing.markerReveal,
    (progress) => {
      setMarkerOpacity(locationNumber, easeInOut(progress));
    },
    runId
  );
}

function animateRoute(chapterNumber, runId) {
  const chapter = chapters[chapterNumber];
  const route = routeElements.get(chapterNumber);
  const cameraPositionFrames =
    cameraPositionFramesForChapter(chapterNumber);

  route.path.style.display = "";
  route.reveal.style.strokeDashoffset = `${route.length}`;

  return animateProgress(
    chapter.duration,
    (progress) => {
      route.reveal.style.strokeDashoffset =
        `${route.length * (1 - progress)}`;

      view = cameraViewForProgress(
        chapterNumber,
        progress,
        cameraPositionFrames
      );
      applyView();
    },
    runId
  );
}

async function playIntroduction(runId) {
  renderIntroductionStart();

  if (!(await wait(timing.introHold, runId))) return false;
  if (!(await animateViewTo(
    locations[1].view,
    timing.introZoom,
    runId
  ))) return false;
  if (!(await revealMarker(1, runId))) return false;

  return true;
}

async function playChapter(chapterNumber, runId, startFromOverview) {
  const chapter = chapters[chapterNumber];

  renderChapterStart(chapterNumber, startFromOverview);

  if (!chapterHasRoute(chapter)) return false;

  const startLocation = locations[chapter.from];

  if (startFromOverview) {
    if (!(await animateViewTo(
      startLocation.view,
      timing.overviewToStart,
      runId
    ))) return false;
  }

  if (!(await wait(timing.startHold, runId))) return false;
  if (!(await animateRoute(chapterNumber, runId))) return false;

  // The route has arrived. Only now reveal the next chapter marker,
  // then leave the map at the destination for free interaction.
  if (!(await revealMarker(chapter.to, runId))) return false;

  return true;
}

async function redrawCompleteJourney(routeNumbers, runId) {
  const routes = routeNumbers.map((chapterNumber) =>
    routeElements.get(chapterNumber)
  );
  const totalLength = routes.reduce(
    (sum, route) => sum + route.length,
    0
  );

  for (const route of routes) {
    route.path.style.display = "";
    route.reveal.style.strokeDashoffset = `${route.length}`;
  }

  const completed = await animateProgress(
    timing.summaryJourneyRedraw,
    (progress) => {
      let remainingDistance = totalLength * progress;

      for (const route of routes) {
        const revealedLength = Math.min(
          route.length,
          Math.max(0, remainingDistance)
        );

        route.reveal.style.strokeDashoffset =
          `${route.length - revealedLength}`;
        remainingDistance -= route.length;
      }
    },
    runId
  );

  if (!completed) return false;

  for (const chapterNumber of routeNumbers) {
    setRouteState(chapterNumber, "complete");
  }

  return true;
}

async function playSummary(runId) {
  renderSummaryStart();

  if (!(await wait(timing.summaryInitialHold, runId))) return false;

  const routeNumbers = [...routeElements.keys()].sort((a, b) => a - b);

  for (const chapterNumber of routeNumbers) {
    setRouteState(chapterNumber, "hidden");
  }

  if (!(await animateViewTo(
    fullView,
    timing.summaryOverview,
    runId
  ))) return false;

  if (!(await wait(timing.summaryRouteStartHold, runId))) return false;
  if (!(await redrawCompleteJourney(routeNumbers, runId))) return false;

  return wait(timing.summaryFinalHold, runId);
}

async function playEpilogue(runId) {
  renderEpilogueStart();

  const ready = councilSvg ? true : await councilReady;
  if (runId !== animationRun) return false;

  const targets = ready ? councilTargetViews() : null;
  if (
    !targets ||
    !councilQuestRoute ||
    !councilQuestLabel
  ) {
    showMiddleEarthScene();
    return false;
  }

  resetCouncilEpilogue();

  if (!(await crossfadeToCouncil(runId))) return false;
  showCouncilScene(false);

  for (const target of targets) {
    if (!(await animateCouncilViewTo(
      target,
      councilTiming.regionMove,
      runId
    ))) return false;

    if (!(await wait(councilTiming.clusterHold, runId))) return false;
  }

  if (!(await animateCouncilViewTo(
    councilFullView,
    councilTiming.finalOverview,
    runId
  ))) return false;

  if (!(await revealCouncilQuest(runId))) return false;

  showCouncilScene();
  return true;
}

function playChapterState(chapterNumber, runId, startFromOverview) {
  if (chapterUsesCouncilScene(chapterNumber)) {
    return playEpilogue(runId);
  }

  if (chapterUsesSummaryScene(chapterNumber)) {
    return playSummary(runId);
  }

  return playChapter(chapterNumber, runId, startFromOverview);
}

async function playSelected({ startFromOverview = false } = {}) {
  if (isAnimating || selectedState === "all") return;
  if (
    selectedState !== "intro" &&
    !chapterUsesCouncilScene(Number(selectedState)) &&
    !chapterUsesSummaryScene(Number(selectedState)) &&
    !chapterHasRoute(chapters[Number(selectedState)])
  ) return;

  cancelPlayback();
  isAnimating = true;
  isPaused = false;
  isStoryPlaying = false;
  browseOverview = false;

  const runId = ++animationRun;
  setUrlState(selectedState, true, "replace");
  updateControls();

  let completed = false;

  if (selectedState === "intro") {
    completed = await playIntroduction(runId);
  } else {
    completed = await playChapterState(
      Number(selectedState),
      runId,
      startFromOverview
    );
  }

  if (!completed || runId !== animationRun) {
    if (runId === animationRun) {
      isAnimating = false;
      isPaused = false;
      isStoryPlaying = false;
      updateControls();
    }
    return;
  }

  isAnimating = false;
  isPaused = false;
  browseOverview =
    chapterUsesCouncilScene(Number(selectedState)) ||
    chapterUsesSummaryScene(Number(selectedState));
  updateControls();
}


async function playStory() {
  if (isAnimating) return;

  cancelPlayback();

  isAnimating = true;
  isPaused = false;
  isStoryPlaying = true;
  browseOverview = false;

  const runId = ++animationRun;

  selectedState = "intro";
  chapterSelect.value = "intro";
  setUrlState("intro", true, "push");
  updateControls();

  let completed = await playIntroduction(runId);
  if (!completed || runId !== animationRun) return;

  for (const chapterNumber of Object.keys(chapters).map(Number)) {
    selectedState = String(chapterNumber);
    chapterSelect.value = selectedState;
    setUrlState(selectedState, true, "replace");
    updateControls();

    completed = await playChapterState(chapterNumber, runId, false);
    if (!completed || runId !== animationRun) {
      if (runId === animationRun) {
        isAnimating = false;
        isPaused = false;
        isStoryPlaying = false;
        updateControls();
      }
      return;
    }
  }

  selectedState = EPILOGUE_STATE;
  chapterSelect.value = EPILOGUE_STATE;
  setUrlState(selectedState, true, "replace");
  updateControls();

  completed = await playEpilogue(runId);
  if (!completed || runId !== animationRun) {
    if (runId === animationRun) {
      isAnimating = false;
      isPaused = false;
      isStoryPlaying = false;
      updateControls();
    }
    return;
  }

  browseOverview = true;
  isAnimating = false;
  isPaused = false;
  isStoryPlaying = false;

  setUrlState(selectedState, false, "replace");
  updateControls();
}

function selectForBrowsing(state, pushUrl = true) {
  if (isAnimating) return;

  cancelPlayback();
  selectedState = normalizeState(state);
  browseOverview = true;

  renderSelectedStart(true);
  setUrlState(
    selectedState,
    false,
    pushUrl ? "push" : "replace"
  );
  updateControls();
}

function selectAndAutoplay(state) {
  if (isAnimating && !isPaused) return;

  cancelPlayback();
  selectedState = normalizeState(state);

  if (selectedState === "all") {
    browseOverview = true;
    renderCompleteJourney();
    setUrlState("all", false, "push");
    updateControls();
    return;
  }

  browseOverview = false;
  renderSelectedStart(false);
  setUrlState(selectedState, true, "push");
  updateControls();

  playSelected({ startFromOverview: false });
}

function togglePlayPause() {
  if (selectedState === "all") return;

  if (isAnimating) {
    isPaused = !isPaused;
    updateControls();
    return;
  }

  playSelected({
    startFromOverview: browseOverview && selectedState !== "intro",
  });
}

playStoryButton.addEventListener("click", playStory);
playPauseButton.addEventListener("click", togglePlayPause);
stopPlaybackButton.addEventListener("click", stopPlayback);

chapterSelect.addEventListener("change", () => {
  selectAndAutoplay(chapterSelect.value);
});

window.addEventListener("popstate", () => {
  cancelPlayback();

  const state = readInitialState();

  if (state.playStoryFromUrl) {
    playStory();
    return;
  }

  selectedState = state.chapter;

  if (state.play && selectedState !== "all") {
    browseOverview = false;
    renderSelectedStart(false);
    updateControls();
    playSelected({ startFromOverview: false });
  } else {
    browseOverview = true;
    renderSelectedStart(true);
    updateControls();
  }
});

svg.addEventListener(
  "wheel",
  (event) => {
    if (isAnimating) return;

    event.preventDefault();
    const point = svgPointFromClient(event.clientX, event.clientY);
    zoomAtSvgPoint(point, event.deltaY < 0 ? 0.85 : 1.15);
  },
  { passive: false }
);

svg.addEventListener("pointerdown", (event) => {
  if (isAnimating) return;

  drag = {
    x: event.clientX,
    y: event.clientY,
    startViewX: view.x,
    startViewY: view.y,
    moved: false,
  };

  svg.setPointerCapture(event.pointerId);
  svg.classList.add("dragging");
});

svg.addEventListener("pointermove", (event) => {
  if (!drag) return;

  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;

  if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
    drag.moved = true;
  }

  const rect = svg.getBoundingClientRect();

  view.x = clamp(
    drag.startViewX - dx * (view.width / rect.width),
    fullView.x,
    fullView.x + fullView.width - view.width
  );

  view.y = clamp(
    drag.startViewY - dy * (view.height / rect.height),
    fullView.y,
    fullView.y + fullView.height - view.height
  );

  applyView();
});

function endDrag(event) {
  if (!drag) return;

  const wasMoved = drag.moved;
  drag = null;

  if (svg.hasPointerCapture(event.pointerId)) {
    svg.releasePointerCapture(event.pointerId);
  }

  svg.classList.remove("dragging");

  if (!wasMoved) {
    const point = svgPointFromClient(event.clientX, event.clientY);
    addWaypoint(point);
  }
}

svg.addEventListener("pointerup", endDrag);
svg.addEventListener("pointercancel", endDrag);


undoWaypointButton.addEventListener("click", undoWaypoint);
clearWaypointsButton.addEventListener("click", clearWaypoints);
copyWaypointsButton.addEventListener("click", copyWaypoints);

renderWaypointLog();

buildMarkers();
buildRoutes();

const initialState = readInitialState();

if (initialState.playStoryFromUrl) {
  playStory();
} else {
  selectedState = initialState.chapter;

  if (initialState.play && selectedState !== "all") {
    browseOverview = false;
    renderSelectedStart(false);
    setUrlState(selectedState, true, "replace");
    updateControls();
    playSelected({ startFromOverview: false });
  } else {
    browseOverview = true;
    renderSelectedStart(true);
    setUrlState(
      selectedState,
      selectedState === "all" ? false : initialState.play,
      "replace"
    );
    updateControls();
  }
}
