// One outdoor pin per building. Coordinates are [longitude, latitude].
// A tour can open an existing scene or a separately hosted hall tour.
export const HALLS = [
  {
    id: 'e2', code: 'E2',
    name: { en: 'Al Razi Auditorium', ar: 'مسرح الرازي' },
    coordinates: [55.477603577553126, 25.27433935800182],
    // Pin position on the rotated 2026 campus artwork: exact E2 building centre.
    mapCoordinates: [55.470043608909286, 25.27984980357116],
    thumbnail: './panoramas-mobile/theater-outer-entrance-a.jpg',
    tour: { scene: 'theater-entrance-a' },
    rooms: []
  },
  {
    id: 'm7', code: 'M7',
    name: { en: 'College of Science', ar: 'كلية العلوم' },
    coordinates: [55.47720532173917, 25.2857153181386],
    // M7 is College of Sciences; the 2026 campus artwork labels this building A11.
    mapCoordinates: [55.482804602208574, 25.280271872334957],
    thumbnail: './panoramas-mobile/ground-entrance.jpg',
    tour: { scene: 'entrance' },
    rooms: [
      { id: 'm7a-001', name: { en: 'M7A-001', ar: 'M7A-001' }, floor: { en: 'Ground floor', ar: 'الطابق الأرضي' }, tour: { scene: 'm7a-001' } },
      { id: 'm7a-002', name: { en: 'M7A-002', ar: 'M7A-002' }, floor: { en: 'Ground floor', ar: 'الطابق الأرضي' }, tour: { scene: 'm7a-002' } },
      { id: 'm7a-003', name: { en: 'M7A-003', ar: 'M7A-003' }, floor: { en: 'Ground floor', ar: 'الطابق الأرضي' }, tour: { scene: 'm7a-003' } },
      { id: 'm7a-004', name: { en: 'M7A-004', ar: 'M7A-004' }, floor: { en: 'Ground floor', ar: 'الطابق الأرضي' }, tour: { scene: 'm7a-004' } }
    ]
  }
];
