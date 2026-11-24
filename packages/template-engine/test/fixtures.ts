import { createEmptyCV, type CVDocument } from "@thaflow/cv-core";

/** 1×1 transparent PNG: enough to exercise the photo slot in unit tests. */
export const TINY_PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** A realistic, complete English CV: every section filled. */
export function fullEnglishCV(options: { photo?: string } = {}): CVDocument {
  const cv = createEmptyCV({ title: "Sophea Chan — Product", language: "en", target: "professional" });
  cv.id = "fixture-en";
  cv.personal = {
    fullName: "Sophea Chan",
    headline: "Senior Product Manager",
    email: "sophea.chan@example.com",
    phone: "+855 12 345 678",
    location: "Phnom Penh, Cambodia",
    website: "https://sopheachan.example",
    linkedin: "https://linkedin.com/in/sopheachan",
    github: "https://github.com/sopheachan",
    photo: options.photo,
    gender: "female",
    dateOfBirth: "1993-02-19",
    placeOfBirth: "Battambang Province",
    nationality: "Cambodian",
    maritalStatus: "single",
    height: "1.62 m",
    health: "Good",
  };
  cv.summary =
    "Product manager with eight years of experience in digital finance and logistics. I lead cross-functional teams from user research to launch, and I make decisions with data. Most recently I grew a mobile banking app to more than 500,000 customers across Cambodia.";
  cv.experiences = [
    {
      id: "exp1",
      company: "Tonle Digital",
      position: "Senior Product Manager",
      location: "Phnom Penh",
      employmentType: "full-time",
      startDate: "2021-03",
      endDate: "",
      isCurrent: true,
      description: "Lead the roadmap for a mobile banking app used by more than 500,000 customers nationwide.",
      achievements: [
        "Grew monthly active users by 40% in twelve months by rebuilding onboarding",
        "Cut new-account sign-up time from ten minutes to three",
        "Manage a team of twelve designers, engineers and data analysts",
      ],
      technologies: ["Figma", "SQL", "Amplitude"],
    },
    {
      id: "exp2",
      company: "Kampuchea Logistics",
      position: "Product Manager",
      location: "Phnom Penh",
      employmentType: "full-time",
      startDate: "2018-06",
      endDate: "2021-02",
      isCurrent: false,
      description: "Owned the shipment-tracking platform for small and medium business customers.",
      achievements: [
        "Launched real-time parcel tracking, reducing support calls by a quarter",
        "Aligned sales, operations and engineering around one quarterly plan",
      ],
      technologies: ["Jira", "Metabase"],
    },
    {
      id: "exp3",
      company: "Mekong Microfinance Institution",
      position: "Business Analyst",
      location: "Siem Reap",
      employmentType: "full-time",
      startDate: "2015-09",
      endDate: "2018-05",
      isCurrent: false,
      description: "Analysed the loan process and prepared monthly reporting for the management committee.",
      achievements: ["Built the credit-quality dashboard still used by forty branches"],
      technologies: [],
    },
  ];
  cv.education = [
    {
      id: "edu1",
      institution: "Royal University of Phnom Penh",
      degree: "Master of Business Administration",
      fieldOfStudy: "",
      location: "Phnom Penh",
      startDate: "2016",
      endDate: "2018",
      description: "",
      achievements: [],
    },
    {
      id: "edu2",
      institution: "Institute of Technology of Cambodia",
      degree: "BSc",
      fieldOfStudy: "Computer Science",
      location: "Phnom Penh",
      startDate: "2011",
      endDate: "2015",
      description: "",
      achievements: ["Graduated with distinction, ranked third in the cohort"],
    },
  ];
  cv.skills = [
    {
      id: "sg1",
      category: "Product",
      skills: [
        { id: "s1", name: "Roadmapping" },
        { id: "s2", name: "User research" },
        { id: "s3", name: "A/B testing" },
        { id: "s4", name: "Analytics" },
      ],
    },
    {
      id: "sg2",
      category: "Technical",
      skills: [
        { id: "s5", name: "SQL" },
        { id: "s6", name: "Python" },
        { id: "s7", name: "Figma" },
        { id: "s8", name: "Jira" },
      ],
    },
    {
      id: "sg3",
      category: "Leadership",
      skills: [
        { id: "s9", name: "Stakeholder management" },
        { id: "s10", name: "Mentoring" },
        { id: "s11", name: "Agile delivery" },
      ],
    },
  ];
  cv.projects = [
    {
      id: "p1",
      name: "QR payments",
      role: "Product lead",
      url: "https://tonledigital.example/qr",
      startDate: "2022-01",
      endDate: "2022-09",
      description: "Designed and shipped QR-code payments connected to the national Bakong system.",
      technologies: ["KHQR", "Bakong API"],
    },
    {
      id: "p2",
      name: "Driver app",
      role: "Product manager",
      url: "",
      startDate: "2019",
      endDate: "2020",
      description: "An offline-first Android app that lets drivers confirm deliveries without a connection.",
      technologies: [],
    },
  ];
  cv.certifications = [
    { id: "c1", name: "Certified Scrum Product Owner", issuer: "Scrum Alliance", date: "2019-04" },
    { id: "c2", name: "Google Data Analytics", issuer: "Coursera", date: "2020-08" },
  ];
  cv.languages = [
    { id: "l1", name: "Khmer", proficiency: "Native" },
    { id: "l2", name: "English", proficiency: "Fluent" },
    { id: "l3", name: "French", proficiency: "Basic" },
  ];
  cv.awards = [
    {
      id: "a1",
      title: "Employee of the Year",
      issuer: "Tonle Digital",
      date: "2023",
      description: "Recognised for leading the digital payments programme.",
    },
  ];
  cv.references = [
    {
      id: "r1",
      name: "Vibol Kim",
      position: "Chief Executive Officer",
      company: "Tonle Digital",
      email: "vibol.kim@example.com",
      phone: "+855 23 456 789",
    },
    {
      id: "r2",
      name: "Sreymom Heng",
      position: "Head of People",
      company: "Kampuchea Logistics",
      email: "sreymom.heng@example.com",
      phone: "",
    },
  ];
  cv.customSections = [
    {
      id: "cs1",
      title: "Volunteering",
      items: [
        {
          id: "ci1",
          title: "Volunteer teacher",
          subtitle: "Code Cambodia",
          date: "2019",
          description: "Teach programming basics to high-school students at weekends.",
        },
      ],
    },
  ];
  return cv;
}

/** The same person in Khmer: every section filled with real Khmer text (mixed with Latin where natural). */
export function fullKhmerCV(options: { photo?: string } = {}): CVDocument {
  const cv = createEmptyCV({ title: "ចាន់ សុភា", language: "km", target: "professional" });
  cv.id = "fixture-km";
  cv.personal = {
    fullName: "ចាន់ សុភា",
    headline: "ប្រធានគ្រប់គ្រងផលិតផលជាន់ខ្ពស់",
    email: "sophea.chan@example.com",
    phone: "+855 12 345 678",
    location: "រាជធានីភ្នំពេញ ប្រទេសកម្ពុជា",
    website: "https://sopheachan.example",
    linkedin: "https://linkedin.com/in/sopheachan",
    github: "https://github.com/sopheachan",
    photo: options.photo,
    gender: "female",
    dateOfBirth: "1993-02-19",
    placeOfBirth: "ខេត្តបាត់ដំបង",
    nationality: "ខ្មែរ",
    maritalStatus: "single",
    height: "១,៦២ ម៉ែត្រ",
    health: "ល្អ",
  };
  cv.summary =
    "អ្នកគ្រប់គ្រងផលិតផលដែលមានបទពិសោធន៍ជាង ៨ ឆ្នាំ ក្នុងវិស័យហិរញ្ញវត្ថុឌីជីថល និងភស្តុភារកម្ម។ មានជំនាញក្នុងការដឹកនាំក្រុមការងារពហុជំនាញ ការស្រាវជ្រាវតម្រូវការអ្នកប្រើប្រាស់ និងការសម្រេចចិត្តផ្អែកលើទិន្នន័យ ដើម្បីបង្កើតផលិតផលដែលងាយស្រួលប្រើ និងផ្តល់តម្លៃដល់អតិថិជន។";
  cv.experiences = [
    {
      id: "exp1",
      company: "ទន្លេ ឌីជីថល (Tonle Digital)",
      position: "ប្រធានគ្រប់គ្រងផលិតផលជាន់ខ្ពស់",
      location: "ភ្នំពេញ",
      employmentType: "full-time",
      startDate: "2021-03",
      endDate: "",
      isCurrent: true,
      description: "ដឹកនាំការអភិវឌ្ឍកម្មវិធីធនាគារចល័តដែលមានអ្នកប្រើប្រាស់ជាង ៥០០ ០០០ នាក់ទូទាំងប្រទេស។",
      achievements: [
        "បង្កើនចំនួនអ្នកប្រើប្រាស់សកម្មប្រចាំខែ ៤០% ក្នុងរយៈពេលមួយឆ្នាំ",
        "កាត់បន្ថយពេលវេលាចុះឈ្មោះគណនីថ្មីពី ១០ នាទី មកត្រឹម ៣ នាទី",
        "គ្រប់គ្រងក្រុមការងារ ១២ នាក់ រួមមានអ្នករចនា វិស្វករ និងអ្នកវិភាគទិន្នន័យ",
      ],
      technologies: ["Figma", "SQL", "Amplitude"],
    },
    {
      id: "exp2",
      company: "ក្រុមហ៊ុន កម្ពុជា ឡូជីស្ទីក",
      position: "អ្នកគ្រប់គ្រងផលិតផល",
      location: "ភ្នំពេញ",
      employmentType: "full-time",
      startDate: "2018-06",
      endDate: "2021-02",
      isCurrent: false,
      description: "ទទួលខុសត្រូវលើប្រព័ន្ធតាមដានការដឹកជញ្ជូនទំនិញសម្រាប់អតិថិជនអាជីវកម្មខ្នាតតូច និងមធ្យម។",
      achievements: [
        "ដាក់ឱ្យប្រើប្រាស់មុខងារតាមដានទំនិញតាមពេលវេលាជាក់ស្តែង",
        "សម្របសម្រួលការងាររវាងផ្នែកលក់ ផ្នែកប្រតិបត្តិការ និងផ្នែកបច្ចេកវិទ្យា",
      ],
      technologies: ["Jira", "Metabase"],
    },
    {
      id: "exp3",
      company: "គ្រឹះស្ថានមីក្រូហិរញ្ញវត្ថុ មេគង្គ",
      position: "អ្នកវិភាគអាជីវកម្ម",
      location: "សៀមរាប",
      employmentType: "full-time",
      startDate: "2015-09",
      endDate: "2018-05",
      isCurrent: false,
      description: "វិភាគដំណើរការផ្តល់ប្រាក់កម្ចី និងរៀបចំរបាយការណ៍ប្រចាំខែជូនគណៈគ្រប់គ្រង។",
      achievements: ["រៀបចំផ្ទាំងទិន្នន័យសម្រាប់តាមដានគុណភាពឥណទាន ដែលសាខាទាំង ៤០ នៅតែប្រើប្រាស់"],
      technologies: [],
    },
  ];
  cv.education = [
    {
      id: "edu1",
      institution: "សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ",
      degree: "បរិញ្ញាបត្រជាន់ខ្ពស់ គ្រប់គ្រងពាណិជ្ជកម្ម",
      fieldOfStudy: "",
      location: "ភ្នំពេញ",
      startDate: "2016",
      endDate: "2018",
      description: "",
      achievements: [],
    },
    {
      id: "edu2",
      institution: "វិទ្យាស្ថានបច្ចេកវិទ្យាកម្ពុជា",
      degree: "បរិញ្ញាបត្រ",
      fieldOfStudy: "វិទ្យាសាស្ត្រកុំព្យូទ័រ",
      location: "ភ្នំពេញ",
      startDate: "2011",
      endDate: "2015",
      description: "",
      achievements: ["បញ្ចប់ការសិក្សាដោយនិទ្ទេសល្អ ជាប់ចំណាត់ថ្នាក់លេខ ៣ ក្នុងជំនាន់"],
    },
  ];
  cv.skills = [
    {
      id: "sg1",
      category: "ផលិតផល",
      skills: [
        { id: "s1", name: "ការរៀបចំផែនការផលិតផល" },
        { id: "s2", name: "ការស្រាវជ្រាវអ្នកប្រើប្រាស់" },
        { id: "s3", name: "ការវិភាគទិន្នន័យ" },
        { id: "s4", name: "A/B Testing" },
      ],
    },
    {
      id: "sg2",
      category: "បច្ចេកទេស",
      skills: [
        { id: "s5", name: "SQL" },
        { id: "s6", name: "Python" },
        { id: "s7", name: "Figma" },
        { id: "s8", name: "Jira" },
      ],
    },
    {
      id: "sg3",
      category: "ភាពជាអ្នកដឹកនាំ",
      skills: [
        { id: "s9", name: "ការគ្រប់គ្រងក្រុម" },
        { id: "s10", name: "ការប្រាស្រ័យទាក់ទង" },
        { id: "s11", name: "ការដោះស្រាយបញ្ហា" },
      ],
    },
  ];
  cv.projects = [
    {
      id: "p1",
      name: "ការទូទាត់ប្រាក់តាម QR",
      role: "ប្រធានគម្រោង",
      url: "https://tonledigital.example/qr",
      startDate: "2022-01",
      endDate: "2022-09",
      description: "ដឹកនាំការរចនា និងដាក់ឱ្យដំណើរការមុខងារទូទាត់ប្រាក់តាមកូដ QR ដែលភ្ជាប់ជាមួយប្រព័ន្ធបាគង។",
      technologies: ["KHQR", "Bakong API"],
    },
    {
      id: "p2",
      name: "កម្មវិធីសម្រាប់អ្នកដឹកជញ្ជូន",
      role: "អ្នកគ្រប់គ្រងផលិតផល",
      url: "",
      startDate: "2019",
      endDate: "2020",
      description: "កម្មវិធី Android ដែលអាចប្រើបានដោយគ្មានអ៊ីនធឺណិត សម្រាប់បញ្ជាក់ការប្រគល់ទំនិញ។",
      technologies: [],
    },
  ];
  cv.certifications = [
    { id: "c1", name: "Certified Scrum Product Owner", issuer: "Scrum Alliance", date: "2019-04" },
    { id: "c2", name: "វិញ្ញាបនបត្រវិភាគទិន្នន័យ Google", issuer: "Coursera", date: "2020-08" },
  ];
  cv.languages = [
    { id: "l1", name: "ភាសាខ្មែរ", proficiency: "ភាសាកំណើត" },
    { id: "l2", name: "ភាសាអង់គ្លេស", proficiency: "ស្ទាត់ជំនាញ" },
    { id: "l3", name: "ភាសាបារាំង", proficiency: "កម្រិតមូលដ្ឋាន" },
  ];
  cv.awards = [
    {
      id: "a1",
      title: "និយោជិតឆ្នើមប្រចាំឆ្នាំ",
      issuer: "ទន្លេ ឌីជីថល",
      date: "2023",
      description: "ទទួលបានការទទួលស្គាល់សម្រាប់ការដឹកនាំគម្រោងទូទាត់ប្រាក់ឌីជីថល។",
    },
  ];
  cv.references = [
    {
      id: "r1",
      name: "លោក គឹម វិបុល",
      position: "នាយកប្រតិបត្តិ",
      company: "ទន្លេ ឌីជីថល",
      email: "vibol.kim@example.com",
      phone: "+855 23 456 789",
    },
    {
      id: "r2",
      name: "លោកស្រី ហេង ស្រីមុំ",
      position: "ប្រធានផ្នែកធនធានមនុស្ស",
      company: "ក្រុមហ៊ុន កម្ពុជា ឡូជីស្ទីក",
      email: "sreymom.heng@example.com",
      phone: "",
    },
  ];
  cv.customSections = [
    {
      id: "cs1",
      title: "សកម្មភាពស្ម័គ្រចិត្ត",
      items: [
        {
          id: "ci1",
          title: "គ្រូបង្រៀនស្ម័គ្រចិត្ត",
          subtitle: "អង្គការ កូដកម្ពុជា",
          date: "2019",
          description: "បង្រៀនមូលដ្ឋានគ្រឹះនៃការសរសេរកម្មវិធីដល់សិស្សវិទ្យាល័យនៅចុងសប្តាហ៍។",
        },
      ],
    },
  ];
  return cv;
}

/** An English-language CV with Khmer mixed in: the bilingual case. */
export function mixedCV(options: { photo?: string } = {}): CVDocument {
  const cv = fullEnglishCV(options);
  const km = fullKhmerCV();
  cv.id = "fixture-mixed";
  cv.personal.fullName = "Sophea Chan · ចាន់ សុភា";
  cv.personal.headline = "Senior Product Manager · ប្រធានគ្រប់គ្រងផលិតផលជាន់ខ្ពស់";
  cv.personal.location = "រាជធានីភ្នំពេញ";
  cv.summary = `${cv.summary}\n${km.summary}`;
  cv.experiences[1] = km.experiences[1]!;
  cv.education[0] = km.education[0]!;
  cv.skills[2] = km.skills[2]!;
  cv.languages = km.languages;
  cv.customSections = km.customSections;
  return cv;
}

/** A CV long enough to reach a second page in every template. */
export function longCV(base: CVDocument): CVDocument {
  const cv = structuredClone(base);
  cv.id = `${base.id}-long`;
  const extra = [...base.experiences, ...base.experiences].map((e, i) => ({
    ...e,
    id: `${e.id}-x${i}`,
    isCurrent: false,
    startDate: `${2014 - i}-01`,
    endDate: `${2015 - i}-01`,
  }));
  cv.experiences = [...base.experiences, ...extra];
  cv.projects = [...base.projects, ...base.projects.map((p) => ({ ...p, id: `${p.id}-x` }))];
  return cv;
}

/** Awkward content: very long unbroken strings, many skills, a long name. */
export function stressCV(): CVDocument {
  const cv = fullEnglishCV({ photo: TINY_PHOTO });
  cv.id = "fixture-stress";
  cv.personal.fullName = "Maximiliana Alexandrovna Chanthavongsakulpanich-Sokhemarith";
  cv.personal.headline = "Principal Engineering Programme Manager, Payments Infrastructure and Developer Experience";
  cv.personal.website = "https://a-very-long-subdomain.portfolio-of-maximiliana.example/cv/2026/english";
  cv.experiences[0]!.position = "ប្រធាននាយកដ្ឋានគ្រប់គ្រងផលិតផលនិងបទពិសោធន៍អតិថិជនឌីជីថលថ្នាក់ជាតិ";
  cv.skills[0]!.skills = Array.from({ length: 18 }, (_, i) => ({ id: `x${i}`, name: `Skill number ${i + 1}` }));
  cv.skills.push({ id: "sg4", category: "", skills: [{ id: "u1", name: "Uncategorised skill" }] });
  cv.certifications[0]!.name = "ISO/IEC-27001:2022-Lead-Implementer-and-Internal-Auditor-Certification";
  return cv;
}
