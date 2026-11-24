"use client";

import { useEffect, useState } from "react";
import { createEmptyCV, type CVDocument, type CVLanguage } from "@thaflow/cv-core";

/**
 * A made-up CV used to show what the designs look like: on the product page, in the demo, and in the
 * template browser. A real person's CV is never shown anywhere but on their own device.
 */
export function sampleCV(language: CVLanguage, photo?: string): CVDocument {
  const cv = createEmptyCV({ title: "Sample", language, target: "professional" });
  cv.id = `sample-${language}`;
  const km = language === "km";
  cv.personal = {
    fullName: km ? "សុខ ដារ៉ា" : "Sok Dara",
    headline: km ? "គណនេយ្យករ" : "Accountant",
    email: "sok.dara@example.com",
    phone: "+855 12 345 678",
    location: km ? "រាជធានីភ្នំពេញ" : "Phnom Penh, Cambodia",
    photo,
    gender: "male",
    dateOfBirth: "1999-03-25",
    placeOfBirth: km ? "ខេត្តកណ្ដាល" : "Kandal Province",
    nationality: km ? "ខ្មែរ" : "Cambodian",
    maritalStatus: "single",
  };
  cv.summary = km
    ? "គណនេយ្យករដែលមានបទពិសោធន៍បីឆ្នាំនៅក្រុមហ៊ុនពាណិជ្ជកម្ម។ ហ្មត់ចត់ជាមួយតួលេខ ចេះប្រើ Excel និង QuickBooks បានល្អ ហើយទំនាក់ទំនងល្អជាមួយអតិថិជន។"
    : "Accountant with three years of experience at a busy trading company. Careful with numbers, quick with Excel and QuickBooks, and good with customers.";
  cv.experiences = [
    {
      id: "s-exp1",
      position: km ? "គណនេយ្យករ" : "Accountant",
      company: km ? "ក្រុមហ៊ុន មេគង្គ ពាណិជ្ជកម្ម" : "Mekong Trading Co., Ltd.",
      location: km ? "ភ្នំពេញ" : "Phnom Penh",
      startDate: "2022-01",
      isCurrent: true,
      description: km ? "រៀបចំរបាយការណ៍ហិរញ្ញវត្ថុប្រចាំខែ និងផ្ទៀងផ្ទាត់របាយការណ៍ធនាគារ។" : "Prepare the monthly financial reports and reconcile the bank statements.",
      achievements: km
        ? ["កាត់បន្ថយពេលបិទបញ្ជីប្រចាំខែពីប្រាំមួយថ្ងៃមកនៅបួនថ្ងៃ", "គ្រប់គ្រងការទូទាត់ប្រាក់ឱ្យអ្នកផ្គត់ផ្គង់ ៤០"]
        : ["Cut the month-end close from six days to four", "Manage payments to 40 suppliers"],
      technologies: [],
    },
    {
      id: "s-exp2",
      position: km ? "បេឡាករ" : "Cashier",
      company: km ? "ផ្សារទំនើប ឡាក់គី" : "Lucky Supermarket",
      location: km ? "ភ្នំពេញ" : "Phnom Penh",
      startDate: "2020-06",
      endDate: "2021-12",
      isCurrent: false,
      description: km
        ? "ទទួលការទូទាត់ និងរាប់សាច់ប្រាក់ប្រចាំថ្ងៃ។ បានបង្ហាត់បេឡាករថ្មីពីរនាក់។"
        : "Handled payments and the daily cash count. Trained two new cashiers.",
      achievements: [],
      technologies: [],
    },
  ];
  cv.education = [
    {
      id: "s-edu1",
      institution: km ? "សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ" : "Royal University of Phnom Penh",
      degree: km ? "បរិញ្ញាបត្រ" : "Bachelor's degree",
      fieldOfStudy: km ? "គណនេយ្យ" : "Accounting",
      startDate: "2017",
      endDate: "2021",
      achievements: [],
    },
    {
      id: "s-edu2",
      institution: km ? "វិទ្យាល័យបាក់ទូក" : "Bak Touk High School",
      degree: km ? "សញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ" : "High school diploma (BacII)",
      startDate: "2014",
      endDate: "2017",
      achievements: [],
    },
  ];
  cv.skills = [
    {
      id: "s-sk",
      category: "",
      skills: (km ? ["Excel", "QuickBooks", "កាន់បញ្ជី", "ការដាក់ពន្ធ", "សេវាអតិថិជន"] : ["Excel", "QuickBooks", "Bookkeeping", "Tax filing", "Customer service"]).map((name, i) => ({ id: `s-sk${i}`, name })),
    },
  ];
  cv.languages = km
    ? [
        { id: "s-l1", name: "ខ្មែរ", proficiency: "ភាសាកំណើត" },
        { id: "s-l2", name: "អង់គ្លេស", proficiency: "ល្អ" },
      ]
    : [
        { id: "s-l1", name: "Khmer", proficiency: "Native" },
        { id: "s-l2", name: "English", proficiency: "Good" },
      ];
  return cv;
}

/**
 * A neutral head-and-shoulders placeholder for the photo slot, drawn on the device so no image is
 * fetched. It is deliberately not a person.
 */
export function useSamplePhoto(): string | undefined {
  const [photo, setPhoto] = useState<string>();
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#d9d6ce";
      ctx.fillRect(0, 0, 240, 300);
      ctx.fillStyle = "#a9a59b";
      ctx.beginPath();
      ctx.arc(120, 116, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(18, 300);
      ctx.bezierCurveTo(18, 222, 66, 190, 120, 190);
      ctx.bezierCurveTo(174, 190, 222, 222, 222, 300);
      ctx.closePath();
      ctx.fill();
      setPhoto(canvas.toDataURL("image/png"));
    } catch {
      // No canvas: the designs simply show no photo.
    }
  }, []);
  return photo;
}
