import { PrismaClient, CourseType, RoomType, FacultyType } from "@prisma/client";

const prisma = new PrismaClient();

// All 7 slots per day (0-6), with slot 3 being lunch break (excluded from availability)
const fullAvailability = {
  MON: [0, 1, 2, 4, 5, 6],
  TUE: [0, 1, 2, 4, 5, 6],
  WED: [0, 1, 2, 4, 5, 6],
  THU: [0, 1, 2, 4, 5, 6],
  FRI: [0, 1, 2, 4, 5, 6],
};

// Part-time: only MON, WED, FRI mornings
const partTimeAvailability = {
  MON: [0, 1, 2],
  WED: [0, 1, 2],
  FRI: [0, 1, 2],
};

async function main() {
  // Clean all tables
  await prisma.assignment.deleteMany();
  await prisma.solverRun.deleteMany();
  await prisma.batchSection.deleteMany();
  await prisma.labGroup.deleteMany();
  await prisma.facultyCourse.deleteMany();
  await prisma.section.deleteMany();
  await prisma.timeConfig.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.course.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.room.deleteMany();

  // ─── Rooms ──────────────────────────────────────────────
  const rooms = await Promise.all([
    prisma.room.create({ data: { name: "LH-101", type: RoomType.LECTURE, capacity: 80, availability: fullAvailability } }),
    prisma.room.create({ data: { name: "LH-102", type: RoomType.LECTURE, capacity: 80, availability: fullAvailability } }),
    prisma.room.create({ data: { name: "LH-103", type: RoomType.LECTURE, capacity: 60, availability: fullAvailability } }),
    prisma.room.create({ data: { name: "LH-104", type: RoomType.LECTURE, capacity: 60, availability: fullAvailability } }),
    prisma.room.create({ data: { name: "Lab-A", type: RoomType.LAB, capacity: 40, availability: fullAvailability } }),
    prisma.room.create({ data: { name: "Lab-B", type: RoomType.LAB, capacity: 40, availability: fullAvailability } }),
  ]);
  console.log(`Created ${rooms.length} rooms`);

  // ─── Courses ────────────────────────────────────────────
  const courseData = [
    { code: "CS301", name: "Data Structures & Algorithms", type: CourseType.LECTURE, hoursPerWeek: 4, sessionsPerWeek: 4 },
    { code: "CS302", name: "Operating Systems", type: CourseType.LECTURE, hoursPerWeek: 3, sessionsPerWeek: 3 },
    { code: "CS303", name: "Database Management Systems", type: CourseType.LECTURE, hoursPerWeek: 3, sessionsPerWeek: 3 },
    { code: "CS304", name: "Computer Networks", type: CourseType.LECTURE, hoursPerWeek: 3, sessionsPerWeek: 3 },
    { code: "CS305", name: "Software Engineering", type: CourseType.LECTURE, hoursPerWeek: 3, sessionsPerWeek: 3 },
    { code: "CS306", name: "Discrete Mathematics", type: CourseType.LECTURE, hoursPerWeek: 3, sessionsPerWeek: 3 },
    { code: "CS391", name: "DSA Lab", type: CourseType.LAB, hoursPerWeek: 2, sessionsPerWeek: 1 },
    { code: "CS393", name: "DBMS Lab", type: CourseType.LAB, hoursPerWeek: 2, sessionsPerWeek: 1 },
  ];

  const courses = [];
  for (const cd of courseData) {
    const course = await prisma.course.create({
      data: {
        ...cd,
        sections: {
          create: cd.type === CourseType.LAB
            ? [
                { name: "A", labGroups: { create: [{ name: "G1" }, { name: "G2" }] } },
                { name: "B", labGroups: { create: [{ name: "G1" }, { name: "G2" }] } },
              ]
            : [{ name: "A" }, { name: "B" }],
        },
      },
      include: { sections: { include: { labGroups: true } } },
    });
    courses.push(course);
  }
  console.log(`Created ${courses.length} courses with sections`);

  // ─── Faculty ────────────────────────────────────────────
  const facultyData = [
    { name: "Dr. Alice Kumar", email: "alice@univ.edu", type: FacultyType.FULLTIME, maxHours: 20, availability: fullAvailability },
    { name: "Dr. Bob Singh", email: "bob@univ.edu", type: FacultyType.FULLTIME, maxHours: 20, availability: fullAvailability },
    { name: "Dr. Carol Patel", email: "carol@univ.edu", type: FacultyType.FULLTIME, maxHours: 20, availability: fullAvailability },
    { name: "Dr. David Chen", email: "david@univ.edu", type: FacultyType.FULLTIME, maxHours: 20, availability: fullAvailability },
    { name: "Dr. Eve Sharma", email: "eve@univ.edu", type: FacultyType.FULLTIME, maxHours: 20, availability: fullAvailability },
    { name: "Dr. Frank Rao", email: "frank@univ.edu", type: FacultyType.FULLTIME, maxHours: 20, availability: fullAvailability },
    { name: "Prof. Grace Lee", email: "grace@univ.edu", type: FacultyType.PARTTIME, maxHours: 9, availability: partTimeAvailability },
    { name: "Prof. Henry Wang", email: "henry@univ.edu", type: FacultyType.PARTTIME, maxHours: 9, availability: partTimeAvailability },
  ];

  const faculty = [];
  for (const fd of facultyData) {
    const f = await prisma.faculty.create({ data: fd });
    faculty.push(f);
  }
  console.log(`Created ${faculty.length} faculty`);

  // Faculty-Course qualifications
  // Each fulltime faculty teaches 2-3 courses, parttime teaches 1
  const qualifications = [
    // Alice: DSA + DSA Lab (sections A & B)
    { facultyId: faculty[0].id, courseId: courses[0].id }, // CS301 DSA
    { facultyId: faculty[0].id, courseId: courses[6].id }, // CS391 DSA Lab
    // Bob: OS
    { facultyId: faculty[1].id, courseId: courses[1].id }, // CS302 OS
    // Carol: DBMS + DBMS Lab
    { facultyId: faculty[2].id, courseId: courses[2].id }, // CS303 DBMS
    { facultyId: faculty[2].id, courseId: courses[7].id }, // CS393 DBMS Lab
    // David: Networks
    { facultyId: faculty[3].id, courseId: courses[3].id }, // CS304 Networks
    // Eve: Software Eng + Discrete Math
    { facultyId: faculty[4].id, courseId: courses[4].id }, // CS305 SE
    { facultyId: faculty[4].id, courseId: courses[5].id }, // CS306 DM
    // Frank: OS + Networks (cross-qualified)
    { facultyId: faculty[5].id, courseId: courses[1].id }, // CS302 OS
    { facultyId: faculty[5].id, courseId: courses[3].id }, // CS304 Networks
    // Grace (PT): SE
    { facultyId: faculty[6].id, courseId: courses[4].id }, // CS305 SE
    // Henry (PT): Discrete Math
    { facultyId: faculty[7].id, courseId: courses[5].id }, // CS306 DM
  ];

  await prisma.facultyCourse.createMany({ data: qualifications });
  console.log(`Created ${qualifications.length} faculty-course qualifications`);

  // ─── Batches ────────────────────────────────────────────
  const batchA = await prisma.batch.create({ data: { name: "CSE Sem-3A", studentCount: 60 } });
  const batchB = await prisma.batch.create({ data: { name: "CSE Sem-3B", studentCount: 60 } });

  // Batch A → Section A of all courses, Batch B → Section B
  const sectionEnrollments: { batchId: string; sectionId: string }[] = [];
  for (const course of courses) {
    const secA = course.sections.find((s) => s.name === "A");
    const secB = course.sections.find((s) => s.name === "B");
    if (secA) sectionEnrollments.push({ batchId: batchA.id, sectionId: secA.id });
    if (secB) sectionEnrollments.push({ batchId: batchB.id, sectionId: secB.id });
  }
  await prisma.batchSection.createMany({ data: sectionEnrollments });
  console.log(`Created 2 batches with ${sectionEnrollments.length} section enrollments`);

  // ─── Schedule ───────────────────────────────────────────
  const schedule = await prisma.schedule.create({
    data: {
      name: "Fall 2026",
      semester: "Semester 3",
      timeConfig: {
        create: {
          days: ["MON", "TUE", "WED", "THU", "FRI"],
          startTime: "09:00",
          endTime: "17:00",
          slotDuration: 60,
          breakStart: "12:00",
          breakEnd: "13:00",
        },
      },
    },
  });
  console.log(`Created schedule: ${schedule.name}`);

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
