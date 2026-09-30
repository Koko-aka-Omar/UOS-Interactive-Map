// One outdoor pin per building. Coordinates are [longitude, latitude].
// A tour can open an existing scene or a separately hosted hall tour.
export const HALLS = [
  {
    id: 'al-zahra', code: 'C2',
    name: { en: 'Al Zahra Hall', ar: 'قاعة الزهراء' },
    // Exact C2 centre on the unchanged 2026 campus artwork.
    mapCoordinates: [55.47735608256855, 25.280057692934516],
    thumbnail: './covers/al-zahra.jpg',
    tour: { scene: 'al-zahra-001' },
    rooms: [
      { id: 'al-zahra-001', name: { en: 'Al Zahra Entrance', ar: 'مدخل قاعة الزهراء' }, floor: { en: 'Al Zahra Hall', ar: 'قاعة الزهراء' }, tour: { scene: 'al-zahra-001' } },
      { id: 'al-zahra-002', name: { en: 'Entrance Hall', ar: 'بهو المدخل' }, floor: { en: 'Al Zahra Hall', ar: 'قاعة الزهراء' }, tour: { scene: 'al-zahra-002' } },
      { id: 'al-zahra-003', name: { en: 'Theater Door', ar: 'باب المسرح' }, floor: { en: 'Al Zahra Hall', ar: 'قاعة الزهراء' }, tour: { scene: 'al-zahra-003' } },
      { id: 'al-zahra-004', name: { en: 'Theater Entrance', ar: 'مدخل المسرح' }, floor: { en: 'Al Zahra Hall', ar: 'قاعة الزهراء' }, tour: { scene: 'al-zahra-004' } },
      { id: 'al-zahra-005', name: { en: 'Theater Right Side', ar: 'الجانب الأيمن للمسرح' }, floor: { en: 'Al Zahra Hall', ar: 'قاعة الزهراء' }, tour: { scene: 'al-zahra-005' } },
      { id: 'al-zahra-006', name: { en: 'Lower Seating', ar: 'منطقة الجلوس السفلية' }, floor: { en: 'Al Zahra Hall', ar: 'قاعة الزهراء' }, tour: { scene: 'al-zahra-006' } },
      { id: 'al-zahra-007', name: { en: 'Upper Theater', ar: 'داخل المسرح' }, floor: { en: 'Al Zahra Hall', ar: 'قاعة الزهراء' }, tour: { scene: 'al-zahra-007' } },
      { id: 'al-zahra-008', name: { en: 'Stage Front', ar: 'أمام المنصة' }, floor: { en: 'Al Zahra Hall', ar: 'قاعة الزهراء' }, tour: { scene: 'al-zahra-008' } }
    ]
  },
  {
    id: 'c4', code: 'C4',
    name: { en: 'C4', ar: 'C4' },
    // Exact C4 centre on the unchanged 2026 campus artwork.
    mapCoordinates: [55.47892269052845, 25.279957223150287],
    thumbnail: './covers/c4.jpg',
    tour: { scene: 'c4-001' },
    rooms: [
      { id: 'c4-001', name: { en: 'C4 Entrance', ar: 'مدخل C4' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-001' } },
      { id: 'c4-002', name: { en: 'Entry Corridor', ar: 'ممر المدخل' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-002' } },
      { id: 'c4-003', name: { en: 'Collaboration Corridor', ar: 'ممر مساحات التعاون' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-003' } },
      { id: 'c4-004', name: { en: 'Café Corridor', ar: 'ممر المقهى' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-004' } },
      { id: 'c4-005', name: { en: 'Café Lounge', ar: 'استراحة المقهى' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-005' } },
      { id: 'c4-006', name: { en: 'Study Booths', ar: 'مقصورات الدراسة' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-006' } },
      { id: 'c4-007', name: { en: 'Breakfast Counter', ar: 'منطقة الإفطار' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-007' } },
      { id: 'c4-008', name: { en: 'Main Lounge', ar: 'الاستراحة الرئيسية' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-008' } },
      { id: 'c4-009', name: { en: 'Recreation Corridor', ar: 'ممر الترفيه' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-009' } },
      { id: 'c4-010', name: { en: 'Games Area', ar: 'منطقة الألعاب' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-010' } },
      { id: 'c4-011', name: { en: 'Tiered Seating', ar: 'الجلسات المتدرجة' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-011' } },
      { id: 'c4-012', name: { en: 'Dining Hall', ar: 'قاعة الطعام' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-012' } },
      { id: 'c4-013', name: { en: 'Food Court Corridor', ar: 'ممر المطاعم' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-013' } },
      { id: 'c4-014', name: { en: 'Food Counter', ar: 'منطقة المطاعم' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-014' } },
      { id: 'c4-015', name: { en: 'Dining Area', ar: 'منطقة الطعام' }, floor: { en: 'C4', ar: 'C4' }, tour: { scene: 'c4-015' } }
    ]
  },
  {
    id: 'a4', code: 'A4',
    name: { en: "Men's Hall", ar: 'قاعة الطلاب' },
    // A4 centre on the unchanged 2026 campus artwork.
    mapCoordinates: [55.484435266313, 25.279942153384],
    thumbnail: './covers/a4.jpg',
    tour: { scene: 'mens-hall-078' },
    rooms: []
  },
  {
    id: 'e2', code: 'E2',
    name: { en: 'Al Razi Auditorium', ar: 'مسرح الرازي' },
    coordinates: [55.477603577553126, 25.27433935800182],
    // Pin position on the rotated 2026 campus artwork: exact E2 building centre.
    mapCoordinates: [55.470043608909286, 25.27984980357116],
    thumbnail: './covers/e2.jpg',
    tour: { scene: 'theater-entrance-a' },
    rooms: []
  },
  {
    id: 'e3', code: 'E4',
    name: { en: 'Library', ar: 'المكتبة' },
    // E4 library position on the campus artwork; not a GPS coordinate.
    mapCoordinates: [55.46917861123175, 25.279846706387637],
    thumbnail: './covers/e4.jpg',
    tour: { scene: 'library-entrance-018' },
    rooms: [
      { id: 'library-study-020', name: { en: 'Study Area 1', ar: 'منطقة الدراسة 1' }, floor: { en: 'Library', ar: 'المكتبة' }, tour: { scene: 'library-study-020' } },
      { id: 'library-study-021', name: { en: 'Study Area 2', ar: 'منطقة الدراسة 2' }, floor: { en: 'Library', ar: 'المكتبة' }, tour: { scene: 'library-study-021' } },
      { id: 'library-study-022', name: { en: 'Study Area 3', ar: 'منطقة الدراسة 3' }, floor: { en: 'Library', ar: 'المكتبة' }, tour: { scene: 'library-study-022' } },
      { id: 'library-study-023', name: { en: 'Study Area 4', ar: 'منطقة الدراسة 4' }, floor: { en: 'Library', ar: 'المكتبة' }, tour: { scene: 'library-study-023' } },
      { id: 'library-study-024', name: { en: 'Study Area 5', ar: 'منطقة الدراسة 5' }, floor: { en: 'Library', ar: 'المكتبة' }, tour: { scene: 'library-study-024' } },
      { id: 'library-study-025', name: { en: 'Study Area 6', ar: 'منطقة الدراسة 6' }, floor: { en: 'Library', ar: 'المكتبة' }, tour: { scene: 'library-study-025' } },
      { id: 'library-study-026', name: { en: 'Study Area 7', ar: 'منطقة الدراسة 7' }, floor: { en: 'Library', ar: 'المكتبة' }, tour: { scene: 'library-study-026' } },
      { id: 'library-study-027', name: { en: 'Study Area 8', ar: 'منطقة الدراسة 8' }, floor: { en: 'Library', ar: 'المكتبة' }, tour: { scene: 'library-study-027' } },
      { id: 'library-study-028', name: { en: 'Study Area 9', ar: 'منطقة الدراسة 9' }, floor: { en: 'Library', ar: 'المكتبة' }, tour: { scene: 'library-study-028' } },
      { id: 'library-study-029', name: { en: 'Study Area 10', ar: 'منطقة الدراسة 10' }, floor: { en: 'Library', ar: 'المكتبة' }, tour: { scene: 'library-study-029' } }
    ]
  },
  {
    id: 'm7', code: 'M7A',
    name: { en: 'College of Science', ar: 'كلية العلوم' },
    coordinates: [55.47720532173917, 25.2857153181386],
    // M7 is College of Sciences; the 2026 campus artwork labels this building A11.
    mapCoordinates: [55.482804602208574, 25.280271872334957],
    thumbnail: './covers/m7.jpg',
    tour: { scene: 'entrance' },
    rooms: [
      { id: 'm7a-001', name: { en: 'M7A-001', ar: 'M7A-001' }, floor: { en: 'Ground floor', ar: 'الطابق الأرضي' }, tour: { scene: 'm7a-001' } },
      { id: 'm7a-002', name: { en: 'M7A-002', ar: 'M7A-002' }, floor: { en: 'Ground floor', ar: 'الطابق الأرضي' }, tour: { scene: 'm7a-002' } },
      { id: 'm7a-003', name: { en: 'M7A-003', ar: 'M7A-003' }, floor: { en: 'Ground floor', ar: 'الطابق الأرضي' }, tour: { scene: 'm7a-003' } },
      { id: 'm7a-004', name: { en: 'M7A-004', ar: 'M7A-004' }, floor: { en: 'Ground floor', ar: 'الطابق الأرضي' }, tour: { scene: 'm7a-004' } }
    ]
  },
  {
    id: 'student-forums', code: 'A6',
    name: { en: 'Student Forums', ar: 'ملتقى الطلاب' },
    // A6 identity confirmed by the owner; reuse the existing artwork anchor.
    mapCoordinates: [55.48428915609322, 25.279545297034954],
    tour: { scene: 'student-forums-071' },
    rooms: [
      { id: 'student-forums-071', name: { en: 'Outside Entrance', ar: 'المدخل الخارجي' }, floor: { en: 'Student Forums', ar: 'ملتقى الطلاب' }, tour: { scene: 'student-forums-071' } },
      { id: 'student-forums-072', name: { en: 'Central Hall', ar: 'البهو المركزي' }, floor: { en: 'Student Forums', ar: 'ملتقى الطلاب' }, tour: { scene: 'student-forums-072' } },
      { id: 'student-forums-073', name: { en: 'Left-Side Checkpoint', ar: 'نقطة الجانب الأيسر' }, floor: { en: 'Student Forums', ar: 'ملتقى الطلاب' }, tour: { scene: 'student-forums-073' } },
      { id: 'student-forums-074', name: { en: 'Right-Side Checkpoint', ar: 'نقطة الجانب الأيمن' }, floor: { en: 'Student Forums', ar: 'ملتقى الطلاب' }, tour: { scene: 'student-forums-074' } },
      { id: 'student-forums-075', name: { en: 'Rejoining Checkpoint', ar: 'نقطة التقاء المسارين' }, floor: { en: 'Student Forums', ar: 'ملتقى الطلاب' }, tour: { scene: 'student-forums-075' } },
      { id: 'student-forums-076', name: { en: 'Glass Passage Entrance', ar: 'مدخل الممر الزجاجي' }, floor: { en: 'Student Forums', ar: 'ملتقى الطلاب' }, tour: { scene: 'student-forums-076' } },
      { id: 'student-forums-077', name: { en: 'Glass Passage', ar: 'الممر الزجاجي' }, floor: { en: 'Student Forums', ar: 'ملتقى الطلاب' }, tour: { scene: 'student-forums-077' } }
    ]
  }
];
