import { createEmptyCV, type CVDocument } from "../src";

export function sampleCV(): CVDocument {
  const cv = createEmptyCV({ title: "Sample", language: "en", target: "professional" });
  cv.personal = { fullName: "Sok Dara", email: "dara@example.com", phone: "+855 12 345 678", location: "Phnom Penh" };
  cv.summary = "Frontend developer with three years of experience building web applications with React.";
  cv.experiences = [
    {
      id: "exp1",
      company: "Acme Co",
      position: "Frontend Developer",
      startDate: "2022-01",
      endDate: "2024-06",
      isCurrent: false,
      description: "Built and maintained customer-facing web applications using React and TypeScript.",
      achievements: ["Migrated the checkout flow to TypeScript"],
      technologies: ["React", "TypeScript"],
    },
  ];
  cv.education = [
    { id: "edu1", institution: "Royal University of Phnom Penh", degree: "BSc", fieldOfStudy: "Computer Science", endDate: "2021", achievements: [] },
  ];
  cv.skills = [{ id: "g1", category: "Frontend", skills: [{ id: "s1", name: "React" }, { id: "s2", name: "CSS" }] }];
  return cv;
}

export function khmerCV(): CVDocument {
  const cv = sampleCV();
  cv.metadata.language = "km";
  cv.personal.fullName = "សុខ ដារ៉ា";
  cv.summary = "អ្នកអភិវឌ្ឍន៍កម្មវិធីដែលមានបទពិសោធន៍បីឆ្នាំក្នុងការបង្កើតគេហទំព័រ។";
  cv.experiences[0]!.position = "អ្នកអភិវឌ្ឍន៍ Frontend";
  cv.experiences[0]!.description = "បង្កើត និងថែទាំកម្មវិធីគេហទំព័រសម្រាប់អតិថិជនដោយប្រើ React។";
  return cv;
}
