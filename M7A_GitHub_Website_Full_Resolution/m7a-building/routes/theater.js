// Theater/Auditorium-only tour data. Global scene indices: 10–22.
// Edit this file for Theater links, stair arrows, bearings, names, and hotspot tuning.

export const PANORAMAS=[
  "theater-outer-entrance-a.glb",
  "theater-outer-entrance-b.glb",
  "theater-hall.glb",
  "theater-foyer.glb",
  "theater-auditorium-rear.glb",
  "theater-auditorium-center.glb",
  "theater-stage-011.glb",
  "theater-stage-012.glb",
  "theater-stage-013.glb",
  "theater-stage-014.glb",
  "theater-stage-015.glb",
  "theater-stage-016.glb",
  "theater-hall-017.glb"
];

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
  ],
  [
    1,
    1,
    1
  ],
  [
    1,
    1,
    1
  ],
  [
    1,
    1,
    1
  ],
  [
    1,
    1,
    1
  ],
  [
    1,
    1,
    1
  ],
  [
    1,
    1,
    1
  ],
  [
    1,
    1,
    1
  ],
  [
    1,
    1,
    1
  ],
  [
    1,
    1,
    1
  ],
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
    id: "theater-entrance-a",
    area: "Theater",
    name: "Exterior View",
    back: null,
    view: 3.14,
    routes: [
      {
        to: 12,
        angle: 3.14,
        arrowAngle: 3.14
      }
    ]
  },
  {
    id: "theater-entrance-b",
    area: "Theater",
    name: "Covered Entrance",
    back: null,
    view: 3.14,
    routes: [
      {
        to: 12,
        angle: 3.14,
        arrowAngle: 3.14
      },
      {
        to: 23,
        angle: 0.18,
        arrowAngle: 0.18
      }
    ]
  },
  {
    id: "theater-hall",
    area: "Theater",
    name: "Main Lobby",
    back: 10,
    view: 2.32,
    routes: [
      {
        to: 10,
        angle: 4.68,
        arrowAngle: 4.68,
        back: true
      },
      {
        to: 11,
        angle: 6.1,
        arrowAngle: 6.28,
        hotspotAngle: 6.28,
        hotspotDistance: 1.25
      },
      {
        to: 13,
        angle: 1.55,
        arrowAngle: 1.95,
        hotspotAngle: 1.8
      },
      {
        to: 22,
        angle: 3.13,
        arrowAngle: 2.9,
        hotspotAngle: 3.05
      }
    ]
  },
  {
    id: "theater-foyer",
    area: "Auditorium",
    name: "Main Door",
    back: 12,
    view: 2.98,
    routes: [
      {
        to: 12,
        angle: 4.62,
        arrowAngle: 4.62,
        back: true,
        hotspotAngle: 5.05
      },
      {
        to: 14,
        arrivalPitch: -0.25,
        angle: 2.98,
        arrowAngle: 2.98
      }
    ]
  },
  {
    id: "theater-auditorium-rear",
    area: "Auditorium",
    name: "Main Stairs · Top",
    back: 13,
    view: 3.14,
    viewPitch: -0.25,
    routes: [
      {
        to: 13,
        angle: 0,
        arrowAngle: 0,
        back: true
      },
      {
        to: 15,
        angle: 3.29,
        arrowAngle: 3.14,
        hotspotAngle: 3.14,
        kind: "stairs",
        stairDirection: "down"
      }
    ]
  },
  {
    id: "theater-auditorium-center",
    area: "Auditorium",
    name: "Main Stairs · Middle",
    back: 14,
    view: 3.05,
    viewPitch: -0.22,
    routes: [
      {
        to: 14,
        angle: 0,
        arrowAngle: 0,
        back: true,
        kind: "stairs",
        stairDirection: "up"
      },
      {
        to: 16,
        angle: 3.3,
        arrivalAngle: 3.3,
        arrowAngle: 3.05,
        hotspotAngle: 3.05,
        kind: "stairs",
        stairDirection: "down"
      },
      {
        to: 20,
        angle: 4.71,
        arrowAngle: 4.71
      }
    ]
  },
  {
    id: "theater-stage-011",
    area: "Auditorium",
    name: "Main Stairs · Bottom",
    back: 15,
    view: 4.3,
    routes: [
      {
        to: 15,
        angle: 6,
        arrowAngle: 6,
        back: true,
        kind: "stairs",
        stairDirection: "up"
      },
      {
        to: 17,
        angle: 4.1,
        arrowAngle: 4.45
      }
    ]
  },
  {
    id: "theater-stage-012",
    area: "Auditorium",
    name: "Lower Center",
    back: 16,
    view: 1.65,
    routes: [
      {
        to: 16,
        angle: 4.71,
        arrowAngle: 4.71,
        back: true
      },
      {
        to: 18,
        angle: 1.65,
        arrowAngle: 1.65,
        hotspotDistance: 0.78
      }
    ]
  },
  {
    id: "theater-stage-013",
    area: "Auditorium",
    name: "Library Stairs · Bottom",
    back: 17,
    view: 1.1,
    routes: [
      {
        to: 17,
        angle: 2.92,
        arrowAngle: 2.92,
        hotspotAngle: 3.15,
        hotspotDistance: 1.35,
        back: true
      },
      {
        to: 19,
        angle: 1.1,
        arrowAngle: 1.1,
        hotspotAngle: 0.98,
        kind: "stairs",
        stairDirection: "up"
      }
    ]
  },
  {
    id: "theater-stage-014",
    area: "Auditorium",
    name: "Library Stairs · Middle",
    back: 18,
    view: 3.14,
    viewPitch: -0.22,
    routes: [
      {
        to: 18,
        angle: 3.25,
        arrowAngle: 3.25,
        back: true,
        kind: "stairs",
        stairDirection: "down"
      },
      {
        to: 21,
        angle: 0.12,
        arrowAngle: 0.12,
        kind: "stairs",
        stairDirection: "up"
      },
      {
        to: 20,
        angle: 1.57,
        arrowAngle: 1.57
      }
    ]
  },
  {
    id: "theater-stage-015",
    area: "Auditorium",
    name: "Cross Aisle",
    back: 15,
    view: 1.8,
    routes: [
      {
        to: 15,
        angle: 1.57,
        arrowAngle: 1.8,
        hotspotAngle: 1.8,
        back: true
      },
      {
        to: 19,
        angle: 4.71,
        arrowAngle: 4.71,
        hotspotAngle: 4.9
      }
    ]
  },
  {
    id: "theater-stage-016",
    area: "Auditorium",
    name: "Library Stairs · Top",
    back: 19,
    view: 3.35,
    viewPitch: -0.25,
    routes: [
      {
        to: 19,
        angle: 3.35,
        arrowAngle: 3.35,
        back: true,
        kind: "stairs",
        stairDirection: "down"
      },
      {
        to: 22,
        angle: 0.2,
        arrowAngle: 0.2
      }
    ]
  },
  {
    id: "theater-hall-017",
    area: "Auditorium",
    name: "Library-Side Door",
    back: 21,
    view: 3.14,
    routes: [
      {
        to: 21,
        arrivalPitch: -0.25,
        angle: 3.14,
        arrowAngle: 3.32,
        back: true
      },
      {
        to: 12,
        angle: 1.2,
        arrowAngle: 1.2
      }
    ]
  }
];

export const LOCATION_AR=[
  [
    "المسرح",
    "منظر خارجي"
  ],
  [
    "المسرح",
    "المدخل المغطى"
  ],
  [
    "المسرح",
    "البهو الرئيسي"
  ],
  [
    "قاعة المحاضرات",
    "الباب الرئيسي"
  ],
  [
    "قاعة المحاضرات",
    "الدرج الرئيسي · أعلى"
  ],
  [
    "قاعة المحاضرات",
    "الدرج الرئيسي · وسط"
  ],
  [
    "قاعة المحاضرات",
    "الدرج الرئيسي · أسفل"
  ],
  [
    "قاعة المحاضرات",
    "المنتصف السفلي"
  ],
  [
    "قاعة المحاضرات",
    "درج جهة المكتبة · أسفل"
  ],
  [
    "قاعة المحاضرات",
    "درج جهة المكتبة · وسط"
  ],
  [
    "قاعة المحاضرات",
    "الممر الأوسط"
  ],
  [
    "قاعة المحاضرات",
    "درج جهة المكتبة · أعلى"
  ],
  [
    "قاعة المحاضرات",
    "باب جهة المكتبة"
  ]
];

// Exceptional visual distance/scale overrides. Keys use stable scene IDs.
export const HOTSPOT_STYLE={
  "theater-auditorium-rear->theater-auditorium-center":[0.65,.38],
  "theater-auditorium-center->theater-stage-011":[0.65,.38],
  "theater-stage-014->theater-stage-013":[0.9,.42],
  "theater-stage-016->theater-stage-014":[0.9,.42],
  "theater-hall->theater-entrance-b":[2.05,.78],
  "theater-hall->theater-foyer":[1.85,.76],
  "theater-hall->theater-hall-017":[1.85,.76],
  "theater-stage-011->theater-stage-012":[1.00,.64],
  "theater-stage-011->theater-auditorium-center":[0.9,.42],
  "theater-stage-013->theater-stage-012":[1.80,.80]
};
