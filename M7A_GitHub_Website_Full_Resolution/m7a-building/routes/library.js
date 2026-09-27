// Library-only tour data. Global scene indices: 23–46.
// Edit this file for Library links, bearings, checkpoint names, and panorama files.

export const PANORAMAS=[
  "library-entrance-018.glb",
  "library-lobby-019.glb",
  "library-study-020.glb",
  "library-study-021.glb",
  "library-study-022.glb",
  "library-study-023.glb",
  "library-study-024.glb",
  "library-study-025.glb",
  "library-study-026.glb",
  "library-study-027.glb",
  "library-study-028.glb",
  "library-study-029.glb",
  "library-corridor-030.glb",
  "library-corridor-031.glb",
  "library-corridor-032.glb",
  "library-corridor-033.glb",
  "library-corridor-034.glb",
  "library-corridor-036.glb",
  "library-corridor-037.glb",
  "library-corridor-038.glb",
  "library-corridor-039.glb",
  "library-corridor-040.glb",
  "library-corridor-041.glb",
  "library-corridor-035.glb"
];

// Only scenes that had explicit calibration in the original file are listed.
// Missing entries intentionally fall back to [1,1,1] in the viewer.
export const VISUAL_CALIBRATION=[
  [
    1,
    1,
    1
  ],
  [
    1,
    1,
    1
  ]
];

export const LOCATIONS=[
  {
    id: "library-entrance-018",
    area: "Library",
    name: "Entrance",
    back: 11,
    view: 3.14,
    routes: [
      {
        to: 11,
        angle: 6.15,
        arrowAngle: 6.15,
        back: true
      },
      {
        to: 24,
        angle: 3.14,
        arrowAngle: 3.14
      }
    ]
  },
  {
    id: "library-lobby-019",
    area: "Library",
    name: "Lobby",
    back: 23,
    view: 3.14,
    routes: [
      {
        to: 23,
        angle: 5.64,
        arrowAngle: 5.64,
        back: true
      },
      {
        to: 25,
        angle: 3.14,
        arrowAngle: 3.14
      }
    ]
  },
  {
    id: "library-study-020",
    area: "Library",
    name: "Study Area 1",
    centerArrival: true,
    back: 24,
    view: 3.14,
    routes: [
      {
        "to": 38,
        "angle": 1.64,
        "arrowAngle": 1.64,
        "hotspotAngle": 1.64,
        "hotspotDistance": 1.05,
        "arrivalAngle": 3.45,
        "departureAngle": 1.64
      },
      {
        to: 24,
        angle: 0,
        arrowAngle: 0,
        back: true
      },
      {
        to: 26,
        arrivalAngle: 3.0,
        departureAngle: 3.14,
        angle: 3.14,
        arrowAngle: 3.14
      },
      {
        to: 32,
        angle: -1.57,
        arrowAngle: -1.57
      }
    ]
  },
  {
    id: "library-study-021",
    area: "Library",
    name: "Study Area 2",
    centerArrival: true,
    back: 25,
    view: 3.0,
    routes: [
      {
        to: 25,
        arrivalAngle: 0,
        departureAngle: 6.17,
        angle: 0,
        arrowAngle: 6.17,
        back: true,
        hotspotAngle: 6.17,
        hotspotDistance: 1.02
      },
      {
        to: 27,
        arrivalAngle: 3.01,
        departureAngle: 3.0,
        angle: 3.14,
        arrowAngle: 3.0,
        hotspotAngle: 3.0,
        hotspotDistance: 1.05
      }
    ]
  },
  {
    id: "library-study-022",
    area: "Library",
    name: "Study Area 3",
    centerArrival: true,
    back: 26,
    view: 3.01,
    routes: [
      {
        to: 26,
        arrivalAngle: 6.17,
        departureAngle: 6.17,
        angle: 0,
        arrowAngle: 0,
        back: true,
        hotspotAngle: 6.17
      },
      {
        to: 28,
        arrivalAngle: 3.35,
        departureAngle: 3.01,
        angle: 3.14,
        arrowAngle: 3.01,
        hotspotAngle: 3.01,
        hotspotDistance: 1.02
      }
    ]
  },
  {
    id: "library-study-023",
    area: "Library",
    name: "Study Area 4",
    centerArrival: true,
    back: 27,
    view: 3.35,
    routes: [
      {
        to: 27,
        arrivalAngle: 6.17,
        departureAngle: 0.28,
        angle: 0,
        arrowAngle: 0.28,
        back: true,
        hotspotAngle: 0.28
      },
      {
        to: 29,
        arrivalAngle: 3.8,
        departureAngle: 3.35,
        angle: 3.14,
        arrowAngle: 3.35,
        hotspotAngle: 3.35,
        hotspotDistance: 1.02
      }
    ]
  },
  {
    id: "library-study-024",
    area: "Library",
    name: "Study Area 5",
    centerArrival: true,
    back: 28,
    view: 3.8,
    routes: [
      {
        to: 28,
        arrivalAngle: 0.28,
        departureAngle: 0.62,
        angle: 0,
        arrowAngle: 0.6,
        back: true,
        hotspotAngle: 0.62
      },
      {
        to: 30,
        arrivalAngle: 2.62,
        departureAngle: 3.8,
        angle: 3.14,
        arrowAngle: 3.8,
        hotspotAngle: 3.8,
        hotspotDistance: 1.08
      }
    ]
  },
  {
    id: "library-study-025",
    area: "Library",
    name: "Study Area 6",
    centerArrival: true,
    back: 29,
    view: 2.62,
    routes: [
      {
        to: 29,
        arrivalAngle: 0.62,
        departureAngle: 5.85,
        angle: 0,
        arrowAngle: 5.85,
        back: true,
        hotspotAngle: 5.85,
        hotspotDistance: 1.2
      },
      {
        to: 31,
        arrivalAngle: 2.85,
        departureAngle: 2.62,
        angle: 3.14,
        arrowAngle: 2.62,
        hotspotAngle: 2.62,
        hotspotDistance: 1.02
      }
    ]
  },
  {
    id: "library-study-026",
    area: "Library",
    name: "Study Area 7",
    centerArrival: true,
    back: 30,
    view: 2.85,
    routes: [
      {
        to: 30,
        arrivalAngle: 5.85,
        departureAngle: 6.05,
        angle: 0,
        arrowAngle: 6.05,
        back: true,
        hotspotAngle: 6.05,
        hotspotDistance: 1.2
      }
    ]
  },
  {
    id: "library-study-027",
    area: "Library",
    name: "Study Area 8",
    centerArrival: true,
    back: 25,
    view: 4.08,
    routes: [
      {
        to: 25,
        angle: 2.15,
        arrowAngle: 1.92,
        back: true,
        hotspotAngle: 1.92
      },
      {
        to: 33,
        angle: 4.08,
        arrowAngle: 4.08
      }
    ]
  },
  {
    id: "library-study-028",
    area: "Library",
    name: "Study Area 9",
    back: 32,
    view: 4.43,
    routes: [
      {
        to: 32,
        angle: 2.26,
        arrowAngle: 2.26,
        back: true
      },
      {
        to: 34,
        angle: 4.15,
        arrowAngle: 4.43,
        hotspotAngle: 4.55
      }
    ]
  },
  {
    id: "library-study-029",
    area: "Library",
    name: "Study Area 10",
    back: 33,
    view: 2.15,
    routes: [
      {
        "to": 35,
        "angle": 4.43,
        "arrowAngle": 4.43,
        "hotspotAngle": 4.43,
        "hotspotDistance": 1.05,
        "arrivalAngle": 3.34,
        "departureAngle": 4.43
      },
      {
        to: 33,
        angle: 1.95,
        arrowAngle: 2.15,
        back: true,
        hotspotAngle: 2.22
      }
    ]
  },
  {
    "id": "library-corridor-030",
    "area": "Library",
    "name": "Glass-Room Corridor · 30",
    "centerArrival": true,
    "back": 34,
    "view": 3.34,
    "routes": [
      {
        "to": 34,
        "angle": 0.17,
        "arrowAngle": 0.17,
        "hotspotAngle": 0.17,
        "hotspotDistance": 1.05,
        "arrivalAngle": 2.15,
        "departureAngle": 0.17,
        "back": true
      },
      {
        "to": 36,
        "angle": 3.34,
        "arrowAngle": 3.34,
        "hotspotAngle": 3.34,
        "hotspotDistance": 1.05,
        "arrivalAngle": 3.03,
        "departureAngle": 3.34
      }
    ]
  },
  {
    "id": "library-corridor-031",
    "area": "Library",
    "name": "Glass-Room Corridor · 31",
    "centerArrival": true,
    "back": 35,
    "view": 3.03,
    "routes": [
      {
        "to": 35,
        "angle": 0.83,
        "arrowAngle": 0.83,
        "hotspotAngle": 0.83,
        "hotspotDistance": 1.05,
        "arrivalAngle": 0.17,
        "departureAngle": 0.83,
        "back": true
      },
      {
        "to": 37,
        "angle": 3.03,
        "arrowAngle": 3.03,
        "hotspotAngle": 3.03,
        "hotspotDistance": 1.05,
        "arrivalAngle": 3.35,
        "departureAngle": 3.03
      }
    ]
  },
  {
    "id": "library-corridor-032",
    "area": "Library",
    "name": "Bookshelf Entrance · 32",
    "centerArrival": true,
    "back": 36,
    "view": 3.35,
    "routes": [
      {
        "to": 36,
        "angle": 0.86,
        "arrowAngle": 0.86,
        "hotspotAngle": 0.86,
        "hotspotDistance": 1.05,
        "arrivalAngle": 0.83,
        "departureAngle": 0.86,
        "back": true
      }
    ]
  },
  {
    "id": "library-corridor-033",
    "area": "Library",
    "name": "Left Study Wing · 33",
    "centerArrival": true,
    "back": 25,
    "view": 3.45,
    "routes": [
      {
        "to": 25,
        "angle": 0.18,
        "arrowAngle": 0.18,
        "hotspotAngle": 0.18,
        "hotspotDistance": 1.05,
        "arrivalAngle": 3.14,
        "departureAngle": 0.18,
        "back": true
      },
      {
        "to": 39,
        "angle": 3.45,
        "arrowAngle": 2.95,
        "hotspotAngle": 3.45,
        "hotspotDistance": 1.05,
        "arrivalAngle": 3.13,
        "departureAngle": 3.45
      }
    ]
  },
  {
    "id": "library-corridor-034",
    "area": "Library",
    "name": "Window Study Area · 34",
    "centerArrival": true,
    "back": 38,
    "view": 3.13,
    "routes": [
      {
        "to": 38,
        "angle": 0.2,
        "arrowAngle": 0.2,
        "hotspotAngle": 0.2,
        "hotspotDistance": 1.05,
        "arrivalAngle": 0.18,
        "departureAngle": 0.2,
        "back": true
      },
      {
        "to": 46,
        "angle": 3.14,
        "arrowAngle": 3.14,
        "hotspotAngle": 3.14,
        "hotspotDistance": 1.05,
        "arrivalAngle": 3.22,
        "departureAngle": 3.14
      }
    ]
  },
  {
    "id": "library-corridor-036",
    "area": "Library",
    "name": "Quiet Study Area · 36",
    "centerArrival": true,
    "back": 46,
    "view": 3.22,
    "routes": [
      {
        "to": 46,
        "angle": 5.87,
        "arrowAngle": 5.87,
        "hotspotAngle": 5.87,
        "hotspotDistance": 1.05,
        "arrivalAngle": 5.38,
        "departureAngle": 5.87,
        "back": true
      },
      {
        "to": 41,
        "angle": 3.22,
        "arrowAngle": 3.22,
        "hotspotAngle": 3.22,
        "hotspotDistance": 1.05,
        "arrivalAngle": 3.04,
        "departureAngle": 3.22
      }
    ]
  },
  {
    "id": "library-corridor-037",
    "area": "Library",
    "name": "Quiet Study Area · 37",
    "centerArrival": true,
    "back": 40,
    "view": 3.04,
    "routes": [
      {
        "to": 40,
        "angle": 4.65,
        "arrowAngle": 4.65,
        "hotspotAngle": 4.65,
        "hotspotDistance": 1.05,
        "arrivalAngle": 5.87,
        "departureAngle": 4.65,
        "back": true
      },
      {
        "to": 42,
        "angle": 3.04,
        "arrowAngle": 3.04,
        "hotspotAngle": 3.04,
        "hotspotDistance": 1.05,
        "arrivalAngle": 3.0,
        "departureAngle": 3.04
      }
    ]
  },
  {
    "id": "library-corridor-038",
    "area": "Library",
    "name": "Bookshelf Passage · 38",
    "centerArrival": true,
    "back": 41,
    "view": 3.0,
    "routes": [
      {
        "to": 41,
        "angle": 1.44,
        "arrowAngle": 1.44,
        "hotspotAngle": 1.44,
        "hotspotDistance": 1.05,
        "arrivalAngle": 4.65,
        "departureAngle": 1.44,
        "back": true
      },
      {
        "to": 43,
        "angle": 3.0,
        "arrowAngle": 3.0,
        "hotspotAngle": 3.0,
        "hotspotDistance": 1.05,
        "arrivalAngle": 3.12,
        "departureAngle": 3.0
      }
    ]
  },
  {
    "id": "library-corridor-039",
    "area": "Library",
    "name": "Bookshelf Aisle · 39",
    "centerArrival": true,
    "back": 42,
    "view": 3.12,
    "routes": [
      {
        "to": 42,
        "angle": 4.82,
        "arrowAngle": 4.82,
        "hotspotAngle": 4.82,
        "hotspotDistance": 1.05,
        "arrivalAngle": 1.44,
        "departureAngle": 4.82,
        "back": true
      },
      {
        "to": 44,
        "angle": 3.12,
        "arrowAngle": 3.12,
        "hotspotAngle": 3.12,
        "hotspotDistance": 1.05,
        "arrivalAngle": 2.62,
        "departureAngle": 3.12
      }
    ]
  },
  {
    "id": "library-corridor-040",
    "area": "Library",
    "name": "Reading Hall · 40",
    "centerArrival": true,
    "back": 43,
    "view": 2.62,
    "routes": [
      {
        "to": 43,
        "angle": 0.16,
        "arrowAngle": 0.16,
        "hotspotAngle": 0.16,
        "hotspotDistance": 1.05,
        "arrivalAngle": 4.82,
        "departureAngle": 0.16,
        "back": true
      },
      {
        "to": 45,
        "angle": 2.62,
        "arrowAngle": 2.62,
        "hotspotAngle": 2.62,
        "hotspotDistance": 1.05,
        "arrivalAngle": 4.4,
        "departureAngle": 2.62
      }
    ]
  },
  {
    "id": "library-corridor-041",
    "area": "Library",
    "name": "Glass Study Rooms · 41",
    "centerArrival": true,
    "back": 44,
    "view": 4.4,
    "routes": [
      {
        "to": 44,
        "angle": 0.19,
        "arrowAngle": 0.45,
        "hotspotAngle": 0.19,
        "hotspotDistance": 1.05,
        "arrivalAngle": 0.16,
        "departureAngle": 0.19,
        "back": true
      }
    ]
  },
  {
    "id": "library-corridor-035",
    "area": "Library",
    "name": "Window Reception · 35",
    "centerArrival": true,
    "back": 39,
    "view": 3.22,
    "routes": [
      {
        "to": 39,
        "angle": 5.38,
        "arrowAngle": 5.38,
        "hotspotAngle": 5.38,
        "hotspotDistance": 1.05,
        "arrivalAngle": 0.2,
        "departureAngle": 5.38,
        "back": true
      },
      {
        "to": 40,
        "angle": 3.22,
        "arrowAngle": 3.17,
        "hotspotAngle": 3.46,
        "hotspotDistance": 0.78,
        "arrivalAngle": 3.22,
        "departureAngle": 3.22
      }
    ]
  }
];

export const LOCATION_AR=[
  [
    "المكتبة",
    "المدخل"
  ],
  [
    "المكتبة",
    "البهو"
  ],
  [
    "المكتبة",
    "منطقة الدراسة 1"
  ],
  [
    "المكتبة",
    "منطقة الدراسة 2"
  ],
  [
    "المكتبة",
    "منطقة الدراسة 3"
  ],
  [
    "المكتبة",
    "منطقة الدراسة 4"
  ],
  [
    "المكتبة",
    "منطقة الدراسة 5"
  ],
  [
    "المكتبة",
    "منطقة الدراسة 6"
  ],
  [
    "المكتبة",
    "منطقة الدراسة 7"
  ],
  [
    "المكتبة",
    "منطقة الدراسة 8"
  ],
  [
    "المكتبة",
    "منطقة الدراسة 9"
  ],
  [
    "المكتبة",
    "منطقة الدراسة 10"
  ],
  ["المكتبة", "ممر غرف الدراسة · 30"],
  ["المكتبة", "ممر غرف الدراسة · 31"],
  ["المكتبة", "مدخل رفوف الكتب · 32"],
  ["المكتبة", "جناح الدراسة الأيسر · 33"],
  ["المكتبة", "منطقة الدراسة بجانب النوافذ · 34"],
  ["المكتبة", "منطقة الدراسة الهادئة · 36"],
  ["المكتبة", "منطقة الدراسة الهادئة · 37"],
  ["المكتبة", "ممر رفوف الكتب · 38"],
  ["المكتبة", "ممر الكتب · 39"],
  ["المكتبة", "قاعة القراءة · 40"],
  ["المكتبة", "غرف الدراسة الزجاجية · 41"],
  ["المكتبة", "مكتب الاستقبال بجانب النوافذ · 35"]
];
