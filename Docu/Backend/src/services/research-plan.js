/**
 * 2030 Research Plan (Cairo University — Faculty of Engineering).
 * Extracted from the plan matrix. Anchoring rules:
 *   - Every axis has a stable code (`م1`, `م2`, ... — Arabic letter after م).
 *   - Every goal has a stable code within the axis (`ع2`, `ت3`, ...).
 *   - Department eligibility is stored per goal, using canonical department
 *     names as they appear in the `Departments.name` column of the DB.
 *
 * If a department name in the DB doesn't match any canonical name here, that
 * department will simply see no eligible axes/goals until the mapping below
 * is updated.
 *
 * IMPORTANT: keep this file the single source of truth. The template's plan
 * picker (frontend) and the docx preprocessor (backend) both consume it.
 */

// -------------------------------------------------------------------------
// Department name aliases. Left side = canonical name we use in the axes
// table; right side = every alternative spelling / language we've seen in
// the DB for that department. Comparison is case-insensitive after trim.
// -------------------------------------------------------------------------
const DEPARTMENT_ALIASES = {
  "Engineering Mathematics and Physics": [
    "Engineering Mathematics and Physics",
    "الرياضيات والفيزياء الهندسية",
  ],
  "Architectural Engineering": [
    "Architectural Engineering",
    "الهندسة المعمارية",
  ],
  "Public Works": ["Public Works", "الأشغال العامة"],
  "Structural Engineering": ["Structural Engineering", "الهندسة الإنشائية"],
  "Irrigation and Hydraulics": [
    "Irrigation and Hydraulics",
    "الري والهيدروليكا",
  ],
  "Mechanical Design and Production": [
    "Mechanical Design and Production",
    "التصميم الميكانيكي والإنتاج",
  ],
  "Mechanical Power Engineering": [
    "Mechanical Power Engineering",
    "هندسة القوى الميكانيكية",
  ],
  "Aeronautical and Aerospace Engineering": [
    "Aeronautical and Aerospace Engineering",
    "هندسة الطيران والفضاء",
  ],
  "Electronics and Communications": [
    "Electronics and Communications",
    "الإلكترونيات والاتصالات",
  ],
  "Electrical Power Engineering": [
    "Electrical Power Engineering",
    "هندسة القوى الكهربية",
  ],
  "Chemical Engineering": ["Chemical Engineering", "الهندسة الكيميائية"],
  "Mining, Petroleum & Metallurgical": [
    "Mining & Geological Engineering Program",
    "Petroleum Engineering Program",
    "Metallurgical Engineering Program",
    "هندسة التعدين والبترول",
  ],
  "Biomedical Engineering and Systems": [
    "Biomedical Engineering and Systems",
    "الهندسة الطبية الحيوية والنظم",
  ],
  "Computer Engineering": ["Computer Engineering", "هندسة الحاسبات"],
};

// Build fast reverse lookup: any alias -> canonical
const CANONICAL_BY_ALIAS = new Map();
for (const [canonical, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
  for (const alias of aliases) {
    CANONICAL_BY_ALIAS.set(alias.trim().toLowerCase(), canonical);
  }
}

function canonicalDepartmentName(name) {
  if (!name) return null;
  return CANONICAL_BY_ALIAS.get(name.trim().toLowerCase()) || null;
}

// -------------------------------------------------------------------------
// Axes & goals. `departments` is the set of CANONICAL department names that
// participate in this goal (i.e. the ✓ cells in that goal's row).
// -------------------------------------------------------------------------
const AXES = [
  {
    code: "م1",
    name: "الطاقة",
    goals: [
      {
        code: "ع3",
        name: "خفض كثافة استهلاك الطاقة",
        departments: ["Mining, Petroleum & Metallurgical"],
      },
      {
        code: "ع5",
        name: "تعظيم الاستفادة من تكنولوجيا الطاقة الشمسية",
        departments: [
          "Engineering Mathematics and Physics",
          "Architectural Engineering",
          "Structural Engineering",
          "Electronics and Communications",
          "Mechanical Design and Production",
          "Electrical Power Engineering",
        ],
      },
      {
        code: "ع6",
        name: "تعظيم الاستفادة من تكنولوجيا الرياح",
        departments: [
          "Engineering Mathematics and Physics",
          "Architectural Engineering",
          "Structural Engineering",
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Electrical Power Engineering",
        ],
      },
      {
        code: "ع7",
        name: "تعظيم الاستفادة من تكنولوجيا الكتلة الحيوية والطحالب وطاقة الأمواج والمد والجزر وطاقة باطن الأرض",
        departments: [
          "Engineering Mathematics and Physics",
          "Architectural Engineering",
          "Structural Engineering",
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Electrical Power Engineering",
        ],
      },
      {
        code: "ع8",
        name: "تعظيم الاستفادة من التكنولوجيا الهجينة",
        departments: [
          "Electronics and Communications",
          "Electrical Power Engineering",
        ],
      },
    ],
  },
  {
    code: "م2",
    name: "المياه",
    goals: [
      {
        code: "ع1",
        name: "استكشاف واستخدام المياه الجوفية",
        departments: [
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Electrical Power Engineering",
          "Chemical Engineering",
        ],
      },
      {
        code: "ع2",
        name: "استخدام وتخزين مياه الأمطار",
        departments: ["Electronics and Communications"],
      },
      {
        code: "ع3",
        name: "تقليل فواقد المياه ببعض دول حوض النيل، وتطهير البحيرات وزيادة الموارد المائية",
        departments: ["Electronics and Communications"],
      },
      {
        code: "ع4",
        name: "ترشيد استخدامات المياه",
        departments: [
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Chemical Engineering",
        ],
      },
      {
        code: "ع5",
        name: "تطوير تكنولوجيا تحلية المياه",
        departments: [
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Chemical Engineering",
        ],
      },
    ],
  },
  {
    code: "م3",
    name: "الصحة",
    goals: [
      {
        code: "ع2",
        name: "الاستفادة الفعلية من الأبحاث واستثمارها في مجابهة الأمراض التي تنتشر في المجتمع واتخاذ القرارات المبنية على الدليل",
        departments: [
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Chemical Engineering",
          "Computer Engineering",
        ],
      },
    ],
  },
  {
    code: "م4",
    name: "الزراعة والغذاء",
    goals: [
      {
        code: "ع2",
        name: "تطبيق تكنولوجيات الزراعة الحديثة",
        departments: ["Electronics and Communications"],
      },
      {
        code: "ع5",
        name: "مواجهة سوء استخدام الموارد المائية",
        departments: [
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
        ],
      },
      {
        code: "ع9",
        name: "تطوير التكنولوجيات الحديثة لزراعة وتنمية الأراضي الجديدة",
        departments: [
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
        ],
      },
      {
        code: "ع15",
        name: "تطوير تكنولوجيا الصناعات الغذائية",
        departments: ["Chemical Engineering"],
      },
    ],
  },
  {
    code: "م5",
    name: "حماية البيئة والموارد الطبيعية",
    goals: [
      {
        code: "ع1",
        name: "مواجهة الآثار المحتملة للتغيرات المناخية",
        departments: [
          "Engineering Mathematics and Physics",
          "Architectural Engineering",
          "Public Works",
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Aeronautical and Aerospace Engineering",
          "Electrical Power Engineering",
          "Chemical Engineering",
          "Mining, Petroleum & Metallurgical",
          "Biomedical Engineering and Systems",
        ],
      },
      {
        code: "ع3",
        name: "توفير بيئة نظيفة آمنة مستدامة",
        departments: [
          "Architectural Engineering",
          "Public Works",
          "Electronics and Communications",
          "Mechanical Power Engineering",
        ],
      },
      {
        code: "ع4",
        name: "دعم الاقتصاد الأخضر",
        departments: [
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Electrical Power Engineering",
        ],
      },
      {
        code: "ع5",
        name: "المحافظة على الثروات الطبيعية",
        departments: [
          "Public Works",
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Electrical Power Engineering",
          "Chemical Engineering",
          "Mining, Petroleum & Metallurgical",
        ],
      },
    ],
  },
  {
    code: "م6",
    name: "التطبيقات التكنولوجية والعلوم المستقبلية والبيئية",
    goals: [
      {
        code: "ت1",
        name: "بناء وتطوير القدرات في العلوم البيئية والمستقبلية وتضييق الفجوة التكنولوجية لمواكبة علوم وتكنولوجيات المستقبل",
        departments: [
          "Engineering Mathematics and Physics",
          "Architectural Engineering",
          "Public Works",
          "Structural Engineering",
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Aeronautical and Aerospace Engineering",
          "Electrical Power Engineering",
          "Chemical Engineering",
          "Mining, Petroleum & Metallurgical",
          "Biomedical Engineering and Systems",
        ],
      },
      {
        code: "ت3",
        name: "تعظيم الاستفادة من استخدام تكنولوجيا النانو في المجالات الصناعية والعسكرية والطبية والزراعية",
        departments: [
          "Engineering Mathematics and Physics",
          "Architectural Engineering",
          "Structural Engineering",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Aeronautical and Aerospace Engineering",
          "Electrical Power Engineering",
          "Chemical Engineering",
          "Mining, Petroleum & Metallurgical",
          "Biomedical Engineering and Systems",
        ],
      },
      {
        code: "ت4",
        name: "تكنولوجيا الفضاء واستغلالها في التنبؤ الجوي والاستشعار عن بعد وأنظمة التموضع العالمي",
        departments: [
          "Engineering Mathematics and Physics",
          "Structural Engineering",
          "Mechanical Design and Production",
          "Aeronautical and Aerospace Engineering",
          "Electrical Power Engineering",
        ],
      },
      {
        code: "ت5",
        name: "استخدام أحدث تقنيات المعلوماتية الحيوية لحل مشكلات البيولوجيا الحيوية",
        departments: [
          "Engineering Mathematics and Physics",
          "Mechanical Design and Production",
        ],
      },
      {
        code: "ت6",
        name: "تطوير أساليب وأجهزة الكشف عن الألغام بالتعاون مع الجهات المعنية",
        departments: [
          "Engineering Mathematics and Physics",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Aeronautical and Aerospace Engineering",
          "Electrical Power Engineering",
          "Chemical Engineering",
          "Biomedical Engineering and Systems",
        ],
      },
    ],
  },
  {
    code: "م7",
    name: "الصناعات الاستراتيجية",
    goals: [
      {
        code: "ع1",
        name: "عمل دراسات لتطوير الصناعات الوطنية",
        departments: [
          "Engineering Mathematics and Physics",
          "Architectural Engineering",
          "Public Works",
          "Structural Engineering",
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Aeronautical and Aerospace Engineering",
          "Electrical Power Engineering",
          "Chemical Engineering",
          "Mining, Petroleum & Metallurgical",
          "Biomedical Engineering and Systems",
          "Computer Engineering",
        ],
      },
      {
        code: "ع4",
        name: "تطوير صناعة السيليكون والجرانيت والثروة المعدنية",
        departments: [
          "Engineering Mathematics and Physics",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Electrical Power Engineering",
          "Chemical Engineering",
          "Mining, Petroleum & Metallurgical",
          "Biomedical Engineering and Systems",
        ],
      },
      {
        code: "ع5",
        name: "تعميق التصنيع المحلي",
        departments: [
          "Engineering Mathematics and Physics",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Aeronautical and Aerospace Engineering",
          "Electrical Power Engineering",
          "Chemical Engineering",
          "Mining, Petroleum & Metallurgical",
          "Biomedical Engineering and Systems",
          "Computer Engineering",
        ],
      },
      {
        code: "ع6",
        name: "تطوير الصناعات الكيماوية",
        departments: [
          "Mechanical Power Engineering",
          "Chemical Engineering",
          "Biomedical Engineering and Systems",
        ],
      },
      {
        code: "ع7",
        name: "تطوير الصناعات الإليكترونية",
        departments: [
          "Engineering Mathematics and Physics",
          "Mechanical Design and Production",
          "Electronics and Communications",
          "Electrical Power Engineering",
          "Biomedical Engineering and Systems",
          "Computer Engineering",
        ],
      },
      {
        code: "ت9",
        name: "دعم المشروع القومي الخاص بتعميق التصنيع المحلي ورفع شعار «صنع في مصر»",
        departments: [
          "Engineering Mathematics and Physics",
          "Architectural Engineering",
          "Structural Engineering",
          "Public Works",
          "Electronics and Communications",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Aeronautical and Aerospace Engineering",
          "Electrical Power Engineering",
          "Chemical Engineering",
          "Mining, Petroleum & Metallurgical",
        ],
      },
      {
        code: "ت10",
        name: "إقامة ونقل التكنولوجيا بين المراكز والمعاهد البحثية والجامعات من جهة والصناعات المناظرة من جهة أخرى",
        departments: [
          "Engineering Mathematics and Physics",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Aeronautical and Aerospace Engineering",
          "Electronics and Communications",
          "Electrical Power Engineering",
          "Mining, Petroleum & Metallurgical",
        ],
      },
      {
        code: "ت11",
        name: "تعظيم التصنيع المحلي في الطاقة والمياه والإلكترونيات والاتصالات والمعدات الزراعية والزيوت وقطع الغيار",
        departments: [
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Electronics and Communications",
          "Electrical Power Engineering",
          "Chemical Engineering",
        ],
      },
      {
        code: "ت12",
        name: "دعم تمويل مشروعات بحوث وتطوير وابتكار وطنية وشراكات دولية في صناعة السيليكون والجرافين والثروة المعدنية في مصر",
        departments: [
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Chemical Engineering",
          "Mining, Petroleum & Metallurgical",
        ],
      },
      {
        code: "ت13",
        name: "توفير مصادر بديلة للطاقة وترشيد استهلاك الطاقة في الصناعات الكيماوية",
        departments: [
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Electrical Power Engineering",
          "Chemical Engineering",
        ],
      },
      {
        code: "ت14",
        name: "تعزيز قدرة مصر في مجال التصميم الإلكتروني",
        departments: [
          "Mechanical Design and Production",
          "Electronics and Communications",
        ],
      },
      {
        code: "ت15",
        name: "بناء القدرات المصرية وبحوث الابتكار والتطوير في مجال صناعة المكونات الدقيقة (النانو والميكرو)",
        departments: [
          "Mechanical Design and Production",
          "Electronics and Communications",
        ],
      },
      {
        code: "ت16",
        name: "زيادة نسبة وتنافسية التصنيع المحلي للمعدات والآلات الزراعية وقطع الغيار والاسطمبات والصناعات المغذية لصناعة السيارات ومعالجة المياه والروبوتات",
        departments: [
          "Aeronautical and Aerospace Engineering",
          "Mechanical Power Engineering",
          "Mechanical Design and Production",
          "Electronics and Communications",
          "Computer Engineering",
        ],
      },
      {
        code: "ت17",
        name: "ربط التنمية التكنولوجية بمواقع الإنتاج المهتمة بتصنيع المعدات وتطوير التصميمات الهندسية بالجامعات ومراكز البحث العلمي والتكنولوجي",
        departments: [
          "Aeronautical and Aerospace Engineering",
          "Electronics and Communications",
          "Public Works",
          "Computer Engineering",
        ],
      },
    ],
  },
  {
    code: "م8",
    name: "تكنولوجيا المعلومات والاتصالات",
    goals: [
      {
        code: "ت1",
        name: "عبور الفجوة الرقمية والمعلوماتية وتمكين تكنولوجيا المعلومات والاتصال",
        departments: [
          "Public Works",
          "Mechanical Design and Production",
          "Aeronautical and Aerospace Engineering",
          "Computer Engineering",
        ],
      },
      {
        code: "ت2",
        name: "تنفيذ مشروعات في مجال تكنولوجيا المعلومات",
        departments: [
          "Mechanical Design and Production",
          "Aeronautical and Aerospace Engineering",
        ],
      },
      {
        code: "ت3",
        name: "تنفيذ مشروعات في مجال تكنولوجيا الفضاء",
        departments: ["Aeronautical and Aerospace Engineering"],
      },
      {
        code: "ت4",
        name: "تنفيذ مشروعات في مجال الاستشعار عن بعد",
        departments: ["Aeronautical and Aerospace Engineering"],
      },
    ],
  },
  {
    code: "م9",
    name: "التعليم أمن قومي",
    goals: [
      {
        code: "ت1",
        name: "تطوير ودعم منظومة التعليم والتعلم",
        departments: [
          "Engineering Mathematics and Physics",
          "Architectural Engineering",
          "Public Works",
          "Structural Engineering",
          "Irrigation and Hydraulics",
          "Mechanical Design and Production",
          "Mechanical Power Engineering",
          "Aeronautical and Aerospace Engineering",
          "Electronics and Communications",
          "Electrical Power Engineering",
          "Chemical Engineering",
          "Mining, Petroleum & Metallurgical",
        ],
      },
    ],
  },
  {
    code: "م11",
    name: "الاستثمار والتجارة والنقل",
    goals: [
      {
        code: "ت3",
        name: "تعظيم الاستفادة من قطاع النقل والموانئ المصرية",
        departments: [
          "Engineering Mathematics and Physics",
          "Architectural Engineering",
          "Public Works",
          "Structural Engineering",
        ],
      },
      {
        code: "ت4",
        name: "رفع كفاءة الخدمات اللوجيستية",
        departments: ["Structural Engineering", "Irrigation and Hydraulics"],
      },
    ],
  },
  {
    code: "م12",
    name: "صناعة السياحة",
    goals: [
      {
        code: "ت8",
        name: "تبنّي وتفعيل البرامج العلمية والبحثية الجديدة مثل حفظ التراث وإدارة المواقع الأثرية من خلال التنمية السياحية المستدامة",
        departments: [
          "Engineering Mathematics and Physics",
          "Architectural Engineering",
          "Biomedical Engineering and Systems",
          "Computer Engineering",
        ],
      },
    ],
  },
];

/**
 * Return the subset of AXES that has ANY goal available to `departmentName`.
 * Each axis returned only contains the eligible goals for that department.
 */
function planForDepartment(departmentName) {
  const canonical = canonicalDepartmentName(departmentName);
  if (!canonical) return [];
  const result = [];
  for (const axis of AXES) {
    const goals = axis.goals.filter((g) => g.departments.includes(canonical));
    if (goals.length) {
      result.push({
        code: axis.code,
        name: axis.name,
        goals: goals.map(({ code, name }) => ({ code, name })),
      });
    }
  }
  return result;
}

/**
 * Look up an axis + goal by their codes. Returns { axisName, goalName } or nulls.
 */
function labelsForCodes(axisCode, goalCode) {
  const axis = AXES.find((a) => a.code === axisCode);
  if (!axis) return { axisName: null, goalName: null };
  const goal = axis.goals.find((g) => g.code === goalCode);
  return { axisName: axis.name, goalName: goal ? goal.name : null };
}

/**
 * Guard used by the request/document validators. Returns true iff the axis
 * / goal pair is legal for the given department.
 */
function isEligibleForDepartment(departmentName, axisCode, goalCode) {
  const canonical = canonicalDepartmentName(departmentName);
  if (!canonical) return false;
  const axis = AXES.find((a) => a.code === axisCode);
  if (!axis) return false;
  const goal = axis.goals.find((g) => g.code === goalCode);
  if (!goal) return false;
  return goal.departments.includes(canonical);
}

module.exports = {
  AXES,
  canonicalDepartmentName,
  planForDepartment,
  labelsForCodes,
  isEligibleForDepartment,
};
