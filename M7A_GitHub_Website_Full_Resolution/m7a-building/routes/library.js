// Library-only tour data. Global scene indices: 23–34.
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
  "library-study-029.glb"
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
        to: 33,
        angle: 1.95,
        arrowAngle: 2.15,
        back: true,
        hotspotAngle: 2.22
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
  ]
];
