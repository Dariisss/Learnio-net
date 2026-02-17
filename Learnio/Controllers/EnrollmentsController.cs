using Learnio.Data;
using Learnio.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EnrollmentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public EnrollmentsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Enrollments/course/{courseId}/students
        [HttpGet("course/{courseId}/students")]
        public async Task<IActionResult> GetStudents(Guid courseId)
        {
            var students = await _context.Enrollments
                .Where(e => e.CourseId == courseId)
                .Include(e => e.Student) // Load student data
                .Select(e => new
                {
                    // 🔥 THIS WAS MISSING. WE ADD IT HERE:
                    Id = e.Student.Id,

                    e.Student.FirstName,
                    e.Student.LastName,
                    e.Student.Email,
                    e.Student.AvatarUrl
                })
                .ToListAsync();

            return Ok(students);
        }

        // POST: api/Enrollments/join
        [HttpPost("join")]
        public async Task<IActionResult> JoinCourse([FromBody] JoinRequestDto model)
        {
            // 1. Ищем курс по Коду (JoinCode)
            var course = await _context.Courses
                .FirstOrDefaultAsync(c => c.JoinCode == model.Code);

            if (course == null)
            {
                return NotFound(new { message = "Курс с таким кодом не найден" });
            }

            // 2. Проверяем, не вступил ли студент уже (чтобы не было дублей)
            var exists = await _context.Enrollments
                .AnyAsync(e => e.StudentId == model.StudentId && e.CourseId == course.Id);

            if (exists)
            {
                // Если уже вступил, просто возвращаем ID курса, чтобы перебросило
                return Ok(new
                {
                    message = "Вы уже в этом курсе!",
                    courseId = course.Id, // <-- ВОЗВРАЩАЕМ GUID
                    courseName = course.Name
                });
            }

            // 3. Создаем запись о вступлении
            var enrollment = new Enrollment
            {
                Id = Guid.NewGuid(),
                CourseId = course.Id,
                StudentId = model.StudentId,
                JoinedAt = DateTime.UtcNow
            };

            _context.Enrollments.Add(enrollment);
            await _context.SaveChangesAsync();

            // 4. Возвращаем результат с НАСТОЯЩИМ GUID
            return Ok(new
            {
                message = "Успешно присоединились!",
                courseId = course.Id, // <-- Самое важное исправление
                courseName = course.Name
            });
        }

        // DELETE: api/Enrollments/kick
        [HttpDelete("kick")]
        public async Task<IActionResult> KickStudent([FromQuery] Guid courseId, [FromQuery] string studentId)
        {
            // 1. Находим запись о зачислении
            var enrollment = await _context.Enrollments
                .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId);

            if (enrollment == null)
            {
                return NotFound("Student is not enrolled in this course.");
            }

            // 2. 🔥 УДАЛЯЕМ РАБОТЫ И ОЦЕНКИ (Только в рамках этого курса!)
            // Ищем сдачи, где задание принадлежит этому курсу
            var studentSubmissionsInThisCourse = await _context.Submissions
                .Where(s => s.StudentId == studentId && s.Assignment.CourseId == courseId)
                .ToListAsync();

            if (studentSubmissionsInThisCourse.Any())
            {
                // Удаляем работы. Файлы ответов (если есть) можно тоже почистить с диска,
                // но для простоты пока удаляем записи из БД.
                _context.Submissions.RemoveRange(studentSubmissionsInThisCourse);
            }

            // 3. Удаляем студента с курса
            _context.Enrollments.Remove(enrollment);

            // 4. ЧАТ НЕ ТРОГАЕМ (Messages остаются)

            await _context.SaveChangesAsync();

            return Ok(new { message = "Student removed and their course data wiped." });
        }
    }
}

    public class JoinRequestDto
    {
        public string Code { get; set; }
        public string StudentId { get; set; }
    }
