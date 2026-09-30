// M7A-only tour data. Global scene indices: 0–9.
// Edit this file only for M7A hall/room routes, names, bearings, or panorama files.

export const PANORAMAS=[
  "ground-entrance.glb",
  "ground-study-rooms.glb",
  "ground-hall-end.glb",
  "top-stair-landing.glb",
  "top-faculty-offices.glb",
  "top-seating-area.glb",
  "room-m7a-001.glb",
  "room-m7a-004.glb",
  "room-m7a-003.glb",
  "room-m7a-002.glb"
];

export const VISUAL_CALIBRATION=[
  [
    0.98,
    1,
    1.06
  ],
  [
    0.985,
    1,
    1.04
  ],
  [
    0.985,
    1,
    1.035
  ],
  [
    0.99,
    1,
    1.02
  ],
  [
    1,
    1,
    1.015
  ],
  [
    1,
    1,
    1.015
  ],
  [
    1.055,
    1.055,
    1.055
  ],
  [
    1.045,
    1.045,
    1.045
  ],
  [
    1.035,
    1.035,
    1.035
  ],
  [
    1.055,
    1.055,
    1.055
  ]
];

export const LOCATIONS=[
  {
    id: "entrance",
    area: "Main Hall",
    name: "Entrance",
    back: null,
    // Open toward the walkable corridor and the first floor arrow.
    view: 2.1,
    routes: [
      {
        to: 1,
        angle: 2.1,
        label: "Main Hall · Study Rooms"
      },
      {
        to: 3,
        angle: 3.7,
        label: "Stairs · M7A Top Floor",
        kind: "stairs"
      }
    ]
  },
  {
    id: "study-junction",
    area: "Main Hall",
    name: "Study Rooms",
    back: 0,
    view: 3.14,
    routes: [
      {
        to: 0,
        angle: 0.15,
        label: "Main Hall · Entrance",
        back: true
      },
      {
        to: 2,
        angle: 3.24,
        label: "Main Hall · Hall End"
      },
      {
        to: 6,
        angle: 4.8,
        label: "M7A-001"
      },
      {
        to: 7,
        angle: 1.68,
        label: "M7A-004"
      }
    ]
  },
  {
    id: "hall-end",
    area: "Main Hall",
    name: "Hall End",
    back: 1,
    view: 1.57,
    routes: [
      {
        to: 1,
        angle: 1.53,
        label: "Main Hall · Study Rooms",
        back: true
      },
      {
        to: 8,
        angle: 3.12,
        label: "M7A-003"
      },
      {
        to: 9,
        angle: 6.1,
        label: "M7A-002"
      }
    ]
  },
  {
    id: "top-floor-landing",
    area: "Top Floor",
    name: "Stair Landing",
    back: 0,
    view: 1.72,
    routes: [
      {
        to: 0,
        angle: 4.4,
        label: "Ground Floor · Entrance",
        back: true,
        kind: "stairs"
      },
      {
        to: 4,
        angle: 1.72,
        label: "Top Floor · Faculty Offices"
      }
    ]
  },
  {
    id: "top-floor-2",
    area: "Top Floor",
    name: "Faculty Offices",
    back: 3,
    view: 2.99,
    routes: [
      {
        to: 3,
        angle: 4.66,
        label: "Top Floor · Stair Landing",
        back: true
      },
      {
        to: 5,
        angle: 1.42,
        label: "Faculty Offices · Seating Area"
      }
    ]
  },
  {
    id: "top-floor-1",
    area: "Top Floor",
    name: "Faculty Offices · Seating Area",
    back: 4,
    view: 6.08,
    routes: [
      {
        to: 4,
        angle: 4.57,
        label: "Top Floor · Faculty Offices",
        back: true
      }
    ]
  },
  {
    id: "m7a-001",
    area: "Ground Floor",
    name: "M7A-001",
    back: 1,
    view: 5,
    routes: [
      {
        to: 1,
        angle: 2.48,
        label: "Main Hall · Study Rooms",
        back: true
      }
    ]
  },
  {
    id: "m7a-004",
    area: "Ground Floor",
    name: "M7A-004",
    back: 1,
    view: 0.55,
    routes: [
      {
        to: 1,
        angle: 1.46,
        label: "Main Hall · Study Rooms",
        back: true
      }
    ]
  },
  {
    id: "m7a-003",
    area: "Ground Floor",
    name: "M7A-003",
    back: 2,
    view: 3.16,
    routes: [
      {
        to: 2,
        angle: 6.08,
        label: "Main Hall · Hall End",
        back: true
      }
    ]
  },
  {
    id: "m7a-002",
    area: "Ground Floor",
    name: "M7A-002",
    back: 2,
    view: 1.95,
    routes: [
      {
        to: 2,
        angle: 2.48,
        label: "Main Hall · Hall End",
        back: true
      }
    ]
  }
];

export const LOCATION_AR=[
  [
    "الردهة الرئيسية",
    "المدخل"
  ],
  [
    "الردهة الرئيسية",
    "قاعات الدراسة"
  ],
  [
    "الردهة الرئيسية",
    "نهاية الردهة"
  ],
  [
    "الطابق العلوي",
    "بسطة الدرج"
  ],
  [
    "الطابق العلوي",
    "مكاتب أعضاء هيئة التدريس"
  ],
  [
    "الطابق العلوي",
    "مكاتب أعضاء هيئة التدريس · منطقة الجلوس"
  ],
  [
    "الطابق الأرضي",
    "M7A-001"
  ],
  [
    "الطابق الأرضي",
    "M7A-004"
  ],
  [
    "الطابق الأرضي",
    "M7A-003"
  ],
  [
    "الطابق الأرضي",
    "M7A-002"
  ]
];
